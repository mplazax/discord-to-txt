interface MessageData {
  id: string;
  author: string;
  timestamp: string | null;
  content: string;
}

export class BackgroundService {
  private chrome: typeof chrome;
  private downloadInProgress: Record<number, boolean> = {};
  private conversationData: Record<number, MessageData[]> = {};

  constructor() {
    // Use global chrome if available, otherwise it will be mocked in tests
    this.chrome =
      typeof chrome !== "undefined" ? chrome : ({} as typeof chrome);
  }

  /**
   * Initializes the background service
   */
  initialize(): void {
    // Set up message listener
    if (this.chrome.runtime) {
      this.chrome.runtime.onMessage.addListener(this.handleMessage.bind(this));
    }
  }

  /**
   * Handles incoming messages from popup or content script
   */
  private handleMessage(
    message: any,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: any) => void
  ): void {
    const tabId = sender.tab?.id;

    if (!tabId) {
      console.error("Message received from unknown tab");
      return;
    }

    switch (message.action) {
      case "startDownload":
        this.startDownloadProcess(tabId);
        break;

      case "progressUpdate":
        // Forward progress updates to popup
        this.chrome.runtime.sendMessage({
          action: "progressUpdate",
          tabId,
          ...message,
        });
        break;

      case "dataChunk":
        this.processDataChunk(tabId, message.data);
        break;

      case "scrapingComplete":
        this.completeDownload(tabId);
        break;

      case "scrapingError":
        this.handleError(tabId, message.error);
        break;
    }

    // Return true if we need to send a response asynchronously
    sendResponse({ received: true });
  }

  /**
   * Starts the download process for a tab
   */
  private async startDownloadProcess(tabId: number): Promise<void> {
    if (this.downloadInProgress[tabId]) {
      console.warn(`Download already in progress for tab ${tabId}`);
      return;
    }

    // Mark as in progress
    this.downloadInProgress[tabId] = true;

    // Clear any existing data
    this.conversationData[tabId] = [];

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

    // Notify popup that process has started
    if (this.chrome.runtime) {
      this.chrome.runtime.sendMessage({
        action: "progressUpdate",
        tabId,
        status: "Initializing scraping process...",
      });
    }
  }

  /**
   * Processes incoming message data chunk from content script
   */
  private processDataChunk(tabId: number, data: MessageData[]): void {
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
  private async completeDownload(tabId: number): Promise<void> {
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
  private formatData(messages: MessageData[]): string {
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
  private handleError(tabId: number, errorMessage: string): void {
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
