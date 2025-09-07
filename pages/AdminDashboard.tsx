import React, { useEffect, useState, useMemo, FC, useDeferredValue, Suspense, useTransition, useCallback } from 'react';
import { FixedSizeList as List, ListChildComponentProps } from 'react-window';
const LazyInsightsView = React.lazy(() => import('./InsightsView'));
import { getSurveyData } from '../services/apiService';
import { Submission, Question, QuestionType, SubmissionMetadata, Answer } from '../types';
import { Link } from 'react-router-dom';
import { useSWRCache } from '../hooks/useSWRCache';
import { InsightsSkeleton, SummarySkeleton, SkeletonTable } from '../components/Skeleton';
import { DeferredMount } from '../components/DeferredMount';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { useLanguage } from '../contexts/LanguageContext';
import LanguageSwitcher from '../components/LanguageSwitcher';

// --- HELPER & UI COMPONENTS ---

const formatAnswerForDisplay = (answer: Answer, question: Question, t: (key: string) => string | string[]): string => {
    if (answer === null || answer === undefined) return '';
    if (Array.isArray(answer) && answer.length === 0) return '';

    const options = question.options;

    // Handle key-value options (Radio, Checkbox, Ranking)
    if (options && !Array.isArray(options)) {
        const optionMap = options as Record<string, string>;
        const otherText = t('common.other') as string;

        const formatSingleAnswer = (ans: string) => {
            if (optionMap[ans]) {
                return optionMap[ans]; // It's a predefined option key
            }
            // It's a custom "Other" answer.
            if (!Object.values(optionMap).includes(ans) && !Object.keys(optionMap).includes(ans)) {
                if (ans.trim() === '' || ans.trim() === ' ') {
                    return otherText; // Represents "Other" selected but with no text
                }
                return `${otherText} (${ans})`;
            }
            return ans; // Fallback for edge cases
        };

        // Handle Ranking specifically to add numbers
        if (question.type === QuestionType.Ranking && Array.isArray(answer)) {
            return answer.map((key, index) => `${index + 1}. ${optionMap[key as string] || key}`).join('; ');
        }

        // Handle Checkbox
        if (Array.isArray(answer)) {
            return answer.map(formatSingleAnswer).join(', ');
        }

        // Handle Radio or custom value
        return formatSingleAnswer(answer as string);
    }

    // Handle no options (Text)
    if (Array.isArray(answer)) return answer.join(', ');

    return String(answer);
};


interface NavLinkProps {
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
    onMouseEnter?: () => void;
    onFocus?: () => void;
}
const NavLink: FC<NavLinkProps> = ({ active, children, onClick, onMouseEnter, onFocus }) => (
    <button
        onClick={onClick}
        onMouseEnter={onMouseEnter}
        onFocus={onFocus}
        aria-current={active ? 'true' : undefined}
        className={`tab-btn relative px-3 py-2 font-medium text-sm rounded-md transition-colors ${active
            ? 'bg-gray-200 text-primary'
            : 'text-gray-500 hover:text-primary hover:bg-gray-100'
            }`}
    >
        {children}
    </button>
);

const KpiCard: FC<{ title: string; value: string | number; description?: string }> = ({ title, value, description }) => (
    <div className="kpi-card p-4 sm:p-5">
        <h3 className="text-gray-500 text-sm font-medium">{title}</h3>
        <p className="text-3xl font-bold text-primary mt-1 tracking-tight">{value}</p>
        {description && <p className="text-xs text-gray-400 mt-1">{description}</p>}
    </div>
);

const NoDataPlaceholder: FC<{ message?: string }> = ({ message }) => {
    const { t } = useLanguage();
    return (
        <div className="flex items-center justify-center h-full text-gray-400 text-sm bg-gray-50 rounded-lg py-10">
            {message || t('dashboard.noData') as string}
        </div>
    );
};


// --- SUMMARY VIEW ---

