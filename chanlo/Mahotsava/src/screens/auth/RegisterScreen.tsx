import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import Animated, {FadeInDown, FadeInUp} from 'react-native-reanimated';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {colors, spacing, borderRadius, fontSize, shadows} from '../../theme/colors';
import {IconButton} from '../../components';
import {api} from '../../services/api';

const NAME_REGEX = /^[a-zA-Z\s.'-]+$/;

function getNameError(value: string): string {
  if (!value.trim()) return '';
  if (value.trim().length <= 3) return 'Name must be more than 3 characters';
  if (!NAME_REGEX.test(value.trim())) return 'Name can only contain letters, spaces, and basic punctuation';
  return '';
}

function getPlaceError(value: string): string {
  if (!value.trim()) return '';
  if (value.trim().length <= 3) return 'City/Village must be more than 3 characters';
  return '';
}

export default function RegisterScreen({route, navigation}: any) {
  const {mode, eventId} = route.params;
  const [name, setName] = useState('');
  const [place, setPlace] = useState('');
  const [email, setEmail] = useState('');
  const [pincode, setPincode] = useState('');
  const [loading, setLoading] = useState(false);

  const nameError = getNameError(name);
  const placeError = getPlaceError(place);

  const handleRegister = async () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter your name');
      return;
    }
    if (nameError) {
      Alert.alert('Invalid Name', nameError);
      return;
    }
    if (!place.trim()) {
      Alert.alert('Required', 'Please enter your city/village');
      return;
    }
    if (placeError) {
      Alert.alert('Invalid Place', placeError);
      return;
    }
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      Alert.alert('Invalid Email', 'Please enter a valid email address');
      return;
    }
    if (pincode.trim() && (pincode.length !== 6 || parseInt(pincode, 10) < 100000)) {
      Alert.alert('Invalid Pincode', 'Please enter a valid 6-digit pincode');
      return;
    }

    setLoading(true);
    try {
      const res = await api.register(
        name.trim(),
        place.trim(),
        email.trim() || undefined,
        pincode.trim() || undefined,
      );
      if (res.success) {
        navigation.reset({
          index: 0,
          routes: [{name: 'HostTabs'}],
        });
      } else {
        Alert.alert('Error', res.message || 'Registration failed');
      }
    } catch (e: any) {
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled">
      <Animated.View entering={FadeInDown.duration(500)} style={styles.header}>
        <View style={styles.iconCircle}>
          <Ionicons name="person-circle-outline" size={48} color={colors.primary} />
        </View>
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>
          Complete your profile to get started
        </Text>
      </Animated.View>

      <Animated.View entering={FadeInUp.duration(500).delay(200)} style={styles.card}>
        <Text style={styles.label}>Name *</Text>
        <TextInput
          style={[styles.input, nameError ? styles.inputError : null]}
          value={name}
          onChangeText={setName}
          placeholder="Enter your full name"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="words"
        />
        {nameError ? <Text style={styles.errorText}>{nameError}</Text> : null}

        <Text style={styles.label}>City / Village *</Text>
        <TextInput
          style={[styles.input, placeError ? styles.inputError : null]}
          value={place}
          onChangeText={setPlace}
          placeholder="Enter your city or village"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="words"
        />
        {placeError ? <Text style={styles.errorText}>{placeError}</Text> : null}

        <Text style={styles.label}>Email (optional)</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="your@email.com"
          placeholderTextColor={colors.textMuted}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Text style={styles.label}>Pincode (optional)</Text>
        <TextInput
          style={styles.input}
          value={pincode}
          onChangeText={t => setPincode(t.replace(/[^0-9]/g, '').slice(0, 6))}
          placeholder="6-digit pincode"
          placeholderTextColor={colors.textMuted}
          keyboardType="number-pad"
          maxLength={6}
        />

        <IconButton
          icon="person-add-outline"
          label="Create Account"
          variant="primary"
          onPress={handleRegister}
          loading={loading}
          style={styles.registerBtn}
        />
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    paddingTop: 60,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
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
    marginTop: spacing.xs,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.lg,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    marginTop: spacing.md,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md - 2,
    fontSize: fontSize.md,
    color: colors.textPrimary,
  },
  inputError: {
    borderColor: colors.error ?? '#E53935',
  },
  errorText: {
    fontSize: fontSize.xs ?? 11,
    color: colors.error ?? '#E53935',
    marginTop: 4,
  },
  registerBtn: {
    marginTop: spacing.xl,
  },
});
