// Tema Neobrutalista - Cores e estilos consistentes
export const colors = {
  // Primárias
  black: '#000000',
  white: '#FFFFFF',
  
  // Destaque Neobrutalista
  yellow: '#FFE600',
  pink: '#FF6B9D',
  blue: '#00D9FF',
  green: '#00FF94',
  purple: '#B829DD',
  orange: '#FF6B35',
  red: '#FF4444',
  
  // Estados
  success: '#00FF94',
  error: '#FF4444',
  warning: '#FFB800',
  info: '#00D9FF',
  
  // Neutros
  gray100: '#F5F5F5',
  gray200: '#E5E5E5',
  gray300: '#D4D4D4',
  gray400: '#A3A3A3',
  gray500: '#737373',
  gray600: '#525252',
  gray700: '#404040',
  gray800: '#262626',
  gray900: '#171717',
};

// Sombras硬 (Hard shadows) - estilo neobrutalista
export const shadows = {
  sm: {
    shadowColor: colors.black,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2,
  },
  md: {
    shadowColor: colors.black,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  lg: {
    shadowColor: colors.black,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  xl: {
    shadowColor: colors.black,
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 6,
  },
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
};

export const borders = {
  thin: 1,
  normal: 2,
  thick: 3,
  heavy: 4,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
};

export const borderRadius = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 20,
  full: 9999,
};

export const typography = {
  sizes: {
    xs: 10,
    sm: 12,
    md: 14,
    base: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 28,
    display: 32,
    huge: 40,
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
  weights: {
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
  },
};
