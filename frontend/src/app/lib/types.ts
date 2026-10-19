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

export interface Simulation {
  feeling: "relieved" | "satisfied" | "neutral" | "confused" | "annoyed" | "angry";
  escalation_risk: number; // 1 to 5
  first_reaction: string;
  confusing_parts: string[];
  fix: string;
}

export interface Settings {
  business: string;
  knowledge: string;
  tone: string;
  language: string;
}

export type Status = "new" | "replied" | "resolved";

export interface PriorContact {
  count: number;
  lastAt: number;
  summaries: string[];
  moods: Sentiment[];
}

export interface HistoryItem {
  id: string;
  at: number;
  message: string;
  result: Triage;
  status?: Status;
  reply?: string;
  prior?: PriorContact;
}

export interface Gap {
  topic: string;
  count: number;
  example: string;
  fact_label: string;
}

export interface Proposal {
  title: string;
  summary: string;
  scope: string[];
  timeline: string | null;
  price: string | null;
  assumptions: string[];
  open_questions: string[];
  email_body: string;
}

export interface InboxEmail {
  from_name: string;
  from_email: string;
  subject: string;
  date: string;
  message_id: string;
  body: string;
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
  signals?: string[];
}
