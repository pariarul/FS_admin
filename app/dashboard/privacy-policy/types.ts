// Shared types for Privacy Policy

export type Block =
  | { type: 'description'; text: string | string[] } // Allow `text` to be string or string[]
  | { type: 'points'; items: string[] };

export interface PrivacySection {
  id: string;
  en: { title: string; blocks: Block[]; description?: string[]; points?: string[][] };
  zh: { title: string; blocks: Block[]; description?: string[]; points?: string[][] };
  si: { title: string; blocks: Block[]; description?: string[]; points?: string[][] };
}

export interface PrivacyPolicy {
  heading: { en: string; zh: string; si: string };
  sections: PrivacySection[];
}