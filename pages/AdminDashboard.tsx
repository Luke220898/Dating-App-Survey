import React, { useEffect, useState, useMemo, FC } from 'react';
import { getSurveyData } from '../services/apiService';
import { Submission, Question, QuestionType, SubmissionMetadata, Answer } from '../types';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
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


const NavLink: FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, children, onClick }) => (
    <button
        onClick={onClick}
        className={`px-3 py-2 font-medium text-sm rounded-md transition-colors ${active
                ? 'bg-gray-200 text-primary'
                : 'text-gray-500 hover:text-primary hover:bg-gray-100'
            }`}
    >
        {children}
    </button>
);

const KpiCard: FC<{ title: string; value: string | number; description?: string }> = ({ title, value, description }) => (
    <div className="bg-white p-4 rounded-lg border border-gray-200">
        <h3 className="text-gray-500 text-sm font-medium">{title}</h3>
        <p className="text-3xl font-bold text-primary mt-1">{value}</p>
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
                if (typeof ans === 'string' && ans.trim()) {
                    totalSelectionsCount++;
                    if (optionMap[ans]) {
                        counts[ans]++;
                    } else if (ans.trim() !== ' ') {
                        customAnswerCounts[ans.trim()] = (customAnswerCounts[ans.trim()] || 0) + 1;
                        hasProvidedCustomAnswer = true;
                    }
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
                                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold" style={{ color: item.percentage > 70 ? 'white' : '#2c3e50' }}>
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

const SubmissionsView: FC<{ questions: Question[]; submissions: Submission[] }> = ({ questions, submissions }) => {
    const { t } = useLanguage();
    const completedSubmissions = submissions.filter(s => s.status === 'completed');
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
                ) : <NoDataPlaceholder message={t('dashboard.noCompletedSubmissions') as string} />}
            </div>
        </div>
    );
};

// --- INSIGHTS VIEW ---

