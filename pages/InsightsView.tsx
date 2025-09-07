import React, { useState, useMemo, FC, useDeferredValue } from 'react';
import { Question, QuestionType, Submission, SubmissionMetadata } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { DeferredMount } from '../components/DeferredMount';
import HorizontalBarChart, { BarDatum } from '../components/HorizontalBarChart';

interface AnalyticsDatum { name: string; count: number; percentage: number; }

const NavLink: FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, children, onClick }) => (
  <button
    onClick={onClick}
    aria-current={active ? 'true' : undefined}
    className={`tab-btn relative px-3 py-2 font-medium text-sm rounded-md transition-colors ${active ? 'bg-gray-200 text-primary' : 'text-gray-500 hover:text-primary hover:bg-gray-100'}`}
  >
    {children}
  </button>
);

const NoDataPlaceholder: FC<{ message?: string }> = ({ message }) => {
  const { t } = useLanguage();
  return <div className="flex items-center justify-center h-full text-gray-400 text-sm bg-gray-50 rounded-lg py-10">{message || (t('dashboard.noData') as string)}</div>;
};

const ChartSkeleton: FC = () => (
  <div className="h-56 -ml-4 w-full flex items-center justify-center">
    <div className="animate-pulse text-xs text-gray-400">Loading chart…</div>
  </div>
);

const AnalyticsChartCard: FC<{ title: string; data: AnalyticsDatum[] | null }> = ({ title, data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg border border-gray-200 cv-chart">
        <h3 className="font-bold text-primary mb-4">{title}</h3>
        <NoDataPlaceholder />
      </div>
    );
  }
  const chartData: BarDatum[] = data.slice(0, 5).map(d => ({ name: d.name, count: d.count, percentage: d.percentage }));
  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200 cv-chart">
      <h3 className="font-bold text-primary mb-4">{title}</h3>
      <DeferredMount placeholder={<ChartSkeleton />}>
        <HorizontalBarChart data={chartData} height={220} barHeight={24} gap={14} maxBars={5} />
      </DeferredMount>
      <ul className="mt-4 space-y-2 text-sm border-t border-gray-200 pt-4">
        {data.map(({ name, count, percentage }) => (
          <li key={name} className="flex justify-between items-center text-gray-700">
            <span>{name}</span>
            <span className="font-semibold">{count} <span className="text-gray-400 font-normal">({percentage.toFixed(2)}%)</span></span>
          </li>
        ))}
      </ul>
    </div>
  );
};

const formatDuration = (totalSeconds: number): string => {
  if (isNaN(totalSeconds) || totalSeconds <= 0) return '0s';
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.round(totalSeconds % 60);
  if (minutes > 0) return `~${minutes}m ${seconds}s`;
  return `${seconds}s`;
};

