import React, {useState, useCallback} from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Image,
  Alert,
  Share,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {colors, spacing, borderRadius, fontSize, shadows} from '../../theme/colors';
import {GradientHeader, AnimatedCard, AmountDisplay, EmptyState} from '../../components';
import {api} from '../../services/api';

type Tab = 'payments' | 'participants' | 'helpers' | 'expenses';

function formatEventTime(timeStr: string): string {
  const [h, m] = timeStr.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m);
  return d.toLocaleTimeString('en-IN', {hour: '2-digit', minute: '2-digit', hour12: true});
}

export default function EventDetailScreen({route, navigation}: any) {
  const {eventId} = route.params;
  const [event, setEvent] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [participants, setParticipants] = useState<any[]>([]);
  const [participantStats, setParticipantStats] = useState<any>(null);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('payments');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [qrVisible, setQrVisible] = useState(false);
  const [qrUri, setQrUri] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const isCapacity = event?.eventType === 'CAPACITY_EVENT';

  const TAB_CONFIG: {key: Tab; icon: string; label: string}[] = isCapacity
    ? [
        {key: 'participants', icon: 'people-outline', label: 'Participants'},
        {key: 'helpers', icon: 'person-outline', label: 'Helpers'},
        {key: 'expenses', icon: 'trending-down-outline', label: 'Expenses'},
      ]
    : [
        {key: 'payments', icon: 'card-outline', label: 'Payments'},
        {key: 'helpers', icon: 'people-outline', label: 'Helpers'},
        {key: 'expenses', icon: 'trending-down-outline', label: 'Expenses'},
      ];

  const loadData = useCallback(async () => {
    try {
      const [eventRes, expenseRes] = await Promise.all([
        api.getEventDetails(eventId),
        api.getExpenses(eventId),
      ]);
      if (eventRes.success) {
        setEvent(eventRes.event);
        setPayments(eventRes.payments || []);
      }
      if (expenseRes.expenses) {
        setExpenses(expenseRes.expenses);
      }
      // Load participants if capacity event
      if (eventRes.event?.eventType === 'CAPACITY_EVENT') {
        const pRes = await api.getParticipants(eventId);
        if (pRes.success) {
          setParticipants(pRes.participants || []);
          setParticipantStats(pRes);
        }
        setActiveTab('participants');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [eventId]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const handleConfirmEvent = () => {
    Alert.alert(
      'Confirm Event',
      `Are you sure you want to confirm "${event.eventName}"?\n\nAll ${participants.length} participants will be notified via WhatsApp.`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Confirm', onPress: async () => {
            setActionLoading(true);
            try {
              const res = await api.confirmEvent(eventId);
              if (res.success) {
                Alert.alert('Confirmed!', res.message);
                loadData();
              } else {
                Alert.alert('Error', res.message);
              }
            } catch {
              Alert.alert('Error', 'Network error. Please try again.');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ],
    );
  };

  const handleShareEvent = () => {
    const deepLink = event?.deepLinkUrl || `mahotsava://event/${eventId}`;
    Share.share({
      message: `Join "${event?.eventName}" on Mahotsava!\n\nTap to open: ${deepLink}`,
      title: event?.eventName,
    });
  };

  const handleCancelEvent = () => {
    Alert.alert(
      'Cancel Event & Refund All',
      `Are you sure you want to cancel "${event.eventName}"?\n\nAll ${participants.length} participants will be refunded and notified via WhatsApp.\n\nThis cannot be undone.`,
      [
        {text: 'Keep Event', style: 'cancel'},
        {
          text: 'Cancel & Refund', style: 'destructive', onPress: async () => {
            setActionLoading(true);
            try {
              const res = await api.cancelEvent(eventId);
              if (res.success) {
                Alert.alert('Event Cancelled', res.message, [{text: 'OK', onPress: () => navigation.goBack()}]);
              } else {
                Alert.alert('Error', res.message);
              }
            } catch {
              Alert.alert('Error', 'Network error. Please try again.');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ],
    );
  };

  if (loading || !event) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const spotsRemaining = isCapacity ? Math.max(0, (event.capacity || 0) - (participantStats?.activeCount || 0)) : 0;

  const renderPayment = ({item, index}: any) => {
    const isSuccess = item.status === 'SUCCESS';
    return (
      <AnimatedCard index={index} style={[styles.paymentCard, {borderLeftColor: isSuccess ? colors.success : colors.warning}]}>
        <View style={styles.paymentRow}>
          <View style={{flex: 1}}>
            <Text style={styles.paymentName}>{item.guestName}</Text>
            <Text style={styles.paymentDetail}>
              {item.guestVillage || ''} {item.createdAt ? '| ' + item.createdAt.split('T')[0] : ''}
            </Text>
          </View>
          <View style={{alignItems: 'flex-end'}}>
            <AmountDisplay amount={item.amount} color={colors.textPrimary} />
            <View style={[styles.statusBadge, isSuccess ? styles.statusSuccess : styles.statusPending]}>
              <Ionicons name={isSuccess ? 'checkmark-circle' : 'time-outline'} size={10} color={isSuccess ? colors.success : colors.warning} />
              <Text style={[styles.statusText, {color: isSuccess ? colors.success : colors.warning}]}>{item.status}</Text>
            </View>
          </View>
        </View>
      </AnimatedCard>
    );
  };

  const isRouteBased = event?.routeStops?.length >= 2;

  // Compute per-segment occupancy from participants
  const segmentOccupancy: {from: string; to: string; seats: number}[] = [];
  if (isRouteBased && event?.routeStops) {
    const stops: string[] = event.routeStops;
    const stopIdx: Record<string, number> = {};
    stops.forEach((s: string, i: number) => { stopIdx[s] = i; });
    for (let k = 0; k < stops.length - 1; k++) {
      const occupied = participants.reduce((sum: number, p: any) => {
        if (p.fromStop == null || p.toStop == null) return sum;
        const from = stopIdx[p.fromStop] ?? -1;
        const to = stopIdx[p.toStop] ?? -1;
        // overlaps segment [k, k+1] if from <= k AND to > k
        if (from <= k && to > k) return sum + (p.seatsBooked || 1);
        return sum;
      }, 0);
      segmentOccupancy.push({from: stops[k], to: stops[k + 1], seats: occupied});
    }
  }

  const renderParticipant = ({item, index}: any) => (
    <AnimatedCard index={index} style={[styles.paymentCard, {borderLeftColor: colors.success}]}>
      <View style={styles.paymentRow}>
        <View style={{flex: 1}}>
          <Text style={styles.paymentName}>{item.guestName}</Text>
          <Text style={styles.paymentDetail}>
            {item.guestPhone} {item.joinedAt ? '| ' + item.joinedAt.split('T')[0] : ''}
          </Text>
          {item.fromStop && (
            <Text style={styles.participantRoute}>{item.fromStop} → {item.toStop} · {item.seatsBooked || 1} seat{(item.seatsBooked || 1) > 1 ? 's' : ''}</Text>
          )}
        </View>
        <AmountDisplay amount={item.amount} color={colors.success} />
      </View>
    </AnimatedCard>
  );

  return (
    <View style={styles.container}>
      <GradientHeader
        title={event.eventName}
        subtitle={event.eventDate + (event.eventTime ? '  •  ' + formatEventTime(event.eventTime) : '')}
        onBack={() => navigation.goBack()}
        rightIcon="qr-code-outline"
        onRightPress={() => {
          setQrUri(api.getEventQrUrl(eventId));
          setQrVisible(true);
        }}
      />
      <TouchableOpacity
        style={styles.deleteBtn}
        onPress={() =>
          Alert.alert(
            'Delete Event',
            `Move "${event.eventName}" to Trash?\n\nThe event will be hidden from your list. You can restore it within 30 days from the Dashboard.\n\nMake sure all helpers are settled first.`,
            [
              {text: 'Cancel', style: 'cancel'},
              {
                text: 'Move to Trash',
                style: 'destructive',
                onPress: async () => {
                  setActionLoading(true);
                  try {
                    const res = await api.deleteEvent(eventId);
                    if (res.success) {
                      Alert.alert('Moved to Trash', 'Event moved to Trash. You can restore it from the Dashboard within 30 days.', [{text: 'OK', onPress: () => navigation.goBack()}]);
                    } else {
                      Alert.alert('Cannot Delete', res.message || 'Failed to delete event');
                    }
                  } catch {
                    Alert.alert('Error', 'Network error. Please try again.');
                  } finally {
                    setActionLoading(false);
                  }
                },
              },
            ],
          )
        }>
        <Ionicons name="trash-outline" size={16} color={colors.error} />
        <Text style={styles.deleteBtnText}>Delete Event</Text>
      </TouchableOpacity>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Ionicons name="cash-outline" size={16} color={colors.secondary} />
          <AmountDisplay amount={event.cashAmount || 0} color={colors.secondary} size="sm" />
          <Text style={styles.statLabel}>Cash</Text>
        </View>
        {isCapacity ? (
          <>
            <View style={styles.statBox}>
              <Ionicons name="people-outline" size={18} color={colors.primary} />
              <Text style={styles.statValue}>{participantStats?.activeCount || 0}/{event.capacity}</Text>
              <Text style={styles.statLabel}>Seats</Text>
            </View>
            <View style={styles.statBox}>
              <Ionicons name="time-outline" size={18} color={spotsRemaining > 0 ? colors.info : colors.error} />
              <Text style={styles.statValue}>{spotsRemaining}</Text>
              <Text style={styles.statLabel}>Remaining</Text>
            </View>
          </>
        ) : (
          <>
            <View style={styles.statBox}>
              <Ionicons name="card-outline" size={16} color={colors.info} />
              <AmountDisplay amount={event.upiAmount || 0} color={colors.info} size="sm" />
              <Text style={styles.statLabel}>UPI</Text>
            </View>
            <View style={styles.statBox}>
              <Ionicons name="gift-outline" size={16} color={colors.primary} />
              <Text style={styles.statValue}>{event.totalGiftsReceived || 0}</Text>
              <Text style={styles.statLabel}>Gifts</Text>
            </View>
          </>
        )}
      </View>

      {/* Accept Gift button (GIFT_COLLECTION events only) */}
      {!isCapacity && (
        <TouchableOpacity
          style={styles.acceptGiftBtn}
          onPress={() => navigation.navigate('HostCollect', {eventId, eventName: event.eventName})}>
          <Ionicons name="gift-outline" size={18} color={colors.textLight} />
          <Text style={styles.acceptGiftText}>Accept Gift</Text>
        </TouchableOpacity>
      )}

      {/* Capacity Event Action Buttons */}
      {isCapacity && (event.status === 'ACTIVE' || event.status === 'CONFIRMED') && (
        <View style={styles.actionRow}>
          {event.status === 'ACTIVE' && event.confirmationType === 'MANUAL' && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionConfirm]}
              onPress={handleConfirmEvent}
              disabled={actionLoading}>
              <Ionicons name="checkmark-circle-outline" size={16} color={colors.white ?? '#fff'} />
              <Text style={styles.actionBtnText}>Confirm Event</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionCancel]}
            onPress={handleCancelEvent}
            disabled={actionLoading}>
            <Ionicons name="close-circle-outline" size={16} color={colors.white ?? '#fff'} />
            <Text style={styles.actionBtnText}>Cancel & Refund</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Event Status Badge for capacity events */}
      {isCapacity && (
        <View style={styles.statusBannerRow}>
          <View style={[styles.statusBanner, event.status === 'CONFIRMED' ? styles.bannerConfirmed : event.status === 'CANCELLED' ? styles.bannerCancelled : styles.bannerActive]}>
            <Ionicons
              name={event.status === 'CONFIRMED' ? 'checkmark-circle' : event.status === 'CANCELLED' ? 'close-circle' : 'time-outline'}
              size={14}
              color={colors.white ?? '#fff'}
            />
            <Text style={styles.statusBannerText}>
              {event.status} {event.confirmationType === 'AUTO' ? '(Auto)' : '(Manual)'}
            </Text>
          </View>
        </View>
      )}

      {/* Route display for route-based events */}
      {isRouteBased && (
        <View style={styles.routeSection}>
          <View style={styles.routeHeaderRow}>
            <Ionicons name="git-branch-outline" size={14} color={colors.primary} />
            <Text style={styles.routeLabel}>Route</Text>
          </View>
          <Text style={styles.routeStopsText} numberOfLines={2}>{(event.routeStops as string[]).join(' → ')}</Text>
        </View>
      )}

      {/* Tabs */}
      <View style={styles.tabRow}>
        {TAB_CONFIG.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => {
              setActiveTab(tab.key);
              if (tab.key === 'helpers') {
                navigation.navigate('Helpers', {eventId});
              }
            }}>
            <Ionicons name={tab.icon} size={18} color={activeTab === tab.key ? colors.primary : colors.textMuted} />
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      {activeTab === 'payments' && (
        <FlatList
          data={payments}
          renderItem={renderPayment}
          keyExtractor={item => String(item.hisabId)}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} colors={[colors.primary]} />}
          ListEmptyComponent={<EmptyState icon="card-outline" title="No payments yet" message="Payments will appear here as guests contribute" />}
        />
      )}
      {activeTab === 'participants' && (
        <FlatList
          data={participants}
          renderItem={renderParticipant}
          keyExtractor={item => String(item.hisabId)}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} colors={[colors.primary]} />}
          ListHeaderComponent={
            participants.length > 0 ? (
              <View>
                <View style={styles.participantHeader}>
                  <Ionicons name="people" size={18} color={colors.primary} />
                  <Text style={styles.participantHeaderText}>{participants.length} confirmed • Rs.{event.pricePerPerson}/seat</Text>
                </View>
                {isRouteBased && segmentOccupancy.length > 0 && (
                  <View style={styles.segmentCard}>
                    <Text style={styles.segmentTitle}>Seat Load by Segment</Text>
                    {segmentOccupancy.map((seg, i) => {
                      const pct = event.capacity > 0 ? seg.seats / event.capacity : 0;
                      return (
                        <View key={i} style={styles.segmentRow}>
                          <Text style={styles.segmentLabel} numberOfLines={1}>{seg.from} → {seg.to}</Text>
                          <View style={styles.segmentBarBg}>
                            <View style={[styles.segmentBarFill, {width: `${Math.min(100, pct * 100)}%`, backgroundColor: pct >= 1 ? colors.error : colors.primary}]} />
                          </View>
                          <Text style={styles.segmentCount}>{seg.seats}/{event.capacity}</Text>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            ) : null
          }
          ListEmptyComponent={<EmptyState icon="people-outline" title="No participants yet" message="Participants will appear here once they join and pay" />}
        />
      )}
      {activeTab === 'expenses' && (
        <FlatList
          data={expenses}
          renderItem={({item, index}: any) => (
            <AnimatedCard index={index} style={[styles.paymentCard, {borderLeftColor: colors.error}]}>
              <View style={styles.paymentRow}>
                <View style={{flex: 1}}>
                  <Text style={styles.paymentName}>{item.reason}</Text>
                  <Text style={styles.paymentDetail}>
                    By: {item.spentBy?.name || 'Helper'} {item.createdAt ? '| ' + item.createdAt.split('T')[0] : ''}
                  </Text>
                </View>
                <AmountDisplay amount={item.amount} color={colors.error} />
              </View>
            </AnimatedCard>
          )}
          keyExtractor={(item, index) => String(item.id || index)}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} colors={[colors.primary]} />}
          ListHeaderComponent={
            expenses.length > 0 ? (
              <View style={styles.expenseTotal}>
                <Ionicons name="trending-down" size={18} color={colors.error} />
                <Text style={styles.expenseTotalText}>
                  Total Expenses: {'\u20B9'}{expenses.reduce((sum: number, e: any) => sum + (e.amount || 0), 0).toLocaleString('en-IN')}
                </Text>
              </View>
            ) : null
          }
          ListEmptyComponent={<EmptyState icon="receipt-outline" title="No expenses" message="No expenses recorded for this event" />}
        />
      )}

      {/* QR Modal */}
      <Modal visible={qrVisible} transparent animationType="fade" onRequestClose={() => setQrVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Ionicons name="qr-code" size={32} color={colors.primary} style={{marginBottom: spacing.sm}} />
            <Text style={styles.modalTitle}>Event QR Code</Text>
            <Text style={styles.modalSubtitle}>Share this QR with guests & helpers</Text>
            {qrUri && (
              <Image
                source={{uri: qrUri, headers: {Authorization: `Bearer ${api.getAuthToken()}`}}}
                style={styles.qrImage}
                resizeMode="contain"
                onLoadStart={() => setQrLoading(true)}
                onLoadEnd={() => setQrLoading(false)}
                onError={() => { setQrLoading(false); Alert.alert('Error', 'Failed to load QR code'); }}
              />
            )}
            {qrLoading && <ActivityIndicator size="large" color={colors.primary} style={{position: 'absolute', top: '50%'}} />}
            <Text style={styles.deepLinkText}>{event?.deepLinkUrl || `mahotsava://event/${eventId}`}</Text>
            <TouchableOpacity style={styles.shareBtn} onPress={handleShareEvent}>
              <Ionicons name="share-outline" size={18} color={colors.white ?? '#fff'} />
              <Text style={styles.shareBtnText}>Share Link</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setQrVisible(false)}>
              <Ionicons name="close" size={18} color={colors.textLight} />
              <Text style={styles.modalCloseBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.background},
  center: {flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background},
  statsRow: {flexDirection: 'row', paddingHorizontal: spacing.md, paddingVertical: spacing.md, gap: spacing.sm},
  statBox: {flex: 1, backgroundColor: colors.surface, borderRadius: borderRadius.md, padding: spacing.sm, alignItems: 'center', gap: 2, ...shadows.sm},
  statValue: {fontSize: fontSize.md, fontWeight: '800', color: colors.textPrimary},
  statLabel: {fontSize: fontSize.xs, color: colors.textMuted},
  actionRow: {flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.md, paddingBottom: spacing.sm},
  actionBtn: {flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: spacing.sm, borderRadius: borderRadius.md},
  actionConfirm: {backgroundColor: colors.success},
  actionCancel: {backgroundColor: colors.error},
  actionBtnText: {color: colors.white ?? '#fff', fontSize: fontSize.sm, fontWeight: '700'},
  statusBannerRow: {paddingHorizontal: spacing.md, paddingBottom: spacing.xs},
  statusBanner: {flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: borderRadius.full ?? 20, alignSelf: 'flex-start'},
  bannerActive: {backgroundColor: colors.primary},
  bannerConfirmed: {backgroundColor: colors.success},
  bannerCancelled: {backgroundColor: colors.error},
  statusBannerText: {color: colors.white ?? '#fff', fontSize: fontSize.xs, fontWeight: '700'},
  tabRow: {flexDirection: 'row', backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.divider, ...shadows.sm},
  tab: {flex: 1, flexDirection: 'row', paddingVertical: spacing.md, alignItems: 'center', justifyContent: 'center', gap: 4, borderBottomWidth: 3, borderBottomColor: 'transparent'},
  tabActive: {borderBottomColor: colors.primary},
  tabText: {fontSize: fontSize.sm, fontWeight: '600', color: colors.textMuted},
  tabTextActive: {color: colors.primary},
  list: {padding: spacing.md, paddingBottom: spacing.xxl},
  paymentCard: {backgroundColor: colors.surface, borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.sm, borderLeftWidth: 4},
  paymentRow: {flexDirection: 'row', alignItems: 'center'},
  paymentName: {fontSize: fontSize.md, fontWeight: '600', color: colors.textPrimary},
  paymentDetail: {fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2},
  statusBadge: {flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: borderRadius.full, marginTop: 4},
  statusSuccess: {backgroundColor: colors.successLight},
  statusPending: {backgroundColor: colors.warningLight},
  statusText: {fontSize: 10, fontWeight: '700'},
  participantHeader: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.primaryLight ?? '#E8F5E9', borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.sm},
  participantHeaderText: {fontSize: fontSize.md, fontWeight: '700', color: colors.primary},
  participantRoute: {fontSize: fontSize.xs ?? 11, color: colors.primary, fontWeight: '600', marginTop: 2},
  routeSection: {marginHorizontal: spacing.md, marginBottom: spacing.xs, backgroundColor: colors.surface, borderRadius: borderRadius.md, padding: spacing.sm, ...shadows.sm},
  routeHeaderRow: {flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2},
  routeLabel: {fontSize: fontSize.xs, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase'},
  routeStopsText: {fontSize: fontSize.sm, fontWeight: '600', color: colors.primary},
  segmentCard: {backgroundColor: colors.background, borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.md},
  segmentTitle: {fontSize: fontSize.sm, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.sm},
  segmentRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 6},
  segmentLabel: {width: 120, fontSize: fontSize.xs, color: colors.textSecondary},
  segmentBarBg: {flex: 1, height: 10, backgroundColor: colors.divider, borderRadius: 5, overflow: 'hidden'},
  segmentBarFill: {height: 10, borderRadius: 5},
  segmentCount: {width: 40, fontSize: fontSize.xs, fontWeight: '700', color: colors.textPrimary, textAlign: 'right'},
  expenseTotal: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.errorLight, borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.md},
  expenseTotalText: {fontSize: fontSize.md, fontWeight: '700', color: colors.error},
  modalOverlay: {flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: spacing.lg},
  modalContent: {backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.lg, alignItems: 'center', width: '100%', maxWidth: 360, ...shadows.lg},
  modalTitle: {fontSize: fontSize.lg, fontWeight: '800', color: colors.textPrimary},
  modalSubtitle: {fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 4, marginBottom: spacing.md},
  qrImage: {width: 260, height: 260, borderRadius: borderRadius.md},
  deepLinkText: {fontSize: 11, color: colors.textMuted, marginTop: spacing.sm, textAlign: 'center', fontFamily: 'monospace'},
  shareBtn: {flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.info, borderRadius: borderRadius.full, paddingVertical: spacing.sm + 2, paddingHorizontal: spacing.xxl, marginTop: spacing.sm},
  shareBtnText: {color: colors.white ?? '#fff', fontSize: fontSize.md, fontWeight: '700'},
  modalCloseBtn: {flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primary, borderRadius: borderRadius.full, paddingVertical: spacing.sm + 2, paddingHorizontal: spacing.xxl, marginTop: spacing.sm},
  modalCloseBtnText: {color: colors.textLight, fontSize: fontSize.md, fontWeight: '700'},
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginRight: spacing.md,
    marginTop: -spacing.xs,
  },
  deleteBtnText: {fontSize: fontSize.xs, color: colors.error, fontWeight: '600'},
  acceptGiftBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.md,
  },
  acceptGiftText: {fontSize: fontSize.md, fontWeight: '700', color: colors.textLight},
});
