/**
 * This is the entry point for the popup UI.
 * It handles all popup interactions.
 */

// Define the PopupManager class directly in this file
class PopupManager {
  constructor() {
    this.statusElement = null;
    this.downloadButton = null;
    // Use global chrome
    this.chrome = chrome;
  }

  /**
   * Initializes the popup UI and event listeners
   */
  initialize() {
    // Set up DOM content loaded listener
    document.addEventListener("DOMContentLoaded", this.onDomLoaded.bind(this));

    // Set up message listener
    if (this.chrome.runtime) {
      this.chrome.runtime.onMessage.addListener(
        this.handleStatusUpdate.bind(this)
      );
    }
  }

  /**
   * Handles DOM loaded event
   */
  onDomLoaded() {
    // Set up UI elements
    this.statusElement = document.getElementById("status");
    this.downloadButton = document.getElementById("downloadButton");

    // Add click handler to download button
    if (this.downloadButton) {
      this.downloadButton.addEventListener("click", async () => {
        await this.startDownload();
      });
    }
  }

  /**
   * Starts the download process
   */
  async startDownload() {
    // Update UI
    if (this.statusElement) {
      this.statusElement.textContent = "Initializing...";
    }

    if (this.downloadButton) {
      this.downloadButton.disabled = true;
    }

    try {
      // Get the active tab
      const tabs = await this.getActiveTabs();

      if (tabs.length === 0) {
        throw new Error("No Discord tab found");
      }

      const tabId = tabs[0].id;

      // Send message to background script
      if (this.chrome.runtime) {
        this.chrome.runtime.sendMessage({
          action: "startDownload",
          tabId,
        });
      }
    } catch (error) {
      console.error("Error starting download:", error);

      // Show error in UI
      if (this.statusElement) {
        this.statusElement.textContent = `Error: ${
          error instanceof Error ? error.message : "Unknown error"
        }`;
      }

      // Re-enable button
      if (this.downloadButton) {
        this.downloadButton.disabled = false;
      }
    }
  }

  /**
   * Gets active Discord tabs
   */
  getActiveTabs() {
    return new Promise((resolve) => {
      if (!this.chrome.tabs) {
        resolve([]);
        return;
      }

      this.chrome.tabs.query({ active: true, currentWindow: true }, (tabs) =>
        resolve(tabs)
      );
    });
  }

  /**
   * Handles status update messages from background script
   */
  handleStatusUpdate(message) {
    // Ignore messages that aren't progress updates
    if (message.action !== "progressUpdate") {
      return;
    }

    // Update status text
    if (this.statusElement && message.status) {
      this.statusElement.textContent = message.status;
    }

    // Re-enable button if operation is complete or failed
    if (this.downloadButton && (message.complete || message.error)) {
      this.downloadButton.disabled = false;
    }
  }
}

// Only initialize in a browser context
// Initialize the popup UI
const popupManager = new PopupManager();
popupManager.initialize();
