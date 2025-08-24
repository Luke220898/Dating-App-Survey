
import React, { useState, useMemo } from 'react';
import { HashRouter, Routes, Route, Link } from 'react-router-dom';
import SurveyPage from './pages/SurveyPage';
import AdminDashboard from './pages/AdminDashboard';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import { Answers, Language } from './types';
import { useLanguage } from './contexts/LanguageContext';
import { getLocalizedQuestions } from './constants';

function App() {
  const { language, t } = useLanguage();
  const [answers, setAnswers] = useState<Answers>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  // Memoize questions to prevent re-calculating on every render
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
            <Route path="/admin" element={<AdminDashboard questions={surveyQuestions} />} />
            <Route path="/privacy" element={<PrivacyPolicyPage />} />
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