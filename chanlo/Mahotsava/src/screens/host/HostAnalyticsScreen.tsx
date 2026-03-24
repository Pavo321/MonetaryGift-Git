import React, {useState, useCallback, useEffect} from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  Modal,
  Dimensions,
  Platform,
} from 'react-native';
import Animated, {FadeInUp} from 'react-native-reanimated';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {BarChart, PieChart} from 'react-native-chart-kit';
import DateTimePicker, {DateTimePickerEvent} from '@react-native-community/datetimepicker';
import {colors, spacing, borderRadius, fontSize, shadows} from '../../theme/colors';
import {GradientHeader} from '../../components';
import {api} from '../../services/api';

const SCREEN_W = Dimensions.get('window').width;
const CHART_W = SCREEN_W - spacing.md * 2 - spacing.lg * 2;

const STATUSES = ['ALL', 'SUCCESS', 'PENDING', 'REFUNDED'] as const;

const fmt = (n: number) =>
  n >= 100000
    ? `₹${(n / 100000).toFixed(1)}L`
    : n >= 1000
    ? `₹${(n / 1000).toFixed(1)}K`
    : `₹${n.toFixed(0)}`;

const fmtFull = (n: number) => `₹${n.toLocaleString('en-IN', {minimumFractionDigits: 2})}`;

const statusColor = (s: string) => {
  if (s === 'SUCCESS') return colors.success;
  if (s === 'PENDING') return colors.warning;
  if (s === 'REFUNDED') return colors.info;
  return colors.error;
};

const formatDate = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
};

const displayDate = (d: Date) =>
  d.toLocaleDateString('en-IN', {day: '2-digit', month: 'short', year: 'numeric'});

