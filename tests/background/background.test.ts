import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { BackgroundService } from "../../src/background/background";

// Mock URL.createObjectURL before tests
global.URL.createObjectURL = vi.fn().mockReturnValue("blob:mock-url");
global.URL.revokeObjectURL = vi.fn();

describe("BackgroundService", () => {
  let backgroundService: BackgroundService;

  beforeEach(() => {
    // Create a new instance for each test
    backgroundService = new BackgroundService();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("initialize", () => {
    it("should set up message listeners", () => {
      backgroundService.initialize();
      expect(chrome.runtime.onMessage.addListener).toHaveBeenCalledTimes(1);
    });
  });

  describe("handleMessage", () => {
    beforeEach(() => {
      backgroundService.initialize();
    });

    it("should start download process when receiving startDownload message", () => {
      const spy = vi.spyOn(backgroundService as any, "startDownloadProcess");

      // Get the listener that was registered
      const listener = (chrome.runtime.onMessage.addListener as any).mock
        .calls[0][0];

      // Call the listener directly
      listener(
        { action: "startDownload", tabId: 123 },
        { tab: { id: 123 } },
        vi.fn()
      );

      expect(spy).toHaveBeenCalledWith(123);
    });

    it("should process data chunk when receiving dataChunk message", () => {
      const spy = vi.spyOn(backgroundService as any, "processDataChunk");
      const message = {
        action: "dataChunk",
        data: [
          {
            id: "1",
            author: "User",
            timestamp: "2024-03-24T22:05:00.000Z",
            content: "Hello",
          },
        ],
      };

      // Get the listener that was registered
      const listener = (chrome.runtime.onMessage.addListener as any).mock
        .calls[0][0];

      // Call the listener directly
      listener(message, { tab: { id: 123 } }, vi.fn());

      expect(spy).toHaveBeenCalledWith(123, message.data);
    });

    it("should complete download when receiving scrapingComplete message", () => {
      const spy = vi.spyOn(backgroundService as any, "completeDownload");

      // Get the listener that was registered
      const listener = (chrome.runtime.onMessage.addListener as any).mock
        .calls[0][0];

      // Call the listener directly
      listener({ action: "scrapingComplete" }, { tab: { id: 123 } }, vi.fn());

      expect(spy).toHaveBeenCalledWith(123);
    });
  });

  describe("startDownloadProcess", () => {
    it("should send scrapeConversation message to content script", async () => {
      await (backgroundService as any).startDownloadProcess(123);

      expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(
        123,
        { action: "scrapeConversation" },
        expect.any(Function)
      );
    });
  });

  describe("processDataChunk", () => {
    it("should store message data for the tab", () => {
      const tabId = 123;
      const data = [
        {
          id: "1",
          author: "User1",
          timestamp: "2024-03-24T22:05:00.000Z",
          content: "Hello",
        },
        {
          id: "2",
          author: "User2",
          timestamp: "2024-03-24T22:06:00.000Z",
          content: "World",
        },
      ];

      (backgroundService as any).processDataChunk(tabId, data);

      // Verify the data is stored
      expect((backgroundService as any).conversationData[tabId]).toEqual(data);
    });

    it("should append to existing data for the tab", () => {
      const tabId = 123;
      const initialData = [
        {
          id: "1",
          author: "User1",
          timestamp: "2024-03-24T22:05:00.000Z",
          content: "Hello",
        },
      ];
      const newData = [
        {
          id: "2",
          author: "User2",
          timestamp: "2024-03-24T22:06:00.000Z",
          content: "World",
        },
      ];

      // Set initial data
      (backgroundService as any).conversationData[tabId] = initialData;

      // Process new data
      (backgroundService as any).processDataChunk(tabId, newData);

      // Verify data is combined
      expect((backgroundService as any).conversationData[tabId]).toEqual([
        ...initialData,
        ...newData,
      ]);
    });
  });

  describe("completeDownload", () => {
    it("should create and download a formatted text file", async () => {
      const tabId = 123;
      const mockData = [
        {
          id: "1",
          author: "User1",
          timestamp: "2024-03-24T22:05:00.000Z",
          content: "Hello",
        },
        {
          id: "2",
          author: "User2",
          timestamp: "2024-03-24T22:06:00.000Z",
          content: "World",
        },
      ];

      // Set mock data
      (backgroundService as any).conversationData[tabId] = mockData;

      // Complete the download
      await (backgroundService as any).completeDownload(tabId);

      // Verify download was initiated
      expect(chrome.downloads.download).toHaveBeenCalledWith({
        url: "blob:mock-url",
        filename: expect.stringContaining("discord-conversation-"),
        saveAs: true,
      });

      // Verify data is cleaned up
      expect(
        (backgroundService as any).conversationData[tabId]
      ).toBeUndefined();
      expect((backgroundService as any).downloadInProgress[tabId]).toBe(false);
    });

    it("should handle case with no data", async () => {
      const tabId = 123;
      // Don't set any data for this tab

      // Try to complete the download
      await (backgroundService as any).completeDownload(tabId);

      // Should not attempt to download with no data
      expect(chrome.downloads.download).not.toHaveBeenCalled();
    });
  });
});
