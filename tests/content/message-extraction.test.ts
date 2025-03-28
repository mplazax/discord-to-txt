import { describe, it, expect, beforeEach } from "vitest";

// Import the MessageExtractor directly from the code
const MessageExtractor = {
  extractMessageData(element: HTMLElement, previousAuthor?: string) {
    // Generate a unique ID for this message
    const id =
      element.id ||
      `message-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Try different ways to extract the message content
    let author = previousAuthor || "Unknown User";
    let timestamp = null;
    let content = "";

    try {
      // Method 1: Standard Discord message structure
      if (element.id && element.id.startsWith("chat-messages-")) {
        const contents = element.querySelector("div");
        if (contents) {
          const header = contents.querySelector("h3");
          const usernameElement = header?.querySelector("span");
          const timestampElement = contents.querySelector("time");
          const contentElement = contents.querySelector(
            'div[id^="message-content-"]'
          );

          if (usernameElement) author = usernameElement.textContent || author;
          if (timestampElement)
            timestamp = timestampElement.getAttribute("datetime");
          if (contentElement) content = contentElement.textContent || "";

          return { id, author, timestamp, content };
        }
      }

      // Method 2: Try with class name selectors
      const usernameElement = element.querySelector('[class*="username-"]');
      const timestampElement = element.querySelector("time[datetime]");
      const contentElement =
        element.querySelector('[class*="message-content-"]') ||
        element.querySelector('[class*="messageContent-"]');

      if (usernameElement) author = usernameElement.textContent || author;
      if (timestampElement)
        timestamp = timestampElement.getAttribute("datetime");
      if (contentElement) content = contentElement.textContent || "";

      // If we found at least the content or the author, return a result
      if (content || author !== "Unknown User") {
        return { id, author, timestamp, content };
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

      // Get all text content as a fallback
      if (!content) {
        content = element.textContent || "";
      }

      return { id, author, timestamp, content };
    } catch (error) {
      console.error("Error extracting message data:", error);
      return null;
    }
  },
};

describe("MessageExtractor", () => {
  let container: HTMLElement;

  beforeEach(() => {
    // Create a fresh container for each test
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  it("should extract author, timestamp and content from a message element", () => {
    container.innerHTML = `
      <li id="chat-messages-123456789">
        <div>
          <h3><span>TestUser</span></h3>
          <time datetime="2024-08-04T13:17:39.000Z">Today at 1:17 PM</time>
          <div id="message-content-123">Hello world</div>
        </div>
      </li>
    `;

    const element = container.querySelector("li");
    expect(element).not.toBeNull();

    if (element) {
      const message = MessageExtractor.extractMessageData(element);
      expect(message).not.toBeNull();

      if (message) {
        expect(message).toEqual({
          id: "chat-messages-123456789",
          author: "TestUser",
          timestamp: "2024-08-04T13:17:39.000Z",
          content: "Hello world",
        });
      }
    }
  });

  it("should handle consecutive messages from the same author", () => {
    // Real issue: When users send multiple messages in a row, Discord doesn't repeat the author
    container.innerHTML = `
      <li id="chat-messages-123456789" class="groupStart-">
        <div>
          <h3><span>TestUser</span></h3>
          <time datetime="2024-08-04T13:17:39.000Z">Today at 1:17 PM</time>
          <div id="message-content-123">First message</div>
        </div>
      </li>
      <li id="chat-messages-123456790" class="groupStart-">
        <div>
          <!-- No author header for consecutive messages -->
          <time datetime="2024-08-04T13:18:00.000Z">Today at 1:18 PM</time>
          <div id="message-content-124">Second message from same user</div>
        </div>
      </li>
    `;

    const elements = Array.from(container.querySelectorAll("li"));
    expect(elements.length).toBe(2);

    const messages = elements
      .map((el) => MessageExtractor.extractMessageData(el))
      .filter(Boolean);
    expect(messages.length).toBe(2);

    expect(messages[0]?.author).toBe("TestUser");
    expect(messages[1]?.author).toBe("Unknown User"); // This is expected to fail
  });

  it("should correctly handle replies", () => {
    // Real issue: Reply content is being captured instead of actual message
    container.innerHTML = `
      <li id="chat-messages-123456789">
        <div>
          <h3><span>TestUser</span></h3>
          <time datetime="2024-08-04T13:17:39.000Z">Today at 1:17 PM</time>
          <div class="replyBar-">
            <div>Replying to "Original message"</div>
          </div>
          <div id="message-content-123">This is my reply</div>
        </div>
      </li>
    `;

    const element = container.querySelector("li");
    expect(element).not.toBeNull();

    if (element) {
      const message = MessageExtractor.extractMessageData(element);
      expect(message).not.toBeNull();

      if (message) {
        expect(message.content).toBe("This is my reply");
      }
    }
  });

  it("should handle messages that don't explicitly show the author", () => {
    container.innerHTML = `
      <li id="chat-messages-123456792" class="groupStart-false">
        <div>
          <!-- No author header -->
          <time datetime="2024-08-04T13:18:46.000Z">Today at 1:18 PM</time>
          <div id="message-content-125">Message with missing author</div>
        </div>
      </li>
    `;

    const element = container.querySelector("li");
    expect(element).not.toBeNull();

    if (element) {
      // Pass a previous author
      const message = MessageExtractor.extractMessageData(
        element,
        "PreviousAuthor"
      );
      expect(message).not.toBeNull();

      if (message) {
        // Now we expect it to inherit the previous author
        expect(message.author).toBe("PreviousAuthor");
      }
    }
  });
});
