import { expect, test } from "@playwright/test";

/**
 * The full happy path, using the memory driver's fake Google sign-in:
 * home → product → cart → checkout (sign in) → place order → confirmation.
 */
test("a shopper can sign in and place an order", async ({ page }) => {
  await page.goto("/shop/ceramic-pour-over-set");
  await expect(page.getByRole("heading", { level: 1, name: "Ceramic Pour-Over Set" })).toBeVisible();

  await page.getByRole("button", { name: "Add to cart", exact: true }).click();
  await expect(page.getByText("Ceramic Pour-Over Set added to your cart")).toBeVisible();

  // Cart → checkout.
  await page.goto("/cart");
  await expect(page.getByLabel("Ceramic Pour-Over Set quantity")).toHaveValue("1");
  await page.getByRole("link", { name: "Proceed to checkout" }).click();

  // Checkout requires sign-in and remembers where to come back to.
  await expect(page).toHaveURL(/\/sign-in\?next=%2Fcheckout/);
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  await page.getByRole("button", { name: "Continue with Google" }).click();

  // The memory provider signs in as shopper@example.com and returns us to checkout.
  await expect(page).toHaveURL(/\/checkout$/);
  await expect(page.getByLabel("Full name")).toHaveValue("Shopper");
  await expect(page.getByLabel("Email")).toHaveValue("shopper@example.com");

  await page.getByLabel("Address").fill("1 Analytical Street");
  await page.getByLabel("City").fill("London");
  await page.getByLabel("State / region").fill("Greater London");
  await page.getByLabel("Postal code").fill("N1 1AA");
  await page.getByLabel("Country").fill("United Kingdom");

  await page.getByRole("button", { name: "Place order" }).click();

  // Confirmation.
  await expect(page).toHaveURL(/\/orders\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(/Thank you, Shopper/);
  await expect(page.getByText("Ceramic Pour-Over Set")).toBeVisible();
  await expect(page.getByText("$56.00").first()).toBeVisible();
  await expect(page.getByText(/confirmation email is on its way to shopper@example.com/)).toBeVisible();

  // The confirmation page shows the shipping address we entered.
  await expect(page.getByText("1 Analytical Street")).toBeVisible();

  // The cart is emptied after a successful order.
  await page.goto("/cart");
  await expect(page.getByRole("heading", { name: "Your cart is empty" })).toBeVisible();
});

test("checkout validation blocks an incomplete address", async ({ page }) => {
  await page.goto("/shop/stainless-water-bottle");
  await page.getByRole("button", { name: "Add to cart", exact: true }).click();

  await page.goto("/checkout");
  await expect(page).toHaveURL(/\/sign-in/);
  // Sign in first, then check that the form reports missing fields.
  await page.getByRole("button", { name: "Continue with Google" }).click();
  await expect(page).toHaveURL(/\/checkout$/);

  await page.getByRole("button", { name: "Place order" }).click();
  await expect(page.getByText("Address is required.")).toBeVisible();
  await expect(page.getByText("City is required.")).toBeVisible();

  // Still on checkout: nothing was ordered.
  await expect(page).toHaveURL(/\/checkout$/);
});

test("an unknown order id renders a 404 for a signed-in shopper", async ({ page }) => {
  await page.goto("/sign-in");
  await page.getByRole("button", { name: "Continue with Google" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Everyday goods");

  const response = await page.goto("/orders/33333333-3333-4333-8333-333333333333");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: /can.t find that page/i })).toBeVisible();
});