const QuestionSummary: FC<{ question: Question; submissions: Submission[] }> = ({ question, submissions }) => {
    const { t } = useLanguage();

    const { summaryData, otherAnswers, totalRespondents, totalSelections } = useMemo(() => {
        const respondents = submissions.filter(s => {
            const answer = s.answers[question.id];
            return answer !== undefined && answer !== null && answer !== '' && (!Array.isArray(answer) || answer.length > 0);
        });
        const totalRespondentsForQuestion = respondents.length;

        if (totalRespondentsForQuestion === 0 || !question.options || Array.isArray(question.options)) {
            return { summaryData: [], otherAnswers: [], totalRespondents: 0, totalSelections: 0 };
        }

        const optionMap = question.options as Record<string, string>;
        const counts: Record<string, number> = Object.fromEntries(Object.keys(optionMap).map(key => [key, 0]));
        const customAnswerCounts: Record<string, number> = {};
        let totalSelectionsCount = 0;

        respondents.forEach(sub => {
            const answer = sub.answers[question.id];
            const answerArray = Array.isArray(answer) ? answer : [answer as string];

            let hasProvidedCustomAnswer = false;
            answerArray.forEach(ans => {
                if (typeof ans !== 'string') return;
                const raw = ans; // original
                const trimmed = raw.trim();
                // placeholder ' ' (single space) or empty becomes no custom value but still counts selection if 'other' chosen
                if (trimmed.length === 0) return; // do not increment selections for empty placeholder
                totalSelectionsCount++;
                if (optionMap[raw]) {
                    counts[raw]++;
                } else if (trimmed !== '') { // real custom text
                    customAnswerCounts[trimmed] = (customAnswerCounts[trimmed] || 0) + 1;
                    hasProvidedCustomAnswer = true;
                }
            });
            if (hasProvidedCustomAnswer && counts.hasOwnProperty('other')) {
                counts['other']++;
            }
        });

        const denominator = totalRespondentsForQuestion > 0 ? totalRespondentsForQuestion : 1;

        const finalSummaryData = Object.entries(optionMap).map(([key, value]) => ({
            key: key,
            name: value,
            value: counts[key] || 0,
            percentage: ((counts[key] || 0) / denominator) * 100,
        }));

        const finalOtherAnswers = Object.entries(customAnswerCounts)
            .map(([text, count]) => ({ text, count }))
            .sort((a, b) => b.count - a.count);

        return {
            summaryData: finalSummaryData,
            otherAnswers: finalOtherAnswers,
            totalRespondents: totalRespondentsForQuestion,
            totalSelections: totalSelectionsCount
        };

    }, [question, submissions, t]);

    const getHeader = () => {
        if (question.type === QuestionType.Checkbox) {
            return `${totalSelections} ${t('dashboard.responses') as string} from ${totalRespondents} ${t('dashboard.respondents') as string}`;
        }
        return `${totalRespondents} ${totalRespondents !== 1 ? t('dashboard.responses') as string : t('dashboard.response') as string}`;
    };

    return (
        <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h3 className="font-bold text-primary mb-1">{question.text}</h3>
            <p className="text-sm text-gray-500 mb-4">{getHeader()}</p>
            {totalRespondents > 0 ? (
                <div>
                    <div className="space-y-3">
                        {summaryData.map(item => (
                            <div key={item.key}>
                                <div className="flex justify-between items-center text-sm text-gray-600 mb-1">
                                    <span>{item.name}</span>
                                    <span className="text-gray-500">{item.value} {item.value !== 1 ? t('dashboard.responses') as string : t('dashboard.response') as string}</span>
                                </div>
                                <div className="w-full bg-lightgray rounded-full h-2.5 relative">
                                    <div className="bg-primary h-2.5 rounded-full" style={{ width: `${item.percentage}%` }}></div>
                                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] font-semibold tracking-tight" style={{ color: item.percentage > 70 ? 'white' : '#2c3e50', textShadow: item.percentage > 70 ? '0 0 2px rgba(0,0,0,0.15)' : 'none' }}>
                                        {item.percentage.toFixed(2)}%
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {otherAnswers.length > 0 && (
                        <div className="mt-6 pt-4 border-t border-gray-200">
                            <h4 className="font-semibold text-primary mb-3">{t('dashboard.otherAnswers') as string}</h4>
                            <ul className="space-y-2 max-h-40 overflow-y-auto">
                                {otherAnswers.map(({ text, count }) => (
                                    <li key={text} className="flex justify-between items-center text-sm p-2 bg-gray-50 rounded-md">
                                        <span className="text-gray-800">{text}</span>
                                        <span className="text-gray-500 font-medium">{count}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            ) : <NoDataPlaceholder message={t('dashboard.noResponsesQuestion') as string} />}
        </div>
    );
};


const TextResponses: FC<{ question: Question; submissions: Submission[] }> = ({ question, submissions }) => {
    const { t } = useLanguage();
    const responses = submissions
        .map(s => s.answers[question.id])
        .filter(answer => typeof answer === 'string' && answer.trim() !== '') as string[];

    return (
        <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h3 className="font-bold text-primary mb-1">{question.text}</h3>
            <p className="text-sm text-gray-500 mb-4">{responses.length} {responses.length !== 1 ? t('dashboard.responses') as string : t('dashboard.response') as string}</p>
            {responses.length > 0 ? (
                <ul className="space-y-3 max-h-64 overflow-y-auto">
                    {responses.map((res, index) => (
                        <li key={index} className="text-sm p-3 bg-gray-50 rounded-md border border-gray-200">{res}</li>
                    ))}
                </ul>
            ) : <NoDataPlaceholder message={t('dashboard.noResponsesQuestion') as string} />}
        </div>
    );
};


const SummaryView: FC<{ questions: Question[]; submissions: Submission[] }> = ({ questions, submissions }) => {
    const answerableQuestions = questions.filter(q => q.type !== QuestionType.Welcome && q.type !== QuestionType.ThankYou && q.type !== QuestionType.Email);
    return (
        <div className="space-y-6">
            {answerableQuestions.map(q => {
                if ([QuestionType.Radio, QuestionType.Checkbox].includes(q.type)) {
                    return <QuestionSummary key={q.id} question={q} submissions={submissions} />;
                }
                if ([QuestionType.Text, QuestionType.Textarea, QuestionType.Autocomplete].includes(q.type)) {
                    return <TextResponses key={q.id} question={q} submissions={submissions} />;
                }
                // Ranking questions could have their own summary component in the future
                return null;
            })}
        </div>
    );
};


// --- SUBMISSIONS VIEW ---

// Lazy code-split SubmissionsView heavy table logic
const LazySubmissionsView = React.lazy(() => import('./SubmissionsView.tsx'));

// Keep inline version for backwards compatibility (could be removed after extraction)
const SubmissionsViewInline: FC<{ questions: Question[]; submissions: Submission[] }> = React.memo(({ questions, submissions }) => {
    const { t } = useLanguage();
    const deferredSubs = useDeferredValue(submissions);
    const completedSubmissions = deferredSubs.filter(s => s.status === 'completed');
    const answerableQuestions = questions.filter(q => q.type !== QuestionType.Welcome && q.type !== QuestionType.ThankYou);

    const downloadCSV = () => {
        const escapeCsvCell = (cell: string | number) => `"${String(cell).replace(/"/g, '""')}"`;

        const headers = [t('dashboard.submittedAt') as string, ...answerableQuestions.map(q => q.text)];
        const headerRow = headers.map(escapeCsvCell).join(',');

        const dataRows = completedSubmissions.map(sub => {
            const row = [
                new Date(sub.timestamp).toLocaleString(),
                ...answerableQuestions.map(q => formatAnswerForDisplay(sub.answers[q.id], q, t))
            ];
            return row.map(escapeCsvCell).join(',');
        });

        const bom = '\uFEFF'; // Byte Order Mark for UTF-8
        const csvContent = "data:text/csv;charset=utf-8," + bom + [headerRow, ...dataRows].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "survey_submissions.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200">
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h3 className="font-bold text-primary">{t('dashboard.allSubmissions') as string}</h3>
                    <p className="text-sm text-gray-500">{completedSubmissions.length} {t('dashboard.completedResponses') as string}</p>
                </div>
                <button onClick={downloadCSV} className="bg-primary text-white text-sm font-bold py-2 px-4 rounded-lg hover:bg-opacity-90">
                    {t('dashboard.downloadCsv') as string}
                </button>
            </div>
            <div className="overflow-x-auto">
                {completedSubmissions.length > 0 ? (
                    completedSubmissions.length < 150 ? (
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('dashboard.submittedAt') as string}</th>
                                    {answerableQuestions.map(q => <th key={q.id} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{q.text}</th>)}
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {completedSubmissions.map(sub => (
                                    <tr key={sub.id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{new Date(sub.timestamp).toLocaleString()}</td>
                                        {answerableQuestions.map(q => (
                                            <td key={q.id} className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                                {formatAnswerForDisplay(sub.answers[q.id], q, t)}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className="border border-gray-200 rounded-lg">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('dashboard.submittedAt') as string}</th>
                                        {answerableQuestions.map(q => <th key={q.id} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{q.text}</th>)}
                                    </tr>
                                </thead>
                            </table>
                            <List
                                height={480}
                                itemCount={completedSubmissions.length}
                                itemSize={56}
                                width={"100%"}
                                className="divide-y divide-gray-200"
                            >
                                {({ index, style }: ListChildComponentProps) => {
                                    const sub = completedSubmissions[index];
                                    return (
                                        <div style={style} className="flex">
                                            <div className="px-6 py-3 whitespace-nowrap text-sm text-gray-800 min-w-[14rem]">{new Date(sub.timestamp).toLocaleString()}</div>
                                            {answerableQuestions.map(q => (
                                                <div key={q.id} className="px-6 py-3 whitespace-nowrap text-sm text-gray-600 min-w-[10rem]">
                                                    {formatAnswerForDisplay(sub.answers[q.id], q, t)}
                                                </div>
                                            ))}
                                        </div>
                                    );
                                }}
                            </List>
                        </div>
                    )
                ) : <NoDataPlaceholder message={t('dashboard.noCompletedSubmissions') as string} />}
            </div>
        </div>
    );
});

// --- MAIN DASHBOARD COMPONENT ---

const AdminDashboard: React.FC<{ questions: Question[] }> = ({ questions }) => {
    const { t } = useLanguage();
    const [isPending, startTransition] = useTransition();
    const [activeTab, setActiveTab] = useState<'summary' | 'submissions' | 'insights'>('summary');
    const [scrolled, setScrolled] = useState(false);

    // Data fetching with SWR-like cache
    const { data: submissions, loading, error, refresh } = useSWRCache<Submission[]>({
        key: 'submissions-all',
        fetcher: getSurveyData,
        ttlMs: 60_000, // 1 minute freshness
        revalidateOnMount: true
    });

    useEffect(() => {
        const onScroll = () => {
            setScrolled(window.scrollY > 24);
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        onScroll();
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    // Sort memoized submissions
    const sortedSubmissions = useMemo(() => {
        return (submissions || []).slice().sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }, [submissions]);

    const handleRefresh = useCallback(() => {
        startTransition(() => refresh());
    }, [refresh]);

    // Prefetch Insights view (lazy) when user hovers or focuses tab
    const prefetchInsights = useCallback(() => { import('./InsightsView'); }, []);
    const prefetchSubmissions = useCallback(() => { import('./SubmissionsView'); }, []);

    // Idle prefetch after first paint
    useEffect(() => {
        if ('requestIdleCallback' in window) {
            (window as any).requestIdleCallback(() => {
                import('./SubmissionsView');
                import('./InsightsView');
            }, { timeout: 1500 });
        } else {
            const t = setTimeout(() => {
                import('./SubmissionsView');
                import('./InsightsView');
            }, 1200);
            return () => clearTimeout(t);
        }
    }, []);

    const loadingUI = (
        <div className="pt-1">
            {activeTab === 'summary' && <SummarySkeleton />}
            {activeTab === 'submissions' && <SkeletonTable columns={4} />}
            {activeTab === 'insights' && <InsightsSkeleton />}
        </div>
    );

    return (
        <div className="bg-background min-h-dvh px-2 sm:px-4 pb-16 sm:pb-8 pt-4 sm:pt-6 layout-transition">
            <div className="content-container max-w-5xl">
                <header className="dashboard-sticky-header px-0 pt-3 pb-5 sm:pb-6" data-scrolled={scrolled}>
                    <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="min-w-0 flex-1">
                            <h1 className="dashboard-title font-bold text-primary leading-tight break-words">{t('questions.welcome.text') as string}</h1>
                            <Link to="/" className="text-sm text-gray-500 hover:text-primary transition-colors">&larr; {t('common.backToSurvey') as string}</Link>
                        </div>
                        <div className="hidden sm:block flex-shrink-0"><LanguageSwitcher /></div>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                        <div className="tabs-gradient-wrapper bg-white p-1.5 rounded-lg border border-gray-200 flex-1 overflow-hidden">
                            <nav className="flex items-center gap-1 justify-start overflow-x-auto tabs-scroll snap-x snap-mandatory [-webkit-overflow-scrolling:touch] scrollbar-thin" role="tablist" aria-label="Dashboard sections">
                                <NavLink active={activeTab === 'summary'} onClick={() => startTransition(() => setActiveTab('summary'))}>{t('dashboard.tabs.summary') as string}</NavLink>
                                <NavLink active={activeTab === 'submissions'} onClick={() => startTransition(() => setActiveTab('submissions'))} onMouseEnter={prefetchSubmissions} onFocus={prefetchSubmissions}>{t('dashboard.tabs.submissions') as string}</NavLink>
                                <NavLink
                                    active={activeTab === 'insights'}
                                    onClick={() => startTransition(() => setActiveTab('insights'))}
                                    onMouseEnter={prefetchInsights}
                                    onFocus={prefetchInsights}
                                >{t('dashboard.tabs.insights') as string}</NavLink>
                            </nav>
                        </div>
                        <button onClick={handleRefresh} className="hidden sm:inline-flex items-center gap-2 bg-primary text-white text-sm font-semibold py-2 px-3 rounded-md hover:bg-opacity-90 disabled:opacity-60" disabled={loading || isPending}>
                            {loading || isPending ? '...' : '↻'}
                        </button>
                        <div className="sm:hidden"><LanguageSwitcher /></div>
                    </div>
                </header>

                <main className="pt-1">
                    {error && (
                        <div className="mb-4 bg-red-50 border border-red-200 text-red-600 p-3 rounded text-sm flex items-center justify-between">
                            <span>{t('dashboard.errorLoading') as string || 'Error loading data.'}</span>
                            <button onClick={handleRefresh} className="underline font-medium">Retry</button>
                        </div>
                    )}
                    {loading ? loadingUI : (
                        <>
                            {activeTab === 'summary' && (
                                <div className="animate-fade-slide cv-auto"><SummaryView questions={questions} submissions={sortedSubmissions} /></div>
                            )}
                            {activeTab === 'submissions' && (
                                <div className="animate-fade-slide cv-auto">
                                    <DeferredMount placeholder={<SkeletonTable columns={4} rows={10} />}>
                                        <ErrorBoundary fallback={<div className="text-sm text-red-500 p-4">Failed to load submissions.</div>}>
                                            <Suspense fallback={<SkeletonTable columns={4} rows={10} />}>
                                                <LazySubmissionsView questions={questions} submissions={sortedSubmissions} />
                                            </Suspense>
                                        </ErrorBoundary>
                                    </DeferredMount>
                                </div>
                            )}
                            {activeTab === 'insights' && (
                                <div className="animate-fade-slide cv-auto">
                                    <DeferredMount placeholder={<InsightsSkeleton />}>
                                        <ErrorBoundary fallback={<div className="text-sm text-red-500 p-4">Failed to load insights.</div>}>
                                            <Suspense fallback={<InsightsSkeleton />}>
                                                <LazyInsightsView questions={questions} submissions={sortedSubmissions} />
                                            </Suspense>
                                        </ErrorBoundary>
                                    </DeferredMount>
                                </div>
                            )}
                        </>
                    )}
                </main>
            </div>
        </div>
    );
};

export default AdminDashboard;