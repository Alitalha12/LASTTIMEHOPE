/**
 * Project Color Theme (Deep Indigo & Emerald)
 * Premium, modern palette for high-end aesthetics.
 */
export const Colors = {
  primary: '#3F51B5', // Deep Indigo
  secondary: '#10B981', // Emerald
  accent: '#F59E0B', // Amber
  background: '#F8FAFC',
  surface: '#FFFFFF',
  text: '#1E293B',
  textLight: '#64748B',
  error: '#EF4444',
  success: '#10B981',
  border: '#E2E8F0',
  glass: 'rgba(255, 255, 255, 0.8)',
};

export const Color = Colors; // Alias for safety

export const Theme = {
  roundness: 12,
  colors: {
    primary: Colors.primary,
    accent: Colors.accent,
    background: Colors.background,
    surface: Colors.surface,
    text: Colors.text,
    error: Colors.error,
    notification: Colors.secondary,
  },
};
