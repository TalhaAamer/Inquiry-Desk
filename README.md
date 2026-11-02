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
- Sign-in, sign-up and password-reset requests are rate-limited by IP and hashed email; public contact forms use honeypot fields and server-side rate limits.
- Production sign-in, sign-up, password-reset, and first-party contact forms also require Cloudflare Turnstile. Set `TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY` in the backend environment; keep the secret out of source control.

**Public website**
- Home, Services (with a detail page for each service), About us and Contact us pages, with a contact form for visitors.

**Admin dashboard** (`/admin`)
- Turn features on or off, change light and dark theme colors, and edit the site's texts and button labels, each in its own section.
- See contact-form enquiries with name, email, phone, topic, service and message. Fields a visitor left empty are not shown. Mark enquiries as new, read or done, or delete them.
- Only verified admins can use it; the check happens on the server.
- Admin access: each admin belongs to one company (stored in Firestore `adminMembers`). A confirmed email can register a company on the separate admin site (`inquiry-desk-admin`) and becomes its owner; owners add admins there. Emails in `ADMIN_EMAILS` are support staff who can open any company. Optional `ADMIN_REGISTRATION_CODE` requires a code to register; `ADMIN_REGISTRATION=closed` stops new companies. Site settings and enquiries are per company; the website picks its company from `NEXT_PUBLIC_COMPANY_ID` (sent as `X-Company-Id`), or the backend's `COMPANY_ID`, else `default`.
- Settings are stored in Firestore (`config/site`) and served to visitors by `GET /api/config`. Changes can take up to about 15 seconds to appear.
