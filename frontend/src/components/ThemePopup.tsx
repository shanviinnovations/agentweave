import React from 'react';

interface ThemePopupProps {
  open: boolean;
  onClose: () => void;
  onThemeChange: (color: string) => void;
}

const themeColors = [
  { name: 'White', value: '#f8f9fa' },
  { name: 'Indigo', value: '#6366f1' },
  { name: 'Orange', value: '#f59e42' },
  { name: 'Emerald', value: '#10b981' },
  { name: 'Rose', value: '#f43f5e' },
  { name: 'Sky', value: '#0ea5e9' },
];

function ThemePopup({ open, onClose, onThemeChange }: ThemePopupProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-surface rounded-xl shadow-card p-8 min-w-[320px] relative">
        <button onClick={onClose} className="absolute top-3 right-3 text-textSecondary hover:text-accent">✕</button>
        <h2 className="text-xl font-bold text-primary mb-4">Change Theme Color</h2>
        <div className="flex flex-wrap gap-4">
          {themeColors.map((color) => (
            <button
              key={color.value}
              className="w-12 h-12 rounded-full border-4 border-transparent focus:outline-none focus:ring-2 focus:ring-primary hover:scale-110 transition-transform"
              style={{ background: color.value }}
              onClick={() => onThemeChange(color.value)}
              aria-label={`Set theme to ${color.name}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default ThemePopup;
