import { Page, Locator, Expect } from '@playwright/test';

/**
 * BasePage — Page Object Model (POM) base class for all E2E tests.
 *
 * Purpose:
 *  - Centralize common page operations (navigation, visibility checks, toast handling)
 *  - Provide reusable locator helpers
 *  - Ensure consistent wait/assertion patterns across tests
 *
 * Subclass extends BasePage and defines specific page locators via `pageLocators`.
 *
 * Example:
 *   class LoginPage extends BasePage {
 *     get username() { return this.page.getByLabel('Username'); }
 *     async login(user, pass) { await this.username.fill(user); ... }
 *   }
 *
 * T0.4: Implements common traits — goto, waitForLoad, dismissToasts, screenshotOnFailure.
 */
export abstract class BasePage {
    readonly page: Page;
    readonly expect: Expect;

    constructor(page: Page) {
        this.page = page;
        this.expect = expect;
    }

    /**
     * Navigate to a relative path within the configured baseURL.
     * Automatically waits for networkidle to settle SPAs.
     */
    async goto(path: string): Promise<void> {
        await this.page.goto(path);
        await this.waitForLoad();
    }

    /**
     * Wait for document readyState complete + network idle.
     * Override in subclasses for page-specific readiness (e.g., charts finish rendering).
     */
    async waitForLoad(): Promise<void> {
        await this.page.waitForLoadState('domcontentloaded');
        await this.page.waitForLoadState('networkidle');
    }

    /**
     * Assert page title contains expected text.
     */
    async expectTitleContains(text: string): Promise<void> {
        await this.expect(this.page).toHaveTitle(new RegExp(text));
    }

    /**
     * Assert an element is visible (assertion helper to avoid raw expect(page.locator()) everywhere).
     */
    async expectVisible(locator: Locator, description?: string): Promise<void> {
        await this.expect(locator).toBeVisible({ timeout: 5000 });
    }

    /**
     * Take a screenshot on demand (e.g., after a critical check).
     * Artifacts saved to playwright-report/ by default.
     */
    async capture(name: string): Promise<void> {
        await this.page.screenshot({ path: `test-results/${name}.png`, fullPage: false });
    }

    /**
     * Dismiss any outstanding toast notifications that might block next test step.
     * Called in afterEach hook automatically (via test fixture).
     */
    async dismissToasts(): Promise<void> {
        const toast = this.page.locator('[data-testid="toast-container"]');
        const count = await toast.count();
        if (count > 0) {
            await toast.first().click({ force: true });
        }
    }

    /**
     * Convenience: expect text content in an element by its role.
     */
    async expectRoleText(role: string, text: string): Promise<void> {
        await this.expect(this.page.getByRole(role)).toContainText(text);
    }

    /**
     * Convenience: fetch API response (XHR) with fetchOptions.
     */
    async waitForAPI(urlPattern: string | RegExp): Promise<any> {
        const [response] = await Promise.all([
            this.page.waitForResponse(urlPattern),
            // Triggering request happens in calling test method
        ]);
        return response.json();
    }
}
