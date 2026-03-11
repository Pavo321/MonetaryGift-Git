import React, {useState, useRef} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  ScrollView,
} from 'react-native';
import {Camera, useCameraDevice, useCodeScanner} from 'react-native-vision-camera';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Animated, {FadeIn} from 'react-native-reanimated';
import {colors, spacing, borderRadius, fontSize, shadows} from '../../theme/colors';
import {GradientHeader, IconButton} from '../../components';
import {api} from '../../services/api';

export default function VerifyScreen() {
  const [qrData, setQrData] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [scannerVisible, setScannerVisible] = useState(false);
  const scannedRef = useRef(false);

  const device = useCameraDevice('back');

  const codeScanner = useCodeScanner({
    codeTypes: ['qr'],
    onCodeScanned: (codes) => {
      if (scannedRef.current) return;
      if (codes.length > 0 && codes[0].value) {
        scannedRef.current = true;
        const data = codes[0].value;
        setScannerVisible(false);
        setQrData(data);
        verifyQr(data);
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

  const verifyQr = async (data: string) => {
    if (!data.trim()) {
      Alert.alert('Required', 'Enter or scan the verification QR');
      return;
    }

    setLoading(true);
    try {
      const res = await api.verifyPayment(data.trim());
      setResult(res);
    } catch {
      Alert.alert('Error', 'Failed to verify');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = () => verifyQr(qrData);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <GradientHeader title="Verify Payment" />

      <View style={styles.body}>
        <View style={styles.card}>
          <View style={styles.titleRow}>
            <Ionicons name="shield-checkmark-outline" size={24} color={colors.primary} />
            <Text style={styles.title}>Verify Payment</Text>
          </View>
          <Text style={styles.subtitle}>
            Scan the verification QR from the guest's receipt
          </Text>

          <IconButton
            icon="scan-outline"
            label="Scan Verification QR"
            variant="primary"
            onPress={openScanner}
            style={styles.scanBtn}
          />

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or enter manually</Text>
            <View style={styles.dividerLine} />
          </View>

          <TextInput
            style={styles.input}
            value={qrData}
            onChangeText={setQrData}
            placeholder="VERIFY_... (paste code here)"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="characters"
          />

          <IconButton
            icon="shield-checkmark-outline"
            label="Verify"
            variant="secondary"
            onPress={handleVerify}
            loading={loading}
            style={styles.verifyBtn}
          />
        </View>

        {/* Result */}
        {result && (
          <Animated.View
            entering={FadeIn.duration(300)}
            style={[styles.resultCard, result.verified ? styles.resultSuccess : styles.resultFail]}>
            <View style={styles.resultHeader}>
              <Ionicons
                name={result.verified ? 'checkmark-circle' : 'close-circle'}
                size={36}
                color={result.verified ? colors.success : colors.error}
              />
              <Text style={[styles.resultTitle, {color: result.verified ? colors.success : colors.error}]}>
                {result.verified ? 'Payment Verified' : 'Not Found'}
              </Text>
            </View>
            <Text style={styles.resultMessage}>{result.message}</Text>

            {result.details && (
              <View style={styles.details}>
                <DetailRow label="Guest" value={result.details.guestName} />
                <DetailRow label="Amount" value={`Rs. ${result.details.amount}`} />
                <DetailRow label="Event" value={result.details.eventName} />
                <DetailRow label="Collected by" value={result.details.collectedBy} />
                <DetailRow label="Method" value={result.details.paymentMethod} />
                <DetailRow label="Status" value={result.details.status} />
                <DetailRow
                  label="Date"
                  value={result.details.date ? result.details.date.split('T')[0] : 'N/A'}
                />
              </View>
            )}
          </Animated.View>
        )}
      </View>

      {/* QR Scanner Modal */}
      <Modal
        visible={scannerVisible}
        animationType="slide"
        onRequestClose={() => setScannerVisible(false)}>
        <View style={styles.scannerContainer}>
          <View style={styles.scannerHeader}>
            <Text style={styles.scannerTitle}>Scan Verification QR</Text>
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
          <Text style={styles.scannerHint}>
            Point camera at the guest's payment verification QR code
          </Text>
        </View>
      </Modal>
    </ScrollView>
  );
}

function DetailRow({label, value}: {label: string; value: string}) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value || 'N/A'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.background},
  content: {paddingBottom: spacing.xxl},
  body: {padding: spacing.md},
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.md,
  },
  titleRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm},
  title: {fontSize: fontSize.xl, fontWeight: '800', color: colors.textPrimary},
  subtitle: {fontSize: fontSize.sm, color: colors.textMuted, marginTop: 4, marginBottom: spacing.lg},
  scanBtn: {marginBottom: spacing.md},
  dividerRow: {flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md},
  dividerLine: {flex: 1, height: 1, backgroundColor: colors.border},
  dividerText: {paddingHorizontal: spacing.md, fontSize: fontSize.xs, color: colors.textMuted},
  input: {borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.md, fontSize: fontSize.sm, color: colors.textPrimary},
  verifyBtn: {marginTop: spacing.md},
  resultCard: {borderRadius: borderRadius.lg, padding: spacing.lg, marginTop: spacing.md, ...shadows.sm},
  resultSuccess: {backgroundColor: colors.successLight},
  resultFail: {backgroundColor: colors.errorLight},
  resultHeader: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs},
  resultTitle: {fontSize: fontSize.lg, fontWeight: '800'},
  resultMessage: {fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 4},
  details: {marginTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md},
  detailRow: {flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6},
  detailLabel: {fontSize: fontSize.sm, color: colors.textSecondary},
  detailValue: {fontSize: fontSize.sm, fontWeight: '600', color: colors.textPrimary},
  scannerContainer: {flex: 1, backgroundColor: '#000'},
  scannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    paddingTop: spacing.xl,
    backgroundColor: colors.primary,
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
