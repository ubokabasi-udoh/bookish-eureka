# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: checkout-journey.spec.ts >> checkout validation blocks an incomplete address
- Location: tests/e2e/checkout-journey.spec.ts:52:5

# Error details

```
Error: expect(page).toHaveURL(expected) failed

Expected pattern: /\/checkout$/
Received string:  "http://localhost:3100/sign-in?next=%2Fcheckout"
Timeout: 5000ms

Call log:
  - Expect "toHaveURL" with timeout 5000ms
    2 × locator resolved to <html lang="en" class="h-full">…</html>
      - unexpected value "http://localhost:3100/sign-in?next=%2Fcheckout"
    - locator resolved to <html lang="en" class="h-full">…</html>
    - unexpected value "http://localhost:3100/auth/callback?code=memory%3Ashopper%40example.com"
    11 × locator resolved to <html lang="en" class="h-full">…</html>
       - unexpected value "http://localhost:3100/sign-in?next=%2Fcheckout"

```

```yaml
- link "Skip to content":
  - /url: "#main"
- banner:
  - link "Northline":
    - /url: /
  - navigation "Primary":
    - list:
      - listitem:
        - link "Shop":
          - /url: /shop
      - listitem:
        - link "Apparel":
          - /url: /shop?category=Apparel
      - listitem:
        - link "Home":
          - /url: /shop?category=Home
      - listitem:
        - link "Accessories":
          - /url: /shop?category=Accessories
      - listitem:
        - link "Tech":
          - /url: /shop?category=Tech
  - search:
    - text: Search products
    - searchbox "Search products"
  - link "Cart, 1 item":
    - /url: /cart
  - link "Sign in":
    - /url: /sign-in
- main:
  - heading "Sign in" [level=1]
  - paragraph: Sign in to complete your order.
  - button "Continue with Google"
  - paragraph: We only use your name and email to create your account and send order confirmations.
- contentinfo:
  - paragraph: Northline
  - paragraph: Everyday goods, made well. Thoughtfully sourced apparel, home, accessories and tech.
  - navigation "Shop categories":
    - paragraph: Shop
    - list:
      - listitem:
        - link "Apparel":
          - /url: /shop?category=Apparel
      - listitem:
        - link "Home":
          - /url: /shop?category=Home
      - listitem:
        - link "Accessories":
          - /url: /shop?category=Accessories
      - listitem:
        - link "Tech":
          - /url: /shop?category=Tech
  - navigation "Account":
    - paragraph: Account
    - list:
      - listitem:
        - link "Sign in":
          - /url: /sign-in
      - listitem:
        - link "Cart":
          - /url: /cart
  - paragraph: Contact
  - link "support@example.com":
    - /url: mailto:support@example.com
  - text: "© 2026 Northline. Demo store: no real payments are taken."
- region "Notifications alt+T"
- alert: Sign in
```

# Test source

```ts
  1  | import { expect, test } from "@playwright/test";
  2  | 
  3  | /**
  4  |  * The full happy path, using the memory driver's fake Google sign-in:
  5  |  * home → product → cart → checkout (sign in) → place order → confirmation.
  6  |  */
  7  | test("a shopper can sign in and place an order", async ({ page }) => {
  8  |   await page.goto("/shop/ceramic-pour-over-set");
  9  |   await expect(page.getByRole("heading", { level: 1, name: "Ceramic Pour-Over Set" })).toBeVisible();
  10 | 
  11 |   await page.getByRole("button", { name: "Add to cart", exact: true }).click();
  12 |   await expect(page.getByText("Ceramic Pour-Over Set added to your cart")).toBeVisible();
  13 | 
  14 |   // Cart → checkout.
  15 |   await page.goto("/cart");
  16 |   await expect(page.getByLabel("Ceramic Pour-Over Set quantity")).toHaveValue("1");
  17 |   await page.getByRole("link", { name: "Proceed to checkout" }).click();
  18 | 
  19 |   // Checkout requires sign-in and remembers where to come back to.
  20 |   await expect(page).toHaveURL(/\/sign-in\?next=%2Fcheckout/);
  21 |   await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  22 |   await page.getByRole("button", { name: "Continue with Google" }).click();
  23 | 
  24 |   // The memory provider signs in as shopper@example.com and returns us to checkout.
  25 |   await expect(page).toHaveURL(/\/checkout$/);
  26 |   await expect(page.getByLabel("Full name")).toHaveValue("Shopper");
  27 |   await expect(page.getByLabel("Email")).toHaveValue("shopper@example.com");
  28 | 
  29 |   await page.getByLabel("Address").fill("1 Analytical Street");
  30 |   await page.getByLabel("City").fill("London");
  31 |   await page.getByLabel("State / region").fill("Greater London");
  32 |   await page.getByLabel("Postal code").fill("N1 1AA");
  33 |   await page.getByLabel("Country").fill("United Kingdom");
  34 | 
  35 |   await page.getByRole("button", { name: "Place order" }).click();
  36 | 
  37 |   // Confirmation.
  38 |   await expect(page).toHaveURL(/\/orders\/[0-9a-f-]{36}$/);
  39 |   await expect(page.getByRole("heading", { level: 1 })).toContainText(/Thank you, Shopper/);
  40 |   await expect(page.getByText("Ceramic Pour-Over Set")).toBeVisible();
  41 |   await expect(page.getByText("$56.00").first()).toBeVisible();
  42 |   await expect(page.getByText(/confirmation email is on its way to shopper@example.com/)).toBeVisible();
  43 | 
  44 |   // The confirmation page shows the shipping address we entered.
  45 |   await expect(page.getByText("1 Analytical Street")).toBeVisible();
  46 | 
  47 |   // The cart is emptied after a successful order.
  48 |   await page.goto("/cart");
  49 |   await expect(page.getByRole("heading", { name: "Your cart is empty" })).toBeVisible();
  50 | });
  51 | 
  52 | test("checkout validation blocks an incomplete address", async ({ page }) => {
  53 |   await page.goto("/shop/stainless-water-bottle");
  54 |   await page.getByRole("button", { name: "Add to cart", exact: true }).click();
  55 | 
  56 |   await page.goto("/checkout");
  57 |   await expect(page).toHaveURL(/\/sign-in/);
  58 |   // Sign in first, then check that the form reports missing fields.
  59 |   await page.getByRole("button", { name: "Continue with Google" }).click();
> 60 |   await expect(page).toHaveURL(/\/checkout$/);
     |                      ^ Error: expect(page).toHaveURL(expected) failed
  61 | 
  62 |   await page.getByRole("button", { name: "Place order" }).click();
  63 |   await expect(page.getByText("Address is required.")).toBeVisible();
  64 |   await expect(page.getByText("City is required.")).toBeVisible();
  65 | 
  66 |   // Still on checkout: nothing was ordered.
  67 |   await expect(page).toHaveURL(/\/checkout$/);
  68 | });
  69 | 
  70 | test("an unknown order id renders a 404 for a signed-in shopper", async ({ page }) => {
  71 |   await page.goto("/sign-in");
  72 |   await page.getByRole("button", { name: "Continue with Google" }).click();
  73 |   await expect(page.getByRole("heading", { level: 1 })).toContainText("Everyday goods");
  74 | 
  75 |   const response = await page.goto("/orders/33333333-3333-4333-8333-333333333333");
  76 |   expect(response?.status()).toBe(404);
  77 |   await expect(page.getByRole("heading", { name: /can.t find that page/i })).toBeVisible();
  78 | });
```