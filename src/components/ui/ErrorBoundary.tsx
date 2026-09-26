import React from "react";

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("Nexa OS — Erreur non gérée:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="max-w-md text-center bg-surface-container-lowest rounded-2xl p-space-xl shadow-md">
            <div className="w-14 h-14 rounded-2xl bg-error-container text-on-error-container flex items-center justify-center mx-auto mb-space-md">
              <span className="material-symbols-outlined" style={{ fontSize: 28 }}>error</span>
            </div>
            <h2 className="text-headline-md font-semibold text-on-surface mb-2">
              Une erreur inattendue s'est produite
            </h2>
            <p className="text-body-sm text-on-surface-variant mb-space-md">
              Tes données sont conservées en local. Recharge la page pour reprendre.
            </p>
            {this.state.error && (
              <details className="text-left mb-space-md">
                <summary className="text-label-sm text-outline cursor-pointer font-mono">Détails techniques</summary>
                <pre className="text-label-sm text-error bg-error-container/30 p-2 rounded-lg mt-2 overflow-auto text-left whitespace-pre-wrap">
                  {this.state.error.message}
                </pre>
              </details>
            )}
            <button
              onClick={() => window.location.reload()}
              className="btn-primary w-full justify-center"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>refresh</span>
              <span>Recharger l'application</span>
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
