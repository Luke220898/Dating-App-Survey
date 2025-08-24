export enum QuestionType {
  Welcome,
  Number,
  Radio,
  Text,
  Checkbox,
  Ranking,
  Textarea,
  Email,
  ThankYou,
  Autocomplete
}

export type Language = 'it' | 'en';

export interface Question {
  id: string;
  type: QuestionType;
  text: string;
  intro?: string;
  options?: string[] | Record<string, string>;
  required?: boolean;
  condition?: (answers: Answers) => boolean;
}

export type Answer = string | string[] | number | boolean | null;

export interface Answers {
  [key: string]: Answer;
}

export interface SubmissionMetadata {
  source?: string;
  device?: string;
  country?: string;
  city?: string;
  browser?: string;
  os?: string;
}

export interface Submission {
  id: string;
  timestamp: string;
  answers: Answers;
  status: 'completed' | 'partial';
  metadata?: SubmissionMetadata;
  duration_seconds?: number;
}

export interface Translations {
    [key: string]: string | string[] | Translations;
}