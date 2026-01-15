import { Moon, Sun, Database, RefreshCw, RotateCcw } from 'lucide-react';
import { Button } from './ui/button';
import { useDarkMode } from '../utils/dark-mode-context';

interface TestingMenuProps {
  dataServiceReady: boolean;
  onDatabaseSetup: () => void;
  onForceRefresh: () => void;
  onRestartOnboarding: () => void;
  onTestMode: () => void;
  onCatalystDebug: () => void;
  onCatalystDotDebug: () => void;
  onDebugRunner: () => void;
  onEventDataDebug: () => void;
  onScrollChartDebug: () => void;
  onClose: () => void;
}

export function TestingMenu({
  dataServiceReady,
  onDatabaseSetup,
  onForceRefresh,
  onRestartOnboarding,
  onTestMode,
  onCatalystDebug,
  onCatalystDotDebug,
  onDebugRunner,
  onEventDataDebug,
  onScrollChartDebug,
  onClose
}: TestingMenuProps) {
  const { darkMode, toggleDarkMode } = useDarkMode();

  return (
    <div className="space-y-1">
      {/* Dark Mode Toggle */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          toggleDarkMode();
        }}
        className="w-full justify-start"
      >
        {darkMode ? <Sun className="h-4 w-4 mr-2" /> : <Moon className="h-4 w-4 mr-2" />}
        {darkMode ? 'Light Mode' : 'Dark Mode'}
      </Button>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          onDatabaseSetup();
          onClose();
        }}
        className="w-full justify-start"
      >
        <Database className="h-4 w-4 mr-2" />
        {dataServiceReady ? 'Manage DB' : 'Setup DB'}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          onForceRefresh();
          onClose();
        }}
        className="w-full justify-start"
      >
        <RefreshCw className="h-4 w-4 mr-2" />
        Force Refresh
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          onRestartOnboarding();
          onClose();
        }}
        className="w-full justify-start"
      >
        <RotateCcw className="h-4 w-4 mr-2" />
        Restart Setup
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          onTestMode();
          onClose();
        }}
        className="w-full justify-start"
      >
        <Database className="h-4 w-4 mr-2" />
        Test Company Data
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          onCatalystDebug();
          onClose();
        }}
        className="w-full justify-start"
      >
        <Database className="h-4 w-4 mr-2" />
        Catalyst Debug
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          onCatalystDotDebug();
          onClose();
        }}
        className="w-full justify-start"
      >
        <Database className="h-4 w-4 mr-2" />
        Catalyst Dot Debug
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          onDebugRunner();
          onClose();
        }}
        className="w-full justify-start"
      >
        <Database className="h-4 w-4 mr-2" />
        Debug Runner
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          onEventDataDebug();
          onClose();
        }}
        className="w-full justify-start"
      >
        <Database className="h-4 w-4 mr-2" />
        Event Data Debug
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          onScrollChartDebug();
          onClose();
        }}
        className="w-full justify-start"
      >
        <Database className="h-4 w-4 mr-2" />
        Scroll & Chart Debug
      </Button>
    </div>
  );
}
