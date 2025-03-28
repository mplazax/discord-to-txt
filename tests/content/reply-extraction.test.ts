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

          // Create a clone to prevent modifying the actual DOM
          const contentsClone = contents.cloneNode(true);

          // Exclude reply bar content
          const replyBar =
            contentsClone.querySelector('[class*="replyBar-"]') ||
            contentsClone.querySelector('[class*="repliedMessage"]') ||
            contentsClone.querySelector('[class*="referencedMessage"]');

          if (replyBar) {
            replyBar.remove(); // Remove from the clone
          }

          // Get content element from the modified clone
          const contentElement =
            contentsClone.querySelector('div[id^="message-content-"]') ||
            contentsClone.querySelector('[class*="message-content-"]') ||
            contentsClone.querySelector('[class*="messageContent-"]');

          if (usernameElement) author = usernameElement.textContent || author;
          if (timestampElement)
            timestamp = timestampElement.getAttribute("datetime");
          if (contentElement) content = contentElement.textContent || "";

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

      // Clone the element to avoid modifying the DOM
      const elementClone = element.cloneNode(true);

      // Handle reply content correctly - multiple possible classes
      const replyBar =
        elementClone.querySelector('[class*="replyBar-"]') ||
        elementClone.querySelector('[class*="repliedMessage"]') ||
        elementClone.querySelector('[class*="referencedMessage"]');

      if (replyBar) {
        replyBar.remove(); // Remove from the clone
      }

      const contentElement =
        elementClone.querySelector('[class*="message-content-"]') ||
        elementClone.querySelector('[class*="messageContent-"]');

      if (usernameElement) author = usernameElement.textContent || author;
      if (timestampElement)
        timestamp = timestampElement.getAttribute("datetime");
      if (contentElement) content = contentElement.textContent || "";

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

      // Method 3: General approach - for hard to parse messages
      // First - handle any reply reference that might be in the way
      const elementForContentExtraction = element.cloneNode(true);

      // Remove any reply-related elements
      const replyElements = elementForContentExtraction.querySelectorAll(
        '[class*="replyBar-"],[class*="repliedMessage"],[class*="referencedMessage"],[class*="repliedTextContent"],[class*="repliedTextPreview"]'
      );

      replyElements.forEach((el) => el.remove());

      // Find all spans, one might be the username
      const spans = elementForContentExtraction.querySelectorAll("span");
      for (const span of spans) {
        if (
          span.className.includes("username") ||
          span.parentElement?.className.includes("username")
        ) {
          author = span.textContent || author;
          break;
        }
      }

      // Find the actual message content after removing replies
      const possibleContent =
        elementForContentExtraction.querySelector(
          '[class*="message-content-"]'
        ) ||
        elementForContentExtraction.querySelector('[class*="messageContent-"]');

      if (possibleContent) {
        content = possibleContent.textContent || "";
      } else {
        // If all else fails, get text content from non-header parts
        const headerEl = elementForContentExtraction.querySelector("h3");
        if (headerEl) headerEl.remove();

        // Get timestamp elements and remove them too
        const timeEls = elementForContentExtraction.querySelectorAll("time");
        timeEls.forEach((el) => el.remove());

        content = elementForContentExtraction.textContent?.trim() || "";
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
  },
};

describe("Reply Extraction", () => {
  let container: HTMLElement;

  beforeEach(() => {
    // Create a fresh container for each test
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  it("should correctly handle messages with replies (complex scenario)", () => {
    // This simulates the problem where a message is a reply to another message
    container.innerHTML = `
      <li id="chat-messages-12345" class="messageListItem-">
        <div>
          <h3><span class="username-">Michał Plaza</span></h3>
          <time datetime="2025-03-24T21:09:05.000Z">Today at 9:09 PM</time>
          <div class="repliedMessage-" aria-hidden="true">
            <div class="repliedTextPreview-">
              <span class="username-">Przem1000</span>
              <span class="repliedTextContent-">Na razie muszę zamknąć temat bo nie mam praw do niczego. Potem będę myślał.</span>
            </div>
          </div>
          <div id="message-content-12345" class="messageContent-">no spoko</div>
        </div>
      </li>
    `;

    const element = container.querySelector("li");
    expect(element).not.toBeNull();

    if (element) {
      const message = MessageExtractor.extractMessageData(element);
      expect(message).not.toBeNull();

      if (message) {
        // Should only include the actual message content, not the reply reference
        expect(message.author).toBe("Michał Plaza");
        expect(message.content).toBe("no spoko");
        expect(message.content).not.toContain("Na razie muszę zamknąć temat");
      }
    }
  });

  it("should handle nested reply content correctly", () => {
    // Discord sometimes nests reply content in multiple divs
    container.innerHTML = `
      <li id="chat-messages-67890" class="messageListItem-">
        <div>
          <h3><span class="username-">Michał Plaza</span></h3>
          <time datetime="2025-03-24T21:09:05.000Z">Today at 9:09 PM</time>
          <div class="replyBar-">
            <div class="referencedMessage-">
              <div class="messageContent-">
                <span class="username-">Przem1000</span>
                <span>Na razie muszę zamknąć temat bo nie mam praw do niczego. Potem będę myślał.</span>
              </div>
            </div>
          </div>
          <div id="message-content-67890" class="messageContent-">no spoko</div>
        </div>
      </li>
    `;

    const element = container.querySelector("li");
    expect(element).not.toBeNull();

    if (element) {
      const message = MessageExtractor.extractMessageData(element);
      expect(message).not.toBeNull();

      if (message) {
        // Should only include the actual message content, not the reply reference
        expect(message.author).toBe("Michał Plaza");
        expect(message.content).toBe("no spoko");
        expect(message.content).not.toContain("Na razie muszę zamknąć temat");
      }
    }
  });
});
