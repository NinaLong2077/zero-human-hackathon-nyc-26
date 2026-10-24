# 🐾 Purrfect Hour

Borrow a cat for the afternoon 🐱. Cat owners list their cat and set an hourly price. Guests book a set stretch of time, visit, and the owner gets paid.

**🌐 Live site: [https://purrfect-hour.whop.site](https://purrfect-hour.whop.site)**

## ✨ What it does

- 😺 **Browse cats.** Each listing has photos, a bio, an hourly price, the shortest and longest visit the host allows, and a neighborhood.
- 📸 **List your cat.** Signed-in hosts add up to five photos, a price, visit limits and a private full address.
- 🗓️ **Book time.** Guests pick a date, start time and number of hours. The total is calculated on the server.
- ✅ **Hosts approve every request.** Guests are charged only after the host accepts. The full address is shown to a guest only once their booking is accepted.
- 💳 **Pay with Whop checkout.** After acceptance the guest pays through a Whop checkout. The booking flips to "Paid" when Whop confirms the payment.
- 🔑 **Sign in with Whop.** "List your cat" and "Book time" ask visitors to create an account first.
- 📝 **Feedback survey** at `/feedback`, with private results at `/results`.
- 💸 **Host payout ledger** at `/payouts` (private) showing which hosts are owed money.

## 🛠️ Built with

- [Whop](https://whop.com) hosted websites (Cloudflare Workers runtime), Whop OAuth for sign-in, Whop checkout for payments
- TanStack Start, React 19, Vite, Tailwind CSS 4
- [Turso](https://turso.tech) (hosted SQLite) for listings, photos, bookings and survey responses

## 🗂️ Project layout

| Path | What it holds |
| --- | --- |
| `src/routes/index.tsx` | Home page: listings, booking and listing forms |
| `src/routes/feedback.tsx` | Feedback survey |
| `src/routes/results.tsx`, `src/routes/api/results.ts` | Private survey results |
| `src/routes/payouts.tsx`, `src/routes/api/payouts.ts` | Private host payout ledger |
| `src/routes/api/oauth/*` | Whop sign-in (login and callback) |
| `src/routes/api/photos.$id.ts` | Serves listing photos from the database |
| `src/lib/marketplace.functions.ts` | Server functions: listings, bookings, approvals, payments |
| `src/lib/db.server.ts` | Database connection and table setup |
| `src/lib/survey.ts` | Survey questions and the survey version (`SURVEY_VERSION`) |
| `src/lib/config.ts` | Platform fee percentage (`PLATFORM_FEE_PERCENT`, default 0) |

## 🔐 Configuration

Secrets are set as app secrets on Whop and are never committed:

| Secret | Purpose |
| --- | --- |
| `TURSO_DATABASE_URL` | Turso database URL |
| `TURSO_AUTH_TOKEN` | Turso access token |
| `RESULTS_KEY` | Password for `/results` and `/payouts` |

Whop supplies `APP_ID`, `WHOP_API_ORIGIN` and the API credential at runtime. Tables are created automatically on first use.

## 🚀 Run it

```bash
bun install
bun run dev        # local dev server
bun run typecheck
bun run build
```

Deploy with `whop apps deploy` (add `--preview true` to upload without going live).

## 🧪 Status: prototype

This works end to end, but it is a prototype. Be clear-eyed about what is and isn't real:

- 🚧 **Not built:** ID verification. The "Verified host" and "Verified guest" copy describes the intended design. Real listings show "Verification pending."
- 🚧 **Not built:** the optional video intro, refunds and cancellations.
- 🤝 **Payouts are manual.** Guests pay into the Purrfect Hour Whop balance. The owner pays hosts from there and records it in `/payouts`.
- 🤖 **Sample cats** (Mango, Biscuit, Noodle, Professor Whiskers) and their photos are AI-generated examples. They are labeled as such and cannot be booked.
- 🗄️ Photos are stored in the database, which is fine for a demo but should move to file storage at scale.
