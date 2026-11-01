# CollectIt — AI-Powered Group Money Collector

> **Tagline:** From 5 friends to a 5,000-student fest, one link collects it all.  
> Built for the **PayPal AI Hackathon**.

CollectIt eliminates the chaos of collecting money across groups, classrooms, flatmates, and campus festivals. Instead of chasing unverified bank transfer screenshots, manual WhatsApp reminders, and lost spreadsheets, a **Lead** describes a collection in plain English, bulk-imports members or shares a self-join link, and shares a single PayPal checkout link in rupees (₹). Members contribute with zero account friction, and Gemini AI manages forecasts, personalized WhatsApp nudges, and public ledger explanations.

---

## 🚀 Key Features

### 1. PayPal Payments & Settlement Flow
- **PayPal Orders API v2 (Sandbox & Live):** Server-side order creation (`/v2/checkout/orders`) with intent `CAPTURE` and secure server-side capture verification.
- **Rupee-to-USD Conversion (`INR_PER_USD`):** PayPal doesn't accept INR from international payers. Members commit to ₹ with transparent live conversion notes (e.g., *"You pay ₹500 · PayPal charges ≈ $5.68 at ₹88/$1"*).
- **Idempotent Capture & Server-Side Verification:** All payment captures verify that the exact charged value equals the expected amount before updating status to `completed`.
- **PayPal Payouts API Settlement:** Funds collect in CollectIt's escrow and are settled directly to the organizer's PayPal email with real Payouts API support or simulated sandbox settlement.
- **Instant Demo Mode:** When PayPal keys are not configured, test payments run in zero-friction demo mode without errors.

### 2. Payout Safety & Governance (v4.1 Safeguards)
Money can **only ever be paid out to the verified PayPal account of the Lead who owns the collection**. The server decides the destination. The browser never does.

1. **Fixed Destination:** `POST /api/manage/:id/payout` accepts **only `{amount}`**. Any client-submitted `email` or `destination` is rejected/ignored. The server reads the verified destination exclusively from `users/{ownerUid}.paypalEmail`.
2. **Owner-Only Authentication:** Confirms `collection.ownerId === authUser.uid` (or 404). All financial numbers (Collected, Spent, Paid out, Available) are recomputed strictly on the server from raw records.
3. **Two-Factor Email Verification:** Fast-path instant verification if the PayPal email matches the Lead's Google sign-in account. For other addresses, a 6-digit code is dispatched with a 10-minute expiry (max 5 attempts). If `EMAIL_API_KEY` is not configured, the app operates in **Demo mode** displaying the code on screen with the notice *"Demo mode: in production this code is emailed"*.
4. **24-Hour Cooling Period:** Updating the payout email triggers a 24-hour security pause during which payouts cannot be requested. The UI displays an active countdown. The demo Lead is seeded and exempt for immediate live demonstration.
5. **Collection State Rules:** Payouts are restricted to collections that are **closed or past their deadline**, with a minimum payout of ₹100. A 60-second mutex lock prevents concurrent double-spend requests.
6. **Immutable Audit Log & Alerts:** Every email change, verification attempt, payout request, execution, and block creates an immutable `auditLogs` record and in-app Lead notification.

---

### 3. Six Gemini AI Features (`@google/genai` SDK, Server-Side)
1. **✨ AI Collection Creator:** Type *"farewell party for 30 friends, around ₹15,000, by end of next month"* and Gemini calculates per-head shares (₹500), selects the color theme, sets deadlines, and drafts a warm purpose blurb.
2. **💬 AI WhatsApp Reminders:** Selects tone (*Friendly*, *Funny*, *Formal*, *Urgent*) and generates personalized WhatsApp messages with direct payment links for each unpaid member.
3. **📈 AI Insights & Forecast:** Evaluates daily velocity, projected completion date, and delivers 3 plain-English observations plus an actionable recommendation with an *"On track / At risk / Behind"* badge.
4. **📖 AI Spending Story:** Generates a friendly 2–3 sentence transparency story on the public page summarizing funds raised, expenses incurred, and current pot balance.
5. **🤖 "Ask the Ledger" Chat Assistant:** Answering queries on the public pay page (*"Where was the money spent?", "How much is left?"*) strictly using sanitized public ledger data while resisting prompt-injection attacks and shielding private user data (never discloses payout emails).
6. **🧹 AI Member Clean-up:** Transforms messy text from WhatsApp or notes with emojis and bullets into capitalized names and validated 10-digit Indian phone tags.

### 4. Bulk Member Import & Scaling
- **Paste Mode:** Intelligently parses tabs, commas, pipes, or semicolons from Google Sheets and WhatsApp.
- **Upload File:** Browser-side `.csv`, `.xlsx`, `.xls`, `.txt` parsing using SheetJS (`xlsx`) with column auto-mapping.
- **📱 Contacts API:** Native Contact Picker integration on supported devices.
- **Self-Join Link & QR Code (`/join/:code`):** For 5,000-student fests, attendees scan a QR code at registration to join the roster automatically.
- **Preview Table & Deduplication:** Ready / Duplicate / Invalid classification, inline editing, dedupe against existing roster.

