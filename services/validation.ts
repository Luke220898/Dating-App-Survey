import { Question, QuestionType, Answers, Answer } from '../types';

export interface ValidationIssue { field: string; message: string; }

export const validateEmail = (value: string): boolean => {
  if (!value) return true; // optional
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
};

export function isAnswered(q: Question, answers: Answers): boolean {
  const a = answers[q.id];
  if (a === null || a === undefined) return false;
  if (q.type === QuestionType.Checkbox) return Array.isArray(a) && a.length > 0;
  if (q.type === QuestionType.Radio || q.type === QuestionType.Autocomplete || q.type === QuestionType.Text || q.type === QuestionType.Textarea) return typeof a === 'string' && a.trim() !== '';
  if (q.type === QuestionType.Number) return typeof a === 'number' && !isNaN(a);
  if (q.type === QuestionType.Ranking) return Array.isArray(a) && a.length > 0;
  return true;
}

export function validateRequired(questions: Question[], answers: Answers): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  for (const q of questions) {
    if (!q.required) continue;
    if (!isAnswered(q, answers)) {
      issues.push({ field: q.id, message: 'required' });
    }
  }
  return issues;
}
