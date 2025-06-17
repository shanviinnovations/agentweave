module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: 'var(--tw-color-primary)',
        accent: 'var(--tw-color-accent)',
        background: 'var(--tw-color-background)',
        surface: 'var(--tw-color-surface)',
        textMain: 'var(--tw-text-color)',
        textSecondary: 'var(--tw-text-color-secondary)',
        'surface-light': 'var(--tw-color-surface-light)',
        'chat-text': 'var(--tw-chat-text-color)',
        'chat-input': 'var(--tw-chat-input-color)',
        'chat-input-border': 'var(--tw-chat-input-border-color)',
        'chat-divider': 'var(--tw-chat-divider-color)',
      },
      fontFamily: {
        display: ['Poppins', 'ui-sans-serif', 'system-ui'],
      },
      borderRadius: {
        xl: '1.25rem',
      },
      boxShadow: {
        card: 'var(--tw-shadow-card)',
      },
    },
  },
  plugins: []
};