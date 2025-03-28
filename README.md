# Discord Conversation Exporter

A Chrome extension that allows you to export Discord conversations to a TXT file. The extension automatically scrolls through the conversation history to load older messages before exporting.

## Features

- Export entire conversation history as a plain text file
- Automatic scrolling to load older messages
- Progress indication while scrolling and exporting
- Works with both DMs and channel conversations
- Preserves timestamps and author information

## Installation

### From Source

1. Clone this repository:

   ```
   git clone https://github.com/yourusername/discord-to-txt.git
   cd discord-to-txt
   ```

2. Install dependencies:

   ```
   npm install
   ```

3. Build the extension:

   ```
   npm run build
   ```

4. Load the extension in Chrome:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" in the top right
   - Click "Load unpacked" and select the `dist` folder from this project

## Usage

1. Navigate to a Discord conversation in Chrome (e.g., https://discord.com/channels/...)
2. Click the Discord Conversation Exporter icon in your browser toolbar
3. Click the "Download Conversation" button in the popup
4. Wait while the extension scrolls through the conversation to load older messages
5. When the process is complete, a .txt file will be downloaded

## Development

- Run tests: `npm test`
- Build for production: `npm run build`
- Build for development with watch mode: `npm run dev`

## How It Works

The extension:

1. Injects a content script into Discord pages
2. When activated, it scrolls to the top of the conversation to load older messages
3. Extracts message data including timestamps, authors, and content
4. Formats the data and initiates a download as a TXT file

## License

[MIT](LICENSE)
