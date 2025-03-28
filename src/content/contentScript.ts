import { MessageExtractor } from "../utils/messageExtractor";
import { ScrollManager } from "../utils/scrollManager";

// Define the MessageData interface (could be exported from MessageExtractor)
interface MessageData {
  id: string;
  author: string;
  timestamp: string | null;
  content: string;
}

interface ExportData {
  messageCount: number;
  messages: MessageData[];
}

export class ContentScript {
  private messageContainer: HTMLElement | null = null;
  private messageList: HTMLElement | null = null;
  private processedMessageIds: Set<string> = new Set();
  private extractedMessages: MessageData[] = [];
  private isScrapingActive: boolean = false;

  constructor(
    private messageExtractor: MessageExtractor = new MessageExtractor(),
    private scrollManager: ScrollManager = new ScrollManager()
  ) {}

  /**
   * Initializes the content script by finding necessary elements
   * @returns true if initialization successful, false otherwise
   */
  initialize(): boolean {
    try {
      // Find the scroll container
      this.messageContainer = document.querySelector("div.scroller");

      // Find the message list
      this.messageList = document.querySelector(
        'ol[data-list-id="chat-messages"]'
      );

      // Return true only if both elements were found
      return !!(this.messageContainer && this.messageList);
    } catch (error) {
      console.error("Error initializing ContentScript:", error);
      return false;
    }
  }

  /**
   * Extracts visible messages in the current view
   * @returns Number of new messages found
   */
  async extractVisibleMessages(): Promise<number> {
    if (!this.messageList) {
      return 0;
    }

    // Find all message elements
    const messageElements = this.messageList.querySelectorAll(
      'li[id^="chat-messages-"]'
    );
    let newMessagesCount = 0;

    // Process each message
    for (const element of messageElements) {
      const messageData = this.messageExtractor.extractMessageData(element);

      if (messageData && !this.processedMessageIds.has(messageData.id)) {
        this.processedMessageIds.add(messageData.id);
        this.extractedMessages.push(messageData);
        newMessagesCount++;
      }
    }

    return newMessagesCount;
  }

  /**
   * Performs the entire scraping operation - scrolling to the top and extracting all messages
   * @param maxScrollAttempts Optional max number of scroll attempts
   * @returns Promise that resolves when scraping is complete
   */
  async scrapeConversation(maxScrollAttempts: number = 100): Promise<void> {
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

        // Increment scroll attempts
        scrollAttempts++;
      }
    } catch (error) {
      console.error("Error while scraping conversation:", error);
    } finally {
      this.isScrapingActive = false;
    }
  }

  /**
   * Formats the extracted messages for export
   * @returns Formatted text string
   */
  formatExportText(): string {
    if (this.extractedMessages.length === 0) {
      return "";
    }

    return this.extractedMessages
      .map((message) => this.messageExtractor.formatMessageForExport(message))
      .join("\n");
  }

  /**
   * Gets the export data including message count and messages
   * @returns Export data object
   */
  getExportedData(): ExportData {
    return {
      messageCount: this.extractedMessages.length,
      messages: [...this.extractedMessages],
    };
  }

  /**
   * Resets the scraping state
   */
  reset(): void {
    this.processedMessageIds.clear();
    this.extractedMessages = [];
    this.isScrapingActive = false;
  }
}
