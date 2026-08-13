# Product-aware / BOGO coupons — launch checklist

## Deploy steps

1. Deploy the backend that includes migration `1786629427164-migration.ts`.
2. **Manually run the migration** against production (it does not auto-run on DigitalOcean deploy):

```bash
cd truscapes-backend
npm run migration:run
```

Ensure `DB_HOST`, `DB_PASSWORD`, `DB_USERNAME`, `DB_NAME`, and `DB_PORT` point at the target database (via `.env` or env vars).

3. Deploy the admin panel and ecommerce storefront.

## Create LAMP50

In admin → Coupons → Create:

- Code: `LAMP50`
- Type: Percentage, value `50`
- Scope: Specific categories / products → select the Lamps category (and enable “Include subcategories” if needed)
- Eligibility: Public, or restrict by role if wholesale stacking is a concern
- Optionally set `maximumDiscountAmount` / date window / usage limits

## Manual QA

- Lamps-only cart → 50% of lamps subtotal
- Mixed cart → discount only on lamps; summary names scope and affected item count
- No-lamps cart → clear rejection message (not “not found”)
- Case-quantity order and DEALER / DISTRIBUTOR / USER roles
- Checkout total matches charged amount (wallet / Stripe)
- Shipping shown as Free everywhere (cart, product, checkout)
- Order detail, packing slip PDF, and admin CSV show discount (incl. per-line when present)
- BOGO coupon: cheapest eligible units discounted; free units labelled
