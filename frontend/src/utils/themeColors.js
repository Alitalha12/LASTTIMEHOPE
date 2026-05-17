export const themes = {
  default: {
    primary: '#2563EB',
    background: '#F8FAFC',
    card: '#FFFFFF',
    text: '#0F172A',
    subtext: '#64748B',
    border: '#E2E8F0',
    header: '#FFFFFF',
    accent: '#3B82F6',
    statusBg: '#F0FDF4',
    statusText: '#166534',
  },
  midnight: {
    primary: '#6366F1',
    background: '#0F172A',
    card: '#1E293B',
    text: '#FFFFFF',
    subtext: '#94A3B8',
    border: '#334155',
    header: '#111827',
    accent: '#818CF8',
    statusBg: 'rgba(16, 185, 129, 0.1)',
    statusText: '#10B981',
  },
  nature: {
    primary: '#059669',
    background: '#F0FDF4',
    card: '#FFFFFF',
    text: '#064E3B',
    subtext: '#374151',
    border: '#D1FAE5',
    header: '#FFFFFF',
    accent: '#10B981',
    statusBg: '#DCFCE7',
    statusText: '#166534',
  }
};

export const getTheme = (themeName) => {
  return themes[themeName] || themes.default;
};
