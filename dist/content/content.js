/**
 * This is the content script that gets injected into Discord pages.
 * It handles message extraction and communication with the background script.
 */

// Define simple classes here instead of importing from TypeScript files
class MessageExtractor {
  extractMessageData(element, previousAuthor = null) {
    // Generate a unique ID for this message
    const id =
      element.id ||
      `message-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Try different ways to extract the message content
    let author = previousAuthor || "Unknown User";
    let timestamp = null;
    let content = "";
    let isPartOfSequence = false;

    try {
      // Check if this is part of a sequence (grouped) message
      isPartOfSequence =
        !element.classList.contains("groupStart-") &&
        element.getAttribute("aria-setsize") &&
        element.getAttribute("aria-posinset") > 1;

      // Method 1: Standard Discord message structure
      if (element.id && element.id.startsWith("chat-messages-")) {
        const contents = element.querySelector("div");
        if (contents) {
          const header = contents.querySelector("h3");
          const usernameElement = header?.querySelector("span");
          const timestampElement = contents.querySelector("time");

          // Exclude reply bar content
          const replyBar = contents.querySelector('[class*="replyBar-"]');
          if (replyBar) {
            replyBar.remove(); // Remove temporarily to not include in text content
          }

          const contentElement = contents.querySelector(
            'div[id^="message-content-"]'
          );

          if (usernameElement) author = usernameElement.textContent || author;
          if (timestampElement)
            timestamp = timestampElement.getAttribute("datetime");
          if (contentElement) content = contentElement.textContent || "";

          // Add reply bar back if we removed it
          if (replyBar && replyBar.parentNode) {
            contents.appendChild(replyBar);
          }

          // If no author found but we have previous author and this looks like a sequence
          if (
            (author === "Unknown User" || !usernameElement) &&
            previousAuthor &&
            isPartOfSequence
          ) {
            author = previousAuthor;
          }

          return { id, author, timestamp, content, isPartOfSequence };
        }
      }

      // Method 2: Try with class name selectors
      const usernameElement = element.querySelector('[class*="username-"]');
      const timestampElement = element.querySelector("time[datetime]");

      // Handle reply content correctly
      const replyBar = element.querySelector('[class*="replyBar-"]');
      if (replyBar) {
        replyBar.remove(); // Remove temporarily
      }

      const contentElement =
        element.querySelector('[class*="message-content-"]') ||
        element.querySelector('[class*="messageContent-"]');

      if (usernameElement) author = usernameElement.textContent || author;
      if (timestampElement)
        timestamp = timestampElement.getAttribute("datetime");
      if (contentElement) content = contentElement.textContent || "";

      // Add reply bar back if we removed it
      if (replyBar && replyBar.parentNode) {
        element.appendChild(replyBar);
      }

      // If no author found but we have previous author and this looks like a sequence
      if (
        (author === "Unknown User" || !usernameElement) &&
        previousAuthor &&
        isPartOfSequence
      ) {
        author = previousAuthor;
      }

      // If we found at least the content or the author, return a result
      if (content || author !== "Unknown User") {
        return { id, author, timestamp, content, isPartOfSequence };
      }

      // Method 3: General approach
      // Find all spans, one might be the username
      const spans = element.querySelectorAll("span");
      for (const span of spans) {
        if (
          span.className.includes("username") ||
          span.parentElement?.className.includes("username")
        ) {
          author = span.textContent || author;
          break;
        }
      }

      // Get all text content as a fallback, but exclude reply content
      if (!content) {
        // Clone the element to avoid modifying the DOM
        const elementClone = element.cloneNode(true);
        const replyBarClone = elementClone.querySelector(
          '[class*="replyBar-"]'
        );
        if (replyBarClone) {
          replyBarClone.remove();
        }
        content = elementClone.textContent || "";
      }

      // If still no author found but we have previous author
      if (author === "Unknown User" && previousAuthor) {
        author = previousAuthor;
      }

      return { id, author, timestamp, content, isPartOfSequence };
    } catch (error) {
      console.error("Error extracting message data:", error);
      return null;
    }
  }

  formatMessageForExport(message) {
    let formattedTimestamp = "Unknown time";

    if (message.timestamp) {
      const date = new Date(message.timestamp);
      // Format the date
      formattedTimestamp = [
        date.getUTCFullYear(),
        "-",
        String(date.getUTCMonth() + 1).padStart(2, "0"),
        "-",
        String(date.getUTCDate()).padStart(2, "0"),
        " ",
        String(date.getUTCHours()).padStart(2, "0"),
        ":",
        String(date.getUTCMinutes()).padStart(2, "0"),
        ":",
        String(date.getUTCSeconds()).padStart(2, "0"),
      ].join("");
    }

    return `[${formattedTimestamp}] ${message.author}: ${message.content}`;
  }
}

class ScrollManager {
  isAtTop(element) {
    return element.scrollTop <= 0;
  }

  async scrollUp(element) {
    const currentScrollTop = element.scrollTop;
    element.scrollTop = currentScrollTop - 1000;
    return new Promise((resolve) => setTimeout(resolve, 500));
  }

  async waitForNewContent() {
    return new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

class ContentScript {
  constructor() {
    this.messageExtractor = new MessageExtractor();
    this.scrollManager = new ScrollManager();
    this.messageContainer = null;
    this.messageList = null;
    this.processedMessageIds = new Set();
    this.extractedMessages = [];
    this.isScrapingActive = false;
    this.lastAuthor = null;
  }

  initialize() {
    try {
      // Try multiple possible selectors for the message container
      this.messageContainer =
        document.querySelector("div.scroller") ||
        document
          .querySelector("[data-list-id='chat-messages']")
          ?.closest(".scroller") ||
        document.querySelector("[class*='scrollerBase']");

      // Find the message list - try multiple selectors to handle different Discord UI versions
      this.messageList =
        document.querySelector('ol[data-list-id="chat-messages"]') ||
        document.querySelector('[role="list"][data-list-id="chat-messages"]') ||
        document.querySelector('[role="list"][class*="scrollerInner"]');

      // If we still couldn't find the message list, try a more general approach
      if (!this.messageList) {
        const chatArea = document.querySelector('[class*="chat-"]');
        if (chatArea) {
          this.messageList = chatArea.querySelector('[role="list"]');
        }

        // Last resort - try to find any list-like element
        if (!this.messageList) {
          this.messageList =
            document.querySelector('[role="list"]') ||
            document.querySelector("ol") ||
            document.querySelector('ul[class*="message"]');
        }
      }

      console.log("Message container:", this.messageContainer);
      console.log("Message list:", this.messageList);

      // Return true only if both elements were found
      return !!(this.messageContainer && this.messageList);
    } catch (error) {
      console.error("Error initializing ContentScript:", error);
      return false;
    }
  }

  async extractVisibleMessages() {
    if (!this.messageList) {
      return 0;
    }

    // Find all message elements - try multiple selectors
    const messageElements =
      Array.from(
        this.messageList.querySelectorAll('li[id^="chat-messages-"]')
      ) ||
      Array.from(this.messageList.querySelectorAll('[class*="message-"]')) ||
      Array.from(this.messageList.querySelectorAll("li"));

    let newMessagesCount = 0;

    // Process each message
    for (const element of messageElements) {
      const messageData = this.messageExtractor.extractMessageData(
        element,
        this.lastAuthor
      );

      if (messageData && !this.processedMessageIds.has(messageData.id)) {
        this.processedMessageIds.add(messageData.id);
        this.extractedMessages.push(messageData);
        newMessagesCount++;

        // Update last author if we have a valid one
        if (messageData.author && messageData.author !== "Unknown User") {
          this.lastAuthor = messageData.author;
        }
      }
    }

    return newMessagesCount;
  }

  async scrapeConversation(maxScrollAttempts = 100) {
    if (this.isScrapingActive || !this.messageContainer) {
      return;
    }

    this.isScrapingActive = true;
    let scrollAttempts = 0;

    try {
      // Extract messages that are initially visible
      await this.extractVisibleMessages();

      // Continue scrolling until we reach the top or hit the limit
      while (
        !this.scrollManager.isAtTop(this.messageContainer) &&
        scrollAttempts < maxScrollAttempts
      ) {
        // Scroll up
        await this.scrollManager.scrollUp(this.messageContainer);

        // Wait for new content to load
        await this.scrollManager.waitForNewContent();

        // Extract messages after each scroll
        await this.extractVisibleMessages();

        // Increment scroll attempts
        scrollAttempts++;
      }
    } catch (error) {
      console.error("Error while scraping conversation:", error);
    } finally {
      this.isScrapingActive = false;
    }
  }

  getExportedData() {
    return {
      messageCount: this.extractedMessages.length,
      messages: [...this.extractedMessages],
    };
  }

  reset() {
    this.processedMessageIds.clear();
    this.extractedMessages = [];
    this.isScrapingActive = false;
  }
}

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
