import React from 'react';

interface SkeletonProps { className?: string; }

export const Skeleton: React.FC<SkeletonProps> = ({ className = '' }) => (
  <div className={`animate-pulse rounded-md bg-gray-200/70 ${className}`} />
);

export const SkeletonText: React.FC<{ lines?: number; className?: string; gap?: string }> = ({ lines = 3, className = '', gap = '0.5rem' }) => {
  return (
    <div className={`flex flex-col ${className}`} style={{ gap }}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={`h-3 ${i === 0 ? 'w-3/5' : i === lines - 1 ? 'w-4/5' : 'w-full'}`} />
      ))}
    </div>
  );
};

export const SkeletonCard: React.FC = () => (
  <div className="bg-white p-6 rounded-lg border border-gray-200">
    <Skeleton className="h-5 w-40 mb-4" />
    <Skeleton className="h-56 w-full mb-4" />
    <SkeletonText lines={4} />
  </div>
);

export const SkeletonKpi: React.FC = () => (
  <div className="kpi-card p-4 sm:p-5">
    <Skeleton className="h-3 w-16 mb-3" />
    <Skeleton className="h-8 w-24 mb-2" />
    <Skeleton className="h-3 w-20" />
  </div>
);

export const SkeletonTable: React.FC<{ columns: number; rows?: number }> = ({ columns, rows = 8 }) => (
  <div className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200 overflow-hidden">
    <div className="flex gap-6 mb-4">
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton key={i} className="h-3 w-24" />
      ))}
    </div>
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-6">
          {Array.from({ length: columns }).map((__, c) => (
            <Skeleton key={c} className="h-3 w-24" />
          ))}
        </div>
      ))}
    </div>
  </div>
);

export const InsightsSkeleton: React.FC = () => (
  <div className="space-y-6">
    <div className="flex gap-2 bg-white p-2 rounded-lg border border-gray-200 w-fit">
      <Skeleton className="h-8 w-20" />
      <Skeleton className="h-8 w-24" />
    </div>
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 kpi-grid-tight">
      {Array.from({ length: 4 }).map((_, i) => <SkeletonKpi key={i} />)}
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
    </div>
  </div>
);

export const SummarySkeleton: React.FC = () => (
  <div className="space-y-6">
    {Array.from({ length: 4 }).map((_, i) => (
      <div key={i} className="bg-white p-6 rounded-lg border border-gray-200">
        <Skeleton className="h-4 w-2/3 mb-2" />
        <Skeleton className="h-3 w-32 mb-4" />
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((__, j) => (
            <div key={j}>
              <div className="flex justify-between mb-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-12" />
              </div>
              <Skeleton className="h-2.5 w-full" />
            </div>
          ))}
        </div>
      </div>
    ))}
  </div>
);
