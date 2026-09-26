import { ErrorBoundary } from "./components/ui/ErrorBoundary";
import { ToastProvider } from "./components/ui/Toast";
import AppShell from "./components/layout/AppShell";
import PWAInstallPrompt from "./components/PWAInstallPrompt";

export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AppShell />
        <PWAInstallPrompt />
      </ToastProvider>
    </ErrorBoundary>
  );
}
