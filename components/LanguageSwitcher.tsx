
import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';

const LanguageSwitcher: React.FC = () => {
    const { language, setLanguage } = useLanguage();

    return (
        <div className="flex items-center space-x-1 bg-white p-1 rounded-md border border-gray-200">
            <button
                onClick={() => setLanguage('it')}
                className={`px-2 py-1 text-xs font-bold rounded ${
                    language === 'it' ? 'bg-primary text-white' : 'bg-transparent text-gray-500 hover:bg-gray-100'
                }`}
            >
                IT
            </button>
            <button
                onClick={() => setLanguage('en')}
                className={`px-2 py-1 text-xs font-bold rounded ${
                    language === 'en' ? 'bg-primary text-white' : 'bg-transparent text-gray-500 hover:bg-gray-100'
                }`}
            >
                EN
            </button>
        </div>
    );
};

export default LanguageSwitcher;
