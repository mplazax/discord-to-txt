export class MessageExtractor {
    extractMessageData(element) {
        if (!element.id.startsWith("chat-messages-")) {
            return null;
        }
        const contents = element.querySelector("div");
        if (!contents) {
            return null;
        }
        const header = contents.querySelector("h3");
        const username = header?.querySelector("span");
        const timestamp = contents.querySelector("time");
        const content = contents.querySelector('div[id^="message-content-"]');
        return {
            id: element.id,
            author: username?.textContent || "Unknown User",
            timestamp: timestamp?.getAttribute("datetime") || null,
            content: content?.textContent || "",
        };
    }
    formatMessageForExport(message) {
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
