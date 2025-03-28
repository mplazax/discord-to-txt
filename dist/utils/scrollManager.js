export class ScrollManager {
    /**
     * Scrolls the container to the top
     * @param container The scrollable container element
     * @returns Promise that resolves to true if scrolling was successful, false otherwise
     */
    async scrollUp(container) {
        if (!container) {
            return false;
        }
        container.scrollTop = 0;
        // Wait for the scroll event to complete
        return new Promise((resolve) => {
            setTimeout(() => resolve(true), 100);
        });
    }
    /**
     * Checks if the container is scrolled to the top
     * @param container The scrollable container element
     * @returns true if at the top (scrollTop === 0), false otherwise
     */
    isAtTop(container) {
        if (!container) {
            return false;
        }
        return container.scrollTop === 0;
    }
    /**
     * Waits for new content to load after scrolling
     * @param delay Time to wait in milliseconds
     * @returns Promise that resolves after the specified delay
     */
    waitForNewContent(delay = 1000) {
        return new Promise((resolve) => {
            setTimeout(() => resolve(), delay);
        });
    }
}
