import { useState } from "react";
import { AutoStartServer } from "./components/AutoStartServer";
import { Header } from "./components/Header";
import { KarabinerOnboarding } from "./components/KarabinerOnboarding";
import { LogPanel } from "./components/LogPanel";
import { MainContent } from "./components/MainContent";
import {
  ConfigProvider,
  KanataProvider,
  KarabinerProvider,
} from "./contexts";

/**
 * Root application component.
 */
export function App() {
  const [onboardingInProgress, setOnboardingInProgress] = useState(false);

  return (
    <KarabinerProvider>
      <KanataProvider>
        <ConfigProvider>
          <div className="h-full flex flex-col bg-bg-primary">
            <KarabinerOnboarding onOnboardingStateChange={setOnboardingInProgress} />
            <AutoStartServer onboardingInProgress={onboardingInProgress} />
            <Header />
            <MainContent />
            <LogPanel />
          </div>
        </ConfigProvider>
      </KanataProvider>
    </KarabinerProvider>
  );
}
