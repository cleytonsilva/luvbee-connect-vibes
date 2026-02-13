import React, { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, View } from 'react-native';
import { colors, shadows, borders, borderRadius, typography } from '../../constants/theme';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';
type ButtonColor = 'yellow' | 'pink' | 'blue' | 'green' | 'red';

interface NeoButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  color?: ButtonColor;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
}

const colorMap: Record<ButtonColor, string> = {
  yellow: colors.yellow,
  pink: colors.pink,
  blue: colors.blue,
  green: colors.green,
  red: colors.red,
};

export function NeoButton({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  color = 'yellow',
  disabled = false,
  loading = false,
  icon,
}: NeoButtonProps) {
  const [pressed, setPressed] = useState(false);

  const sizeStyles = {
    sm: { paddingVertical: 8, paddingHorizontal: 16 },
    md: { paddingVertical: 12, paddingHorizontal: 24 },
    lg: { paddingVertical: 16, paddingHorizontal: 32 },
  };

  const getBackgroundColor = () => {
    if (disabled) return colors.gray300;
    if (variant === 'ghost') return 'transparent';
    if (variant === 'outline') return colors.white;
    return colorMap[color];
  };

  const getTextColor = () => {
    if (disabled) return colors.gray500;
    return colors.black;
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      activeOpacity={0.8}
      style={[
        styles.button,
        {
          backgroundColor: getBackgroundColor(),
          borderColor: disabled ? colors.gray400 : colors.black,
        },
        sizeStyles[size],
        pressed ? { transform: [{ translateX: 2 }, { translateY: 2 }] } : {},
        pressed ? {} : shadows.md,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={getTextColor()} />
      ) : (
        <View style={styles.content}>
          {icon && <View style={styles.icon}>{icon}</View>}
          <Text style={[styles.text, { color: getTextColor(), fontSize: size === 'lg' ? 18 : size === 'md' ? 16 : 14 }]}>
            {title}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderWidth: borders.thick,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    marginRight: 8,
  },
  text: {
    fontWeight: 'bold',
  },
});
