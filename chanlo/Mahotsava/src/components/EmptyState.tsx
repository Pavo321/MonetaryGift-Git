import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import Animated, {FadeIn} from 'react-native-reanimated';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {colors, spacing, fontSize} from '../theme/colors';

interface EmptyStateProps {
  icon: string;
  iconColor?: string;
  title: string;
  message: string;
}

export default function EmptyState({
  icon,
  iconColor = colors.textMuted,
  title,
  message,
}: EmptyStateProps) {
  return (
    <Animated.View entering={FadeIn.duration(400)} style={styles.container}>
      <View style={[styles.iconCircle, {backgroundColor: iconColor + '15'}]}>
        <Ionicons name={icon} size={48} color={iconColor} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: spacing.xxl * 2,
    paddingHorizontal: spacing.lg,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: '800',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  message: {
    fontSize: fontSize.md,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
});
