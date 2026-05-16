import { test, expect } from '@playwright/test';

/**
 * Authentication E2E tests.
 *
 * Network calls to the backend are intercepted with page.route() so the
 * tests run without a live API server.
 */

test.describe('Login page', () => {
  test('renders all required fields', async ({ page }) => {
    await page.goto('/login');

    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('shows validation error for invalid email format', async ({ page }) => {
    await page.goto('/login');

    await page.locator('input[type="email"], input[name="email"]').fill('not-an-email');
    await page.locator('input[type="password"]').fill('pass');
    await page.getByRole('button', { name: /sign in/i }).click();

    await expect(page.getByText(/invalid email/i)).toBeVisible();
  });

  test('shows error toast on invalid credentials', async ({ page }) => {
    // Mock the login endpoint to return 401
    await page.route('**/auth/login', (route) =>
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ statusCode: 401, message: 'Invalid email or password' }),
      }),
    );

    await page.goto('/login');
    await page.locator('input[type="email"], input[name="email"]').fill('wrong@example.com');
    await page.locator('input[type="password"]').fill('wrongpassword');
    await page.getByRole('button', { name: /sign in/i }).click();

    // Error toast or inline message should appear
    await expect(
      page.getByText(/invalid credentials|login failed|invalid email or password/i),
    ).toBeVisible({ timeout: 5_000 });
  });

  test('redirects to /dashboard on successful login', async ({ page }) => {
    // Mock successful login
    await page.route('**/auth/login', (route) =>
      route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            accessToken: 'test-access-token',
            refreshToken: 'test-refresh-token',
            expiresIn: 900,
            user: {
              id: 'u1',
              email: 'admin@natproject.app',
              name: 'Admin User',
              roles: ['admin'],
              organizationId: 'org-1',
            },
          },
        }),
      }),
    );

    // Mock the /users/me used by the app shell after login
    await page.route('**/users/me', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            id: 'u1',
            email: 'admin@natproject.app',
            name: 'Admin User',
            roles: [{ role: { name: 'admin' } }],
          },
        }),
      }),
    );

    await page.goto('/login');
    await page.locator('input[type="email"], input[name="email"]').fill('admin@natproject.app');
    await page.locator('input[type="password"]').fill('Admin@123');
    await page.getByRole('button', { name: /sign in/i }).click();

    await expect(page).toHaveURL(/dashboard/, { timeout: 8_000 });
  });

  test('has a link to the registration page', async ({ page }) => {
    await page.goto('/login');
    const registerLink = page.getByRole('link', { name: /register|sign up|create account/i });
    await expect(registerLink).toBeVisible();
  });
});

test.describe('Route protection', () => {
  test('unauthenticated visit to /dashboard redirects to /login', async ({ page }) => {
    // Clear any persisted auth state
    await page.context().clearCookies();
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/login/);
  });

  test('unauthenticated visit to /projects redirects to /login', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/projects');
    await expect(page).toHaveURL(/login/);
  });
});
