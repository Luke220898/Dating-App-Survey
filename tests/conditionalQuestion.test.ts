import { describe, it, expect } from 'vitest';
import { QuestionType, Answers, Question } from '../types';

const paidQuestion: Question = { id: 'paid', type: QuestionType.Radio, text: 'Paid?', options: { yes: 'Yes', no: 'No' } };
const reasonQuestion: Question = { id: 'paidReason', type: QuestionType.Radio, text: 'Reason', options: { a: 'A', other: 'Other' }, condition: (answers: Answers) => answers['paid'] === 'yes' };

describe('conditional question', () => {
  it('condition true when paid is yes', () => {
    const answers: Answers = { paid: 'yes' };
    expect(reasonQuestion.condition!(answers)).toBe(true);
  });
  it('condition false when paid is no', () => {
    const answers: Answers = { paid: 'no' };
    expect(reasonQuestion.condition!(answers)).toBe(false);
  });
});