const InsightsView: FC<{ questions: Question[]; submissions: Submission[] }> = ({ questions, submissions }) => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'visits' | 'dropoff'>('visits');
  const deferredSubs = useDeferredValue(submissions);

  const totalSubmissions = deferredSubs.length;
  const completedSubmissions = deferredSubs.filter(s => s.status === 'completed');
  const completionRate = totalSubmissions > 0 ? `${((completedSubmissions.length / totalSubmissions) * 100).toFixed(2)}%` : '0%';

  const averageDuration = useMemo(() => {
    const completedWithDuration = completedSubmissions.filter(s => s.duration_seconds != null && s.duration_seconds > 0);
    if (completedWithDuration.length === 0) return 0;
    const totalSeconds = completedWithDuration.reduce((acc, s) => acc + s.duration_seconds!, 0);
    return totalSeconds / completedWithDuration.length;
  }, [completedSubmissions]);

  const funnelData = useMemo(() => {
    const funnelQuestions = questions.filter(q => q.type !== QuestionType.Welcome && q.type !== QuestionType.ThankYou && q.type !== QuestionType.Email);
    const result: { question: string; reached: number; answered: number; dropOff: number }[] = [];
    let active = [...deferredSubs];
    for (const question of funnelQuestions) {
      const eligible = question.condition ? active.filter(s => question.condition!(s.answers)) : active;
      const eligibleCount = eligible.length;
      const answeredSubs = eligible.filter(s => s.answers.hasOwnProperty(question.id) && s.answers[question.id] !== null && String(s.answers[question.id]).trim() !== '' && (Array.isArray(s.answers[question.id]) ? (s.answers[question.id] as any[]).length > 0 : true));
      const answeredCount = answeredSubs.length;
      const dropOff = eligibleCount - answeredCount;
      result.push({ question: question.text, reached: eligibleCount, answered: answeredCount, dropOff });
      const nonEligible = active.filter(s => !eligible.some(e => e.id === s.id));
      active = [...nonEligible, ...answeredSubs];
    }
    return result;
  }, [questions, deferredSubs]);

  const aggregatedMeta = useMemo(() => {
    const keys: (keyof SubmissionMetadata)[] = ['source', 'device', 'country', 'city', 'browser', 'os'];
    const totals: Record<string, Record<string, number>> = {};
    keys.forEach(k => totals[k as string] = {});
    deferredSubs.forEach(s => {
      keys.forEach(k => {
        const v = s.metadata?.[k];
        if (v) {
          const bucket = totals[k as string];
          bucket[v] = (bucket[v] || 0) + 1;
        }
      });
    });
    const total = deferredSubs.length || 1;
    const toArr = (obj: Record<string, number>): AnalyticsDatum[] => Object.entries(obj).map(([name, count]) => ({ name, count, percentage: (count / total) * 100 })).sort((a, b) => b.count - a.count);
    return {
      source: toArr(totals.source),
      device: toArr(totals.device),
      country: toArr(totals.country),
      city: toArr(totals.city),
      browser: toArr(totals.browser),
      os: toArr(totals.os)
    };
  }, [deferredSubs]);

  return (
    <div className="space-y-6">
      <div className="bg-white p-2 rounded-lg border border-gray-200 self-start inline-flex">
        <NavLink active={activeTab === 'visits'} onClick={() => setActiveTab('visits')}>{t('dashboard.insights.visits') as string}</NavLink>
        <NavLink active={activeTab === 'dropoff'} onClick={() => setActiveTab('dropoff')}>{t('dashboard.insights.dropoff') as string}</NavLink>
      </div>
      {activeTab === 'visits' && (
        <div className="space-y-6 cv-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 kpi-grid-tight">
            <div className="kpi-card p-4 sm:p-5">
              <h3 className="text-gray-500 text-sm font-medium">{t('dashboard.kpi.visits') as string}</h3>
              <p className="text-3xl font-bold text-primary mt-1 tracking-tight">{totalSubmissions}</p>
              <p className="text-xs text-gray-400 mt-1">{t('dashboard.kpi.visitsDesc') as string}</p>
            </div>
            <div className="kpi-card p-4 sm:p-5">
              <h3 className="text-gray-500 text-sm font-medium">{t('dashboard.kpi.submissions') as string}</h3>
              <p className="text-3xl font-bold text-primary mt-1 tracking-tight">{completedSubmissions.length}</p>
              <p className="text-xs text-gray-400 mt-1">{t('dashboard.kpi.submissionsDesc') as string}</p>
            </div>
            <div className="kpi-card p-4 sm:p-5">
              <h3 className="text-gray-500 text-sm font-medium">{t('dashboard.kpi.completionRate') as string}</h3>
              <p className="text-3xl font-bold text-primary mt-1 tracking-tight">{completionRate}</p>
            </div>
            <div className="kpi-card p-4 sm:p-5">
              <h3 className="text-gray-500 text-sm font-medium">{t('dashboard.kpi.avgDuration') as string}</h3>
              <p className="text-3xl font-bold text-primary mt-1 tracking-tight">{formatDuration(averageDuration)}</p>
              <p className="text-xs text-gray-400 mt-1">{t('dashboard.kpi.avgDurationDesc') as string}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <AnalyticsChartCard title={t('dashboard.analytics.sources') as string} data={aggregatedMeta.source} />
            <AnalyticsChartCard title={t('dashboard.analytics.devices') as string} data={aggregatedMeta.device} />
            <AnalyticsChartCard title={t('dashboard.analytics.countries') as string} data={aggregatedMeta.country} />
            <AnalyticsChartCard title={t('dashboard.analytics.cities') as string} data={aggregatedMeta.city} />
            <AnalyticsChartCard title={t('dashboard.analytics.browsers') as string} data={aggregatedMeta.browser} />
            <AnalyticsChartCard title={t('dashboard.analytics.os') as string} data={aggregatedMeta.os} />
          </div>
        </div>
      )}
      {activeTab === 'dropoff' && (
        <div className="bg-white p-6 rounded-lg border border-gray-200 cv-auto">
          <h3 className="font-bold text-primary mb-4">{t('dashboard.funnel.title') as string}</h3>
          <div className="space-y-2">
            <div className="flex items-center gap-4 p-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center">✓</div>
              <div className="flex-grow">
                <p className="font-semibold">{t('dashboard.funnel.started') as string}</p>
                <p className="text-sm text-gray-500">{deferredSubs.length} {t('dashboard.funnel.respondents') as string}</p>
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

export default React.memo(InsightsView);
