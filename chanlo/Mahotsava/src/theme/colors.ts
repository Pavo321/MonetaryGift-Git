export const colors = {
  // Primary - warm saffron/orange (Indian festive)
  primary: '#E65100',
  primaryLight: '#FF8F00',
  primaryDark: '#BF360C',

  // Secondary - deep teal
  secondary: '#00695C',
  secondaryLight: '#00897B',

  // Accent - gold
  accent: '#F9A825',
  accentLight: '#FFD54F',

  // Background
  background: '#FAFAFA',
  surface: '#FFFFFF',
  card: '#FFFFFF',

  // Text
  textPrimary: '#212121',
  textSecondary: '#757575',
  textLight: '#FFFFFF',
  textMuted: '#9E9E9E',

  // Status
  success: '#2E7D32',
  successLight: '#E8F5E9',
  error: '#C62828',
  errorLight: '#FFEBEE',
  warning: '#F57F17',
  warningLight: '#FFF8E1',
  info: '#1565C0',
  infoLight: '#E3F2FD',

  // Borders
  border: '#E0E0E0',
  divider: '#EEEEEE',

  // Shadows
  shadow: 'rgba(0, 0, 0, 0.1)',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
};

export const fontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 22,
  xxl: 28,
  title: 34,
};

export const gradients = {
  hostHeader: ['#E65100', '#FF8F00'] as const,
  helperHeader: ['#00695C', '#00897B'] as const,
  loginBg: ['#FFF8E1', '#FAFAFA'] as const,
  festive: ['#E65100', '#F9A825'] as const,
};

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 3},
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 6},
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 8,
  },
};
