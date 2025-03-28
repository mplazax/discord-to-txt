import { describe, it, expect, vi, beforeEach } from "vitest";
import { PopupManager } from "../../src/popup/popup";

describe("PopupManager", () => {
  let popupManager: PopupManager;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Set up DOM
    document.body.innerHTML = `
      <div id="status">Ready</div>
      <button id="downloadButton">Download Conversation</button>
    `;

    // Create a new instance
    popupManager = new PopupManager();
  });

  it("initializes with message listeners", () => {
    popupManager.initialize();
    expect(chrome.runtime.onMessage.addListener).toHaveBeenCalled();
  });

  it("handles status update messages", () => {
    // First set up the elements
    (popupManager as any).statusElement = document.getElementById("status");
    (popupManager as any).downloadButton = document.getElementById(
      "downloadButton"
    ) as HTMLButtonElement;

    // Test status update
    (popupManager as any).handleStatusUpdate({
      action: "progressUpdate",
      status: "Test Status",
    });

    expect(document.getElementById("status")!.textContent).toBe("Test Status");
  });

  it("handles completion messages", () => {
    // Set up the elements
    (popupManager as any).statusElement = document.getElementById("status");
    (popupManager as any).downloadButton = document.getElementById(
      "downloadButton"
    ) as HTMLButtonElement;

    // Disable the button
    (popupManager as any).downloadButton.disabled = true;

    // Test complete message
    (popupManager as any).handleStatusUpdate({
      action: "progressUpdate",
      status: "Complete",
      complete: true,
    });

    expect(
      (document.getElementById("downloadButton") as HTMLButtonElement).disabled
    ).toBe(false);
  });
});
