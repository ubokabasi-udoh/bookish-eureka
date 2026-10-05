# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: checkout-journey.spec.ts >> an unknown order id renders a 404 for a signed-in shopper
- Location: tests/e2e/checkout-journey.spec.ts:70:5

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 404
Received: 200
```

# Page snapshot

```yaml
- generic [active] [ref=f1e1]:
  - link "Skip to content" [ref=f1e2] [cursor=pointer]:
    - /url: "#main"
  - banner [ref=f1e3]:
    - generic [ref=f1e4]:
      - link "Northline" [ref=f1e5] [cursor=pointer]:
        - /url: /
      - navigation "Primary" [ref=f1e6]:
        - list [ref=f1e7]:
          - listitem [ref=f1e8]:
            - link "Shop" [ref=f1e9] [cursor=pointer]:
              - /url: /shop
          - listitem [ref=f1e10]:
            - link "Apparel" [ref=f1e11] [cursor=pointer]:
              - /url: /shop?category=Apparel
          - listitem [ref=f1e12]:
            - link "Home" [ref=f1e13] [cursor=pointer]:
              - /url: /shop?category=Home
          - listitem [ref=f1e14]:
            - link "Accessories" [ref=f1e15] [cursor=pointer]:
              - /url: /shop?category=Accessories
          - listitem [ref=f1e16]:
            - link "Tech" [ref=f1e17] [cursor=pointer]:
              - /url: /shop?category=Tech
      - search [ref=f1e18]:
        - generic [ref=f1e19]: Search products
        - searchbox "Search products" [ref=f1e20]
      - link "Cart" [ref=f1e21] [cursor=pointer]:
        - /url: /cart
      - link "Sign in" [ref=f1e25] [cursor=pointer]:
        - /url: /sign-in
  - main [ref=f1e26]:
    - generic [ref=f1e28]:
      - heading "Sign in" [level=1] [ref=f1e29]
      - paragraph [ref=f1e30]: Sign in to check out and keep track of your orders.
      - button "Continue with Google" [ref=f1e32]
      - paragraph [ref=f1e38]: We only use your name and email to create your account and send order confirmations.
  - contentinfo [ref=f1e39]:
    - generic [ref=f1e40]:
      - generic [ref=f1e41]:
        - paragraph [ref=f1e42]: Northline
        - paragraph [ref=f1e43]: Everyday goods, made well. Thoughtfully sourced apparel, home, accessories and tech.
      - navigation "Shop categories" [ref=f1e44]:
        - paragraph [ref=f1e45]: Shop
        - list [ref=f1e46]:
          - listitem [ref=f1e47]:
            - link "Apparel" [ref=f1e48] [cursor=pointer]:
              - /url: /shop?category=Apparel
          - listitem [ref=f1e49]:
            - link "Home" [ref=f1e50] [cursor=pointer]:
              - /url: /shop?category=Home
          - listitem [ref=f1e51]:
            - link "Accessories" [ref=f1e52] [cursor=pointer]:
              - /url: /shop?category=Accessories
          - listitem [ref=f1e53]:
            - link "Tech" [ref=f1e54] [cursor=pointer]:
              - /url: /shop?category=Tech
      - navigation "Account" [ref=f1e55]:
        - paragraph [ref=f1e56]: Account
        - list [ref=f1e57]:
          - listitem [ref=f1e58]:
            - link "Sign in" [ref=f1e59] [cursor=pointer]:
              - /url: /sign-in
          - listitem [ref=f1e60]:
            - link "Cart" [ref=f1e61] [cursor=pointer]:
              - /url: /cart
      - generic [ref=f1e62]:
        - paragraph [ref=f1e63]: Contact
        - link "support@example.com" [ref=f1e64] [cursor=pointer]:
          - /url: mailto:support@example.com
    - generic [ref=f1e65]: "© 2026 Northline. Demo store: no real payments are taken."
  - region "Notifications alt+T"
  - button "Open Next.js Dev Tools" [ref=f1e71] [cursor=pointer]
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
  60 |   await expect(page).toHaveURL(/\/checkout$/);
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
> 76 |   expect(response?.status()).toBe(404);
     |                              ^ Error: expect(received).toBe(expected) // Object.is equality
  77 |   await expect(page.getByRole("heading", { name: /can.t find that page/i })).toBeVisible();
  78 | });
```