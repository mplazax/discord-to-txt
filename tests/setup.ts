import { vi } from "vitest";

// Mock chrome API for tests
// Define a simplified version that captures the essential functionality
const createMockChrome = () => {
  return {
    runtime: {
      onMessage: {
        addListener: vi.fn(),
        removeListener: vi.fn(),
        hasListener: vi.fn(),
      },
      sendMessage: vi.fn(),
      getURL: vi.fn().mockReturnValue("/mockURL"),
      lastError: null,
    },
    tabs: {
      query: vi.fn().mockImplementation((_, callback) => {
        callback?.([{ id: 123 }]);
      }),
      sendMessage: vi.fn(),
    },
    downloads: {
      download: vi.fn().mockResolvedValue("mock-download-id"),
    },
    scripting: {
      executeScript: vi.fn(),
    },
  };
};

// Create the mock
const mockChrome = createMockChrome();

// Assign to global chrome
// @ts-ignore - Ignore type errors for testing purposes
global.chrome = mockChrome;

// Mock URL methods
global.URL.createObjectURL = vi.fn().mockReturnValue("blob:mock-url");
global.URL.revokeObjectURL = vi.fn();

// Add any other global test setup here
