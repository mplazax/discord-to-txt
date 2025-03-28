import { MessageExtractor } from "../utils/messageExtractor";
import { ScrollManager } from "../utils/scrollManager";
export class ContentScript {
    constructor(messageExtractor = new MessageExtractor(), scrollManager = new ScrollManager()) {
        this.messageExtractor = messageExtractor;
        this.scrollManager = scrollManager;
        this.messageContainer = null;
        this.messageList = null;
        this.processedMessageIds = new Set();
        this.extractedMessages = [];
        this.isScrapingActive = false;
    }
    /**
     * Initializes the content script by finding necessary elements
     * @returns true if initialization successful, false otherwise
     */
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
            }
            console.log("Message container:", this.messageContainer);
            console.log("Message list:", this.messageList);
            // Return true only if both elements were found
            return !!(this.messageContainer && this.messageList);
        }
        catch (error) {
            console.error("Error initializing ContentScript:", error);
            return false;
        }
    }
    /**
     * Extracts visible messages in the current view
     * @returns Number of new messages found
     */
    async extractVisibleMessages() {
        if (!this.messageList) {
            return 0;
        }
        // Find all message elements - try multiple selectors
        const messageElements = this.messageList.querySelectorAll('li[id^="chat-messages-"]') ||
            this.messageList.querySelectorAll('[class*="message-"]');
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
            while (!this.scrollManager.isAtTop(this.messageContainer) &&
                scrollAttempts < maxScrollAttempts) {
                // Scroll up
                await this.scrollManager.scrollUp(this.messageContainer);
                // Wait for new content to load
                await this.scrollManager.waitForNewContent();
                // Increment scroll attempts
                scrollAttempts++;
            }
        }
        catch (error) {
            console.error("Error while scraping conversation:", error);
        }
        finally {
            this.isScrapingActive = false;
        }
    }
    /**
     * Formats the extracted messages for export
     * @returns Formatted text string
     */
    formatExportText() {
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
    getExportedData() {
        return {
            messageCount: this.extractedMessages.length,
            messages: [...this.extractedMessages],
        };
    }
    /**
     * Resets the scraping state
     */
    reset() {
        this.processedMessageIds.clear();
        this.extractedMessages = [];
        this.isScrapingActive = false;
    }
}
