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
} from 'react-native';
import Animated, {FadeInUp} from 'react-native-reanimated';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {BarChart, PieChart} from 'react-native-chart-kit';
import {colors, spacing, borderRadius, fontSize, shadows} from '../../theme/colors';
import {GradientHeader} from '../../components';
import {api} from '../../services/api';

const SCREEN_W = Dimensions.get('window').width;
const CHART_W = SCREEN_W - spacing.md * 2 - spacing.lg * 2;

const fmt = (n: number) =>
  n >= 100000 ? `₹${(n / 100000).toFixed(1)}L` : n >= 1000 ? `₹${(n / 1000).toFixed(1)}K` : `₹${n.toFixed(0)}`;

const fmtFull = (n: number) => `₹${n.toLocaleString('en-IN', {minimumFractionDigits: 2})}`;

export default function HelperAnalyticsScreen() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [eventPickerOpen, setEventPickerOpen] = useState(false);

  useEffect(() => {
    api.getHelperEvents().then(res => {
      if (res.success) setEvents(res.events ?? []);
    }).finally(() => setLoading(false));
  }, []);

  const filtered = selectedEventId ? events.filter(e => e.eventId === selectedEventId) : events;

  const totalCash = filtered.reduce((s, e) => s + (e.cashCollected ?? 0), 0);
  const totalUpi = filtered.reduce((s, e) => s + (e.upiCollected ?? 0), 0);
  const totalExpenses = filtered.reduce((s, e) => s + (e.totalExpenses ?? 0), 0);
  const netBalance = totalCash - totalExpenses;

  // Bar chart: top events cash vs upi
  const top = [...filtered].sort((a, b) => (b.cashCollected + b.upiCollected) - (a.cashCollected + a.upiCollected)).slice(0, 5);

  const barData = {
    labels: top.map((e: any) => e.eventName?.length > 10 ? e.eventName.slice(0, 9) + '…' : e.eventName),
    datasets: [
      {data: top.map((e: any) => e.cashCollected ?? 0), color: (o = 1) => `rgba(46,125,50,${o})`, strokeWidth: 2},
      {data: top.map((e: any) => e.upiCollected ?? 0), color: (o = 1) => `rgba(21,101,192,${o})`, strokeWidth: 2},
    ],
    legend: ['Cash', 'UPI'],
  };

  const pieData = [
    {name: 'Cash', population: totalCash || 1, color: colors.success, legendFontColor: colors.textPrimary, legendFontSize: 12},
    {name: 'UPI', population: totalUpi || 0.01, color: colors.info, legendFontColor: colors.textPrimary, legendFontSize: 12},
  ];

  const chartConfig = {
    backgroundGradientFrom: colors.surface,
    backgroundGradientTo: colors.surface,
    color: (opacity = 1) => `rgba(0, 105, 92, ${opacity})`,
    labelColor: () => colors.textSecondary,
    barPercentage: 0.5,
    decimalPlaces: 0,
    propsForLabels: {fontSize: 10},
  };

  return (
    <View style={styles.container}>
      <GradientHeader title="My Analytics" gradientColors={['#00695C', '#00897B']} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Summary Cards */}
        <Animated.View entering={FadeInUp.duration(400).delay(50)} style={styles.cardGrid}>
          <StatCard label="Cash Collected" value={fmt(totalCash)} icon="cash-outline" color={colors.success} />
          <StatCard label="UPI Collected" value={fmt(totalUpi)} icon="phone-portrait-outline" color={colors.info} />
          <StatCard label="Expenses" value={fmt(totalExpenses)} icon="receipt-outline" color={colors.error} />
          <StatCard label="Net Balance" value={fmt(Math.max(0, netBalance))} icon="wallet-outline" color={colors.accent} />
        </Animated.View>

        {/* Event Filter */}
        <Animated.View entering={FadeInUp.duration(400).delay(100)}>
          <TouchableOpacity style={styles.filterBtn} onPress={() => setEventPickerOpen(true)}>
            <Ionicons name="filter-outline" size={16} color={colors.secondary} />
            <Text style={styles.filterBtnText}>
              {selectedEventId ? (events.find(e => e.eventId === selectedEventId)?.eventName ?? 'Event') : 'All Events'}
            </Text>
            {selectedEventId && (
              <TouchableOpacity onPress={() => setSelectedEventId(null)}>
                <Ionicons name="close-circle" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            )}
            <Ionicons name="chevron-down" size={14} color={colors.textMuted} style={{marginLeft: 'auto'}} />
          </TouchableOpacity>
        </Animated.View>

        {loading ? (
          <ActivityIndicator color={colors.secondary} style={{marginTop: 40}} />
        ) : (
          <>
            {/* Pie Chart */}
            {(totalCash > 0 || totalUpi > 0) && (
              <Animated.View entering={FadeInUp.duration(400).delay(150)} style={styles.chartCard}>
                <Text style={styles.chartTitle}>Cash vs UPI Split</Text>
                <PieChart
                  data={pieData}
                  width={CHART_W}
                  height={180}
                  chartConfig={chartConfig}
                  accessor="population"
                  backgroundColor="transparent"
                  paddingLeft="16"
                />
                <View style={styles.pieLegend}>
                  <Text style={styles.pieLegendItem}><Text style={{color: colors.success}}>■ </Text>Cash: {fmtFull(totalCash)}</Text>
                  <Text style={styles.pieLegendItem}><Text style={{color: colors.info}}>■ </Text>UPI: {fmtFull(totalUpi)}</Text>
                </View>
              </Animated.View>
            )}

            {/* Bar Chart */}
            {top.length > 0 && (
              <Animated.View entering={FadeInUp.duration(400).delay(200)} style={styles.chartCard}>
                <Text style={styles.chartTitle}>Cash vs UPI per Event</Text>
                <BarChart
                  data={barData}
                  width={CHART_W}
                  height={220}
                  chartConfig={chartConfig}
                  style={styles.chart}
                  fromZero
                  yAxisLabel="₹"
                  yAxisSuffix=""
                  withInnerLines={false}
                />
                <View style={styles.pieLegend}>
                  <Text style={styles.pieLegendItem}><Text style={{color: colors.success}}>■ </Text>Cash</Text>
                  <Text style={styles.pieLegendItem}><Text style={{color: colors.info}}>■ </Text>UPI</Text>
                </View>
              </Animated.View>
            )}

            {/* Per Event List */}
            <Text style={styles.sectionTitle}>Per Event Breakdown</Text>
            {filtered.length === 0 ? (
              <View style={styles.empty}>
                <Ionicons name="calendar-outline" size={40} color={colors.textMuted} />
                <Text style={styles.emptyText}>No events assigned yet</Text>
              </View>
            ) : (
              filtered.map((item: any, i: number) => (
                <Animated.View key={item.eventId} entering={FadeInUp.duration(300).delay(i * 40)} style={styles.eventRow}>
                  <Text style={styles.eventName}>{item.eventName}</Text>
                  <Text style={styles.eventDate}>{item.eventDate}</Text>
                  <View style={styles.eventStats}>
                    <View style={styles.eventStat}>
                      <Text style={[styles.eventStatVal, {color: colors.success}]}>{fmtFull(item.cashCollected ?? 0)}</Text>
                      <Text style={styles.eventStatLabel}>Cash</Text>
                    </View>
                    <View style={styles.eventStat}>
                      <Text style={[styles.eventStatVal, {color: colors.info}]}>{fmtFull(item.upiCollected ?? 0)}</Text>
                      <Text style={styles.eventStatLabel}>UPI</Text>
                    </View>
                    <View style={styles.eventStat}>
                      <Text style={[styles.eventStatVal, {color: colors.error}]}>{fmtFull(item.totalExpenses ?? 0)}</Text>
                      <Text style={styles.eventStatLabel}>Expenses</Text>
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
                {selectedEventId === item.eventId && <Ionicons name="checkmark" size={16} color={colors.secondary} />}
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
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  filterBtnText: {fontSize: fontSize.sm, fontWeight: '600', color: colors.textPrimary},
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
  sectionTitle: {fontSize: fontSize.md, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.sm},
  eventRow: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  eventName: {fontSize: fontSize.sm, fontWeight: '700', color: colors.textPrimary},
  eventDate: {fontSize: fontSize.xs, color: colors.textMuted, marginBottom: spacing.sm},
  eventStats: {flexDirection: 'row', gap: spacing.sm},
  eventStat: {flex: 1, alignItems: 'center', backgroundColor: colors.background, borderRadius: borderRadius.sm, padding: spacing.sm},
  eventStatVal: {fontSize: fontSize.sm, fontWeight: '700'},
  eventStatLabel: {fontSize: 10, color: colors.textMuted, marginTop: 2},
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
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: spacing.sm + 4,
    borderBottomWidth: 1, borderBottomColor: colors.divider,
  },
  modalItemActive: {backgroundColor: colors.secondary + '10', borderRadius: borderRadius.sm},
  modalItemText: {fontSize: fontSize.sm, color: colors.textPrimary},
  modalItemTextActive: {color: colors.secondary, fontWeight: '700'},
});
