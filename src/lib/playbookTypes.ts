// Playbook article structured data types

export interface PlaybookArticle {
  title: string;
  subtitle: string;
  tags: string[];
  sections: PlaybookSection[];
  timeline?: TimelineEntry[];
}

export interface PlaybookSection {
  id: string;
  letter: string;
  title: string;
  icon?: string;
  content: SectionContent[];
}

export type SectionContent =
  | InfoGridContent
  | RoleCardsContent
  | StepsContent
  | CalloutContent
  | MessageTemplateContent
  | ChecklistContent
  | ParagraphContent
  | TableContent
  | ListContent
  | ImageGalleryContent
  | DocumentLinksContent
  | InlineImageContent;

export interface InfoGridContent {
  type: 'info-grid';
  items: InfoGridItem[];
}

export interface InfoGridItem {
  title: string;
  icon?: string;
  items: { label: string; value: string }[];
}

export interface RoleCardsContent {
  type: 'role-cards';
  roles: RoleCard[];
}

export interface RoleCard {
  title: string;
  description: string;
  color?: 'blue' | 'teal' | 'purple' | 'orange' | 'green' | 'red';
}

export interface StepsContent {
  type: 'steps';
  steps: Step[];
}

export interface Step {
  number: number;
  title: string;
  description?: string;
  substeps?: string[];
}

export interface CalloutContent {
  type: 'callout';
  variant: 'warning' | 'info' | 'success' | 'tip';
  title?: string;
  text: string;
}

export interface MessageTemplateContent {
  type: 'message-template';
  label: string;
  content: string;
}

export interface ChecklistContent {
  type: 'checklist';
  title?: string;
  items: string[];
}

export interface ParagraphContent {
  type: 'paragraph';
  text: string;
}

export interface TableContent {
  type: 'table';
  headers: string[];
  rows: string[][];
}

export interface ListContent {
  type: 'list';
  title?: string;
  items: { label?: string; value: string }[];
}

export interface ImageGalleryContent {
  type: 'image-gallery';
  title?: string;
  images: { url: string; caption?: string }[];
}

export interface DocumentLinksContent {
  type: 'document-links';
  title?: string;
  files: { name: string; url: string; description?: string }[];
}

export interface InlineImageContent {
  type: 'inline-image';
  url: string;
  caption?: string;
  alt?: string;
}

export interface TimelineEntry {
  date: string;
  author: string;
  description: string;
}

// Section colors for the letter markers
export const SECTION_COLORS: Record<string, string> = {
  A: 'bg-blue-500',
  B: 'bg-orange-500',
  C: 'bg-teal-500',
  D: 'bg-purple-500',
  E: 'bg-green-500',
  F: 'bg-rose-500',
  G: 'bg-amber-500',
  H: 'bg-indigo-500',
  I: 'bg-cyan-500',
  J: 'bg-pink-500',
};

export const ROLE_COLORS: Record<string, { bg: string; border: string }> = {
  blue: { bg: 'bg-blue-50', border: 'border-t-blue-500' },
  teal: { bg: 'bg-teal-50', border: 'border-t-teal-500' },
  purple: { bg: 'bg-purple-50', border: 'border-t-purple-500' },
  orange: { bg: 'bg-orange-50', border: 'border-t-orange-500' },
  green: { bg: 'bg-green-50', border: 'border-t-green-500' },
  red: { bg: 'bg-rose-50', border: 'border-t-rose-500' },
};
