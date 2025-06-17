import React, { useState } from 'react';
import ThemePopup from './ThemePopup';
import AboutPopup from './AboutPopup';
import { hexToRgb } from '../utils/colorUtils';

interface SidebarProps {
  selected: 'client' | 'server' | null;
  onSelect: (sel: 'client' | 'server') => void;
}

function Sidebar({ selected, onSelect }: SidebarProps) {
  const [themePopupOpen, setThemePopupOpen] = useState(false);
  const [aboutPopupOpen, setAboutPopupOpen] = useState(false);
  const [themeColor, setThemeColor] = useState('#f8f9fa');
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Update all theme-related CSS variables, including shadows
  const handleThemeChange = (color: string) => {
    setThemeColor(color);
    document.documentElement.style.setProperty('--tw-color-primary', color);
    document.documentElement.style.setProperty('--tw-color-primary-rgb', hexToRgb(color));
    // Accent color logic (simple contrast)
    if (color === '#f8f9fa') {
      // White theme (default)
      document.documentElement.style.setProperty('--tw-color-accent', '#111111'); // Use black for accent
      document.documentElement.style.setProperty('--tw-color-background', '#f8f9fa');
      document.documentElement.style.setProperty('--tw-color-surface', '#ffffff');
      document.documentElement.style.setProperty('--tw-color-surface-light', '#f5f5f5');
      document.documentElement.style.setProperty('--tw-shadow-card', '0 4px 24px 0 rgba(0,0,0,0.08)');
      // Set text color classes for white theme
      document.documentElement.style.setProperty('--tw-text-color', '#333333');
      document.documentElement.style.setProperty('--tw-text-color-secondary', '#666666');
      // Set chat-specific colors for white theme
      document.documentElement.style.setProperty('--tw-chat-text-color', '#333333');
      document.documentElement.style.setProperty('--tw-chat-input-color', '#ffffff');
      document.documentElement.style.setProperty('--tw-chat-input-border-color', '#e5e5e5');
      document.documentElement.style.setProperty('--tw-chat-divider-color', '#e5e5e5');
    } else if (color === '#6366f1') {
      // Indigo/Blue theme
      document.documentElement.style.setProperty('--tw-color-accent', '#6366f1');
      document.documentElement.style.setProperty('--tw-color-primary', '#6366f1');
      document.documentElement.style.setProperty('--tw-color-primary-rgb', '99, 102, 241');
      document.documentElement.style.setProperty('--tw-color-background', '#18181b');
      document.documentElement.style.setProperty('--tw-color-surface', '#27272a');
      document.documentElement.style.setProperty('--tw-color-surface-light', '#32323a');
      document.documentElement.style.setProperty('--tw-shadow-card', '0 4px 24px 0 rgba(99,102,241,0.10)');
      document.documentElement.style.setProperty('--tw-text-color', '#ffffff');
      document.documentElement.style.setProperty('--tw-text-color-secondary', '#e5e7eb');
      // Set chat-specific colors for dark theme
      document.documentElement.style.setProperty('--tw-chat-text-color', '#ffffff');
      document.documentElement.style.setProperty('--tw-chat-input-color', '#27272a');
      document.documentElement.style.setProperty('--tw-chat-input-border-color', '#3f3f46');
      document.documentElement.style.setProperty('--tw-chat-divider-color', '#3f3f46');
    } else if (color === '#f59e42') {
      // Orange theme
      document.documentElement.style.setProperty('--tw-color-accent', '#f59e42');
      document.documentElement.style.setProperty('--tw-color-primary', '#f59e42');
      document.documentElement.style.setProperty('--tw-color-primary-rgb', '245, 158, 66');
      document.documentElement.style.setProperty('--tw-color-background', '#2d1a06');
      document.documentElement.style.setProperty('--tw-color-surface', '#3a220a');
      document.documentElement.style.setProperty('--tw-color-surface-light', '#4a2c10');
      document.documentElement.style.setProperty('--tw-shadow-card', '0 4px 24px 0 rgba(245,158,66,0.10)');
      document.documentElement.style.setProperty('--tw-text-color', '#ffffff');
      document.documentElement.style.setProperty('--tw-text-color-secondary', '#e5e7eb');
      document.documentElement.style.setProperty('--tw-chat-text-color', '#ffffff');
      document.documentElement.style.setProperty('--tw-chat-input-color', '#3a220a');
      document.documentElement.style.setProperty('--tw-chat-input-border-color', '#4a2c10');
      document.documentElement.style.setProperty('--tw-chat-divider-color', '#4a2c10');
    } else if (color === '#10b981') {
      // Green theme
      document.documentElement.style.setProperty('--tw-color-accent', '#10b981');
      document.documentElement.style.setProperty('--tw-color-primary', '#10b981');
      document.documentElement.style.setProperty('--tw-color-primary-rgb', '16, 185, 129');
      document.documentElement.style.setProperty('--tw-color-background', '#10291e');
      document.documentElement.style.setProperty('--tw-color-surface', '#193c2b');
      document.documentElement.style.setProperty('--tw-color-surface-light', '#204d36');
      document.documentElement.style.setProperty('--tw-shadow-card', '0 4px 24px 0 rgba(16,185,129,0.10)');
      document.documentElement.style.setProperty('--tw-text-color', '#ffffff');
      document.documentElement.style.setProperty('--tw-text-color-secondary', '#e5e7eb');
      document.documentElement.style.setProperty('--tw-chat-text-color', '#ffffff');
      document.documentElement.style.setProperty('--tw-chat-input-color', '#193c2b');
      document.documentElement.style.setProperty('--tw-chat-input-border-color', '#204d36');
      document.documentElement.style.setProperty('--tw-chat-divider-color', '#204d36');
    } else if (color === '#f43f5e') {
      // Red theme
      document.documentElement.style.setProperty('--tw-color-accent', '#f43f5e');
      document.documentElement.style.setProperty('--tw-color-primary', '#f43f5e');
      document.documentElement.style.setProperty('--tw-color-primary-rgb', '244, 63, 94');
      document.documentElement.style.setProperty('--tw-color-background', '#2a1016');
      document.documentElement.style.setProperty('--tw-color-surface', '#3c1922');
      document.documentElement.style.setProperty('--tw-color-surface-light', '#4d202c');
      document.documentElement.style.setProperty('--tw-shadow-card', '0 4px 24px 0 rgba(244,63,94,0.10)');
      document.documentElement.style.setProperty('--tw-text-color', '#ffffff');
      document.documentElement.style.setProperty('--tw-text-color-secondary', '#e5e7eb');
      document.documentElement.style.setProperty('--tw-chat-text-color', '#ffffff');
      document.documentElement.style.setProperty('--tw-chat-input-color', '#3c1922');
      document.documentElement.style.setProperty('--tw-chat-input-border-color', '#4d202c');
      document.documentElement.style.setProperty('--tw-chat-divider-color', '#4d202c');
    } else if (color === '#0ea5e9') {
      // Sky/Light Blue theme
      document.documentElement.style.setProperty('--tw-color-accent', '#0ea5e9');
      document.documentElement.style.setProperty('--tw-color-primary', '#0ea5e9');
      document.documentElement.style.setProperty('--tw-color-primary-rgb', '14, 165, 233');
      document.documentElement.style.setProperty('--tw-color-background', '#10212a');
      document.documentElement.style.setProperty('--tw-color-surface', '#19303c');
      document.documentElement.style.setProperty('--tw-color-surface-light', '#213e4d');
      document.documentElement.style.setProperty('--tw-shadow-card', '0 4px 24px 0 rgba(14,165,233,0.10)');
      // Reset text color classes for dark theme
      document.documentElement.style.setProperty('--tw-text-color', '#ffffff');
      document.documentElement.style.setProperty('--tw-text-color-secondary', '#e5e7eb');
    } else {
      document.documentElement.style.setProperty('--tw-color-accent', color);
      document.documentElement.style.setProperty('--tw-color-background', '#18181b');
      document.documentElement.style.setProperty('--tw-color-surface', '#27272a');
      document.documentElement.style.setProperty('--tw-color-surface-light', '#32323a');
      document.documentElement.style.setProperty('--tw-shadow-card', '0 4px 24px 0 rgba(99,102,241,0.10)');
      // Reset text color classes for dark theme
      document.documentElement.style.setProperty('--tw-text-color', '#ffffff');
      document.documentElement.style.setProperty('--tw-text-color-secondary', '#e5e7eb');
    }
    setThemePopupOpen(false);
  };

  // Set initial CSS variables on mount for white theme as default
  React.useEffect(() => {
    // Set white theme as default on initial load
    document.documentElement.style.setProperty('--tw-color-primary', themeColor);
    document.documentElement.style.setProperty('--tw-color-primary-rgb', hexToRgb(themeColor));
    document.documentElement.style.setProperty('--tw-color-accent', '#111111'); // Use black for accent
    document.documentElement.style.setProperty('--tw-color-background', '#f8f9fa');
    document.documentElement.style.setProperty('--tw-color-surface', '#ffffff');
    document.documentElement.style.setProperty('--tw-color-surface-light', '#f5f5f5');
    document.documentElement.style.setProperty('--tw-shadow-card', '0 4px 24px 0 rgba(0,0,0,0.08)');
    document.documentElement.style.setProperty('--tw-text-color', '#333333');
    document.documentElement.style.setProperty('--tw-text-color-secondary', '#666666');
    // Set chat-specific colors for white theme
    document.documentElement.style.setProperty('--tw-chat-text-color', '#333333');
    document.documentElement.style.setProperty('--tw-chat-input-color', '#ffffff');
    document.documentElement.style.setProperty('--tw-chat-input-border-color', '#e5e5e5');
    document.documentElement.style.setProperty('--tw-chat-divider-color', '#e5e5e5');
  }, []);

  return (
    <div className="w-72 bg-surface p-6 flex flex-col rounded-xl shadow-card h-full">
      <div className="flex-1 flex flex-col space-y-4">
        <div className="sidebar-app-name-animated flex items-center justify-center mb-6">
          <span className="sidebar-app-name-text">AgentWeave</span>
        </div>
        <button
          className={`text-left p-3 rounded-xl font-semibold transition shadow sidebar-client-btn ${selected === 'client' ? 'active' : ''}`}
          onClick={() => onSelect('client')}
        >
          Agents
        </button>
        <button
          className={`text-left p-3 rounded-xl font-semibold transition shadow sidebar-server-btn ${selected === 'server' ? 'active' : ''}`}
          onClick={() => onSelect('server')}
        >
          Engine
        </button>
      </div>
      <button
        className={`btn-primary sidebar-settings-btn flex items-center justify-center w-full mt-4 mb-2${settingsOpen ? ' active' : ''}`}
        onClick={() => setSettingsOpen((open) => !open)}
        aria-label="Open settings menu"
        type="button"
      >
        <span>Settings</span>
      </button>
      {settingsOpen && (
        <div className="mt-2 w-full">
          <div className="bg-surface-light rounded-xl shadow-card divide-y divide-zinc-700">
            <button
              className={`w-full text-left px-5 py-3 hover:bg-primary/10 transition flex items-center gap-2 sidebar-btn${themePopupOpen ? ' active' : ''}`}
              onClick={() => { setThemePopupOpen(true); setSettingsOpen(false); }}
              aria-label="Open theme settings"
              type="button"
            >
              <span>Theme</span>
            </button>
            <button
              className={`w-full text-left px-5 py-3 hover:bg-primary/10 transition flex items-center gap-2 sidebar-btn${aboutPopupOpen ? ' active' : ''}`}
              onClick={() => { setAboutPopupOpen(true); setSettingsOpen(false); }}
              aria-label="Open about popup"
              type="button"
            >
              <span>About</span>
            </button>
          </div>
        </div>
      )}
      <div className="mt-6 text-center text-xs text-textSecondary opacity-80">
        powered by <span className="font-bold text-primary">Shanvi Innovations</span>
      </div>
      <ThemePopup open={themePopupOpen} onClose={() => setThemePopupOpen(false)} onThemeChange={handleThemeChange} />
      <AboutPopup open={aboutPopupOpen} onClose={() => setAboutPopupOpen(false)} />
    </div>
  );
}

export default Sidebar;