// types.ts - TypeScript descriptions of the data we send and receive.
export type Category =
  | "new_project"
  | "support"
  | "bug_report"
  | "billing"
  | "partnership"
  | "spam";
export type Sentiment = "positive" | "neutral" | "frustrated" | "angry";
export type Team = "sales" | "support" | "billing" | "management";

// An uploaded picture, already shrunk and turned into base64 text.
export interface Img {
  name: string;
  preview: string; // data URL used to show the thumbnail
  data: string; // base64 text sent to the backend
  media_type: "image/jpeg" | "image/png" | "image/webp";
}

// Claude's answer. Mirrors the Triage class in main.py.
export interface Triage {
  category: Category;
  urgency: number; // 1 to 5
  sentiment: Sentiment;
  team: Team;
  sender_name: string | null;
  sender_email: string | null;
  budget: string | null;
  summary: string;
  next_step: string;
  missing_info: string[];
  image_notes: string | null;
  needs_review: boolean; // true = a human should check before sending
  review_reason: string | null;
  reply_draft: string;
}
