import React, {useState, useRef, useEffect} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import Animated, {FadeInDown, FadeInUp} from 'react-native-reanimated';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {colors, spacing, borderRadius, fontSize, shadows} from '../../theme/colors';
import {IconButton} from '../../components';
import {api} from '../../services/api';

export default function OtpScreen({route, navigation}: any) {
  const {phone, mode, eventId, devOtp} = route.params;
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const inputs = useRef<TextInput[]>([]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleChange = (text: string, index: number) => {
    const digit = text.replace(/[^0-9]/g, '');
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);

    if (digit && index < 5) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const code = otp.join('');
    if (code.length !== 6) {
      Alert.alert('Invalid', 'Please enter the 6-digit OTP');
      return;
    }

    setLoading(true);
    try {
      const res = await api.verifyOtp(phone, code);
      if (res.success) {
        if (res.user) {
          // For existing users: trust the mode they selected at login.
          // A HOST can also be a HELPER for someone else's event.
          // A GUEST goes to GuestTabs.
          if (mode === 'guest') {
            navigation.reset({index: 0, routes: [{name: 'GuestTabs'}]});
          } else if (mode === 'helper') {
            navigation.reset({index: 0, routes: [{name: 'HelperTabs'}]});
          } else {
            navigation.reset({index: 0, routes: [{name: 'HostTabs'}]});
          }
        } else {
          navigation.replace('Register', {mode, eventId});
        }
      } else {
        Alert.alert('Error', res.message || 'Invalid OTP');
      }
    } catch (e: any) {
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    try {
      await api.sendOtp(phone);
      setCountdown(30);
      Alert.alert('Sent', 'OTP resent successfully');
    } catch {
      Alert.alert('Error', 'Failed to resend OTP');
    }
  };

  return (
    <View style={styles.container}>
      <Animated.View entering={FadeInDown.duration(500)} style={styles.header}>
        <View style={styles.lockCircle}>
          <Ionicons name="lock-closed-outline" size={36} color={colors.primary} />
        </View>
        <Text style={styles.title}>Verify OTP</Text>
        <Text style={styles.subtitle}>
          Enter the 6-digit code sent via WhatsApp to{'\n'}
          <Text style={styles.phone}>+91 {phone}</Text>
        </Text>
      </Animated.View>

      {/* Dev mode OTP hint */}
      {devOtp && (
        <View style={styles.devBanner}>
          <Text style={styles.devText}>DEV OTP: {devOtp}</Text>
        </View>
      )}

      <Animated.View entering={FadeInUp.duration(500).delay(150)} style={styles.otpRow}>
        {otp.map((digit, i) => (
          <TextInput
            key={i}
            ref={ref => {
              if (ref) inputs.current[i] = ref;
            }}
            style={[styles.otpBox, digit ? styles.otpBoxFilled : null]}
            value={digit}
            onChangeText={t => handleChange(t, i)}
            onKeyPress={e => handleKeyPress(e, i)}
            keyboardType="number-pad"
            maxLength={1}
            selectTextOnFocus
          />
        ))}
      </Animated.View>

      <Animated.View entering={FadeInUp.duration(500).delay(300)}>
        <IconButton
          icon="checkmark-circle"
          label="Verify"
          variant="primary"
          onPress={handleVerify}
          loading={loading}
          style={styles.verifyBtn}
        />
      </Animated.View>

      <TouchableOpacity
        style={styles.resendBtn}
        onPress={handleResend}
        disabled={countdown > 0}>
        <Ionicons
          name="refresh-outline"
          size={16}
          color={countdown > 0 ? colors.textMuted : colors.primary}
          style={{marginRight: 4}}
        />
        <Text
          style={[
            styles.resendText,
            countdown > 0 && styles.resendTextDisabled,
          ]}>
          {countdown > 0 ? `Resend OTP in ${countdown}s` : 'Resend OTP'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    paddingTop: 80,
  },
  header: {
    alignItems: 'center',
  },
  lockCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 24,
  },
  phone: {
    fontWeight: '700',
    color: colors.primary,
  },
  devBanner: {
    backgroundColor: colors.warningLight,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    marginTop: spacing.md,
    alignItems: 'center',
  },
  devText: {
    color: colors.warning,
    fontWeight: '700',
    fontSize: fontSize.md,
    letterSpacing: 4,
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginTop: spacing.xl,
  },
  otpBox: {
    width: 48,
    height: 56,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    textAlign: 'center',
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.textPrimary,
    backgroundColor: colors.surface,
    ...shadows.sm,
  },
  otpBoxFilled: {
    borderColor: colors.primary,
    backgroundColor: '#FFF3E0',
  },
  verifyBtn: {
    marginTop: spacing.xl,
  },
  resendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  resendText: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  resendTextDisabled: {
    color: colors.textMuted,
  },
});