---

## 🛠️ Tech Stack

- **Frontend:** React 19, TypeScript, Vite, React Router 7, Tailwind CSS, Lucide icons, Recharts, `canvas-confetti`, `xlsx` (SheetJS).
- **Typography:** Sora (headings), Inter (body), JetBrains Mono (financial tabular figures).
- **Daylight & Dark Mode:** Dedicated high-contrast daylight theme (`.light`) and dark theme (`.dark`) with instant system bootstrap.
- **Backend:** Node.js + Express (serving the app build, REST APIs, QR generation via `qrcode`, and SPA routing).
- **Database:** Firestore schema compatible architecture with real-time polling updates.
- **AI:** Google GenAI SDK (`@google/genai`) running `gemini-3.8-flash` on the server.
- **Payments:** PayPal Orders API v2 & PayPal Payouts API (with automatic sandbox simulation fallback).

---

## 🔑 Environment Variables & Secrets

Configure these in the **Settings > Secrets** panel or `.env`:

| Variable | Description | Default |
|---|---|---|
| `GEMINI_API_KEY` | Google Gemini API Key | *(Preconfigured in AI Studio)* |
| `PAYPAL_CLIENT_ID` | PayPal Sandbox Client ID | `""` (runs in Demo Mode if absent) |
| `PAYPAL_CLIENT_SECRET` | PayPal Sandbox Secret | `""` |
| `PAYPAL_MODE` | PayPal environment | `sandbox` |
| `INR_PER_USD` | Conversion rate for PayPal charge | `88` |
| `PAYPAL_CHARGE_CURRENCY` | Currency charged via PayPal | `USD` |
| `PAYPAL_PAYOUTS_ENABLED` | Enable live PayPal Payouts API (`true` / `false`) | `false` |
| `EMAIL_API_KEY` | Optional email delivery API key (runs Demo on-screen code if missing) | `""` |
| `APP_URL` | Base public URL of applet | Derived from request host |

### Getting PayPal Sandbox Credentials:
1. Go to [developer.paypal.com](https://developer.paypal.com) and log in.
2. Navigate to **Apps & Credentials** > **Sandbox** > **Create App**.
3. Copy the **Client ID** and **Secret** to your secrets.
4. Under **Testing Tools > Sandbox Accounts**, create a Sandbox Personal account to test payments.
5. All payments land in the developer Sandbox Business account and are settled to Leads via the Payouts flow.

---

## ⏱️ 2:45 Demo Script for Judges

1. **0:00 - 0:25: The Problem & Landing**  
   Show the landing page. Explain: *"In India, group money collection happens through messy WhatsApp reminders, unverified screenshots, and awkward follow-ups. CollectIt solves this with one link powered by PayPal and Gemini AI."*
2. **0:25 - 0:50: Bulk Roster Import & AI Clean-up**  
   Open **CS Batch 2026** > **Members**. Click **Add People**. Paste messy text with numbers and emojis, click **✨ Clean with AI**. Show instant deduplication, Ready vs Duplicate tags, and one-click confirm.
3. **0:50 - 1:15: AI Collection Creator**  
   Click **New Collection**. In the AI box, type: *"farewell party for 30 friends, around ₹15,000, by end of next month"*. Click **Generate with AI**. Watch Gemini auto-populate the fixed share (₹500), theme (Candy), emoji, and deadline. Click **Launch Collection**.
4. **1:15 - 1:40: Share & Mobile Pay Page**  
   Show the share modal with QR code. Open the public page `/c/:slug`. Show the live currency note: *"You pay ₹500 · PayPal charges ≈ $5.68"*. Select your name from the roster, click **Pay ₹500 (Instant Demo Checkout)**. Watch the success screen with confetti and view the printable receipt.
5. **1:40 - 2:10: Live Dashboard & AI Insights**  
   Return to `/manage/:id`. Notice the live update: total raised increased by ₹500, row flashes green. Point to **✨ AI Insights & Forecast** (computed pace, projected completion date, status). Switch reminder tone to **Funny** and show customized WhatsApp messages with one-click `wa.me` links.
6. **2:10 - 2:30: Ledger & Payout**  
   Scroll to **"Where the money went"**. View the **AI Spending Story**. Open the floating **"Ask the ledger"** chat and ask: *"Where was the money spent?"*. Scroll to **Settlement**, enter organizer's PayPal email, and click **Request payout** to demonstrate fund settlement.
7. **2:30 - 2:45: Conclusion**  
   *"CollectIt combines PayPal checkout with Gemini AI to make group collections effortless, transparent, and fun."*

---

## 📄 License

MIT License. See [LICENSE](LICENSE) for details.
