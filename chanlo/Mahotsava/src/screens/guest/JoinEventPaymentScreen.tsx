import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Alert,
  TextInput,
  Modal,
  ScrollView,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {colors, spacing, borderRadius, fontSize, shadows} from '../../theme/colors';
import {GradientHeader} from '../../components';
import {api} from '../../services/api';

const UPI_APPS = [
  {key: 'googlePay', label: 'Google Pay', icon: 'logo-google', color: '#4285F4'},
  {key: 'phonePe', label: 'PhonePe', icon: 'phone-portrait-outline', color: '#5F259F'},
  {key: 'paytm', label: 'Paytm', icon: 'wallet-outline', color: '#002970'},
  {key: 'bhim', label: 'BHIM', icon: 'shield-outline', color: '#1A237E'},
  {key: 'genericUpi', label: 'Any UPI App', icon: 'apps-outline', color: colors.primary},
];

export default function JoinEventPaymentScreen({route, navigation}: any) {
  const {hisabId, amount, eventName, upiLinks} = route.params;
  const [txnModalVisible, setTxnModalVisible] = useState(false);
  const [transactionId, setTransactionId] = useState('');
  const [confirming, setConfirming] = useState(false);

  const openUpiApp = async (appKey: string) => {
    const url = upiLinks?.[appKey];
    if (!url) {
      Alert.alert('Not Available', 'Payment link not available. Please use another app.');
      return;
    }
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        Alert.alert('App Not Found', `Could not open ${appKey}. Try another payment app.`);
      }
    } catch {
      Alert.alert('Error', 'Failed to open payment app.');
    }
  };

  const handleConfirmPayment = async () => {
    if (!transactionId.trim()) {
      Alert.alert('Required', 'Please enter the transaction ID from your payment app.');
      return;
    }
    setConfirming(true);
    try {
      const res = await api.confirmJoinPayment(hisabId, transactionId.trim());
      if (res.success) {
        setTxnModalVisible(false);
        Alert.alert(
          'Seat Confirmed!',
          `Your seat for "${eventName}" is confirmed.\n\nTransaction ID: ${transactionId}\n\nYou will receive a WhatsApp confirmation shortly.`,
          [{text: 'Done', onPress: () => navigation.navigate('GuestTabs')}],
        );
      } else {
        Alert.alert('Error', res.message);
      }
    } catch {
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setConfirming(false);
    }
  };

  return (
    <View style={styles.container}>
      <GradientHeader title="Complete Payment" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content}>

        {/* Amount Card */}
        <View style={styles.amountCard}>
          <Text style={styles.amountLabel}>Amount to Pay</Text>
          <Text style={styles.amountValue}>Rs.{amount}</Text>
          <Text style={styles.eventNameText}>{eventName}</Text>
        </View>

        {/* UPI App Buttons */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Choose Payment App</Text>
          {UPI_APPS.map(app => (
            <TouchableOpacity
              key={app.key}
              style={[styles.upiBtn, {borderLeftColor: app.color}]}
              onPress={() => openUpiApp(app.key)}>
              <View style={[styles.upiIcon, {backgroundColor: app.color + '22'}]}>
                <Ionicons name={app.icon} size={22} color={app.color} />
              </View>
              <Text style={styles.upiLabel}>{app.label}</Text>
              <Ionicons name="chevron-forward-outline" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Confirm Payment Button */}
        <View style={styles.confirmSection}>
          <Text style={styles.confirmHint}>After completing payment in your UPI app, tap below to confirm your seat.</Text>
          <TouchableOpacity style={styles.confirmBtn} onPress={() => setTxnModalVisible(true)}>
            <Ionicons name="checkmark-circle-outline" size={20} color={colors.white ?? '#fff'} />
            <Text style={styles.confirmBtnText}>I've Paid — Confirm Seat</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Transaction ID Modal */}
      <Modal visible={txnModalVisible} transparent animationType="slide" onRequestClose={() => setTxnModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Ionicons name="receipt-outline" size={32} color={colors.primary} style={{marginBottom: spacing.sm}} />
            <Text style={styles.modalTitle}>Enter Transaction ID</Text>
            <Text style={styles.modalSubtitle}>Find it in your UPI app's transaction history</Text>
            <TextInput
              style={styles.txnInput}
              value={transactionId}
              onChangeText={setTransactionId}
              placeholder="e.g. T2312345678"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="characters"
            />
            <TouchableOpacity
              style={[styles.confirmBtn, confirming && {opacity: 0.6}]}
              onPress={handleConfirmPayment}
              disabled={confirming}>
              <Ionicons name="checkmark-circle-outline" size={18} color={colors.white ?? '#fff'} />
              <Text style={styles.confirmBtnText}>{confirming ? 'Confirming...' : 'Confirm'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setTxnModalVisible(false)}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.background},
  content: {padding: spacing.md, paddingBottom: spacing.xxl},
  amountCard: {backgroundColor: colors.primary, borderRadius: borderRadius.lg, padding: spacing.xl ?? spacing.lg, alignItems: 'center', marginBottom: spacing.lg, ...shadows.md},
  amountLabel: {fontSize: fontSize.sm, color: 'rgba(255,255,255,0.8)', marginBottom: 4},
  amountValue: {fontSize: 40, fontWeight: '900', color: colors.white ?? '#fff'},
  eventNameText: {fontSize: fontSize.sm, color: 'rgba(255,255,255,0.8)', marginTop: 4},
  section: {marginBottom: spacing.lg},
  sectionTitle: {fontSize: fontSize.md, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.md},
  upiBtn: {flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.sm, borderLeftWidth: 4, ...shadows.sm},
  upiIcon: {width: 44, height: 44, borderRadius: borderRadius.md, justifyContent: 'center', alignItems: 'center'},
  upiLabel: {flex: 1, fontSize: fontSize.md, fontWeight: '600', color: colors.textPrimary},
  confirmSection: {backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.lg, alignItems: 'center', ...shadows.sm},
  confirmHint: {fontSize: fontSize.sm, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.md},
  confirmBtn: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.success, borderRadius: borderRadius.full ?? 20, paddingVertical: spacing.md, paddingHorizontal: spacing.xxl, width: '100%', justifyContent: 'center'},
  confirmBtnText: {color: colors.white ?? '#fff', fontSize: fontSize.md, fontWeight: '700'},
  modalOverlay: {flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end'},
  modalContent: {backgroundColor: colors.surface, borderTopLeftRadius: borderRadius.xl ?? 24, borderTopRightRadius: borderRadius.xl ?? 24, padding: spacing.xl ?? spacing.lg, alignItems: 'center'},
  modalTitle: {fontSize: fontSize.lg, fontWeight: '800', color: colors.textPrimary},
  modalSubtitle: {fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 4, marginBottom: spacing.lg},
  txnInput: {width: '100%', borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.md, fontSize: fontSize.md, color: colors.textPrimary, marginBottom: spacing.md, textAlign: 'center', letterSpacing: 1},
  cancelBtn: {marginTop: spacing.sm, padding: spacing.md},
  cancelBtnText: {fontSize: fontSize.md, color: colors.textMuted},
});
