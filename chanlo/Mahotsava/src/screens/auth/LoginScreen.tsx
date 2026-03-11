import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Animated, {FadeInDown, FadeInUp} from 'react-native-reanimated';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {colors, spacing, borderRadius, fontSize, gradients, shadows} from '../../theme/colors';
import {IconButton} from '../../components';
import {api} from '../../services/api';

type LoginMode = 'host' | 'helper';

export default function LoginScreen({navigation}: any) {
  const [mode, setMode] = useState<LoginMode>('host');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async () => {
    if (phone.length !== 10) {
      Alert.alert('Invalid', 'Please enter a valid 10-digit phone number');
      return;
    }

    setLoading(true);
    try {
      const res = await api.sendOtp(phone);
      if (res.success) {
        navigation.navigate('Otp', {
          phone,
          mode,
          devOtp: res.otp, // null in production when WhatsApp succeeds
        });
      } else {
        Alert.alert('Error', res.message || 'Failed to send OTP');
      }
    } catch (e: any) {
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={[...gradients.loginBg]}
      style={styles.gradient}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Animated.View entering={FadeInDown.duration(600)} style={styles.header}>
          <Ionicons name="gift" size={56} color={colors.accent} />
          <Text style={styles.logo}>Mahotsava</Text>
          <Text style={styles.tagline}>
            Paperless money collection{'\n'}for every event
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInUp.duration(600).delay(200)} style={styles.card}>
          {/* Mode selector */}
          <View style={styles.modeRow}>
            <ModeButton
              icon="home-outline"
              label="I'm a Host"
              active={mode === 'host'}
              onPress={() => setMode('host')}
            />
            <ModeButton
              icon="people-outline"
              label="Help a Host"
              active={mode === 'helper'}
              onPress={() => setMode('helper')}
            />
          </View>

          {/* Phone input */}
          <Text style={styles.label}>Mobile Number</Text>
          <View style={styles.phoneRow}>
            <View style={styles.prefix}>
              <Text style={styles.prefixText}>+91</Text>
            </View>
            <TextInput
              style={styles.phoneInput}
              value={phone}
              onChangeText={t => setPhone(t.replace(/[^0-9]/g, '').slice(0, 10))}
              placeholder="Enter 10-digit number"
              placeholderTextColor={colors.textMuted}
              keyboardType="phone-pad"
              maxLength={10}
            />
          </View>

          <IconButton
            icon="send-outline"
            label="Send OTP"
            variant="primary"
            onPress={handleSendOtp}
            loading={loading}
            style={styles.sendBtn}
          />
        </Animated.View>

        <Animated.Text entering={FadeInUp.duration(600).delay(400)} style={styles.footer}>
          Hosts & Helpers login here.{'\n'}Guests use WhatsApp!
        </Animated.Text>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

function ModeButton({icon, label, active, onPress}: {icon: string; label: string; active: boolean; onPress: () => void}) {
  return (
    <View style={[styles.modeBtn, active && styles.modeBtnActive]}>
      <Ionicons
        name={icon}
        size={16}
        color={active ? colors.textLight : colors.textSecondary}
        style={{marginRight: 4}}
      />
      <Text
        style={[styles.modeBtnText, active && styles.modeBtnTextActive]}
        onPress={onPress}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  logo: {
    fontSize: 42,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 1,
    marginTop: spacing.sm,
  },
  tagline: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 22,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.lg,
  },
  modeRow: {
    flexDirection: 'row',
    backgroundColor: colors.divider,
    borderRadius: borderRadius.full,
    padding: 3,
    marginBottom: spacing.lg,
  },
  modeBtn: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: spacing.sm + 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.full,
  },
  modeBtnActive: {
    backgroundColor: colors.primary,
  },
  modeBtnText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  modeBtnTextActive: {
    color: colors.textLight,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    marginTop: spacing.md,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  prefix: {
    backgroundColor: colors.divider,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md - 2,
    borderTopLeftRadius: borderRadius.sm,
    borderBottomLeftRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRightWidth: 0,
  },
  prefixText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  phoneInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderTopRightRadius: borderRadius.sm,
    borderBottomRightRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md - 2,
    fontSize: fontSize.lg,
    color: colors.textPrimary,
    letterSpacing: 2,
  },
  sendBtn: {
    marginTop: spacing.lg,
  },
  footer: {
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: fontSize.sm,
    marginTop: spacing.lg,
  },
});
