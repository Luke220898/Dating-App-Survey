import React, { FC, useDeferredValue } from 'react';
import { Submission, Question, QuestionType, Answer } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { FixedSizeList as List, ListChildComponentProps } from 'react-window';

const formatAnswerForDisplay = (answer: Answer, question: Question, t: (key: string) => string | string[]): string => {
  if (answer === null || answer === undefined) return '';
  if (Array.isArray(answer) && answer.length === 0) return '';
  const options = question.options;
  if (options && !Array.isArray(options)) {
    const optionMap = options as Record<string, string>;
    const otherText = t('common.other') as string;
    const formatSingleAnswer = (ans: string) => {
      if (optionMap[ans]) return optionMap[ans];
      if (!Object.values(optionMap).includes(ans) && !Object.keys(optionMap).includes(ans)) {
        if (ans.trim() === '' || ans.trim() === ' ') return otherText;
        return `${otherText} (${ans})`;
      }
      return ans;
    };
    if (question.type === QuestionType.Ranking && Array.isArray(answer)) {
      return answer.map((key, index) => `${index + 1}. ${optionMap[key as string] || key}`).join('; ');
    }
    if (Array.isArray(answer)) return answer.map(formatSingleAnswer).join(', ');
    return formatSingleAnswer(answer as string);
  }
  if (Array.isArray(answer)) return answer.join(', ');
  return String(answer);
};

const SubmissionsView: FC<{ questions: Question[]; submissions: Submission[] }> = React.memo(({ questions, submissions }) => {
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
    const bom = '\uFEFF';
    const csvContent = 'data:text/csv;charset=utf-8,' + bom + [headerRow, ...dataRows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'survey_submissions.csv');
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
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
                      <td key={q.id} className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{formatAnswerForDisplay(sub.answers[q.id], q, t)}</td>
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
              <List height={480} itemCount={completedSubmissions.length} itemSize={56} width={'100%'} className="divide-y divide-gray-200">
                {({ index, style }: ListChildComponentProps) => {
                  const sub = completedSubmissions[index];
                  return (
                    <div style={style} className="flex">
                      <div className="px-6 py-3 whitespace-nowrap text-sm text-gray-800 min-w-[14rem]">{new Date(sub.timestamp).toLocaleString()}</div>
                      {answerableQuestions.map(q => (
                        <div key={q.id} className="px-6 py-3 whitespace-nowrap text-sm text-gray-600 min-w-[10rem]">{formatAnswerForDisplay(sub.answers[q.id], q, t)}</div>
                      ))}
                    </div>
                  );
                }}
              </List>
            </div>
          )
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400 text-sm bg-gray-50 rounded-lg py-10">{t('dashboard.noCompletedSubmissions') as string}</div>
        )}
      </div>
    </div>
  );
});

export default SubmissionsView;
