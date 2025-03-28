/**
 * This is the entry point for the popup UI.
 * It initializes the PopupManager which handles all popup interactions.
 */
import { PopupManager } from "./popup.ts";

// Only initialize in a browser context, not during tests
if (typeof chrome !== "undefined" && chrome.runtime) {
  // Initialize the popup UI
  const popupManager = new PopupManager();
  popupManager.initialize();
}
