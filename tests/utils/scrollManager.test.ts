import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ScrollManager } from "../../src/utils/scrollManager";

describe("ScrollManager", () => {
  let scrollManager: ScrollManager;
  let mockContainer: HTMLElement;

  beforeEach(() => {
    // Setup mock scroll container
    mockContainer = document.createElement("div");
    Object.defineProperty(mockContainer, "scrollHeight", { value: 1000 });
    Object.defineProperty(mockContainer, "scrollTop", {
      value: 500,
      writable: true,
    });

    scrollManager = new ScrollManager();

    // Mock setTimeout
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe("scrollUp", () => {
    it("should set scrollTop to 0", async () => {
      const result = scrollManager.scrollUp(mockContainer);

      // Advance timers to complete the scroll
      await vi.runAllTimersAsync();

      expect(mockContainer.scrollTop).toBe(0);
      await expect(result).resolves.toBe(true);
    });

    it("should return false if container is null", async () => {
      const result = scrollManager.scrollUp(null);
      await expect(result).resolves.toBe(false);
    });
  });

  describe("isAtTop", () => {
    it("should return true if scrollTop is 0", () => {
      mockContainer.scrollTop = 0;
      const result = scrollManager.isAtTop(mockContainer);
      expect(result).toBe(true);
    });

    it("should return false if scrollTop is greater than 0", () => {
      mockContainer.scrollTop = 10;
      const result = scrollManager.isAtTop(mockContainer);
      expect(result).toBe(false);
    });

    it("should return false if container is null", () => {
      const result = scrollManager.isAtTop(null);
      expect(result).toBe(false);
    });
  });

  describe("waitForNewContent", () => {
    it("should resolve after the specified delay", async () => {
      const startTime = Date.now();
      const promise = scrollManager.waitForNewContent(1000);

      // Advance timers
      await vi.advanceTimersByTimeAsync(1000);

      await promise;
      expect(Date.now() - startTime).toBeGreaterThanOrEqual(1000);
    });
  });
});
