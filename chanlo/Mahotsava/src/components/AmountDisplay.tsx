import React from 'react';
import {Text, TextStyle} from 'react-native';
import {colors, fontSize as fs} from '../theme/colors';

interface AmountDisplayProps {
  amount: number | string;
  color?: string;
  size?: 'sm' | 'md' | 'lg';
  style?: TextStyle;
}

function formatIndian(num: number): string {
  if (num % 1 === 0) return num.toLocaleString('en-IN');
  return num.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2});
}

export default function AmountDisplay({
  amount,
  color = colors.textPrimary,
  size = 'md',
  style,
}: AmountDisplayProps) {
  const numVal = typeof amount === 'string' ? parseFloat(amount) || 0 : amount;
  const sizeMap = {sm: fs.sm, md: fs.md, lg: fs.xl};

  return (
    <Text style={[{color, fontSize: sizeMap[size], fontWeight: '800'}, style]}>
      {'\u20B9'}{formatIndian(numVal)}
    </Text>
  );
}
