
import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback } from 'react';
import { Language, Translations } from '../types';

interface LanguageContextType {
    language: Language;
    setLanguage: (language: Language) => void;
    t: (key: string) => string | string[];
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const getNestedValue = (obj: Translations, key: string): string | string[] | Translations | undefined => {
    return key.split('.').reduce<any>((acc, part) => acc && acc[part], obj);
};

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [language, setLanguage] = useState<Language>('it');
    const [translations, setTranslations] = useState<Translations>({});

    useEffect(() => {
        const fetchTranslations = async () => {
            try {
                const response = await fetch(`/locales/${language}.json`);
                if (!response.ok) {
                    throw new Error(`Failed to load ${language}.json`);
                }
                const data = await response.json();
                setTranslations(data);
            } catch (error) {
                console.error("Error fetching translations:", error);
                // Fallback to Italian if English fails or is missing
                if (language !== 'it') {
                    setLanguage('it');
                }
            }
        };
        fetchTranslations();
    }, [language]);
    
    const t = useCallback((key: string): string | string[] => {
        const value = getNestedValue(translations, key);
        if (value === undefined) {
            console.warn(`Translation key not found: ${key}`);
            return key;
        }
        return value as string | string[];
    }, [translations]);

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {Object.keys(translations).length > 0 ? children : <div>Loading translations...</div>}
        </LanguageContext.Provider>
    );
};

export const useLanguage = (): LanguageContextType => {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
};
