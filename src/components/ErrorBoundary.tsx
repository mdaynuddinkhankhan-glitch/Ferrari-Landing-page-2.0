import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Porshibari ErrorBoundary caught an error:', error, errorInfo);
  }

  public handleReset = () => {
    try {
      this.setState({ hasError: false, error: null });
      window.location.reload();
    } catch {
      window.location.href = '/';
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-neutral-900 border border-neutral-800 rounded-2xl p-6 sm:p-8 text-center shadow-2xl">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 text-2xl font-bold">
              !
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
              কিছু একটা সমস্যা হয়েছে
            </h2>
            <p className="text-sm text-neutral-400 mb-6 leading-relaxed">
              পৃষ্ঠাটি লোড করতে সাময়িক বিঘ্ন ঘটেছে। দয়া করে পেজটি রিফ্রেশ করুন অথবা মূল পাতায় ফিরে যান।
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                type="button"
                onClick={this.handleReset}
                className="w-full sm:w-auto px-6 py-3 bg-[#075f58] hover:bg-[#064e48] text-white font-bold rounded-xl transition-colors cursor-pointer"
              >
                রিলোড করুন
              </button>
              <button
                type="button"
                onClick={() => {
                  try {
                    window.location.href = '/';
                  } catch {
                    window.location.reload();
                  }
                }}
                className="w-full sm:w-auto px-6 py-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-medium rounded-xl transition-colors cursor-pointer"
              >
                মূল পাতায় যান
              </button>
            </div>
            {this.state.error && (
              <p className="mt-6 text-[11px] text-neutral-600 font-mono break-all text-left bg-black/50 p-2.5 rounded-lg border border-neutral-800/80">
                {String(this.state.error.message || this.state.error)}
              </p>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
