/**
 * This is the entry point for the background service worker.
 * It handles background processing.
 */

// Define the BackgroundService class directly
class BackgroundService {
  constructor() {
    this.chrome = chrome;
    this.downloadInProgress = {};
    this.conversationData = {};
  }

  /**
   * Initializes the background service
   */
  initialize() {
    // Set up message listener
    if (this.chrome.runtime) {
      this.chrome.runtime.onMessage.addListener(this.handleMessage.bind(this));
    }
  }

  /**
   * Handles incoming messages from popup or content script
   */
  handleMessage(message, sender, sendResponse) {
    const tabId = sender.tab?.id;

    if (!tabId && message.action !== "startDownload") {
      console.error("Message received from unknown tab");
      return;
    }

    // For startDownload action, use the tabId from the message
    const effectiveTabId =
      message.action === "startDownload" && message.tabId
        ? message.tabId
        : tabId;

    switch (message.action) {
      case "startDownload":
        this.startDownloadProcess(effectiveTabId);
        break;

      case "progressUpdate":
        // Forward progress updates to popup
        this.chrome.runtime.sendMessage({
          action: "progressUpdate",
          tabId: effectiveTabId,
          ...message,
        });
        break;

      case "dataChunk":
        this.processDataChunk(effectiveTabId, message.data);
        break;

      case "scrapingComplete":
        this.completeDownload(effectiveTabId);
        break;

      case "scrapingError":
        this.handleError(effectiveTabId, message.error);
        break;
    }

    // Return true if we need to send a response asynchronously
    sendResponse({ received: true });
    return true;
  }

  /**
   * Starts the download process for a tab
   */
  async startDownloadProcess(tabId) {
    if (this.downloadInProgress[tabId]) {
      console.warn(`Download already in progress for tab ${tabId}`);
      return;
    }

    // Mark as in progress
    this.downloadInProgress[tabId] = true;

    // Clear any existing data
    this.conversationData[tabId] = [];

    try {
      // First, notify popup that process has started
      if (this.chrome.runtime) {
        this.chrome.runtime.sendMessage({
          action: "progressUpdate",
          tabId,
          status: "Injecting content script...",
        });
      }

      // Make sure the content script is injected
      await this.injectContentScript(tabId);

      // Send message to content script to start scraping
      if (this.chrome.tabs) {
        this.chrome.tabs.sendMessage(
          tabId,
          { action: "scrapeConversation" },
          (response) => {
            if (this.chrome.runtime?.lastError) {
              console.error(
                "Error sending message to content script:",
                this.chrome.runtime.lastError
              );
              this.handleError(
                tabId,
                "Failed to communicate with content script"
              );
            }
          }
        );
      }

      // Notify popup that process has progressed
      if (this.chrome.runtime) {
        this.chrome.runtime.sendMessage({
          action: "progressUpdate",
          tabId,
          status: "Initializing scraping process...",
        });
      }
    } catch (error) {
      console.error("Error starting download process:", error);
      this.handleError(
        tabId,
        "Failed to inject content script: " + error.message
      );
    }
  }

  /**
   * Injects the content script into the tab
   */
  async injectContentScript(tabId) {
    // Check if the scripting API is available
    if (!chrome.scripting) {
      throw new Error("Scripting API not available");
    }

    try {
      // Inject the content script
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ["content/content.js"],
      });

      console.log("Content script injected successfully");
    } catch (error) {
      console.error("Failed to inject content script:", error);
      throw error;
    }
  }

  /**
   * Processes incoming message data chunk from content script
   */
  processDataChunk(tabId, data) {
    if (!this.conversationData[tabId]) {
      this.conversationData[tabId] = [];
    }

    // Add new messages to our data store
    this.conversationData[tabId] = [...this.conversationData[tabId], ...data];

    // Update progress
    if (this.chrome.runtime) {
      this.chrome.runtime.sendMessage({
        action: "progressUpdate",
        tabId,
        status: `Processing data... Found ${this.conversationData[tabId].length} messages`,
      });
    }
  }

  /**
   * Completes the download process and generates the file
   */
  async completeDownload(tabId) {
    try {
      const messages = this.conversationData[tabId];

      if (!messages || messages.length === 0) {
        this.handleError(tabId, "No messages found to download");
        return;
      }

      // Update status
      if (this.chrome.runtime) {
        this.chrome.runtime.sendMessage({
          action: "progressUpdate",
          tabId,
          status: `Formatting ${messages.length} messages...`,
        });
      }

      // Format data into text
      const formattedText = this.formatData(messages);

      // Create a blob and download it
      const blob = new Blob([formattedText], { type: "text/plain" });
      const url = URL.createObjectURL(blob);

      // Generate filename with date
      const date = new Date().toISOString().split("T")[0];
      const filename = `discord-conversation-${date}.txt`;

      // Initiate download
      if (this.chrome.downloads) {
        await this.chrome.downloads.download({
          url,
          filename,
          saveAs: true,
        });
      }

      // Clean up
      URL.revokeObjectURL(url);
      delete this.conversationData[tabId];
      this.downloadInProgress[tabId] = false;

      // Notify completion
      if (this.chrome.runtime) {
        this.chrome.runtime.sendMessage({
          action: "progressUpdate",
          tabId,
          status: "Download complete!",
          complete: true,
        });
      }
    } catch (error) {
      console.error("Error completing download:", error);
      this.handleError(tabId, "Failed to create download file");
    }
  }

  /**
   * Formats the message data into a readable text format
   */
  formatData(messages) {
    return messages
      .map((message) => {
        const timestamp = message.timestamp
          ? new Date(message.timestamp)
              .toISOString()
              .replace("T", " ")
              .substring(0, 19)
          : "Unknown time";

        return `[${timestamp}] ${message.author}: ${message.content}`;
      })
      .join("\n");
  }

  /**
   * Handles errors in the download process
   */
  handleError(tabId, errorMessage) {
    console.error(`Error for tab ${tabId}:`, errorMessage);

    // Clean up
    delete this.conversationData[tabId];
    this.downloadInProgress[tabId] = false;

    // Notify popup
    if (this.chrome.runtime) {
      this.chrome.runtime.sendMessage({
        action: "progressUpdate",
        tabId,
        status: `Error: ${errorMessage}`,
        error: true,
      });
    }
  }
}

// Create and initialize the background service
const backgroundService = new BackgroundService();
backgroundService.initialize();

// Log that the background service has started
console.log("Discord Conversation Exporter background service started");
