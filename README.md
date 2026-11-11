# Inquiry Desk

Inquiry Desk helps a business deal with customer messages faster. Paste or fetch a message and the AI works out what it is about, how urgent it is, how the customer feels and which team should handle it. It then writes a ready-to-edit reply from your own business facts. A person always reviews the reply before anything is sent.

## Features

**Triage**
- Category, urgency from 1 to 5, sentiment, team, sender details and the questions you still need to ask.
- Reads screenshots of messages.
- Inbox mode: paste several messages and triage them all, ranked by urgency.
- Reply deadlines with an overdue alert, status tracking (New, Replied, Resolved), search, filters, stats and CSV export.

**Replies**
- Drafts a reply from your business profile and facts, with rewrite buttons and three versions to compare.
- A customer reaction simulator shows how the customer is likely to take your reply.
- Learns your writing style from the edits you make to drafts.
- Instant proposals for new-project and partnership inquiries: scope, timeline, price (only if stated) and a proposal email.
- Dictate a message with the microphone and have a reply read aloud.

**Safety**
- Privacy shield hides card numbers, ID numbers, passwords and API keys before text reaches the AI.
- Reply guard flags prices, dates and durations that are not in your business facts or the customer's message.
- Message X-ray highlights the exact phrases behind the urgency and mood scores.
- Nothing is ever sent automatically.

**Memory and knowledge**
- Recognises returning customers by email and warns you after repeat complaints.
- Finds questions your business facts cannot answer so you can fill the gaps.
- Fills in your business profile from a website link or a pasted price list.

**Connect to your business**
- Your own email inbox (Gmail, Outlook, Yahoo, iCloud, Zoho or a custom domain): fetch unread emails and reply from the app.
- A shareable contact page and QR code for your business.
- An optional message button for your own website, with step-by-step setup for WordPress, Shopify, Wix, Squarespace and Webflow.
- Slack, Teams, Discord or Zapier alerts for urgent inquiries.

**Accounts and security**
- Sign up and sign in with Google or email and password, with first and last name.
- Email verification with a 6-digit code that expires after 15 minutes.
- Each person's data is private to their own account.
- Light, dark or system theme, saved in a first-party cookie on the current device.
- The app checks sign-in, sign-up and password-reset attempts with IP/email rate limits and Cloudflare Turnstile before using Firebase Authentication. These checks are not a security boundary for Firebase's directly accessible authentication API; configure abuse protection and quotas in Firebase/Identity Platform as well.
- Public first-party contact and newsletter forms use honeypots, server-side rate limits and Cloudflare Turnstile. Set `TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY` in the backend environment; keep the secret out of source control. Embedded third-party contact widgets also use origin checks, honeypots and rate limits, but do not use Turnstile.
- Firebase Authentication handles password storage. Protected operations require a Firebase verified-email claim and an app verification claim bound to the same email address. Firestore Security Rules must independently enforce ownership and verification for browser access; review and test the rules actually deployed in Firebase.
- Mailbox passwords are encrypted at rest; IMAP and SMTP connections verify TLS certificates. Set a strong `EMAIL_ENCRYPTION_KEY` and back it up securely: losing or changing it makes existing saved mailbox credentials unreadable.
- Production email verification requires a configured SMTP server. Without `SMTP_HOST`, verification fails rather than writing codes to logs. For local development only, explicitly set `OTP_ALLOW_CONSOLE_DELIVERY=true` to print codes; never enable it in a deployed environment.

The local `firestore.rules` and `firebase.json` files are ignored by Git and are not deployed automatically. Before deploying a rules change, test it with the Firestore emulator and review the rules currently deployed to the intended Firebase project. The Admin SDK bypasses these rules, so backend authorization remains necessary.

Existing accounts must verify their email once more after deploying the address-bound verification changes. Ensure production SMTP is working first, then coordinate deployment of the backend, both frontends, and Firestore rules. Deploy the backend first and expect a brief interruption until the frontends and rules are updated; otherwise users may not be redirected to verification or may be unable to complete it.

To run the rules regression test on Windows from the repository root, provide local `firestore.rules` and `firebase.json` files, install Java 21 or later and a supported Node.js version, then run:

```powershell
$tools = Join-Path $env:TEMP "inquiry-desk-firestore-test-tools"
npm install --prefix $tools --no-save firebase-tools@15.35.0 @firebase/rules-unit-testing@6.0.0 firebase@13.2.0
$env:NODE_PATH = Join-Path $tools "node_modules"
& (Join-Path $tools "node_modules\.bin\firebase.cmd") emulators:exec --project demo-inquiry-desk --only firestore "node backend\tests\firestore_rules.test.cjs"
```

This uses a demo project and the local emulator; it does not deploy rules or access production data.

**Public website**
- Home, Services (with a detail page for each service), About us and Contact us pages, with a contact form for visitors.

**Admin dashboard** (`/admin`)
- Turn features on or off, change light and dark theme colors, and edit the site's texts and button labels, each in its own section.
- See contact-form enquiries with name, email, phone, topic, service and message. Fields a visitor left empty are not shown. Mark enquiries as new, read or done, or delete them.
- Only verified admins can use it; the check happens on the server.
- Admin access: each admin belongs to one company (stored in Firestore `adminMembers`). A confirmed email can register a company on the separate admin site (`inquiry-desk-admin`) and becomes its owner; owners add admins there. Emails in `ADMIN_EMAILS` are support staff who can open any company. Optional `ADMIN_REGISTRATION_CODE` requires a code to register; `ADMIN_REGISTRATION=closed` stops new companies. Site settings and enquiries are per company; the website picks its company from `NEXT_PUBLIC_COMPANY_ID` (sent as `X-Company-Id`), or the backend's `COMPANY_ID`, else `default`.
- Settings are stored in Firestore (`config/site`) and served to visitors by `GET /api/config`. Changes can take up to about 15 seconds to appear.
