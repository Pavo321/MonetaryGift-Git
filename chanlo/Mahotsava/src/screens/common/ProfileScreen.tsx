import React, {useState, useCallback} from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {colors, spacing, borderRadius, fontSize, shadows, gradients} from '../../theme/colors';
import {IconButton} from '../../components';
import {api} from '../../services/api';

export default function ProfileScreen({navigation}: any) {
  const [user, setUser] = useState<any>(null);
  const [name, setName] = useState('');
  const [place, setPlace] = useState('');
  const [email, setEmail] = useState('');
  const [pincode, setPincode] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadProfile = useCallback(async () => {
    try {
      const res = await api.getProfile();
      if (res.success && res.user) {
        setUser(res.user);
        setName(res.user.name || '');
        setPlace(res.user.village || '');
        setEmail(res.user.email || '');
        setPincode(res.user.pincode || '');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile]),
  );

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Name cannot be empty');
      return;
    }
    setSaving(true);
    try {
      const res = await api.updateProfile({
        name: name.trim(),
        place: place.trim(),
        email: email.trim() || undefined,
        pincode: pincode.trim() || undefined,
      });
      if (res.success) {
        Alert.alert('Saved', 'Profile updated');
      } else {
        Alert.alert('Error', res.message);
      }
    } catch {
      Alert.alert('Error', 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure?', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await api.logout();
          navigation.reset({
            index: 0,
            routes: [{name: 'Login'}],
          });
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const isHelper = user?.role === 'HELPER';
  const avatarGradient = isHelper ? gradients.helperHeader : gradients.hostHeader;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Avatar */}
      <View style={styles.avatarContainer}>
        <LinearGradient
          colors={[...avatarGradient]}
          style={styles.avatar}>
          <Text style={styles.avatarText}>
            {name ? name.charAt(0).toUpperCase() : '?'}
          </Text>
        </LinearGradient>
        <Text style={styles.phoneBadge}>{user?.phoneNumber || ''}</Text>
        <View style={[styles.rolePill, {backgroundColor: isHelper ? colors.secondary + '20' : colors.primary + '20'}]}>
          <Ionicons
            name={isHelper ? 'people' : 'home'}
            size={12}
            color={isHelper ? colors.secondary : colors.primary}
          />
          <Text style={[styles.roleText, {color: isHelper ? colors.secondary : colors.primary}]}>
            {user?.role || ''}
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Your name"
          placeholderTextColor={colors.textMuted}
        />

        <Text style={styles.label}>City / Village</Text>
        <TextInput
          style={styles.input}
          value={place}
          onChangeText={setPlace}
          placeholder="Your city"
          placeholderTextColor={colors.textMuted}
        />

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="Optional"
          placeholderTextColor={colors.textMuted}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Text style={styles.label}>Pincode</Text>
        <TextInput
          style={styles.input}
          value={pincode}
          onChangeText={t => setPincode(t.replace(/[^0-9]/g, '').slice(0, 6))}
          placeholder="Optional"
          placeholderTextColor={colors.textMuted}
          keyboardType="number-pad"
          maxLength={6}
        />

        <IconButton
          icon="checkmark-done-outline"
          label="Save Changes"
          variant="primary"
          onPress={handleSave}
          loading={saving}
          style={styles.saveBtn}
        />
      </View>

      <IconButton
        icon="log-out-outline"
        label="Logout"
        variant="outline"
        onPress={handleLogout}
        style={styles.logoutBtn}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.background},
  content: {padding: spacing.md, paddingBottom: spacing.xxl},
  center: {flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background},
  avatarContainer: {alignItems: 'center', paddingVertical: spacing.lg},
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
  },
  avatarText: {fontSize: 36, fontWeight: '800', color: colors.textLight},
  phoneBadge: {fontSize: fontSize.md, color: colors.textSecondary, marginTop: spacing.sm, fontWeight: '600'},
  rolePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.xs,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  roleText: {fontSize: fontSize.xs, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1},
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.md,
  },
  label: {fontSize: fontSize.sm, fontWeight: '600', color: colors.textPrimary, marginBottom: spacing.xs, marginTop: spacing.md},
  input: {borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.md - 2, fontSize: fontSize.md, color: colors.textPrimary},
  saveBtn: {marginTop: spacing.lg},
  logoutBtn: {marginTop: spacing.lg},
});
