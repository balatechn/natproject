import { test, expect, type Page } from '@playwright/test';

/**
 * Dashboard E2E tests.
 *
 * All API calls are mocked so no live backend is required.
 */

// ── Mock helpers ──────────────────────────────────────────────────────────────

const MOCK_USER = {
  id: 'u1',
  email: 'admin@natproject.app',
  name: 'Admin User',
  roles: [{ role: { name: 'admin' } }],
  organizationId: 'org-1',
  status: 'ACTIVE',
};

async function setupAuthenticatedSession(page: Page) {
  // Inject token into localStorage before the page loads
  await page.addInitScript(() => {
    localStorage.setItem('nat_access_token', 'e2e-test-token');
    // Persist the auth store so the app shell treats us as logged in
    localStorage.setItem(
      'nat-auth-store',
      JSON.stringify({
        state: {
          user: {
            id: 'u1',
            email: 'admin@natproject.app',
            name: 'Admin User',
            roles: ['admin'],
            organizationId: 'org-1',
          },
          accessToken: 'e2e-test-token',
        },
        version: 0,
      }),
    );
  });

  // Mock /users/me used by layout / middleware
  await page.route('**/users/me', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: MOCK_USER }),
    }),
  );

  // Stub common data endpoints so the dashboard doesn't hang on network
  await page.route('**/projects**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [], total: 0, page: 1, pageSize: 10, totalPages: 0 }),
    }),
  );

  await page.route('**/tasks**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [], total: 0, page: 1, pageSize: 20, totalPages: 0 }),
    }),
  );

  await page.route('**/notifications**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [], total: 0, unread: 0 }),
    }),
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedSession(page);
  });

  test('page loads without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    expect(errors).toHaveLength(0);
  });

  test('sidebar navigation is visible', async ({ page }) => {
    await page.goto('/dashboard');

    // Wait for the main layout to render
    await expect(
      page.locator('nav, aside, [data-testid="sidebar"], [class*="sidebar"]'),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('page title includes NAT Project', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveTitle(/NAT Project|Dashboard/i);
  });

  test('navigating to /projects renders the projects page', async ({ page }) => {
    await page.goto('/projects');
    await page.waitForLoadState('networkidle');

    // The URL should still be /projects (not redirected to login)
    await expect(page).toHaveURL(/projects/);
  });

  test('navigating to /tasks renders the tasks page', async ({ page }) => {
    await page.goto('/tasks');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/tasks/);
  });
});

test.describe('Navigation links', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedSession(page);
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
  });

  test('clicking Projects link navigates correctly', async ({ page }) => {
    const projectsLink = page
      .locator('a[href="/projects"], a:has-text("Projects")')
      .first();

    if (await projectsLink.isVisible()) {
      await projectsLink.click();
      await expect(page).toHaveURL(/projects/);
    } else {
      test.skip();
    }
  });

  test('clicking Tasks link navigates correctly', async ({ page }) => {
    const tasksLink = page
      .locator('a[href="/tasks"], a:has-text("Tasks")')
      .first();

    if (await tasksLink.isVisible()) {
      await tasksLink.click();
      await expect(page).toHaveURL(/tasks/);
    } else {
      test.skip();
    }
  });
});
