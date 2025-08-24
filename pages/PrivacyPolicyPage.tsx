import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import LanguageSwitcher from '../components/LanguageSwitcher';

const PrivacyPolicyPage: React.FC = () => {
    const { t } = useLanguage();
    
    return (
        <div className="bg-white min-h-screen">
            <header className="p-4 sm:p-8 sticky top-0 bg-white/80 backdrop-blur-sm border-b border-gray-200">
                <div className="max-w-3xl mx-auto flex justify-between items-center">
                    <Link to="/" className="text-sm text-gray-500 hover:text-primary transition-colors">
                        &larr; {t('common.backToSurvey')}
                    </Link>
                    <LanguageSwitcher />
                </div>
            </header>
            <main className="p-4 sm:p-8">
                <div className="max-w-3xl mx-auto text-gray-700 leading-relaxed">
                    <h1 className="text-3xl sm:text-4xl font-bold text-primary mb-6">{t('privacy.title')}</h1>
                    <p className="mb-6 text-sm text-gray-500">{t('privacy.lastUpdated')}</p>
                    
                    <p className="mb-8">{t('privacy.intro')}</p>

                    <section className="mb-8">
                        <h2 className="text-2xl font-bold text-secondary mb-3">{t('privacy.controller.title')}</h2>
                        <p>
                            {t('privacy.controller.text')} <br />
                            <strong>Luca Emelino</strong> <br />
                            {t('privacy.controller.emailLabel')} <a href="mailto:emelinoluca@gmail.com" className="text-primary underline">emelinoluca@gmail.com</a>
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-bold text-secondary mb-3">{t('privacy.dataCollected.title')}</h2>
                        <p className="mb-4">{t('privacy.dataCollected.intro')}</p>
                        <h3 className="text-xl font-semibold text-secondary mb-2">{t('privacy.dataCollected.personal.title')}</h3>
                        <p>{t('privacy.dataCollected.personal.text')}</p>
                        
                        <h3 className="text-xl font-semibold text-secondary mt-6 mb-2">{t('privacy.dataCollected.anonymous.title')}</h3>
                        <p>{t('privacy.dataCollected.anonymous.text')}</p>
                        <ul className="list-disc list-inside mt-2 space-y-1">
                            {(t('privacy.dataCollected.anonymous.items') as string[]).map((item, i) => <li key={i}>{item}</li>)}
                        </ul>
                         <p className="mt-4 text-sm text-gray-500">{t('privacy.dataCollected.philosophy')}</p>
                    </section>
                    
                    <section className="mb-8">
                        <h2 className="text-2xl font-bold text-secondary mb-3">{t('privacy.purpose.title')}</h2>
                        <p>{t('privacy.purpose.text')}</p>
                        <ul className="list-disc list-inside mt-2 space-y-1">
                             {(t('privacy.purpose.items') as string[]).map((item, i) => <li key={i}>{item}</li>)}
                        </ul>
                        <p className="mt-2">{t('privacy.purpose.footer')}</p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-bold text-secondary mb-3">{t('privacy.legalBasis.title')}</h2>
                        <p dangerouslySetInnerHTML={{ __html: t('privacy.legalBasis.text') as string }} />
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-bold text-secondary mb-3">{t('privacy.processing.title')}</h2>
                        <p className="mb-4">{t('privacy.processing.text')}</p>
                        <ul className="list-disc list-inside mt-2 space-y-1">
                            {(t('privacy.processing.items') as string[]).map((item, i) => <li key={i} dangerouslySetInnerHTML={{ __html: item }} />)}
                        </ul>
                        <p className="mt-4">{t('privacy.processing.footer')}</p>
                        <p className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-900"
                           dangerouslySetInnerHTML={{ __html: t('privacy.processing.note') as string }}
                        />
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-bold text-secondary mb-3">{t('privacy.retention.title')}</h2>
                        <p>{t('privacy.retention.text')}</p>
                    </section>
                    
                    <section className="mb-8">
                        <h2 className="text-2xl font-bold text-secondary mb-3">{t('privacy.rights.title')}</h2>
                        <p>{t('privacy.rights.text')}</p>
                         <ul className="list-disc list-inside mt-2 space-y-1">
                            {(t('privacy.rights.items') as string[]).map((item, i) => <li key={i} dangerouslySetInnerHTML={{ __html: item }}/>)}
                        </ul>
                        <p className="mt-2" dangerouslySetInnerHTML={{ __html: t('privacy.rights.footer') as string }} />
                    </section>
                </div>
            </main>
        </div>
    );
};

export default PrivacyPolicyPage;