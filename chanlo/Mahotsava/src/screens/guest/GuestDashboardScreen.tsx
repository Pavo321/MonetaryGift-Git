import React, {useState, useCallback} from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {colors, spacing, borderRadius, fontSize, shadows} from '../../theme/colors';
import {GradientHeader, AnimatedCard, AmountDisplay, EmptyState} from '../../components';
import {api} from '../../services/api';

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: colors.primary,
  CONFIRMED: colors.success,
  CANCELLED: colors.error,
  COMPLETED: colors.textMuted,
};

export default function GuestDashboardScreen({navigation}: any) {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const res = await api.getMyJoinedEvents();
      if (res.success) {
        setEvents(res.events || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const handleExit = (item: any) => {
    Alert.alert(
      'Exit Event',
      `Are you sure you want to exit "${item.eventName}"?\n\nYour refund of Rs.${item.amount} will be processed.`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Exit & Refund', style: 'destructive', onPress: async () => {
            try {
              const res = await api.exitEvent(item.hisabId);
              if (res.success) {
                Alert.alert('Exited', res.message);
                loadData();
              } else {
                Alert.alert('Error', res.message);
              }
            } catch {
              Alert.alert('Error', 'Network error. Please try again.');
            }
          },
        },
      ],
    );
  };

  const canExit = (item: any) =>
    item.hisabStatus === 'SUCCESS' &&
    (item.eventStatus === 'ACTIVE' || item.eventStatus === 'CONFIRMED');

  const canPay = (item: any) => item.hisabStatus === 'PENDING';

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <GradientHeader title="My Events" />
      <FlatList
        data={events}
        keyExtractor={item => String(item.hisabId)}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} colors={[colors.primary]} />}
        ListEmptyComponent={<EmptyState icon="calendar-outline" title="No events joined" message="Join capacity events to see them here" />}
        renderItem={({item, index}) => (
          <AnimatedCard index={index} style={[styles.card, {borderLeftColor: STATUS_COLORS[item.eventStatus] || colors.primary}]}>
            <View style={styles.cardHeader}>
              <View style={{flex: 1}}>
                <Text style={styles.eventName} numberOfLines={1}>{item.eventName}</Text>
                <Text style={styles.eventDate}>{item.eventDate}</Text>
              </View>
              <View style={{alignItems: 'flex-end', gap: 4}}>
                <View style={[styles.badge, {backgroundColor: (STATUS_COLORS[item.eventStatus] || colors.primary) + '22'}]}>
                  <Text style={[styles.badgeText, {color: STATUS_COLORS[item.eventStatus] || colors.primary}]}>{item.eventStatus}</Text>
                </View>
                <View style={[styles.badge, {backgroundColor: item.hisabStatus === 'SUCCESS' ? colors.successLight : item.hisabStatus === 'REFUNDED' ? colors.errorLight ?? '#FFEBEE' : colors.warningLight}]}>
                  <Text style={[styles.badgeText, {color: item.hisabStatus === 'SUCCESS' ? colors.success : item.hisabStatus === 'REFUNDED' ? colors.error : colors.warning}]}>{item.hisabStatus}</Text>
                </View>
              </View>
            </View>

            {item.fromStop && (
              <View style={styles.routeRow}>
                <Ionicons name="git-branch-outline" size={14} color={colors.primary} />
                <Text style={styles.routeText}>{item.fromStop} → {item.toStop}</Text>
                {item.seatsBooked > 1 && <Text style={styles.seatsText}>{item.seatsBooked} seats</Text>}
              </View>
            )}
            <View style={styles.amountRow}>
              <Ionicons name="wallet-outline" size={16} color={colors.secondary} />
              <AmountDisplay amount={item.amount} color={colors.secondary} size="sm" />
              <Text style={styles.confirmType}>
                {item.confirmationType === 'AUTO' ? '• Auto-confirm' : '• Manual confirm'}
              </Text>
            </View>

            {(canPay(item) || canExit(item)) && (
              <View style={styles.actionRow}>
                {canPay(item) && (
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.btnPay]}
                    onPress={() => navigation.navigate('JoinEventPayment', {hisabId: item.hisabId, amount: item.amount, eventName: item.eventName})}>
                    <Ionicons name="card-outline" size={14} color={colors.white ?? '#fff'} />
                    <Text style={styles.actionBtnText}>Complete Payment</Text>
                  </TouchableOpacity>
                )}
                {canExit(item) && (
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.btnExit]}
                    onPress={() => handleExit(item)}>
                    <Ionicons name="exit-outline" size={14} color={colors.white ?? '#fff'} />
                    <Text style={styles.actionBtnText}>Exit Event</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </AnimatedCard>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.background},
  center: {flex: 1, justifyContent: 'center', alignItems: 'center'},
  list: {padding: spacing.md, paddingBottom: spacing.xxl},
  card: {backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.md, marginBottom: spacing.md, borderLeftWidth: 4, ...shadows.sm},
  cardHeader: {flexDirection: 'row', alignItems: 'flex-start'},
  eventName: {fontSize: fontSize.md, fontWeight: '700', color: colors.textPrimary},
  eventDate: {fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2},
  badge: {paddingHorizontal: 8, paddingVertical: 2, borderRadius: borderRadius.full ?? 20},
  badgeText: {fontSize: 10, fontWeight: '700'},
  amountRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm},
  confirmType: {fontSize: fontSize.xs, color: colors.textMuted},
  routeRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.xs},
  routeText: {fontSize: fontSize.xs, color: colors.primary, fontWeight: '600'},
  seatsText: {fontSize: fontSize.xs, color: colors.textMuted, marginLeft: 4},
  actionRow: {flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md},
  actionBtn: {flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: spacing.sm, borderRadius: borderRadius.md},
  btnPay: {backgroundColor: colors.primary},
  btnExit: {backgroundColor: colors.error},
  actionBtnText: {color: colors.white ?? '#fff', fontSize: fontSize.sm, fontWeight: '700'},
});
