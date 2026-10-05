import { expect, test } from "@playwright/test";

test.describe("browsing the catalog", () => {
  test("home page links into the shop and the listing filters", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Everyday goods");

    await page.getByRole("link", { name: "Shop the collection" }).click();
    await expect(page).toHaveURL(/\/shop$/);
    await expect(page.getByRole("heading", { level: 1, name: "Shop" })).toBeVisible();

    // Category filter.
    await page.getByRole("link", { name: "Tech", exact: true }).first().click();
    await expect(page).toHaveURL(/category=Tech/);
    await expect(page.getByRole("heading", { level: 1, name: "Tech" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Compact Mechanical Keyboard" })).toBeVisible();

    // Search within the shop (from a clean listing, so no category is applied).
    await page.goto("/shop");
    await page.locator("#shop-search").fill("wool");
    await page.getByRole("button", { name: "Search" }).click();
    await expect(page).toHaveURL(/q=wool/);
    await expect(page.getByRole("link", { name: "Wool Throw Blanket" })).toBeVisible();

    // No results state.
    await page.locator("#shop-search").fill("zzzznotathing");
    await page.getByRole("button", { name: "Search" }).click();
    await expect(page.getByRole("heading", { name: /No products match your search/ })).toBeVisible();
  });

  test("a missing product renders the 404 page", async ({ page }) => {
    const response = await page.goto("/shop/does-not-exist");
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: /can.t find that page/i })).toBeVisible();
  });
});

test.describe("cart", () => {
  test("starts empty and can be filled from the product page", async ({ page }) => {
    await page.goto("/cart");
    await expect(page.getByRole("heading", { name: "Your cart is empty" })).toBeVisible();

    await page.goto("/shop/wool-throw-blanket");
    await expect(page.getByRole("heading", { level: 1, name: "Wool Throw Blanket" })).toBeVisible();

    // Stock is 3 in the seed data, so the "+" must stop at 3.
    await page.getByRole("button", { name: "Increase quantity" }).click();
    await expect(page.getByLabel("Quantity quantity")).toHaveValue("2");
    await page.getByRole("button", { name: "Increase quantity" }).click();
    await expect(page.getByLabel("Quantity quantity")).toHaveValue("3");
    await expect(page.getByRole("button", { name: "Increase quantity" })).toBeDisabled();

    await page.getByRole("button", { name: "Add to cart", exact: true }).click();
    await expect(page.getByText("Wool Throw Blanket added to your cart")).toBeVisible();

    await page.goto("/cart");
    await expect(page.getByRole("link", { name: "Wool Throw Blanket" })).toBeVisible();
    await expect(page.getByLabel("Wool Throw Blanket quantity")).toHaveValue("3");
    // 3 × $110.00
    await expect(page.getByText("$330.00").first()).toBeVisible();
  });

  test("an out-of-stock product cannot be added", async ({ page }) => {
    await page.goto("/shop/walnut-desk-organizer");
    await expect(page.getByRole("button", { name: "Out of stock" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Add to cart", exact: true })).toHaveCount(0);
  });
});