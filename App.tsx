import React, { useState, useMemo, Suspense } from 'react';
import { HashRouter, Routes, Route, Link } from 'react-router-dom';
import SurveyPage from './pages/SurveyPage';
// Lazy loaded heavy routes
const AdminDashboard = React.lazy(() => import('./pages/AdminDashboard'));
const PrivacyPolicyPage = React.lazy(() => import('./pages/PrivacyPolicyPage'));
import { Answers } from './types';
import { useLanguage } from './contexts/LanguageContext';
import { getLocalizedQuestions } from './constants';

function App() {
  const { language, t } = useLanguage();
  const [answers, setAnswers] = useState<Answers>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  const surveyQuestions = useMemo(() => getLocalizedQuestions(t), [language, t]);

  return (
    <HashRouter>
      <div className="bg-background text-secondary min-h-screen font-sans flex flex-col">
        <main className="flex-grow">
          <Routes>
            <Route
              path="/"
              element={
                <SurveyPage
                  questions={surveyQuestions}
                  answers={answers}
                  setAnswers={setAnswers}
                  currentQuestionIndex={currentQuestionIndex}
                  setCurrentQuestionIndex={setCurrentQuestionIndex}
                />
              }
            />
            <Route path="/admin" element={<Suspense fallback={<div className='p-8 text-sm text-gray-500'>Loading dashboard...</div>}><AdminDashboard questions={surveyQuestions} /></Suspense>} />
            <Route path="/privacy" element={<Suspense fallback={<div className='p-8 text-sm text-gray-500'>Loading privacy policy...</div>}><PrivacyPolicyPage /></Suspense>} />
          </Routes>
        </main>
        <footer className="w-full text-center p-4 mt-auto">
          <Link to="/privacy" className="text-xs text-gray-400 hover:text-primary transition-colors">{t('common.privacyPolicy')}</Link>
        </footer>
      </div>
    </HashRouter>
  );
}

export default App;