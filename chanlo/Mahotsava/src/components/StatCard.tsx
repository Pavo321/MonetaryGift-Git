import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {colors, spacing, borderRadius, fontSize, shadows} from '../theme/colors';

interface StatCardProps {
  icon: string;
  iconColor?: string;
  value: string;
  label: string;
  bgTint?: string;
}

export default function StatCard({
  icon,
  iconColor = colors.primary,
  value,
  label,
  bgTint,
}: StatCardProps) {
  return (
    <View style={[styles.card, bgTint ? {backgroundColor: bgTint} : undefined]}>
      <View style={[styles.iconCircle, {backgroundColor: iconColor + '18'}]}>
        <Ionicons name={icon} size={22} color={iconColor} />
      </View>
      <Text style={styles.value} numberOfLines={1}>{value}</Text>
      <Text style={styles.label} numberOfLines={1}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    ...shadows.sm,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  value: {
    fontSize: fontSize.md,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: 2,
  },
  label: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
});
