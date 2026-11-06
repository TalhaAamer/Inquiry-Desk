import type { Metadata } from "next";
import LegalDocument from "../../components/LegalDocument";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "How Inquiry Desk handles account details, customer messages and usage information.",
};

const sections = [
  {
    title: "Information we handle",
    paragraphs: [
      "When you create an account, we handle account information such as your email address, profile details and sign-in verification status. If you choose to add a profile photo, phone number, business facts or preferences, we handle those too.",
      "Messages and other content you submit may include customer names, email addresses, phone numbers, message text, screenshots, attachments, email content and your edits to AI-generated drafts. Please avoid submitting payment-card details, passwords or information you are not authorized to share.",
      "If you join the newsletter list, we store your email address and signup consent in Firebase. You can ask us to remove your address through the Contact page. Newsletter emails have not started yet.",
      "The app may use cookies or browser storage for preferences such as your theme and for app functionality. Vercel Analytics and Speed Insights may collect website usage and performance information.",
    ],
  },
  {
    title: "How we use information",
    paragraphs: [
      "We use information to provide and secure the service: to authenticate accounts, save user-selected content and settings, process messages, create triage results and reply drafts, operate connected features, prevent abuse, and troubleshoot or improve the app.",
      "When you request an AI feature, the relevant information you provide—such as the message, business facts, requested language, examples and any images—is sent to Anthropic for processing. AI output can be inaccurate or incomplete; review it before relying on or sending it.",
    ],
  },
  {
    title: "Connected services and sharing",
    paragraphs: [
      "Inquiry Desk uses Firebase for authentication and data storage, Anthropic for AI processing, Vercel for hosting and site analytics/performance measurement, and Cloudflare Turnstile for anti-abuse checks. Those providers process information as needed to provide their services under their own terms and privacy policies.",
      "If you connect an email inbox, the app uses the credentials you provide to retrieve messages and, when you choose, send replies. Email connection details are encrypted before storage; disconnecting removes the saved connection. Do not connect a mailbox unless you are authorized to do so.",
      "If you configure a Slack, Microsoft Teams, Discord, Zapier, Make or other webhook, Inquiry Desk sends it a short alert containing message summary and triage information when your alert settings match. It does not send the full message in that alert. The webhook provider then handles the information under its own policies.",
      "Company administrators may see enquiries submitted to their company’s contact forms. We do not sell personal information. We do not allow other companies to access your company’s enquiries through the intended product controls.",
    ],
  },
  {
    title: "Storage, security and retention",
    paragraphs: [
      "We use access controls and reasonable technical measures intended to protect information. No online service can guarantee absolute security, so do not use the service to store secrets or information you cannot risk exposing.",
      "Information is retained as needed to provide the features you use, maintain your account and meet legitimate operational or legal needs. Retention may differ by feature and by the settings of connected services. You can delete some saved items in the app, disconnect integrations, or contact us about account data; some records may remain for a limited time in backups or where retention is required.",
    ],
  },
  {
    title: "Your choices and changes",
    paragraphs: [
      "You can review or change some profile information and app settings in your account, disconnect an email integration, and delete supported content from the app. For privacy questions or requests, use the Contact page.",
      "We may update this policy as the service changes. The version published on this page is the current version. If a change materially affects how information is handled, we will take reasonable steps to make the change clear.",
    ],
  },
];

export default function PrivacyPolicyPage() {
  return (
    <LegalDocument
      eyebrow="Your information"
      title="Privacy policy"
      updated="November 6, 2026"
      sections={sections}
    />
  );
}