export default function HostAnalyticsScreen() {
  const [events, setEvents] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterOpen, setFilterOpen] = useState(false);

  // Filters
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [guestName, setGuestName] = useState('');
  const [guestPlace, setGuestPlace] = useState('');
  const [status, setStatus] = useState<string>('ALL');
  const [fromDate, setFromDate] = useState<Date | null>(null);
  const [toDate, setToDate] = useState<Date | null>(null);
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);
  const [eventPickerOpen, setEventPickerOpen] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [evRes, payRes] = await Promise.all([
        api.getMyEvents(),
        api.getAnalyticsPayments({
          eventId: selectedEventId ?? undefined,
          guestName: guestName || undefined,
          guestPlace: guestPlace || undefined,
          status: status === 'ALL' ? undefined : status,
          fromDate: fromDate ? formatDate(fromDate) : undefined,
          toDate: toDate ? formatDate(toDate) : undefined,
        }),
      ]);
      if (evRes.success) setEvents(evRes.events ?? []);
      if (payRes.success) setPayments(payRes.payments ?? []);
    } catch {/* ignore */}
    finally {setLoading(false);}
  }, [selectedEventId, guestName, guestPlace, status, fromDate, toDate]);

  useEffect(() => {loadData();}, [loadData]);

  // ── Derived stats ──────────────────────────────────────────────────────────
  const successPayments = payments.filter(p => p.status === 'SUCCESS');
  const totalCollected = successPayments.reduce((s, p) => s + (p.amount ?? 0), 0);
  const totalGifts = successPayments.length;
  const avgPerEvent = events.length > 0 ? totalCollected / events.length : 0;
  const pending = payments.filter(p => p.status === 'PENDING').reduce((s, p) => s + (p.amount ?? 0), 0);

  // Bar chart: top 5 events by amount
  const eventTotals: Record<string, number> = {};
  successPayments.forEach(p => {
    eventTotals[p.eventName] = (eventTotals[p.eventName] ?? 0) + p.amount;
  });
  const topEvents = Object.entries(eventTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const barData = {
    labels: topEvents.map(([n]) => n.length > 10 ? n.slice(0, 9) + '…' : n),
    datasets: [{data: topEvents.map(([, v]) => v || 0.01)}],
  };

  // Pie chart: cash vs UPI (using all events data)
  const allCash = events.reduce((s, e) => s + (e.cashAmount ?? 0), 0);
  const allUpi = events.reduce((s, e) => s + (e.upiAmount ?? 0), 0);
  const pieData = [
    {name: 'Cash', population: allCash || 1, color: colors.success, legendFontColor: colors.textPrimary, legendFontSize: 12},
    {name: 'UPI', population: allUpi || 0.01, color: colors.info, legendFontColor: colors.textPrimary, legendFontSize: 12},
  ];

  const chartConfig = {
    backgroundGradientFrom: colors.surface,
    backgroundGradientTo: colors.surface,
    color: (opacity = 1) => `rgba(230, 81, 0, ${opacity})`,
    labelColor: () => colors.textSecondary,
    barPercentage: 0.6,
    decimalPlaces: 0,
    propsForLabels: {fontSize: 10},
  };

  const activeFilterCount = [
    selectedEventId, guestName, guestPlace, status !== 'ALL', fromDate, toDate,
  ].filter(Boolean).length;

  const clearFilters = () => {
    setSelectedEventId(null);
    setGuestName('');
    setGuestPlace('');
    setStatus('ALL');
    setFromDate(null);
    setToDate(null);
  };

  const renderPayment = ({item}: {item: any}) => (
    <View style={styles.paymentRow}>
      <View style={styles.paymentLeft}>
        <Text style={styles.paymentName}>{item.guestName}</Text>
        <Text style={styles.paymentSub}>{item.guestVillage} · {item.eventName}</Text>
        <Text style={styles.paymentDate}>
          {item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-IN', {day: '2-digit', month: 'short', year: 'numeric'}) : ''}
        </Text>
      </View>
      <View style={styles.paymentRight}>
        <Text style={styles.paymentAmount}>{fmtFull(item.amount ?? 0)}</Text>
        <View style={[styles.statusBadge, {backgroundColor: statusColor(item.status) + '22'}]}>
          <Text style={[styles.statusText, {color: statusColor(item.status)}]}>{item.status}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <GradientHeader title="Analytics" />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Summary Cards */}
        <Animated.View entering={FadeInUp.duration(400).delay(50)} style={styles.cardGrid}>
          <StatCard label="Total Collected" value={fmt(totalCollected)} icon="cash-outline" color={colors.success} />
          <StatCard label="Total Events" value={String(events.length)} icon="calendar-outline" color={colors.primary} />
          <StatCard label="Total Gifts" value={String(totalGifts)} icon="gift-outline" color={colors.accent} />
          <StatCard label="Avg / Event" value={fmt(avgPerEvent)} icon="trending-up-outline" color={colors.info} />
        </Animated.View>

        {/* Filter Bar */}
        <Animated.View entering={FadeInUp.duration(400).delay(100)}>
          <TouchableOpacity style={styles.filterToggle} onPress={() => setFilterOpen(v => !v)}>
            <Ionicons name="options-outline" size={18} color={colors.primary} />
            <Text style={styles.filterToggleText}>Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}</Text>
            {activeFilterCount > 0 && (
              <TouchableOpacity onPress={clearFilters} hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
                <Text style={styles.clearText}>Clear</Text>
              </TouchableOpacity>
            )}
            <Ionicons
              name={filterOpen ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={colors.textMuted}
              style={{marginLeft: 'auto'}}
            />
          </TouchableOpacity>

          {filterOpen && (
            <View style={styles.filterPanel}>
              {/* Event Picker */}
              <Text style={styles.filterLabel}>Event</Text>
              <TouchableOpacity style={styles.pickerBtn} onPress={() => setEventPickerOpen(true)}>
                <Text style={[styles.pickerBtnText, !selectedEventId && {color: colors.textMuted}]}>
                  {selectedEventId ? (events.find(e => e.eventId === selectedEventId)?.eventName ?? 'Select event') : 'All Events'}
                </Text>
                <Ionicons name="chevron-down" size={14} color={colors.textMuted} />
              </TouchableOpacity>

              {/* Status Row */}
              <Text style={styles.filterLabel}>Status</Text>
              <View style={styles.statusRow}>
                {STATUSES.map(s => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.statusChip, status === s && styles.statusChipActive]}
                    onPress={() => setStatus(s)}>
                    <Text style={[styles.statusChipText, status === s && styles.statusChipTextActive]}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Guest Name */}
              <Text style={styles.filterLabel}>Guest Name</Text>
              <TextInput
                style={styles.filterInput}
                value={guestName}
                onChangeText={setGuestName}
                placeholder="Search by name…"
                placeholderTextColor={colors.textMuted}
                returnKeyType="search"
                onSubmitEditing={loadData}
              />

              {/* Guest Place */}
              <Text style={styles.filterLabel}>Village / Place</Text>
              <TextInput
                style={styles.filterInput}
                value={guestPlace}
                onChangeText={setGuestPlace}
                placeholder="Search by place…"
                placeholderTextColor={colors.textMuted}
                returnKeyType="search"
                onSubmitEditing={loadData}
              />

              {/* Date Range */}
              <Text style={styles.filterLabel}>Date Range</Text>
              <View style={styles.dateRow}>
                <TouchableOpacity style={styles.dateBtn} onPress={() => setShowFromPicker(true)}>
                  <Ionicons name="calendar-outline" size={14} color={colors.primary} />
                  <Text style={[styles.dateBtnText, !fromDate && {color: colors.textMuted}]}>
                    {fromDate ? displayDate(fromDate) : 'From'}
                  </Text>
                </TouchableOpacity>
                <Text style={styles.dateSep}>–</Text>
                <TouchableOpacity style={styles.dateBtn} onPress={() => setShowToPicker(true)}>
                  <Ionicons name="calendar-outline" size={14} color={colors.primary} />
                  <Text style={[styles.dateBtnText, !toDate && {color: colors.textMuted}]}>
                    {toDate ? displayDate(toDate) : 'To'}
                  </Text>
                </TouchableOpacity>
              </View>
              {showFromPicker && (
                <DateTimePicker
                  value={fromDate ?? new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'calendar'}
                  onChange={(_e: DateTimePickerEvent, d?: Date) => {
                    setShowFromPicker(Platform.OS === 'ios');
                    if (d) setFromDate(d);
                  }}
                />
              )}
              {showToPicker && (
                <DateTimePicker
                  value={toDate ?? new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'calendar'}
                  onChange={(_e: DateTimePickerEvent, d?: Date) => {
                    setShowToPicker(Platform.OS === 'ios');
                    if (d) setToDate(d);
                  }}
                />
              )}

              <TouchableOpacity style={styles.applyBtn} onPress={loadData}>
                <Text style={styles.applyBtnText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{marginTop: 40}} />
        ) : (
          <>
            {/* Bar Chart */}
            {topEvents.length > 0 && (
              <Animated.View entering={FadeInUp.duration(400).delay(150)} style={styles.chartCard}>
                <Text style={styles.chartTitle}>Top Events by Collection</Text>
                <BarChart
                  data={barData}
                  width={CHART_W}
                  height={200}
                  chartConfig={chartConfig}
                  style={styles.chart}
                  showValuesOnTopOfBars
                  fromZero
                  yAxisLabel="₹"
                  yAxisSuffix=""
                  withInnerLines={false}
                />
              </Animated.View>
            )}

            {/* Pie Chart */}
            {(allCash > 0 || allUpi > 0) && (
              <Animated.View entering={FadeInUp.duration(400).delay(200)} style={styles.chartCard}>
                <Text style={styles.chartTitle}>Cash vs UPI Split</Text>
                <PieChart
                  data={pieData}
                  width={CHART_W}
                  height={180}
                  chartConfig={chartConfig}
                  accessor="population"
                  backgroundColor="transparent"
                  paddingLeft="16"
                  style={styles.chart}
                />
                <View style={styles.pieLegend}>
                  <Text style={styles.pieLegendItem}>
                    <Text style={{color: colors.success}}>■ </Text>Cash: {fmtFull(allCash)}
                  </Text>
                  <Text style={styles.pieLegendItem}>
                    <Text style={{color: colors.info}}>■ </Text>UPI: {fmtFull(allUpi)}
                  </Text>
                </View>
              </Animated.View>
            )}

            {/* Stats summary row */}
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{payments.length}</Text>
                <Text style={styles.summaryLabel}>Records</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryValue, {color: colors.success}]}>{fmtFull(totalCollected)}</Text>
                <Text style={styles.summaryLabel}>Collected</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryValue, {color: colors.warning}]}>{fmtFull(pending)}</Text>
                <Text style={styles.summaryLabel}>Pending</Text>
              </View>
            </View>

            {/* Payment List */}
            <Text style={styles.sectionTitle}>Payment Records ({payments.length})</Text>
            {payments.length === 0 ? (
              <View style={styles.empty}>
                <Ionicons name="search-outline" size={40} color={colors.textMuted} />
                <Text style={styles.emptyText}>No payments found</Text>
              </View>
            ) : (
              payments.map((item, i) => (
                <Animated.View key={item.hisabId} entering={FadeInUp.duration(300).delay(i * 30)}>
                  {renderPayment({item})}
                </Animated.View>
              ))
            )}
          </>
        )}
      </ScrollView>

      {/* Event Picker Modal */}
      <Modal visible={eventPickerOpen} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setEventPickerOpen(false)} />
        <View style={styles.modalSheet}>
          <Text style={styles.modalTitle}>Select Event</Text>
          <FlatList
            data={[{eventId: null, eventName: 'All Events'}, ...events]}
            keyExtractor={item => String(item.eventId)}
            renderItem={({item}) => (
              <TouchableOpacity
                style={[styles.modalItem, selectedEventId === item.eventId && styles.modalItemActive]}
                onPress={() => {setSelectedEventId(item.eventId); setEventPickerOpen(false);}}>
                <Text style={[styles.modalItemText, selectedEventId === item.eventId && styles.modalItemTextActive]}>
                  {item.eventName}
                </Text>
                {selectedEventId === item.eventId && <Ionicons name="checkmark" size={16} color={colors.primary} />}
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>
    </View>
  );
}

