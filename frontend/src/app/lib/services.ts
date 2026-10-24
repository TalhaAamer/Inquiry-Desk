export interface Service {
  slug: string;
  title: string;
  short: string;
  intro: string;
  gets: [string, string][];
  steps: string[];
  fit: string;
  note?: string;
}

// Every statement here describes something the app already does.
export const SERVICES: Service[] = [
  {
    slug: "smart-triage",
    title: "Smart triage",
    short: "Every message sorted by urgency, mood and the team that should handle it.",
    intro:
      "Paste a customer message or a screenshot and get a clear read in seconds, so the messages that matter are answered first.",
    gets: [
      ["Category and urgency", "What the message is about and how fast it needs an answer, on a scale of 1 to 5."],
      ["Sentiment and team", "How the customer feels, and which team should handle it."],
      ["Reply deadline", "The exact time to reply by, with an overdue alert in your history."],
      ["Questions to ask", "What is missing before your team can act, such as an order number."],
      ["Message X-ray", "The exact phrases that drove the urgency and mood scores, highlighted."],
      ["Screenshot reading", "Add an image and the notes on what it shows come with the result."],
      ["Inbox mode", "Paste a whole inbox, separated by --- lines, and every message is triaged and ranked by urgency."],
      ["History and tracking", "Mark each message New, Replied or Resolved, search and filter, view stats and export to CSV."],
    ],
    steps: [
      "Paste the customer message, add a screenshot, or fetch unread emails.",
      "Press Triage. The result shows category, urgency, mood, owner and deadline.",
      "Work through the list from the most urgent down, and mark each one as you go.",
    ],
    fit: "Anyone who gets more messages than they can read carefully: shops, agencies, clinics, freelancers and small support teams.",
    note: "The AI can be wrong. A needs-review flag tells you when a person should check the result.",
  },
  {
    slug: "replies-from-your-facts",
    title: "Replies from your facts",
    short: "Draft replies that use only your prices, hours and policies, in your tone and language.",
    intro:
      "Tell Inquiry Desk about your business once. Every draft is written from those facts instead of guesses.",
    gets: [
      ["Your business profile", "Type your facts, or fill them in from a website link or a pasted price list."],
      ["Tone and language", "Friendly, professional or short, in the language the customer wrote in."],
      ["Three versions", "Compare a short, a warm and a formal reply side by side."],
      ["Rewrite buttons", "Make a draft shorter, warmer or more formal with one click."],
      ["Reaction simulator", "See how the customer will probably feel when they read your reply."],
      ["Knowledge gap detector", "Finds open questions your facts cannot answer and adds a labelled line for you to fill in."],
      ["Instant proposals", "For new-project and partnership inquiries, get the scope, timeline, price (only if stated) and a proposal email."],
      ["Copy or open in email", "Copy the reply, or open it in your own email app."],
    ],
    steps: [
      "Open the Business profile and add your prices, hours and policies.",
      "Triage a message. A draft reply appears, written from your facts.",
      "Edit it if you like, then copy it or open it in your email app.",
    ],
    fit: "Businesses that answer the same kinds of questions again and again and want replies that stay accurate.",
    note: "Replies are drafts. Always read them before you send.",
  },
  {
    slug: "reply-guard",
    title: "Reply guard and privacy shield",
    short: "Catches invented prices and promises, and hides sensitive details from the AI.",
    intro:
      "Two safety checks run around every reply: one protects your customers' private details, the other protects you from promising too much.",
    gets: [
      ["Privacy shield", "Card numbers, ID numbers, passwords and API keys are hidden before the text reaches the AI."],
      ["Price check", "Flags any price in a draft that is not in your business facts or the customer's message."],
      ["Date and duration check", "Flags dates and durations, such as 'delivered in 2 days', that you never stated."],
      ["Needs-review flag", "Marks results that a person should check before replying."],
    ],
    steps: [
      "Sensitive details are masked automatically before the AI sees the message.",
      "After a draft is written, the guard compares its claims with your facts.",
      "Anything it cannot find in your facts is highlighted for you to confirm or remove.",
    ],
    fit: "Anyone who quotes prices, delivery times or policies and does not want a wrong promise to reach a customer.",
    note: "The guard reduces mistakes but cannot catch everything. You stay in charge of what is sent.",
  },
  {
    slug: "contact-page-and-qr",
    title: "Contact page and QR code",
    short: "Give customers a link or QR code to message you, with no website or code needed.",
    intro:
      "Create a contact page for your business in one click. Customers write to you from any phone, and their messages arrive sorted.",
    gets: [
      ["A shareable contact page", "A link for your email signature, social profiles, WhatsApp or a Contact us button."],
      ["A printable QR code", "Download it for your shop, counter, tables or flyers."],
      ["A message button for your website", "One line of code adds a button, with plain-language steps for WordPress, Shopify, Wix, Squarespace and Webflow."],
      ["Your look", "Set the heading, button text, greeting, color and corner."],
      ["Spam protection", "A hidden trap for bots and limits on how often one visitor can send."],
      ["Private by design", "Each page belongs to your account, and only you can read its messages."],
    ],
    steps: [
      "Open Contact page and alerts in the dashboard, type your business name and create the page.",
      "Share the link or print the QR code.",
      "Fetch the customer messages into inbox mode and triage them like any other.",
    ],
    fit: "Shops, restaurants, salons, clinics and freelancers who do not have a website or do not want to build a contact form.",
  },
  {
    slug: "email-inbox",
    title: "Email inbox",
    short: "Read and reply from your own mailbox without leaving Inquiry Desk.",
    intro:
      "Connect your mailbox once. Fetch new emails into the triage list and send replies from your own address.",
    gets: [
      ["Common providers built in", "Gmail, Outlook, Yahoo, iCloud and Zoho, or your own mail servers under Advanced."],
      ["Fetch unread emails", "Loads up to 10 unread messages at a time, without marking them as read."],
      ["Send from your address", "Each reply asks for your confirmation. Nothing is ever sent automatically."],
      ["Sending limit", "At most 20 emails per hour per account, to keep your mailbox safe."],
      ["Stays connected", "The connection follows your account to any device. Disconnect any time to delete it."],
      ["Stored safely", "Your app password is checked once, kept encrypted on the server and never sent back to the browser."],
    ],
    steps: [
      "Click Connect email and enter your address and an app password.",
      "Inquiry Desk checks that it can read and send before saving anything.",
      "Fetch unread emails, triage them, review the draft and send.",
    ],
    fit: "People who already work from one mailbox and want triage and drafting on top of it.",
    note: "Use an app password, not your normal password. The setup screen explains how to create one.",
  },
  {
    slug: "customer-memory",
    title: "Customer memory",
    short: "Remember returning customers and warn you about repeat complaints.",
    intro:
      "Customers are recognised by their email address, so you know the history before you answer.",
    gets: [
      ["Returning customer notes", "Short summaries of earlier messages are given to the AI and shown to you."],
      ["Repeat-complaint warning", "A clear warning appears after a customer complains more than once."],
      ["Mood over time", "See whether a customer's mood is getting better or worse."],
      ["Your history, saved", "Triage history is saved to your account and is there on every device."],
      ["You stay in control", "Forget all customer memory at any time from the Business profile."],
    ],
    steps: [
      "Triage a message that has the sender's email address.",
      "Inquiry Desk saves a short summary against that customer.",
      "Next time they write, the history appears with the new result.",
    ],
    fit: "Teams where the same customers write more than once and a repeat problem should never feel like a first-time one.",
  },
  {
    slug: "alerts",
    title: "Alerts in Slack, Teams or Discord",
    short: "Get a short alert when something urgent arrives, wherever your team already works.",
    intro:
      "Connect a chat channel and Inquiry Desk tells you the moment an inquiry needs fast attention.",
    gets: [
      ["Works with your tools", "Slack, Microsoft Teams, Discord, Zapier, Make or your own endpoint."],
      ["You choose when", "Alert at the urgency level you pick, or when a message needs a human check."],
      ["Short and safe", "Each alert has the summary, urgency, sender and next step, never the full message."],
      ["Test it first", "Send a test alert to check the connection before relying on it."],
      ["Ready for automations", "The alert also carries structured details for Zapier, Make or your own code."],
    ],
    steps: [
      "Create an incoming webhook in your chat tool and copy its address.",
      "Paste it into Contact page and alerts and turn on Send alerts.",
      "Choose the urgency level and send a test alert.",
    ],
    fit: "Teams that live in a chat app and cannot keep a dashboard open all day.",
    note: "Webhook addresses must use https and point to a public address.",
  },
  {
    slug: "writing-style-and-voice",
    title: "Writing style and voice",
    short: "Drafts that sound like you, plus dictation and read-aloud.",
    intro:
      "Inquiry Desk learns from your edits, so drafts need fewer changes over time. You can also talk instead of typing.",
    gets: [
      ["Learns your style", "When you edit a draft and then copy or send it, your edit becomes an example for later drafts. The last 20 are kept."],
      ["Full control", "Turn style learning off, or forget it, from the Business profile."],
      ["Dictate a message", "Use the microphone button to speak a message instead of typing it."],
      ["Read a reply aloud", "Have a reply read back to you before you send it."],
      ["Saved to your account", "Your learned style is saved to your account, not to one browser."],
    ],
    steps: [
      "Edit a draft so it sounds like you, then copy or send it.",
      "Inquiry Desk keeps your edit as an example of how you write.",
      "Later drafts follow that style. Use the microphone and speaker buttons whenever you prefer to talk.",
    ],
    fit: "Anyone who edits every draft before sending and would like the first draft to be closer to the final one.",
    note: "Dictation and read-aloud use your browser's built-in speech features, so they depend on your browser.",
  },
];

export const bySlug = (slug: string) => SERVICES.find((s) => s.slug === slug);
