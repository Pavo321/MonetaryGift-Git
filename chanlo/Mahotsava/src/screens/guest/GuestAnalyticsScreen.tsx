import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  FlatList,
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
  n >= 100000 ? `₹${(n / 100000).toFixed(1)}L` : n >= 1000 ? `₹${(n / 1000).toFixed(1)}K` : `₹${n.toFixed(0)}`;

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

export default function GuestAnalyticsScreen() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [status, setStatus] = useState('ALL');
  const [fromDate, setFromDate] = useState<Date | null>(null);
  const [toDate, setToDate] = useState<Date | null>(null);
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);
  const [eventPickerOpen, setEventPickerOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);

  useEffect(() => {
    api.getMyJoinedEvents().then(res => {
      if (res.success) setEvents(res.events ?? []);
    }).finally(() => setLoading(false));
  }, []);

  // Apply filters client-side (guest data is small)
  const filtered = events.filter(e => {
    if (selectedEventId && e.eventId !== selectedEventId) return false;
    if (status !== 'ALL' && e.paymentStatus !== status) return false;
    if (fromDate && e.createdAt && new Date(e.createdAt) < fromDate) return false;
    if (toDate) {
      const end = new Date(toDate);
      end.setHours(23, 59, 59);
      if (e.createdAt && new Date(e.createdAt) > end) return false;
    }
    return true;
  });

  const totalPaid = filtered.filter(e => e.paymentStatus === 'SUCCESS').reduce((s, e) => s + (e.amount ?? 0), 0);
  const totalPending = filtered.filter(e => e.paymentStatus === 'PENDING').reduce((s, e) => s + (e.amount ?? 0), 0);
  const totalRefunded = filtered.filter(e => e.paymentStatus === 'REFUNDED').reduce((s, e) => s + (e.amount ?? 0), 0);

  // Pie chart: status distribution
  const pieData = [
    {name: 'Paid', population: filtered.filter(e => e.paymentStatus === 'SUCCESS').length || 0.01, color: colors.success, legendFontColor: colors.textPrimary, legendFontSize: 12},
    {name: 'Pending', population: filtered.filter(e => e.paymentStatus === 'PENDING').length || 0.01, color: colors.warning, legendFontColor: colors.textPrimary, legendFontSize: 12},
    {name: 'Refunded', population: filtered.filter(e => e.paymentStatus === 'REFUNDED').length || 0.01, color: colors.info, legendFontColor: colors.textPrimary, legendFontSize: 12},
  ].filter(d => d.population > 0.01 || filtered.length === 0);

  // Bar chart: amount per event
  const eventAmounts = filtered
    .filter(e => e.paymentStatus === 'SUCCESS')
    .slice(0, 5);

  const barData = {
    labels: eventAmounts.map((e: any) => e.eventName?.length > 10 ? e.eventName.slice(0, 9) + '…' : e.eventName),
    datasets: [{data: eventAmounts.map((e: any) => e.amount ?? 0)}],
  };

  const chartConfig = {
    backgroundGradientFrom: colors.surface,
    backgroundGradientTo: colors.surface,
    color: (opacity = 1) => `rgba(21, 101, 192, ${opacity})`,
    labelColor: () => colors.textSecondary,
    barPercentage: 0.6,
    decimalPlaces: 0,
    propsForLabels: {fontSize: 10},
  };

  const activeFilters = [selectedEventId, status !== 'ALL', fromDate, toDate].filter(Boolean).length;

  const clearFilters = () => {
    setSelectedEventId(null);
    setStatus('ALL');
    setFromDate(null);
    setToDate(null);
  };

  return (
    <View style={styles.container}>
      <GradientHeader title="My Analytics" gradientColors={['#1565C0', '#1976D2']} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Summary Cards */}
        <Animated.View entering={FadeInUp.duration(400).delay(50)} style={styles.cardGrid}>
          <StatCard label="Events Joined" value={String(events.length)} icon="calendar-outline" color={colors.info} />
          <StatCard label="Total Paid" value={fmt(totalPaid)} icon="checkmark-circle-outline" color={colors.success} />
          <StatCard label="Pending" value={fmt(totalPending)} icon="time-outline" color={colors.warning} />
          <StatCard label="Refunded" value={fmt(totalRefunded)} icon="return-down-back-outline" color={colors.secondary} />
        </Animated.View>

        {/* Filter Toggle */}
        <Animated.View entering={FadeInUp.duration(400).delay(100)}>
          <TouchableOpacity style={styles.filterToggle} onPress={() => setFilterOpen(v => !v)}>
            <Ionicons name="options-outline" size={18} color={colors.info} />
            <Text style={styles.filterToggleText}>Filters{activeFilters > 0 ? ` (${activeFilters})` : ''}</Text>
            {activeFilters > 0 && (
              <TouchableOpacity onPress={clearFilters}>
                <Text style={styles.clearText}>Clear</Text>
              </TouchableOpacity>
            )}
            <Ionicons name={filterOpen ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textMuted} style={{marginLeft: 'auto'}} />
          </TouchableOpacity>

          {filterOpen && (
            <View style={styles.filterPanel}>
              {/* Event Picker */}
              <Text style={styles.filterLabel}>Event</Text>
              <TouchableOpacity style={styles.pickerBtn} onPress={() => setEventPickerOpen(true)}>
                <Text style={[styles.pickerBtnText, !selectedEventId && {color: colors.textMuted}]}>
                  {selectedEventId ? (events.find(e => e.eventId === selectedEventId)?.eventName ?? 'Select') : 'All Events'}
                </Text>
                <Ionicons name="chevron-down" size={14} color={colors.textMuted} />
              </TouchableOpacity>

              {/* Status */}
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

              {/* Date Range */}
              <Text style={styles.filterLabel}>Date Range</Text>
              <View style={styles.dateRow}>
                <TouchableOpacity style={styles.dateBtn} onPress={() => setShowFromPicker(true)}>
                  <Ionicons name="calendar-outline" size={14} color={colors.info} />
                  <Text style={[styles.dateBtnText, !fromDate && {color: colors.textMuted}]}>
                    {fromDate ? fromDate.toLocaleDateString('en-IN', {day:'2-digit', month:'short'}) : 'From'}
                  </Text>
                </TouchableOpacity>
                <Text style={styles.dateSep}>–</Text>
                <TouchableOpacity style={styles.dateBtn} onPress={() => setShowToPicker(true)}>
                  <Ionicons name="calendar-outline" size={14} color={colors.info} />
                  <Text style={[styles.dateBtnText, !toDate && {color: colors.textMuted}]}>
                    {toDate ? toDate.toLocaleDateString('en-IN', {day:'2-digit', month:'short'}) : 'To'}
                  </Text>
                </TouchableOpacity>
              </View>
              {showFromPicker && (
                <DateTimePicker
                  value={fromDate ?? new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'calendar'}
                  onChange={(_e: DateTimePickerEvent, d?: Date) => {setShowFromPicker(Platform.OS === 'ios'); if (d) setFromDate(d);}}
                />
              )}
              {showToPicker && (
                <DateTimePicker
                  value={toDate ?? new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'calendar'}
                  onChange={(_e: DateTimePickerEvent, d?: Date) => {setShowToPicker(Platform.OS === 'ios'); if (d) setToDate(d);}}
                />
              )}
            </View>
          )}
        </Animated.View>

        {loading ? (
          <ActivityIndicator color={colors.info} style={{marginTop: 40}} />
        ) : (
          <>
            {/* Pie Chart */}
            {filtered.length > 0 && (
              <Animated.View entering={FadeInUp.duration(400).delay(150)} style={styles.chartCard}>
                <Text style={styles.chartTitle}>Payment Status Distribution</Text>
                <PieChart
                  data={pieData}
                  width={CHART_W}
                  height={180}
                  chartConfig={chartConfig}
                  accessor="population"
                  backgroundColor="transparent"
                  paddingLeft="16"
                />
              </Animated.View>
            )}

            {/* Bar Chart */}
            {eventAmounts.length > 0 && (
              <Animated.View entering={FadeInUp.duration(400).delay(200)} style={styles.chartCard}>
                <Text style={styles.chartTitle}>Amount Paid per Event</Text>
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

            {/* Event List */}
            <Text style={styles.sectionTitle}>Events ({filtered.length})</Text>
            {filtered.length === 0 ? (
              <View style={styles.empty}>
                <Ionicons name="calendar-outline" size={40} color={colors.textMuted} />
                <Text style={styles.emptyText}>No events match your filters</Text>
              </View>
            ) : (
              filtered.map((item: any, i: number) => (
                <Animated.View key={item.hisabId ?? item.eventId} entering={FadeInUp.duration(300).delay(i * 40)} style={styles.eventRow}>
                  <View style={styles.eventLeft}>
                    <Text style={styles.eventName}>{item.eventName}</Text>
                    <Text style={styles.eventDate}>{item.eventDate}</Text>
                  </View>
                  <View style={styles.eventRight}>
                    <Text style={styles.eventAmount}>{fmtFull(item.amount ?? 0)}</Text>
                    <View style={[styles.statusBadge, {backgroundColor: statusColor(item.paymentStatus) + '22'}]}>
                      <Text style={[styles.statusText, {color: statusColor(item.paymentStatus)}]}>{item.paymentStatus}</Text>
                    </View>
                  </View>
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
                {selectedEventId === item.eventId && <Ionicons name="checkmark" size={16} color={colors.info} />}
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
    flex: 1, minWidth: '45%',
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
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.surface, borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2,
    marginBottom: spacing.sm, ...shadows.sm,
  },
  filterToggleText: {fontSize: fontSize.sm, fontWeight: '600', color: colors.textPrimary},
  clearText: {fontSize: fontSize.xs, color: colors.error, fontWeight: '600'},
  filterPanel: {
    backgroundColor: colors.surface, borderRadius: borderRadius.md,
    padding: spacing.md, marginBottom: spacing.md, ...shadows.sm, gap: spacing.sm,
  },
  filterLabel: {fontSize: fontSize.xs, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5},
  pickerBtn: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
  },
  pickerBtnText: {fontSize: fontSize.sm, color: colors.textPrimary},
  statusRow: {flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap'},
  statusChip: {
    paddingHorizontal: spacing.sm, paddingVertical: 4,
    borderRadius: borderRadius.full, borderWidth: 1, borderColor: colors.border,
  },
  statusChipActive: {borderColor: colors.info, backgroundColor: colors.info + '15'},
  statusChipText: {fontSize: fontSize.xs, color: colors.textSecondary, fontWeight: '600'},
  statusChipTextActive: {color: colors.info},
  dateRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm},
  dateBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm, paddingVertical: spacing.sm,
  },
  dateBtnText: {fontSize: fontSize.xs, color: colors.textPrimary},
  dateSep: {fontSize: fontSize.md, color: colors.textMuted},
  chartCard: {
    backgroundColor: colors.surface, borderRadius: borderRadius.md,
    padding: spacing.md, marginBottom: spacing.md, ...shadows.sm,
  },
  chartTitle: {fontSize: fontSize.sm, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.sm},
  chart: {borderRadius: borderRadius.sm},
  sectionTitle: {fontSize: fontSize.md, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.sm},
  eventRow: {
    flexDirection: 'row', backgroundColor: colors.surface,
    borderRadius: borderRadius.sm, padding: spacing.md,
    marginBottom: spacing.sm, ...shadows.sm,
  },
  eventLeft: {flex: 1},
  eventRight: {alignItems: 'flex-end', gap: 4},
  eventName: {fontSize: fontSize.sm, fontWeight: '700', color: colors.textPrimary},
  eventDate: {fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2},
  eventAmount: {fontSize: fontSize.sm, fontWeight: '700', color: colors.textPrimary},
  statusBadge: {paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: borderRadius.full},
  statusText: {fontSize: 10, fontWeight: '700'},
  empty: {alignItems: 'center', paddingVertical: spacing.xxl, gap: spacing.sm},
  emptyText: {fontSize: fontSize.sm, color: colors.textMuted},
  modalOverlay: {flex: 1, backgroundColor: 'rgba(0,0,0,0.4)'},
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl, borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg, maxHeight: '60%',
  },
  modalTitle: {fontSize: fontSize.lg, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.md},
  modalItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: spacing.sm + 4, borderBottomWidth: 1, borderBottomColor: colors.divider,
  },
  modalItemActive: {backgroundColor: colors.info + '10', borderRadius: borderRadius.sm},
  modalItemText: {fontSize: fontSize.sm, color: colors.textPrimary},
  modalItemTextActive: {color: colors.info, fontWeight: '700'},
});
