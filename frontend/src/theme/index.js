import { DefaultTheme } from 'react-native-paper';

export const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#2563EB',
    secondary: '#0F172A',
    accent: '#06B6D4',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    background: '#F8FAFC',
    card: '#FFFFFF',
    textPrimary: '#0F172A',
    textSecondary: '#64748B',
    surface: '#FFFFFF',
    border: '#E2E8F0',
  },
  roundness: 24, // Premium rounded corners (20-28px)
  fonts: {
    ...DefaultTheme.fonts,
    regular: { fontFamily: 'System', fontWeight: '400' },
    medium: { fontFamily: 'System', fontWeight: '500' },
    bold: { fontFamily: 'System', fontWeight: '700' },
  },
};
