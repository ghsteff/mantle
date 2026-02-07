import { useState } from "react";
import { AutoStartServer } from "./components/AutoStartServer";
import { ErrorBoundary } from "./components/error-boundary";
import { Header } from "./components/Header";
import { KarabinerOnboarding } from "./components/KarabinerOnboarding";
import { LogPanel } from "./components/LogPanel";
import { MainContent } from "./components/MainContent";
import {
  ConfigProvider,
  UIProvider,
  ProfileProvider,
  KanataProvider,
  KarabinerProvider,
} from "./contexts";

/**
 * Root application component.
 */
export function App() {
  const [onboardingInProgress, setOnboardingInProgress] = useState(false);

  return (
    <ErrorBoundary>
      <ConfigProvider>
        <UIProvider>
          <ProfileProvider>
            <KanataProvider>
              <KarabinerProvider>
                <div className="h-full flex flex-col bg-background">
                  <KarabinerOnboarding
                    onOnboardingStateChange={setOnboardingInProgress}
                  />
                  <AutoStartServer onboardingInProgress={onboardingInProgress} />
                  <Header />
                  <MainContent />
                  <LogPanel />
                </div>
              </KarabinerProvider>
            </KanataProvider>
          </ProfileProvider>
        </UIProvider>
      </ConfigProvider>
    </ErrorBoundary>
  );
}
