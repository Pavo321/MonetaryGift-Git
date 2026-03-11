import React, {useState, useCallback} from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TextInput,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {colors, spacing, borderRadius, fontSize, gradients} from '../../theme/colors';
import {GradientHeader, AnimatedCard, AmountDisplay, EmptyState} from '../../components';
import {api} from '../../services/api';

export default function HelperDashboardScreen({navigation}: any) {
  const [events, setEvents] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadEvents = useCallback(async () => {
    try {
      const res = await api.getHelperEvents();
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

  useFocusEffect(
    useCallback(() => {
      loadEvents();
    }, [loadEvents]),
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.secondary} />
      </View>
    );
  }

  const renderEvent = ({item, index}: any) => (
    <AnimatedCard index={index} style={styles.eventCard}>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => navigation.navigate('HelperEvent', {eventId: item.eventId, eventName: item.eventName})}>
        <View style={styles.eventHeader}>
          <View style={{flex: 1}}>
            <Text style={styles.eventName}>{item.eventName}</Text>
            <View style={styles.dateRow}>
              <Ionicons name="calendar-outline" size={13} color={colors.textMuted} />
              <Text style={styles.eventDate}>{item.eventDate}</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </View>
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <AmountDisplay amount={item.totalCollected || 0} color={colors.secondary} size="sm" />
            <Text style={styles.statLabel}>Collected</Text>
          </View>
          <View style={styles.statBox}>
            <AmountDisplay amount={item.totalExpense || 0} color={colors.error} size="sm" />
            <Text style={styles.statLabel}>Expenses</Text>
          </View>
          {item.canExpense && (
            <View style={styles.badge}>
              <Ionicons name="checkmark-circle" size={12} color={colors.success} />
              <Text style={styles.badgeText}>Can Expense</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    </AnimatedCard>
  );

  const filteredEvents = search.trim()
    ? events.filter(e => e.eventName?.toLowerCase().includes(search.trim().toLowerCase()))
    : events;

  return (
    <View style={styles.container}>
      <GradientHeader
        title="My Events"
        subtitle="Helper Dashboard"
        gradientColors={gradients.helperHeader}
      />
      <View style={styles.searchBox}>
        <Ionicons name="search-outline" size={16} color={colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search events..."
          placeholderTextColor={colors.textMuted}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>
      <FlatList
        data={filteredEvents}
        renderItem={renderEvent}
        keyExtractor={item => String(item.eventId)}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadEvents(); }}
            colors={[colors.secondary]}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon="people-outline"
            iconColor={colors.secondary}
            title="No Events Assigned"
            message={'The host needs to add you as a helper.\nAsk the host to add your phone number.'}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.background},
  center: {flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background},
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm - 2,
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    padding: 0,
  },
  list: {padding: spacing.md, paddingBottom: spacing.xxl},
  eventCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.secondary,
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eventName: {fontSize: fontSize.lg, fontWeight: '800', color: colors.textPrimary},
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  eventDate: {fontSize: fontSize.sm, color: colors.textMuted},
  statsRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.md, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.divider},
  statBox: {alignItems: 'center'},
  statLabel: {fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2},
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    backgroundColor: colors.successLight,
    marginLeft: 'auto',
  },
  badgeText: {fontSize: 10, fontWeight: '700', color: colors.success},
});
