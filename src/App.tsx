import { ConfigProvider, KanataProvider, useConfig } from "./contexts";
import { KeyboardGrid } from "./components/keyboard";
import { KeyInspector, LayerTabs } from "./components/editor";
import { StatusIndicator } from "./components/status";

/**
 * Header with layer tabs and status indicator.
 */
function Header() {
  return (
    <header className="h-12 bg-bg-secondary border-b border-border flex items-center justify-between px-4">
      <div className="flex items-center gap-4">
        <h1 className="text-sm font-semibold text-text-primary">Kanata UI</h1>
        <LayerTabs />
      </div>
      <StatusIndicator />
    </header>
  );
}

/**
 * Main content area with keyboard grid and inspector.
 */
function MainContent() {
  const { isLoading, error } = useConfig();

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-text-muted">Loading configuration...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="text-status-error text-lg mb-2">Error</div>
          <div className="text-text-muted">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <main className="flex-1 flex overflow-hidden">
      <KeyboardGrid />
      <KeyInspector />
    </main>
  );
}

/**
 * Root application component.
 */
export function App() {
  return (
    <KanataProvider>
      <ConfigProvider>
        <div className="h-full flex flex-col bg-bg-primary">
          <Header />
          <MainContent />
        </div>
      </ConfigProvider>
    </KanataProvider>
  );
}

