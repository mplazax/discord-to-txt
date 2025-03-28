interface MessageData {
  id: string;
  author: string;
  timestamp: string | null;
  content: string;
}

export class MessageExtractor {
  extractMessageData(element: Element): MessageData | null {
    // Generate a unique ID for this message
    const id =
      element.id ||
      `message-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Try different ways to extract the message content
    let author = "Unknown User";
    let timestamp: string | null = null;
    let content = "";

    try {
      // Method 1: Standard Discord message structure
      if (element.id.startsWith("chat-messages-")) {
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
  }

  formatMessageForExport(message: MessageData): string {
    let formattedTimestamp = "Unknown time";

    if (message.timestamp) {
      const date = new Date(message.timestamp);
      // Format the date exactly as expected in test
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
