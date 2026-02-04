
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';
import { Button } from './Button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center">
          <div className="bg-white p-10 rounded-[3rem] shadow-xl max-w-md w-full border border-red-100 space-y-6">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto text-red-600">
              <AlertTriangle className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-black text-navy leading-tight italic">OPA! ALGO DEU ERRADO</h2>
            <p className="text-slate-text text-sm">
              Ocorreu um erro inesperado na aplicação. Nossa equipe técnica já foi notificada.
            </p>
            <div className="bg-slate-50 p-4 rounded-2xl text-left overflow-auto max-h-32">
              <code className="text-[10px] text-red-500 font-bold block">
                {this.state.error?.toString()}
              </code>
            </div>
            <Button fullWidth onClick={this.handleReset} variant="primary" className="py-4 rounded-xl font-black uppercase tracking-widest text-[13.2px]">
              <RefreshCcw size={16} className="mr-2" /> RECOMEÇAR SISTEMA
            </Button>
          </div>
        </div>
      );
    }

    // Fix: Access children via this.props in a class component
    return this.props.children;
  }
}
