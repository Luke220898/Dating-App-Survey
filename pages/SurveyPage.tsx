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

const CheckIcon: React.FC<{className?: string}> = ({ className }) => (
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
    if(answer === ' ') return false;
    if(Array.isArray(answer) && answer.includes(' ')) return false;


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
            setStartTime(Date.now());
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
        if (!submissionId) {
            setSubmissionError("Error: Submission ID not found. Cannot submit.");
            return;
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

            await finalizeSurvey(submissionId, finalAnswers, duration);
            
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
            setCurrentQuestionIndex(currentVisibleIndex + 1);
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
    switch(currentQuestion.type) {
      case QuestionType.Welcome:
        return (
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">{currentQuestion.text}</h1>
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
                            <input type="checkbox" checked={emailConsent} onChange={(e) => setEmailConsent(e.target.checked)} className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary mt-1 flex-shrink-0"/>
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
            <h1 className="text-4xl font-bold mb-4 text-success">{currentQuestion.text}</h1>
            <p className="text-lg max-w-2xl mx-auto">{currentQuestion.intro}</p>
          </div>
        );
      default:
        return <QuestionDisplay question={currentQuestion} onAnswer={handleAnswer} currentAnswer={answers[currentQuestion.id]} />;
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      <header className="w-full p-4">
        <div className="max-w-3xl mx-auto flex justify-between items-center">
            <Link to="/admin" className="text-sm text-gray-500 hover:text-primary transition-colors">{t('common.adminDashboard') as string}</Link>
            <LanguageSwitcher />
        </div>
      </header>
      <main className="flex-grow flex items-center justify-center p-4">
        <div className="w-full max-w-3xl">
          {currentQuestion && currentQuestion.type !== QuestionType.Welcome && currentQuestion.type !== QuestionType.ThankYou && (
              <div className="mb-8">
                  <ProgressBar current={currentProgress} total={totalProgressSteps} />
              </div>
          )}
          
          <div className="relative">
              {renderContent()}
          </div>

          {currentQuestion && currentQuestion.type !== QuestionType.Welcome && currentQuestion.type !== QuestionType.ThankYou && (
            <div className="mt-8">
              <div className="flex items-center gap-4">
                 {currentQuestionIndex > 0 && (
                      <button
                          onClick={handleBack}
                          className="bg-gray-200 text-secondary p-3 rounded-md hover:bg-gray-300"
                          aria-label={t('survey.backButton') as string}
                      >
                          <ArrowLeftIcon className="w-6 h-6" />
                      </button>
                  )}
                  <button 
                    onClick={handleNext} 
                    disabled={isNextDisabled() || isSubmitting}
                    className="bg-primary text-white font-bold py-2 px-6 rounded-md text-lg flex items-center justify-center gap-2 disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-opacity-90 flex-grow"
                  >
                    {isSubmitting ? t('survey.submitting') as string : (currentQuestion.type === QuestionType.Email ? t('survey.submit') as string : t('survey.ok') as string)}
                    {!isSubmitting && <CheckIcon className="w-5 h-5"/>}
                  </button>
              </div>
              {submissionError && <p className="text-red-500 mt-4">{submissionError}</p>}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default SurveyPage;