/**
 * This is the content script that gets injected into Discord pages.
 * It initializes the ContentScript class and sets up message listeners.
 */
import { ContentScript } from "./contentScript.ts";

// Initialize variables
let contentScript = null;

// Set up message listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Initialize content script if needed
  if (!contentScript) {
    contentScript = new ContentScript();
    const initialized = contentScript.initialize();

    if (!initialized) {
      chrome.runtime.sendMessage({
        action: "scrapingError",
        error: "Failed to initialize: Discord conversation not found",
      });

      sendResponse({ success: false });
      return;
    }
  }

  // Handle different message actions
  if (message.action === "scrapeConversation") {
    // Start scraping conversation
    handleScrapeConversation(sendResponse);
    return true; // Indicate async response
  }

  sendResponse({ success: true });
});

/**
 * Handles the request to scrape the conversation
 */
async function handleScrapeConversation(sendResponse) {
  try {
    // Send initial progress update
    chrome.runtime.sendMessage({
      action: "progressUpdate",
      status: "Scrolling to load messages...",
    });

    // Start scraping
    await contentScript.scrapeConversation();

    // Send exported data to background script
    const exportData = contentScript.getExportedData();

    // Send progress update
    chrome.runtime.sendMessage({
      action: "progressUpdate",
      status: `Exporting ${exportData.messageCount} messages...`,
    });

    // Send data in chunks to avoid message size limits
    const chunkSize = 100;
    for (let i = 0; i < exportData.messages.length; i += chunkSize) {
      const chunk = exportData.messages.slice(i, i + chunkSize);

      chrome.runtime.sendMessage({
        action: "dataChunk",
        data: chunk,
      });
    }

    // Notify scraping completion
    chrome.runtime.sendMessage({
      action: "scrapingComplete",
    });

    sendResponse({ success: true });
  } catch (error) {
    console.error("Error scraping conversation:", error);

    chrome.runtime.sendMessage({
      action: "scrapingError",
      error: error.message || "Unknown error during scraping",
    });

    sendResponse({ success: false, error: error.message });
  }
}
