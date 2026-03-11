import React from 'react';
import {TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {colors, spacing, borderRadius, fontSize} from '../theme/colors';

type Variant = 'primary' | 'secondary' | 'success' | 'danger' | 'accent' | 'outline';

interface IconButtonProps {
  icon: string;
  label: string;
  variant?: Variant;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  size?: 'sm' | 'md';
}

const variantStyles: Record<Variant, {bg: string; text: string; border?: string}> = {
  primary: {bg: colors.primary, text: colors.textLight},
  secondary: {bg: colors.secondary, text: colors.textLight},
  success: {bg: colors.success, text: colors.textLight},
  danger: {bg: colors.error, text: colors.textLight},
  accent: {bg: colors.accent, text: '#3E2723'},
  outline: {bg: 'transparent', text: colors.primary, border: colors.primary},
};

export default function IconButton({
  icon,
  label,
  variant = 'primary',
  onPress,
  loading = false,
  disabled = false,
  style,
  size = 'md',
}: IconButtonProps) {
  const v = variantStyles[variant];
  const isSmall = size === 'sm';

  return (
    <TouchableOpacity
      style={[
        styles.button,
        {backgroundColor: v.bg},
        v.border ? {borderWidth: 2, borderColor: v.border} : undefined,
        isSmall ? styles.buttonSm : undefined,
        (disabled || loading) && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}>
      {loading ? (
        <ActivityIndicator color={v.text} size="small" />
      ) : (
        <>
          <Ionicons name={icon} size={isSmall ? 18 : 20} color={v.text} />
          <Text style={[styles.label, {color: v.text}, isSmall && styles.labelSm]}>{label}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.xl,
    gap: spacing.sm,
  },
  buttonSm: {
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
  },
  label: {
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  labelSm: {
    fontSize: fontSize.sm,
  },
  disabled: {
    opacity: 0.6,
  },
});
