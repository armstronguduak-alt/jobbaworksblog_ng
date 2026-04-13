import { Component, type ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: any) {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="min-h-[60vh] flex items-center justify-center p-8">
          <div className="bg-white rounded-3xl shadow-lg p-8 md:p-12 max-w-md w-full text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-rose-50 flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-3xl text-rose-500">error_outline</span>
            </div>
            <h2 className="text-xl font-bold font-headline text-on-surface">Something went wrong</h2>
            <p className="text-sm text-on-surface-variant">
              {this.state.error?.message || 'An unexpected error occurred. Please try again.'}
            </p>
            <div className="flex gap-3 justify-center pt-2">
              <button
                onClick={() => { this.setState({ hasError: false }); window.location.reload(); }}
                className="px-5 py-2.5 bg-primary text-white rounded-xl font-bold text-sm hover:bg-emerald-800 transition-colors"
              >
                Try Again
              </button>
              <Link to="/" className="px-5 py-2.5 bg-surface-container text-on-surface rounded-xl font-bold text-sm hover:bg-surface-container-high transition-colors">
                Go Home
              </Link>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
