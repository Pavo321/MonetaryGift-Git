import React from 'react';
import {ViewStyle} from 'react-native';
import Animated, {FadeInDown} from 'react-native-reanimated';
import {shadows} from '../theme/colors';

interface AnimatedCardProps {
  index?: number;
  style?: ViewStyle;
  children: React.ReactNode;
}

export default function AnimatedCard({index = 0, style, children}: AnimatedCardProps) {
  return (
    <Animated.View
      entering={FadeInDown.delay(index * 60).springify().damping(18)}
      style={[{...shadows.md}, style]}>
      {children}
    </Animated.View>
  );
}
