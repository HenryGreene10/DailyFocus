export const theme = {
  colors: {
    background: '#F5F0E8',
    textPrimary: '#1C1917',
    textSecondary: '#44403C',
    textFaint: '#A8A29E',
    accent: '#8B6F47',
    accentLight: '#C4A882',
  },
  spacing: {
    xs: 8,
    sm: 16,
    md: 24,
    lg: 32,
    xl: 40,
    xxl: 48,
  },
  fontSizes: {
    tiny: 9,
    small: 10,
    body: 11,
    bodyLarge: 13,
    story: 17,
    title: 36,
    hero: 42,
    stat: 40,
  },
  fonts: {
    loraRegular: 'Lora_400Regular',
    loraItalic: 'Lora_400Regular_Italic',
    cormorantLight: 'CormorantGaramond_300Light',
    cormorantItalic: 'CormorantGaramond_400Regular_Italic',
  },
} as const;

// Compatibility exports for existing template utilities still present in repo.
export const Colors = {
  light: {
    text: theme.colors.textPrimary,
    background: theme.colors.background,
    tint: theme.colors.accent,
    icon: theme.colors.textSecondary,
    tabIconDefault: theme.colors.textFaint,
    tabIconSelected: theme.colors.accent,
  },
  dark: {
    text: theme.colors.textPrimary,
    background: theme.colors.background,
    tint: theme.colors.accent,
    icon: theme.colors.textSecondary,
    tabIconDefault: theme.colors.textFaint,
    tabIconSelected: theme.colors.accent,
  },
};

export const Fonts = {
  sans: theme.fonts.loraRegular,
  serif: theme.fonts.cormorantLight,
  rounded: theme.fonts.cormorantLight,
  mono: theme.fonts.loraRegular,
};
