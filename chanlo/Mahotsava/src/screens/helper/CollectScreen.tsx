import React, {useState, useRef, useCallback} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Modal,
} from 'react-native';
import {Camera, useCameraDevice, useCodeScanner} from 'react-native-vision-camera';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {colors, spacing, borderRadius, fontSize, shadows} from '../../theme/colors';
import {IconButton, EmptyState} from '../../components';
import {api} from '../../services/api';

export default function CollectScreen({route}: any) {
  const {eventId} = route.params;
  const [guestName, setGuestName] = useState('');
  const [guestPlace, setGuestPlace] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<'CASH' | 'UPI_QR'>('CASH');
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);
  const [scannerVisible, setScannerVisible] = useState(false);
  const [scannedGuest, setScannedGuest] = useState(false);
  const scannedRef = useRef(false);
  const amountRef = useRef<TextInput>(null);

  const device = useCameraDevice('back');

  const codeScanner = useCodeScanner({
    codeTypes: ['qr'],
    onCodeScanned: (codes) => {
      if (scannedRef.current) return;
      if (codes.length > 0 && codes[0].value) {
        scannedRef.current = true;
        const qrData = codes[0].value;
        if (qrData.startsWith('GUEST|')) {
          const parts = qrData.split('|');
          if (parts.length >= 4) {
            setGuestName(parts[1]);
            setGuestPlace(parts[2]);
            setGuestPhone(parts[3]);
            setScannedGuest(true);
            setScannerVisible(false);
            setTimeout(() => amountRef.current?.focus(), 400);
            return;
          }
        }
        setScannerVisible(false);
        Alert.alert('Invalid QR', 'This is not a valid guest QR code');
      }
    },
  });

  const openScanner = async () => {
    const status = await Camera.requestCameraPermission();
    if (status === 'granted') {
      scannedRef.current = false;
      setScannerVisible(true);
    } else {
      Alert.alert('Permission Denied', 'Camera permission is required to scan QR codes');
    }
  };

  const submitCollect = async (amt: number) => {
    setLoading(true);
    try {
      const res = await api.collectMoney(
        eventId,
        guestName.trim(),
        guestPhone,
        amt,
        guestPlace.trim() || undefined,
        method,
      );
      if (res.success) {
        setLastResult(res);
        setGuestName('');
        setGuestPlace('');
        setGuestPhone('');
        setAmount('');
        setScannedGuest(false);
        Alert.alert(
          'Collected!',
          `Rs. ${amt.toFixed(2)} from ${guestName} recorded.\nVerification ID: ${res.verificationQr || ''}`,
        );
      } else {
        Alert.alert('Error', res.message || 'Failed');
      }
    } catch {
      Alert.alert('Error', 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleCollect = () => {
    if (!guestName.trim()) {
      Alert.alert('Required', 'Enter guest name');
      return;
    }
    if (guestPhone.length !== 10) {
      Alert.alert('Required', 'Enter valid 10-digit phone');
      return;
    }
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      Alert.alert('Required', 'Enter a valid amount');
      return;
    }

    const summary = [
      `Guest Name: ${guestName.trim()}`,
      guestPlace.trim() ? `Place: ${guestPlace.trim()}` : null,
      `Phone: ${guestPhone}`,
      `Amount: Rs. ${amt.toFixed(2)}`,
      `Payment Method: ${method === 'CASH' ? 'Cash' : 'UPI'}`,
    ]
      .filter(Boolean)
      .join('\n');

    Alert.alert(
      'Recheck Before Confirming',
      `${summary}\n\nIs all the information correct?`,
      [
        {text: 'Edit', style: 'cancel'},
        {text: 'Confirm', onPress: () => submitCollect(amt)},
      ],
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled">
      <View style={styles.card}>
        <View style={styles.titleRow}>
          <Ionicons name="cash-outline" size={22} color={colors.secondary} />
          <Text style={styles.title}>Collect Money</Text>
        </View>
        <Text style={styles.subtitle}>Record a contribution from a guest</Text>

        {/* Scan QR button */}
        <IconButton
          icon="scan-outline"
          label="Scan Guest QR"
          variant="secondary"
          onPress={openScanner}
          style={styles.scanBtn}
        />

        {scannedGuest ? (
          <View style={styles.scannedBanner}>
            <View style={styles.scannedHeader}>
              <Ionicons name="checkmark-circle" size={20} color={colors.secondary} />
              <Text style={styles.scannedTitle}>Guest Details (from QR)</Text>
            </View>
            <Text style={styles.scannedInfo}>
              {guestName}{guestPlace ? ` - ${guestPlace}` : ''}{'\n'}
              Phone: {guestPhone}
            </Text>
            <TouchableOpacity onPress={() => setScannedGuest(false)}>
              <Text style={styles.scannedEdit}>Edit details</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or enter manually</Text>
              <View style={styles.dividerLine} />
            </View>

            <Text style={styles.label}>Guest Name *</Text>
            <TextInput
              style={styles.input}
              value={guestName}
              onChangeText={setGuestName}
              placeholder="Enter guest name"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="words"
            />

            <Text style={styles.label}>Village / City</Text>
            <TextInput
              style={styles.input}
              value={guestPlace}
              onChangeText={setGuestPlace}
              placeholder="Optional"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={styles.label}>Phone Number *</Text>
            <TextInput
              style={styles.input}
              value={guestPhone}
              onChangeText={t => setGuestPhone(t.replace(/[^0-9]/g, '').slice(0, 10))}
              placeholder="10-digit number"
              placeholderTextColor={colors.textMuted}
              keyboardType="phone-pad"
              maxLength={10}
            />
          </>
        )}

        <Text style={styles.label}>Amount (Rs.) *</Text>
        <TextInput
          ref={amountRef}
          style={[styles.input, styles.amountInput]}
          value={amount}
          onChangeText={t => setAmount(t.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1'))}
          placeholder="0.00"
          placeholderTextColor={colors.textMuted}
          keyboardType="decimal-pad"
        />

        {/* Payment method */}
        <Text style={styles.label}>Payment Method</Text>
        <View style={styles.methodRow}>
          <TouchableOpacity
            style={[styles.methodBtn, method === 'CASH' && styles.methodBtnActive]}
            onPress={() => setMethod('CASH')}>
            <Ionicons name="cash-outline" size={18} color={method === 'CASH' ? colors.secondary : colors.textSecondary} />
            <Text style={[styles.methodText, method === 'CASH' && styles.methodTextActive]}>Cash</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.methodBtn, styles.methodBtnDisabled]}
            onPress={() => Alert.alert('Coming Soon', 'UPI payments will be available in a future update. Please use Cash for now.')}>
            <Ionicons name="card-outline" size={18} color={colors.textMuted} />
            <Text style={[styles.methodText, {color: colors.textMuted}]}>UPI</Text>
          </TouchableOpacity>
        </View>
      </View>

      <IconButton
        icon="checkmark-circle"
        label="Received"
        variant="success"
        onPress={handleCollect}
        loading={loading}
        style={styles.collectBtn}
      />

      {/* Last result */}
      {lastResult && (
        <View style={styles.resultCard}>
          <Ionicons name="checkmark-done-circle" size={24} color={colors.success} />
          <View style={{marginLeft: spacing.sm, flex: 1}}>
            <Text style={styles.resultTitle}>Last Collection</Text>
            <Text style={styles.resultText}>Hisab #{lastResult.hisabId} recorded</Text>
            <Text style={styles.resultText}>WhatsApp confirmation sent to guest</Text>
          </View>
        </View>
      )}

      {/* QR Scanner Modal */}
      <Modal
        visible={scannerVisible}
        animationType="slide"
        onRequestClose={() => setScannerVisible(false)}>
        <View style={styles.scannerContainer}>
          <View style={styles.scannerHeader}>
            <Text style={styles.scannerTitle}>Scan Guest QR Code</Text>
            <TouchableOpacity
              style={styles.scannerCloseBtn}
              onPress={() => setScannerVisible(false)}>
              <Ionicons name="close" size={24} color={colors.textLight} />
            </TouchableOpacity>
          </View>
          {device ? (
            <Camera
              style={styles.camera}
              device={device}
              isActive={scannerVisible}
              codeScanner={codeScanner}
            />
          ) : (
            <View style={styles.noCameraView}>
              <Ionicons name="camera-outline" size={48} color={colors.textLight} />
              <Text style={styles.noCameraText}>No camera available</Text>
            </View>
          )}
          <Text style={styles.scannerHint}>Point camera at the guest's QR code</Text>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.background},
  content: {padding: spacing.md, paddingBottom: spacing.xxl},
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.md,
  },
  titleRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm},
  title: {fontSize: fontSize.xl, fontWeight: '800', color: colors.textPrimary},
  subtitle: {fontSize: fontSize.sm, color: colors.textMuted, marginTop: 2, marginBottom: spacing.sm},
  label: {fontSize: fontSize.sm, fontWeight: '600', color: colors.textPrimary, marginBottom: spacing.xs, marginTop: spacing.md},
  input: {borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.md - 2, fontSize: fontSize.md, color: colors.textPrimary},
  amountInput: {fontSize: fontSize.xxl, fontWeight: '800', textAlign: 'center', letterSpacing: 2},
  methodRow: {flexDirection: 'row', gap: spacing.sm},
  methodBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm + 2,
  },
  methodBtnActive: {borderColor: colors.secondary, backgroundColor: '#E0F2F1'},
  methodBtnDisabled: {opacity: 0.5},
  methodText: {fontSize: fontSize.md, fontWeight: '600', color: colors.textSecondary},
  methodTextActive: {color: colors.secondary},
  scanBtn: {marginBottom: spacing.sm},
  collectBtn: {marginTop: spacing.lg},
  scannedBanner: {
    backgroundColor: '#E0F2F1',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderLeftWidth: 4,
    borderLeftColor: colors.secondary,
  },
  scannedHeader: {flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: 4},
  scannedTitle: {fontSize: fontSize.sm, fontWeight: '700', color: colors.secondary},
  scannedInfo: {fontSize: fontSize.md, color: colors.textPrimary, fontWeight: '600', lineHeight: 22},
  scannedEdit: {fontSize: fontSize.sm, color: colors.secondary, fontWeight: '600', marginTop: spacing.xs, textDecorationLine: 'underline'},
  dividerRow: {flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm},
  dividerLine: {flex: 1, height: 1, backgroundColor: colors.border},
  dividerText: {paddingHorizontal: spacing.md, fontSize: fontSize.xs, color: colors.textMuted},
  resultCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.successLight,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  resultTitle: {fontSize: fontSize.md, fontWeight: '700', color: colors.success},
  resultText: {fontSize: fontSize.sm, color: colors.secondary, marginTop: 4},
  scannerContainer: {flex: 1, backgroundColor: '#000'},
  scannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    paddingTop: spacing.xl,
    backgroundColor: colors.secondary,
  },
  scannerTitle: {fontSize: fontSize.lg, fontWeight: '700', color: colors.textLight},
  scannerCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  camera: {flex: 1},
  noCameraView: {flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md},
  noCameraText: {color: colors.textLight, fontSize: fontSize.md},
  scannerHint: {textAlign: 'center', color: colors.textLight, fontSize: fontSize.sm, padding: spacing.md, backgroundColor: 'rgba(0,0,0,0.7)'},
});
