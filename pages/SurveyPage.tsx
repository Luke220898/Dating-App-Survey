import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Answers, Question, QuestionType } from '../types';
import { ITALIAN_CITIES } from '../data/cities';
import ProgressBar from '../components/ProgressBar';
import QuestionDisplay from '../components/QuestionDisplay';
import { createPartialSubmission, updateSurveyAnswers, finalizeSurvey } from '../services/apiService';
import { useLanguage } from '../contexts/LanguageContext';
import LanguageSwitcher from '../components/LanguageSwitcher';

const ArrowLeftIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-6 h-6"}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
  </svg>
);

const CheckIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className || "w-6 h-6"}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
  </svg>
);

interface SurveyPageProps {
  questions: Question[];
  answers: Answers;
  setAnswers: React.Dispatch<React.SetStateAction<Answers>>;
  currentQuestionIndex: number;
  setCurrentQuestionIndex: React.Dispatch<React.SetStateAction<number>>;
}

const SurveyPage: React.FC<SurveyPageProps> = ({ questions, answers, setAnswers, currentQuestionIndex, setCurrentQuestionIndex }) => {
  const { t } = useLanguage();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [emailConsent, setEmailConsent] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [navTransitioning, setNavTransitioning] = useState(false);

  // Restore persisted submission data (handles HMR / refresh mid-survey)
  useEffect(() => {
    try {
      const savedId = window.localStorage.getItem('surveySubmissionId');
      const savedStart = window.localStorage.getItem('surveyStartTime');
      if (savedId) setSubmissionId(savedId);
      if (savedStart) setStartTime(parseInt(savedStart, 10));
    } catch (e) {
      // Ignore storage errors (e.g., private mode)
      console.warn('Storage restore failed', e);
    }
  }, []);

  useEffect(() => {
    const email = answers.collectEmail as string;
    if (email && email.length > 0) {
      const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      if (!isValid) {
        setEmailError(t('survey.emailError') as string);
      } else {
        setEmailError(null);
      }
    } else {
      setEmailError(null);
    }
  }, [answers.collectEmail, t]);

  const allPossibleQuestions = useMemo(() =>
    questions.filter(q =>
      q.type !== QuestionType.Welcome &&
      q.type !== QuestionType.ThankYou &&
      q.type !== QuestionType.Email
    ), [questions]);

  const visibleQuestions = useMemo(() => questions.filter(q => {
    return !q.condition || q.condition(answers);
  }), [answers, questions]);

  const currentQuestion = visibleQuestions[currentQuestionIndex];

  // Normalize current question answer to avoid undefined causing uncontrolled->controlled warnings
  useEffect(() => {
    if (!currentQuestion) return;
    const existing = answers[currentQuestion.id];
    if (existing !== undefined) return; // already initialized (could be null or '')
    setAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: ((): any => {
        switch (currentQuestion.type) {
          case QuestionType.Radio:
          case QuestionType.Text:
          case QuestionType.Textarea:
          case QuestionType.Autocomplete:
            return '';
          case QuestionType.Number:
            return '';
          case QuestionType.Checkbox:
            return [] as string[];
          case QuestionType.Ranking:
            return [] as string[]; // will be populated/shuffled in component
          default:
            return '';
        }
      })()
    }));
  }, [currentQuestion, answers, setAnswers]);

  const totalProgressSteps = allPossibleQuestions.length;
  const currentProgress = useMemo(() => {
    if (!currentQuestion) return 0;
    const currentIndexInAll = allPossibleQuestions.findIndex(q => q.id === currentQuestion.id);
    return currentIndexInAll >= 0 ? currentIndexInAll : totalProgressSteps;
  }, [currentQuestion, allPossibleQuestions, totalProgressSteps]);


  const handleAnswer = useCallback((answer: any) => {
    setAnswers(prev => ({ ...prev, [currentQuestion.id]: answer }));
  }, [currentQuestion, setAnswers]);

  const isAnswerValid = () => {
    if (!currentQuestion) return false;
    const answer = answers[currentQuestion.id];

    if (!currentQuestion.required) return true;
    if (answer === null || answer === undefined) return false;

    // Specific validation for Autocomplete (City)
    if (currentQuestion.id === 'city') {
      return typeof answer === 'string' && ITALIAN_CITIES.includes(answer);
    }

    // General validation for empty answers
    if (Array.isArray(answer) && answer.length === 0) return false;
    if (typeof answer === 'string' && answer.trim() === '') return false;

    // Validation for "Other" option: if "Other" is chosen, the text must not be empty.
    const options = currentQuestion.options;
    if (options && !Array.isArray(options) && options.hasOwnProperty('other')) {
      if (Array.isArray(answer)) { // Checkbox
        const customAnswer = answer.find(a => !options.hasOwnProperty(a));
        if (customAnswer !== undefined && customAnswer.trim() === '') {
          return false; // "Other" is selected, but the text is empty.
        }
      } else if (typeof answer === 'string') { // Radio
        // If the answer is not one of the predefined keys, it's a custom answer.
        if (!options.hasOwnProperty(answer) && answer.trim() === '') {
          return false; // It's a custom "Other" answer, and it's empty.
        }
      }
    }

    // The placeholder for an empty "Other" input is ' '. Trimmed, it's '', so the general validation handles it.
    if (answer === ' ') return false;
    if (Array.isArray(answer) && answer.includes(' ')) return false;


    return true;
  };

  const handleNext = async () => {
    if (!currentQuestion) return;

    // --- Case 1: Starting the survey from Welcome screen ---
    if (currentQuestion.type === QuestionType.Welcome) {
      setSubmissionError(null);
      setIsSubmitting(true);
      try {
        const newSubmission = await createPartialSubmission();
        setSubmissionId(newSubmission.id);
        const now = Date.now();
        setStartTime(now);
        try {
          window.localStorage.setItem('surveySubmissionId', newSubmission.id);
          window.localStorage.setItem('surveyStartTime', String(now));
        } catch (e) {
          console.warn('Storage save failed', e);
        }
        const welcomeIndex = visibleQuestions.findIndex(q => q.id === 'welcome');
        setCurrentQuestionIndex(welcomeIndex + 1);
      } catch (error) {
        console.error("Failed to start survey", error);
        setSubmissionError(t('survey.submissionError') as string);
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // Persist answers on navigation for all other questions.
    if (submissionId) {
      updateSurveyAnswers(submissionId, answers);
    }

    const isFinalStep = currentQuestion.type === QuestionType.Email;

    // --- Case 2: Finalizing the survey ---
    if (isFinalStep) {
      // Fallback: if submissionId lost (e.g., HMR reset), recreate silently
      if (!submissionId) {
        try {
          const recreated = await createPartialSubmission();
          setSubmissionId(recreated.id);
          const recreatedStart = Date.now();
          setStartTime(recreatedStart);
          try {
            window.localStorage.setItem('surveySubmissionId', recreated.id);
            window.localStorage.setItem('surveyStartTime', String(recreatedStart));
          } catch (e) { console.warn('Storage save failed', e); }
        } catch (e) {
          setSubmissionError("Error: Submission ID not found. Cannot submit.");
          return;
        }
      }
      setIsSubmitting(true);
      setSubmissionError(null);
      try {
        const duration = startTime ? Math.round((Date.now() - startTime) / 1000) : null;
        const finalAnswers = { ...answers, emailConsent };

        Object.keys(finalAnswers).forEach(key => {
          const answer = finalAnswers[key];
          if (answer === ' ') finalAnswers[key] = '';
          if (Array.isArray(answer)) {
            finalAnswers[key] = answer.map(a => a === ' ' ? '' : a);
          }
        });

        await finalizeSurvey(submissionId!, finalAnswers, duration);

        // Clear persisted info on successful completion
        try {
          window.localStorage.removeItem('surveySubmissionId');
          window.localStorage.removeItem('surveyStartTime');
        } catch (e) { /* ignore */ }

        const currentVisibleIndex = visibleQuestions.findIndex(q => q.id === currentQuestion.id);
        const nextVisibleQuestion = visibleQuestions[currentVisibleIndex + 1];
        if (nextVisibleQuestion) {
          setCurrentQuestionIndex(currentVisibleIndex + 1);
        }
      } catch (error) {
        setSubmissionError(t('survey.submissionError') as string);
        console.error(error);
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // --- Case 3: Navigating between regular questions ---
    if (isAnswerValid()) {
      const currentVisibleIndex = visibleQuestions.findIndex(q => q.id === currentQuestion.id);
      if (currentVisibleIndex < visibleQuestions.length - 1) {
        setNavTransitioning(true);
        const targetIndex = currentVisibleIndex + 1;
        // Micro-delay per mostrare feedback “Avanti…” senza rallentare percezione (>=120ms)
        const start = performance.now();
        setCurrentQuestionIndex(targetIndex);
        requestAnimationFrame(() => {
          const elapsed = performance.now() - start;
          const remaining = elapsed < 120 ? 120 - elapsed : 0;
          setTimeout(() => setNavTransitioning(false), remaining);
        });
      }
    }
  };

  const handleBack = () => {
    if (!currentQuestion) return;
    const currentVisibleIndex = visibleQuestions.findIndex(q => q.id === currentQuestion.id);

    if (currentVisibleIndex > 0) {
      if (submissionId) {
        updateSurveyAnswers(submissionId, answers);
      }
      setCurrentQuestionIndex(currentVisibleIndex - 1);
    }
  };

  const isNextDisabled = () => {
    if (!currentQuestion) return true;
    if (currentQuestion.type === QuestionType.Email) {
      return (!!answers.collectEmail && emailError !== null) || (!!answers.collectEmail && !emailConsent);
    }
    return currentQuestion.required && !isAnswerValid();
  }

  const renderContent = () => {
    if (!currentQuestion) return null;
    switch (currentQuestion.type) {
      case QuestionType.Welcome:
        return (
          <div className="text-center">
            <h1 className="text-fluid-hero font-bold mb-4">{currentQuestion.text}</h1>
            <p className="text-lg max-w-2xl mx-auto mb-8">{currentQuestion.intro}</p>
            <button
              onClick={handleNext}
              disabled={isSubmitting}
              className="bg-primary text-white font-bold py-3 px-8 rounded-lg text-lg hover:bg-opacity-90 disabled:bg-gray-400"
            >
              {isSubmitting ? (t('survey.submitting') as string) : (t('survey.start') as string)}
            </button>
            {submissionError && <p className="text-red-500 mt-4">{submissionError}</p>}
          </div>
        );
      case QuestionType.Email:
        const consentTextParts = (t('survey.consentLabel') as string).split('<a>');
        return (
          <div>
            {currentQuestion.intro && <p className="text-lg text-gray-600 mb-4">{currentQuestion.intro}</p>}
            <h2 className="text-3xl font-bold mb-8">{currentQuestion.text}</h2>
            <div className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-md font-medium text-gray-700 mb-2">{t('survey.emailLabel') as string}</label>
                <input type="email" id="email" value={(answers.collectEmail as string) || ''} onChange={(e) => handleAnswer(e.target.value)} placeholder={t('survey.emailPlaceholder') as string} className="w-full p-3 text-xl bg-secondary text-white rounded-lg focus:ring-2 focus:ring-blue-400 focus:outline-none placeholder:text-gray-400" />
                {emailError && <p className="text-red-500 text-sm mt-2">{emailError}</p>}
              </div>
              {answers.collectEmail && (
                <label className="flex items-start space-x-3 cursor-pointer">
                  <input type="checkbox" checked={emailConsent} onChange={(e) => setEmailConsent(e.target.checked)} className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary mt-1 flex-shrink-0" />
                  <span className="text-sm text-gray-600">
                    {consentTextParts[0]}
                    <Link to="/privacy" className="underline text-primary hover:text-opacity-80">{t('common.privacyPolicy') as string}</Link>
                    {consentTextParts[1]}
                  </span>
                </label>
              )}
            </div>
          </div>
        );
      case QuestionType.ThankYou:
        return (
          <div className="text-center">
            <h1 className="text-fluid-hero font-bold mb-4 text-success">{currentQuestion.text}</h1>
            <p className="text-lg max-w-2xl mx-auto">{currentQuestion.intro}</p>
          </div>
        );
      default:
        return <QuestionDisplay question={currentQuestion} onAnswer={handleAnswer} currentAnswer={answers[currentQuestion.id]} />;
    }
  }

  return (
    <div className="flex flex-col min-h-dvh layout-transition">
      {/* Top bar: compact on mobile, spacious on md+ */}
      <header className="w-full px-2 sm:px-3 py-2 md:p-4 sticky top-0 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b border-gray-200">
        <div className="content-container flex flex-col gap-2 md:flex-row md:justify-between md:items-center">
          <div className="flex justify-between items-center">
            <Link to="/admin" className="text-[11px] md:text-sm text-gray-500 hover:text-primary transition-colors">{t('common.adminDashboard') as string}</Link>
            <div className="md:hidden ml-4"><LanguageSwitcher /></div>
          </div>
          {/* Progress bar moved to top on mobile for better immediate context */}
          {currentQuestion && currentQuestion.type !== QuestionType.Welcome && currentQuestion.type !== QuestionType.ThankYou && (
            <div className="w-full md:order-none order-3 md:mt-0">
              <ProgressBar current={currentProgress} total={totalProgressSteps} />
            </div>
          )}
          <div className="hidden md:block"><LanguageSwitcher /></div>
        </div>
      </header>
      <main className="flex-grow px-2 sm:px-3 pt-4 pb-20 md:pb-10 md:pt-10 overflow-x-hidden">
        <div className="content-container compact-vertical-space">
          <div key={currentQuestion?.id} className="relative min-w-0 animate-fade-slide" aria-live="polite">
            {renderContent()}
          </div>

          {/* Action buttons below question/options */}
          {currentQuestion && currentQuestion.type !== QuestionType.Welcome && currentQuestion.type !== QuestionType.ThankYou && (
            <div className={`mt-6 md:mt-10 col-span-full ${(() => {
              if ([QuestionType.Radio, QuestionType.Checkbox, QuestionType.Ranking].includes(currentQuestion.type)) {
                const optCount = currentQuestion.options && !Array.isArray(currentQuestion.options) ? Object.keys(currentQuestion.options).filter(k => k !== 'other').length : 0;
                return optCount < 3 ? 'pt-4 border-t border-gray-200/60' : 'pt-6 border-t border-gray-200';
              }
              return '';
            })()}`}>
              <div className="flex flex-col gap-3 md:gap-4 max-w-md mx-auto w-full">
                <button
                  onClick={handleNext}
                  disabled={isNextDisabled() || isSubmitting}
                  className="bg-primary text-white font-semibold md:font-bold py-3 px-6 rounded-md text-base md:text-lg flex items-center justify-center gap-2 disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-opacity-90 active:scale-[0.985] transition shadow w-full"
                >
                  {isSubmitting || navTransitioning ? (t('survey.submitting') as string) : (currentQuestion.type === QuestionType.Email ? t('survey.submit') as string : t('survey.ok') as string)}
                  {!isSubmitting && <CheckIcon className="w-5 h-5" />}
                </button>
                {currentQuestionIndex > 0 && (
                  <button
                    onClick={handleBack}
                    className="text-sm md:text-base text-gray-500 hover:text-primary transition font-medium flex items-center justify-center gap-1 w-full mt-1"
                    aria-label={t('survey.backButton') as string}
                    type="button"
                  >
                    <ArrowLeftIcon className="w-4 h-4" /> {t('survey.backButton') as string}
                  </button>
                )}
              </div>
              {submissionError && <p className="text-red-500 mt-4 text-center">{submissionError}</p>}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default SurveyPage;