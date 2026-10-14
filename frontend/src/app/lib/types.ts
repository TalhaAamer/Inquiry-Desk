export type Category =
  | "new_project"
  | "support"
  | "bug_report"
  | "billing"
  | "partnership"
  | "spam";
export type Sentiment = "positive" | "neutral" | "frustrated" | "angry";
export type Team = "sales" | "support" | "billing" | "management";

export interface Img {
  name: string;
  preview: string; 
  data: string; 
  media_type: "image/jpeg" | "image/png" | "image/webp";
}

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
  needs_review: boolean; 
  review_reason: string | null;
  reply_draft: string;
}
