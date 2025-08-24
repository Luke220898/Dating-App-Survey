import { Question, QuestionType, Translations } from './types';
import { ITALIAN_CITIES } from './data/cities';

export const getLocalizedQuestions = (t: (key: string) => string | string[] | Record<string, string>): Question[] => [
  {
    id: 'welcome',
    type: QuestionType.Welcome,
    text: t('questions.welcome.text') as string,
    intro: t('questions.welcome.intro') as string,
  },
  {
    id: 'age',
    type: QuestionType.Radio,
    text: t('questions.age.text') as string,
    options: t('questions.age.options') as Record<string, string>,
    required: true,
  },
  {
    id: 'gender',
    type: QuestionType.Radio,
    text: t('questions.gender.text') as string,
    options: t('questions.gender.options') as Record<string, string>,
    required: true,
  },
  {
    id: 'city',
    type: QuestionType.Autocomplete,
    text: t('questions.city.text') as string,
    options: ITALIAN_CITIES, // This remains Italian as it's a specific dataset
    required: true,
  },
  {
    id: 'apps',
    type: QuestionType.Checkbox,
    text: t('questions.apps.text') as string,
    options: t('questions.apps.options') as Record<string, string>,
    required: true,
  },
  {
    id: 'paid',
    type: QuestionType.Radio,
    text: t('questions.paid.text') as string,
    options: t('questions.paid.options') as Record<string, string>,
    required: true,
  },
  {
    id: 'paidReason',
    type: QuestionType.Radio,
    intro: t('questions.paidReason.intro') as string,
    text: t('questions.paidReason.text') as string,
    options: t('questions.paidReason.options') as Record<string, string>,
    required: true,
    condition: (answers) => answers.paid === 'yes', // Robust condition
  },
  {
    id: 'frustrations',
    type: QuestionType.Ranking,
    intro: t('questions.frustrations.intro') as string,
    text: t('questions.frustrations.text') as string,
    options: t('questions.frustrations.options') as Record<string, string>,
    required: true,
  },
  {
    id: 'changeOneThing',
    type: QuestionType.Textarea,
    text: t('questions.changeOneThing.text') as string,
    required: true,
  },
  {
    id: 'businessModel',
    type: QuestionType.Radio,
    text: t('questions.businessModel.text') as string,
    options: t('questions.businessModel.options') as Record<string, string>,
    required: true,
  },
  {
    id: 'collectEmail',
    type: QuestionType.Email,
    text: t('questions.collectEmail.text') as string,
    intro: t('questions.collectEmail.intro') as string,
  },
  {
    id: 'thankyou',
    type: QuestionType.ThankYou,
    text: t('questions.thankyou.text') as string,
    intro: t('questions.thankyou.intro') as string,
  },
];