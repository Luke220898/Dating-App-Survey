import React from 'react';

interface ErrorBoundaryState { hasError: boolean; error?: Error; }
interface ErrorBoundaryProps { fallback?: React.ReactNode; children: React.ReactNode; onReset?: () => void; }

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, info: any) {
    console.error('ErrorBoundary caught error', error, info);
  }
  reset = () => {
    this.setState({ hasError: false, error: undefined });
    this.props.onReset?.();
  };
  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-md text-sm space-y-3">
          <p className="font-semibold">Something went wrong.</p>
          <pre className="whitespace-pre-wrap text-xs opacity-80 max-h-40 overflow-auto">{this.state.error?.message}</pre>
          <button onClick={this.reset} className="bg-red-600 text-white text-xs font-semibold py-1.5 px-3 rounded hover:bg-red-700">Retry</button>
        </div>
      );
    }
    return this.props.children;
  }
}
