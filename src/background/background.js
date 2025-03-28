/**
 * This is the entry point for the background service worker.
 * It initializes the BackgroundService class which handles background processing.
 */
import { BackgroundService } from "./background.ts";

// This file should only be included in the actual extension build, not in tests
// Conditionally initialize only if we're in a browser context
if (typeof chrome !== "undefined" && chrome.runtime) {
  // Create and initialize the background service
  const backgroundService = new BackgroundService();
  backgroundService.initialize();

  // Log that the background service has started
  console.log("Discord Conversation Exporter background service started");
}