const formatDuration = (totalSeconds: number): string => {
    if (isNaN(totalSeconds) || totalSeconds <= 0) return '0s';
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.round(totalSeconds % 60);
    if (minutes > 0) {
        return `~${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
};

const AnalyticsChartCard: FC<{ title: string; submissions: Submission[]; dataKey: keyof SubmissionMetadata }> = ({ title, submissions, dataKey }) => {
    const processedData = useMemo(() => {
        const counts = submissions.reduce((acc, item) => {
            const key = item.metadata?.[dataKey];
            if (key) {
                acc[key] = (acc[key] || 0) + 1;
            }
            return acc;
        }, {} as Record<string, number>);

        if (Object.keys(counts).length === 0) return null;

        const total = submissions.length;
        return Object.entries(counts)
            .map(([name, count]) => ({ name, count, percentage: (count / total) * 100 }))
            .sort((a, b) => b.count - a.count);

    }, [submissions, dataKey]);

    if (!processedData) {
        return (
            <div className="bg-white p-6 rounded-lg border border-gray-200">
                <h3 className="font-bold text-primary mb-4">{title}</h3>
                <NoDataPlaceholder />
            </div>
        );
    }

    const chartData = processedData.slice(0, 5);

    return (
        <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h3 className="font-bold text-primary mb-4">{title}</h3>
            <div className="h-40 -ml-4">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 20, left: 20, bottom: 0 }}>
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={80} tick={{ fontSize: 12, fill: '#34495e' }} />
                        <Tooltip cursor={{ fill: '#f7f9fa' }} contentStyle={{ backgroundColor: 'white', border: '1px solid #ecf0f1', borderRadius: '0.5rem' }} />
                        <Bar dataKey="count" fill="#2c3e50" barSize={20} radius={[0, 4, 4, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
            <ul className="mt-4 space-y-2 text-sm border-t border-gray-200 pt-4">
                {processedData.map(({ name, count, percentage }) => (
                    <li key={name} className="flex justify-between items-center text-gray-700">
                        <span>{name}</span>
                        <span className="font-semibold">{count} <span className="text-gray-400 font-normal">({percentage.toFixed(2)}%)</span></span>
                    </li>
                ))}
            </ul>
        </div>
    );
};

const InsightsView: FC<{ questions: Question[]; submissions: Submission[] }> = ({ questions, submissions }) => {
    const { t } = useLanguage();
    const [activeTab, setActiveTab] = useState<'visits' | 'dropoff'>('visits');

    const totalSubmissions = submissions.length;
    const completedSubmissions = submissions.filter(s => s.status === 'completed');
    const completionRate = totalSubmissions > 0 ? `${((completedSubmissions.length / totalSubmissions) * 100).toFixed(2)}%` : '0%';

    const averageDuration = useMemo(() => {
        const completedWithDuration = completedSubmissions.filter(s => s.duration_seconds != null && s.duration_seconds > 0);
        if (completedWithDuration.length === 0) return 0;
        const totalSeconds = completedWithDuration.reduce((acc, s) => acc + s.duration_seconds!, 0);
        return totalSeconds / completedWithDuration.length;
    }, [completedSubmissions]);

    const funnelData = useMemo(() => {
        const funnelQuestions = questions.filter(q =>
            q.type !== QuestionType.Welcome &&
            q.type !== QuestionType.ThankYou &&
            q.type !== QuestionType.Email
        );

        const result = [];
        let activeSubmissions = [...submissions];

        for (const question of funnelQuestions) {
            // Of the people who made it this far, who was *eligible* to see this question?
            const eligibleSubmissions = question.condition
                ? activeSubmissions.filter(s => question.condition!(s.answers))
                : activeSubmissions;

            const eligibleCount = eligibleSubmissions.length;

            // Of those eligible, who actually answered?
            const answeredSubmissions = eligibleSubmissions.filter(s =>
                s.answers.hasOwnProperty(question.id) &&
                s.answers[question.id] !== null &&
                String(s.answers[question.id]).trim() !== '' &&
                (Array.isArray(s.answers[question.id]) ? (s.answers[question.id] as any[]).length > 0 : true)
            );
            const answeredCount = answeredSubmissions.length;

            // The real drop-off is only among those who were eligible
            const dropOff = eligibleCount - answeredCount;

            result.push({
                question: question.text,
                reached: eligibleCount, // "Reached" means "was shown this question"
                answered: answeredCount,
                dropOff: dropOff,
            });

            // The people for the next stage are those who were *not* eligible for this question
            // (they took another branch) PLUS those who *were* eligible and answered it.
            const nonEligibleSubmissions = activeSubmissions.filter(s =>
                !eligibleSubmissions.some(es => es.id === s.id)
            );

            activeSubmissions = [...nonEligibleSubmissions, ...answeredSubmissions];
        }

        return result;
    }, [questions, submissions]);


    return (
        <div className="space-y-6">
            <div className="bg-white p-2 rounded-lg border border-gray-200 self-start inline-flex">
                <NavLink active={activeTab === 'visits'} onClick={() => setActiveTab('visits')}>{t('dashboard.insights.visits') as string}</NavLink>
                <NavLink active={activeTab === 'dropoff'} onClick={() => setActiveTab('dropoff')}>{t('dashboard.insights.dropoff') as string}</NavLink>
            </div>

            {activeTab === 'visits' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <KpiCard title={t('dashboard.kpi.visits') as string} value={totalSubmissions} description={t('dashboard.kpi.visitsDesc') as string} />
                        <KpiCard title={t('dashboard.kpi.submissions') as string} value={completedSubmissions.length} description={t('dashboard.kpi.submissionsDesc') as string} />
                        <KpiCard title={t('dashboard.kpi.completionRate') as string} value={completionRate} />
                        <KpiCard title={t('dashboard.kpi.avgDuration') as string} value={formatDuration(averageDuration)} description={t('dashboard.kpi.avgDurationDesc') as string} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <AnalyticsChartCard title={t('dashboard.analytics.sources') as string} submissions={submissions} dataKey="source" />
                        <AnalyticsChartCard title={t('dashboard.analytics.devices') as string} submissions={submissions} dataKey="device" />
                        <AnalyticsChartCard title={t('dashboard.analytics.countries') as string} submissions={submissions} dataKey="country" />
                        <AnalyticsChartCard title={t('dashboard.analytics.cities') as string} submissions={submissions} dataKey="city" />
                        <AnalyticsChartCard title={t('dashboard.analytics.browsers') as string} submissions={submissions} dataKey="browser" />
                        <AnalyticsChartCard title={t('dashboard.analytics.os') as string} submissions={submissions} dataKey="os" />
                    </div>
                </div>
            )}

            {activeTab === 'dropoff' && (
                <div className="bg-white p-6 rounded-lg border border-gray-200">
                    <h3 className="font-bold text-primary mb-4">{t('dashboard.funnel.title') as string}</h3>
                    <div className="space-y-2">
                        <div className="flex items-center gap-4 p-3">
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center">✓</div>
                            <div className="flex-grow">
                                <p className="font-semibold">{t('dashboard.funnel.started') as string}</p>
                                <p className="text-sm text-gray-500">{submissions.length} {t('dashboard.funnel.respondents') as string}</p>
                            </div>
                        </div>
                        {funnelData.map(({ question, answered, reached, dropOff }, index) => (
                            <React.Fragment key={index}>
                                <div className="pl-7">
                                    <div className="border-l-2 border-dashed border-gray-300 h-8 ml-3.5"></div>
                                    {dropOff > 0 && reached > 0 && <p className="text-xs text-red-500 ml-6">-{dropOff} {t('dashboard.funnel.dropoff') as string} ({(dropOff / reached * 100).toFixed(2)}%)</p>}
                                </div>
                                <div className="flex items-center gap-4 p-3">
                                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center font-mono text-sm">{index + 1}</div>
                                    <div className="flex-grow">
                                        <p className="font-semibold">{question}</p>
                                        <p className="text-sm text-gray-500">{answered} / {reached} {t('dashboard.funnel.answered') as string}</p>
                                    </div>
                                </div>
                            </React.Fragment>
                        ))}
                        <div className="pl-7">
                            <div className="border-l-2 border-dashed border-gray-300 h-8 ml-3.5"></div>
                        </div>
                        <div className="flex items-center gap-4 p-3">
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center">✓</div>
                            <div className="flex-grow">
                                <p className="font-semibold">{t('dashboard.funnel.completed') as string}</p>
                                <p className="text-sm text-gray-500">{completedSubmissions.length} {t('dashboard.funnel.completions') as string}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- MAIN DASHBOARD COMPONENT ---

const AdminDashboard: React.FC<{ questions: Question[] }> = ({ questions }) => {
    const { t } = useLanguage();
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'summary' | 'submissions' | 'insights'>('summary');

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const data = await getSurveyData();
            setSubmissions(data.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
            setLoading(false);
        };
        fetchData();
    }, []);

    if (loading) {
        return <div className="flex justify-center items-center h-screen"><p>{t('dashboard.loading') as string}</p></div>;
    }

    return (
        <div className="p-4 sm:p-8 bg-background min-h-screen">
            <div className="max-w-4xl mx-auto">
                <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-8">
                    <div className="w-full sm:w-auto">
                        <h1 className="text-2xl sm:text-3xl font-bold text-primary truncate">{t('questions.welcome.text') as string}</h1>
                        <Link to="/" className="text-sm text-gray-500 hover:text-primary transition-colors">&larr; {t('common.backToSurvey') as string}</Link>
                    </div>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full sm:w-auto">
                        <div className="bg-white p-1.5 rounded-lg border border-gray-200 w-full sm:w-auto">
                            <nav className="flex items-center gap-1 justify-around sm:justify-start">
                                <NavLink active={activeTab === 'summary'} onClick={() => setActiveTab('summary')}>{t('dashboard.tabs.summary') as string}</NavLink>
                                <NavLink active={activeTab === 'submissions'} onClick={() => setActiveTab('submissions')}>{t('dashboard.tabs.submissions') as string}</NavLink>
                                <NavLink active={activeTab === 'insights'} onClick={() => setActiveTab('insights')}>{t('dashboard.tabs.insights') as string}</NavLink>
                            </nav>
                        </div>
                        <LanguageSwitcher />
                    </div>
                </header>

                <main>
                    {activeTab === 'summary' && <SummaryView questions={questions} submissions={submissions} />}
                    {activeTab === 'submissions' && <SubmissionsView questions={questions} submissions={submissions} />}
                    {activeTab === 'insights' && <InsightsView questions={questions} submissions={submissions} />}
                </main>
            </div>
        </div>
    );
};

export default AdminDashboard;