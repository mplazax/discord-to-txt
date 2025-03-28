import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ContentScript } from "../../src/content/contentScript";
import { MessageExtractor } from "../../src/utils/messageExtractor";
import { ScrollManager } from "../../src/utils/scrollManager";

// Mock the dependencies
vi.mock("../../src/utils/messageExtractor");
vi.mock("../../src/utils/scrollManager");

describe("ContentScript", () => {
  let contentScript: ContentScript;
  let mockMessageExtractor: MessageExtractor;
  let mockScrollManager: ScrollManager;
  let mockMessageContainer: HTMLElement;
  let mockMessageList: HTMLElement;
  let mockMessages: HTMLElement[];

  beforeEach(() => {
    // Setup DOM elements
    mockMessageContainer = document.createElement("div");
    mockMessageContainer.className = "scroller";

    mockMessageList = document.createElement("ol");
    mockMessageList.setAttribute("data-list-id", "chat-messages");
    mockMessageContainer.appendChild(mockMessageList);

    // Create mock messages
    mockMessages = Array.from({ length: 3 }).map((_, i) => {
      const message = document.createElement("li");
      message.id = `chat-messages-${i}`;
      mockMessageList.appendChild(message);
      return message;
    });

    // Add to document
    document.body.appendChild(mockMessageContainer);

    // Create mocks
    mockMessageExtractor = {
      extractMessageData: vi.fn(),
      formatMessageForExport: vi.fn(),
    } as unknown as MessageExtractor;

    mockScrollManager = {
      scrollUp: vi.fn(),
      isAtTop: vi.fn(),
      waitForNewContent: vi.fn(),
    } as unknown as ScrollManager;

    // Initialize content script with mocks
    contentScript = new ContentScript(mockMessageExtractor, mockScrollManager);

    // Setup message extraction mock responses
    mockMessages.forEach((msg, i) => {
      vi.mocked(mockMessageExtractor.extractMessageData).mockReturnValueOnce({
        id: `chat-messages-${i}`,
        author: `User${i}`,
        timestamp: `2024-03-24T22:05:${i}0.000Z`,
        content: `Message content ${i}`,
      });
    });

    // Setup scroll manager mock responses
    vi.mocked(mockScrollManager.scrollUp).mockResolvedValue(true);
    vi.mocked(mockScrollManager.isAtTop).mockReturnValue(false);
    vi.mocked(mockScrollManager.waitForNewContent).mockResolvedValue();
  });

  afterEach(() => {
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  describe("initialize", () => {
    it("should find message container and message list", () => {
      const result = contentScript.initialize();
      expect(result).toBe(true);
      expect(contentScript["messageContainer"]).toBe(mockMessageContainer);
      expect(contentScript["messageList"]).toBe(mockMessageList);
    });

    it("should return false if elements not found", () => {
      document.body.innerHTML = "";
      const result = contentScript.initialize();
      expect(result).toBe(false);
    });
  });

  describe("extractVisibleMessages", () => {
    it("should extract visible messages and avoid duplicates", async () => {
      contentScript.initialize();

      // First extraction
      let result = await contentScript.extractVisibleMessages();
      expect(result).toBe(3); // Should extract 3 messages
      expect(mockMessageExtractor.extractMessageData).toHaveBeenCalledTimes(3);

      // Reset mock to simulate a second extraction with same messages
      vi.mocked(mockMessageExtractor.extractMessageData).mockClear();
      mockMessages.forEach((msg, i) => {
        vi.mocked(mockMessageExtractor.extractMessageData).mockReturnValueOnce({
          id: `chat-messages-${i}`,
          author: `User${i}`,
          timestamp: `2024-03-24T22:05:${i}0.000Z`,
          content: `Message content ${i}`,
        });
      });

      // Second extraction should find 0 new messages as they're already processed
      result = await contentScript.extractVisibleMessages();
      expect(result).toBe(0);
    });
  });

  describe("scrapeConversation", () => {
    it("should scroll and extract messages until reaching the top", async () => {
      contentScript.initialize();

      // Mock that we reach the top after two scroll attempts
      vi.mocked(mockScrollManager.isAtTop)
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(true);

      await contentScript.scrapeConversation();

      expect(mockScrollManager.scrollUp).toHaveBeenCalledTimes(2);
      expect(mockScrollManager.waitForNewContent).toHaveBeenCalledTimes(2);
      expect(mockMessageExtractor.extractMessageData).toHaveBeenCalledTimes(3);

      // Check the exported data
      const exportedData = contentScript.getExportedData();
      expect(exportedData.messageCount).toBe(3);
      expect(exportedData.messages.length).toBe(3);
    });

    it("should handle empty conversation gracefully", async () => {
      // Empty message list
      mockMessageList.innerHTML = "";
      contentScript.initialize();

      // Mock that we're already at the top
      vi.mocked(mockScrollManager.isAtTop).mockReturnValue(true);

      await contentScript.scrapeConversation();

      expect(mockScrollManager.scrollUp).not.toHaveBeenCalled();
      expect(mockMessageExtractor.extractMessageData).not.toHaveBeenCalled();

      const exportedData = contentScript.getExportedData();
      expect(exportedData.messageCount).toBe(0);
      expect(exportedData.messages.length).toBe(0);
    });
  });

  describe("formatExportText", () => {
    it("should format messages for export", async () => {
      contentScript.initialize();

      // Setup formatMessageForExport mock
      mockMessages.forEach((_, i) => {
        vi.mocked(
          mockMessageExtractor.formatMessageForExport
        ).mockReturnValueOnce(
          `[2024-03-24 22:05:${i}0] User${i}: Message content ${i}`
        );
      });

      // Extract messages first
      await contentScript.extractVisibleMessages();

      // Now format the text
      const text = contentScript.formatExportText();
      expect(text).toBe(
        "[2024-03-24 22:05:00] User0: Message content 0\n" +
          "[2024-03-24 22:05:10] User1: Message content 1\n" +
          "[2024-03-24 22:05:20] User2: Message content 2"
      );
      expect(mockMessageExtractor.formatMessageForExport).toHaveBeenCalledTimes(
        3
      );
    });

    it("should return empty string for no messages", () => {
      const text = contentScript.formatExportText();
      expect(text).toBe("");
    });
  });
});
