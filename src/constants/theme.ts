export type ThemeName = 'light' | 'dark';

export type Palette = {
  background: string;
  card: string;
  text: string;
  mutedText: string;
  track: string;
  primary: string;
  primaryDisabled: string;
  onPrimary: string;
  warning: string;
  error: string;
};

export const palettes: Record<ThemeName, Palette> = {
  dark: {
    background: '#0B0F19',
    card: '#151B2B',
    text: '#FFFFFF',
    mutedText: '#9CA3AF',
    track: '#1F2937',
    primary: '#4F46E5',
    primaryDisabled: '#312E81',
    onPrimary: '#FFFFFF',
    warning: '#FBBF24',
    error: '#EF4444',
  },
  light: {
    background: '#F5F7FB',
    card: '#FFFFFF',
    text: '#0B0F19',
    mutedText: '#6B7280',
    track: '#E5E7EB',
    primary: '#4F46E5',
    primaryDisabled: '#A5B4FC',
    onPrimary: '#FFFFFF',
    warning: '#B45309',
    error: '#DC2626',
  },
};