function StatCard({label, value, icon, color}: {label: string; value: string; icon: string; color: string}) {
  return (
    <View style={[styles.statCard, {borderLeftColor: color}]}>
      <Ionicons name={icon} size={20} color={color} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.background},
  scroll: {padding: spacing.md, paddingBottom: spacing.xxl},
  cardGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md},
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderLeftWidth: 3,
    ...shadows.sm,
    gap: spacing.xs,
  },
  statValue: {fontSize: fontSize.lg, fontWeight: '800', color: colors.textPrimary},
  statLabel: {fontSize: fontSize.xs, color: colors.textSecondary},
  filterToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  filterToggleText: {fontSize: fontSize.sm, fontWeight: '600', color: colors.textPrimary},
  clearText: {fontSize: fontSize.xs, color: colors.error, fontWeight: '600'},
  filterPanel: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.sm,
    gap: spacing.sm,
  },
  filterLabel: {fontSize: fontSize.xs, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5},
  filterInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
  },
  pickerBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  pickerBtnText: {fontSize: fontSize.sm, color: colors.textPrimary},
  statusRow: {flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap'},
  statusChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusChipActive: {borderColor: colors.primary, backgroundColor: colors.primary + '15'},
  statusChipText: {fontSize: fontSize.xs, color: colors.textSecondary, fontWeight: '600'},
  statusChipTextActive: {color: colors.primary},
  dateRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm},
  dateBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  dateBtnText: {fontSize: fontSize.xs, color: colors.textPrimary},
  dateSep: {fontSize: fontSize.md, color: colors.textMuted},
  applyBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.sm + 2,
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  applyBtnText: {color: '#fff', fontWeight: '700', fontSize: fontSize.sm},
  chartCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  chartTitle: {fontSize: fontSize.sm, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.sm},
  chart: {borderRadius: borderRadius.sm},
  pieLegend: {flexDirection: 'row', gap: spacing.lg, justifyContent: 'center', marginTop: spacing.sm},
  pieLegendItem: {fontSize: fontSize.xs, color: colors.textSecondary},
  summaryRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  summaryItem: {flex: 1, alignItems: 'center'},
  summaryValue: {fontSize: fontSize.md, fontWeight: '800', color: colors.textPrimary},
  summaryLabel: {fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2},
  summaryDivider: {width: 1, backgroundColor: colors.divider, marginHorizontal: spacing.sm},
  sectionTitle: {fontSize: fontSize.md, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.sm},
  paymentRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  paymentLeft: {flex: 1},
  paymentRight: {alignItems: 'flex-end', gap: 4},
  paymentName: {fontSize: fontSize.sm, fontWeight: '700', color: colors.textPrimary},
  paymentSub: {fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2},
  paymentDate: {fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2},
  paymentAmount: {fontSize: fontSize.sm, fontWeight: '700', color: colors.textPrimary},
  statusBadge: {paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: borderRadius.full},
  statusText: {fontSize: 10, fontWeight: '700'},
  empty: {alignItems: 'center', paddingVertical: spacing.xxl, gap: spacing.sm},
  emptyText: {fontSize: fontSize.sm, color: colors.textMuted},
  modalOverlay: {flex: 1, backgroundColor: 'rgba(0,0,0,0.4)'},
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg,
    maxHeight: '60%',
  },
  modalTitle: {fontSize: fontSize.lg, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.md},
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm + 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  modalItemActive: {backgroundColor: colors.primary + '10', borderRadius: borderRadius.sm},
  modalItemText: {fontSize: fontSize.sm, color: colors.textPrimary},
  modalItemTextActive: {color: colors.primary, fontWeight: '700'},
});
