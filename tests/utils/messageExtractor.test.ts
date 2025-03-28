import { describe, it, expect, beforeEach } from "vitest";
import { MessageExtractor } from "../../src/utils/messageExtractor";

describe("MessageExtractor", () => {
  let extractor: MessageExtractor;

  beforeEach(() => {
    extractor = new MessageExtractor();
  });

  describe("extractMessageData", () => {
    it("should extract message data from a valid message element", () => {
      const messageElement = document.createElement("li");
      messageElement.id = "chat-messages-123";

      const contents = document.createElement("div");
      const header = document.createElement("h3");
      const username = document.createElement("span");
      username.textContent = "TestUser";
      header.appendChild(username);

      const timestamp = document.createElement("time");
      timestamp.setAttribute("datetime", "2024-03-24T22:05:24.000Z");

      const content = document.createElement("div");
      content.id = "message-content-123";
      content.textContent = "Test message content";

      contents.appendChild(header);
      contents.appendChild(timestamp);
      contents.appendChild(content);
      messageElement.appendChild(contents);

      const result = extractor.extractMessageData(messageElement);

      expect(result).toEqual({
        id: "chat-messages-123",
        author: "TestUser",
        timestamp: "2024-03-24T22:05:24.000Z",
        content: "Test message content",
      });
    });

    it("should return null for invalid message element", () => {
      const invalidElement = document.createElement("div");
      const result = extractor.extractMessageData(invalidElement);
      expect(result).toBeNull();
    });

    it("should handle missing timestamp", () => {
      const messageElement = document.createElement("li");
      messageElement.id = "chat-messages-123";

      const contents = document.createElement("div");
      const header = document.createElement("h3");
      const username = document.createElement("span");
      username.textContent = "TestUser";
      header.appendChild(username);

      const content = document.createElement("div");
      content.id = "message-content-123";
      content.textContent = "Test message content";

      contents.appendChild(header);
      contents.appendChild(content);
      messageElement.appendChild(contents);

      const result = extractor.extractMessageData(messageElement);

      expect(result).toEqual({
        id: "chat-messages-123",
        author: "TestUser",
        timestamp: null,
        content: "Test message content",
      });
    });
  });

  describe("formatMessageForExport", () => {
    it("should format message data correctly for export", () => {
      const messageData = {
        id: "chat-messages-123",
        author: "TestUser",
        timestamp: "2024-03-24T22:05:24.000Z",
        content: "Test message content",
      };

      const result = extractor.formatMessageForExport(messageData);
      expect(result).toBe(
        "[2024-03-24 22:05:24] TestUser: Test message content"
      );
    });

    it("should handle message without timestamp", () => {
      const messageData = {
        id: "chat-messages-123",
        author: "TestUser",
        timestamp: null,
        content: "Test message content",
      };

      const result = extractor.formatMessageForExport(messageData);
      expect(result).toBe("[Unknown time] TestUser: Test message content");
    });
  });
});
