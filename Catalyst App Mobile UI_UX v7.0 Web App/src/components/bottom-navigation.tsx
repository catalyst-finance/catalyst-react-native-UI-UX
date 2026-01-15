import { 
  Search, 
  Wallet, 
  User,
  Sparkles
} from 'lucide-react';
import { useDarkMode } from '../utils/dark-mode-context';

interface BottomNavigationProps {
  activeTab: 'home' | 'copilot' | 'search' | 'profile';
  onTabChange: (tab: 'home' | 'copilot' | 'search' | 'profile') => void;
}

// Custom Timeline Icon Component
const TimelineIcon = ({ isActive }: { isActive: boolean }) => {
  const { darkMode } = useDarkMode();
  
  // Use new icons based on dark mode and active state
  let iconUrl;
  if (isActive) {
    iconUrl = darkMode
      ? 'https://lrlvxxyokajquyieshww.supabase.co/storage/v1/object/sign/application_assets/catalyst_icon_dark_11-11-25.svg?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV85YTAyZDhmMC1iY2FjLTQ3ZTAtOTExNy05MjRkMjRkODlkNGQiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJhcHBsaWNhdGlvbl9hc3NldHMvY2F0YWx5c3RfaWNvbl9kYXJrXzExLTExLTI1LnN2ZyIsImlhdCI6MTc2Mjg4NTg1MiwiZXhwIjozMzI2NzM0OTg1Mn0.dF7av41xBzXksmTlSRJpGUQd9_wy2vJ8GtfWLLIngLQ'
      : 'https://lrlvxxyokajquyieshww.supabase.co/storage/v1/object/sign/application_assets/catalyst_icon_light_11-11-25.svg?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV85YTAyZDhmMC1iY2FjLTQ3ZTAtOTExNy05MjRkMjRkODlkNGQiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJhcHBsaWNhdGlvbl9hc3NldHMvY2F0YWx5c3RfaWNvbl9saWdodF8xMS0xMS0yNS5zdmciLCJpYXQiOjE3NjI4ODU4MDUsImV4cCI6MzMyNjczNDk4MDV9.56GogPh1FWoMMF4Asepy7sk1wAamRn70aLvZdo5Z6BI';
  } else {
    iconUrl = darkMode
      ? 'https://lrlvxxyokajquyieshww.supabase.co/storage/v1/object/sign/application_assets/catalyst_icon_dark_11-11-25.svg?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV85YTAyZDhmMC1iY2FjLTQ3ZTAtOTExNy05MjRkMjRkODlkNGQiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJhcHBsaWNhdGlvbl9hc3NldHMvY2F0YWx5c3RfaWNvbl9kYXJrXzExLTExLTI1LnN2ZyIsImlhdCI6MTc2Mjg4NTg1MiwiZXhwIjozMzI2NzM0OTg1Mn0.dF7av41xBzXksmTlSRJpGUQd9_wy2vJ8GtfWLLIngLQ'
      : 'https://lrlvxxyokajquyieshww.supabase.co/storage/v1/object/sign/application_assets/catalyst_icon_light_11-11-25.svg?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV85YTAyZDhmMC1iY2FjLTQ3ZTAtOTExNy05MjRkMjRkODlkNGQiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJhcHBsaWNhdGlvbl9hc3NldHMvY2F0YWx5c3RfaWNvbl9saWdodF8xMS0xMS0yNS5zdmciLCJpYXQiOjE3NjI4ODU4MDUsImV4cCI6MzMyNjczNDk4MDV9.56GogPh1FWoMMF4Asepy7sk1wAamRn70aLvZdo5Z6BI';
  }
  
  return (
    <img 
      src={iconUrl} 
      alt="Timeline" 
      className="w-5 h-5"
      style={{ opacity: isActive ? 1 : 0.6 }}
    />
  );
};

const navigationItems = [
  { id: 'home', icon: TimelineIcon, label: 'Timeline', isCustom: true },
  { id: 'copilot', icon: Sparkles, label: 'Copilot', isCustom: false },
  { id: 'search', icon: Search, label: 'Discover', isCustom: false },
  { id: 'profile', icon: User, label: 'Profile', isCustom: false }
] as const;

export function BottomNavigation({ activeTab, onTabChange }: BottomNavigationProps) {
  const handleTabChange = (tab: 'home' | 'copilot' | 'search' | 'profile') => {
    // Scroll to top immediately when changing tabs
    window.scrollTo({ top: 0, behavior: 'instant' });
    onTabChange(tab);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border z-[60]">
      <div className="flex items-center justify-around py-2 px-4" style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}>
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => handleTabChange(item.id as any)}
              className={`flex items-center justify-center p-2 rounded-lg transition-colors ${
                isActive 
                  ? 'text-ai-accent' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {item.isCustom ? (
                <Icon isActive={isActive} />
              ) : (
                <Icon className="w-5 h-5" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}