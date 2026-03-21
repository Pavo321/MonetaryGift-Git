import React, {useState, useCallback, useEffect} from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Text,
  TextInput,
} from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import {useFocusEffect} from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {colors, spacing, borderRadius, fontSize, shadows} from '../../theme/colors';
import {GradientHeader, StatCard, AnimatedCard, EmptyState, AmountDisplay, IconButton} from '../../components';
import {api} from '../../services/api';

export default function DashboardScreen({navigation}: any) {
  const [events, setEvents] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const unsub = NetInfo.addEventListener(state => {
      setOffline(!(state.isConnected && state.isInternetReachable));
    });
    return unsub;
  }, []);

  const loadEvents = useCallback(async () => {
    try {
      const res = await api.getMyEvents();
      if (res.success) {
        setEvents(res.events || []);
      }
    } catch (e) {
      console.error('Failed to load events', e);
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

  const totalCollected = events.reduce((sum, e) => sum + (e.totalAmount || 0), 0);
  const totalGifts = events.reduce((sum, e) => sum + (e.totalGiftsReceived || 0), 0);
  const filteredEvents = search.trim()
    ? events.filter(e => e.eventName?.toLowerCase().includes(search.trim().toLowerCase()))
    : events;

  const renderEvent = ({item, index}: any) => (
    <AnimatedCard index={index} style={styles.eventCard}>
      <TouchableOpacity
        onPress={() => navigation.navigate('EventDetail', {eventId: item.eventId})}
        activeOpacity={0.7}>
        <View style={styles.eventHeader}>
          <View style={{flex: 1}}>
            <Text style={styles.eventName} numberOfLines={1}>{item.eventName}</Text>
            <View style={styles.dateRow}>
              <Ionicons name="calendar-outline" size={13} color={colors.textMuted} />
              <Text style={styles.eventDate}>{item.eventDate}</Text>
            </View>
          </View>
          <View style={{alignItems: 'flex-end', gap: 4}}>
            {item.eventType === 'CAPACITY_EVENT' && (
              <View style={styles.typeBadge}>
                <Ionicons name="people-outline" size={10} color={colors.info} />
                <Text style={styles.typeBadgeText}>CAPACITY</Text>
              </View>
            )}
            <View style={[styles.badge, item.status === 'ACTIVE' ? styles.badgeActive : item.status === 'CONFIRMED' ? styles.badgeConfirmed : styles.badgeDone]}>
              <Text style={[styles.badgeText, item.status !== 'ACTIVE' && item.status !== 'CONFIRMED' && {color: colors.textMuted}]}>
                {item.status}
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.eventStats}>
          <View style={styles.stat}>
            <Ionicons name="wallet-outline" size={16} color={colors.secondary} />
            <AmountDisplay amount={item.totalAmount || 0} color={colors.secondary} size="sm" style={{marginLeft: 4}} />
            <Text style={styles.statLabel}>Collected</Text>
          </View>
          <View style={styles.statDivider} />
          {item.eventType === 'CAPACITY_EVENT' ? (
            <View style={styles.stat}>
              <Ionicons name="people-outline" size={16} color={colors.primary} />
              <Text style={styles.statValue}>{item.activeParticipants || 0}/{item.capacity || 0}</Text>
              <Text style={styles.statLabel}>Seats</Text>
            </View>
          ) : (
            <View style={styles.stat}>
              <Ionicons name="gift-outline" size={16} color={colors.primary} />
              <Text style={styles.statValue}>{item.totalGiftsReceived || 0}</Text>
              <Text style={styles.statLabel}>Contributions</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    </AnimatedCard>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <GradientHeader title="Mahotsava" subtitle="Your Events" />
      {offline && (
        <View style={styles.offlineBanner}>
          <Ionicons name="cloud-offline-outline" size={14} color="#fff" />
          <Text style={styles.offlineText}>Offline — showing cached data</Text>
        </View>
      )}

      {/* Summary cards */}
      <View style={styles.summaryRow}>
        <StatCard icon="calendar-outline" iconColor={colors.primary} value={String(events.length)} label="Events" bgTint="#FFF3E0" />
        <StatCard icon="wallet-outline" iconColor={colors.secondary} value={`\u20B9${totalCollected.toLocaleString('en-IN')}`} label="Collected" bgTint="#E8F5E9" />
        <StatCard icon="gift-outline" iconColor={colors.info} value={String(totalGifts)} label="Gifts" bgTint="#E3F2FD" />
      </View>

      {/* Search + Create row */}
      <View style={styles.actionRow}>
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
        <IconButton
          icon="add-circle-outline"
          label="New"
          variant="primary"
          onPress={() => navigation.navigate('CreateEvent')}
        />
      </View>

      {/* Events list */}
      <FlatList
        data={filteredEvents}
        renderItem={renderEvent}
        keyExtractor={item => String(item.eventId)}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadEvents(); }}
            colors={[colors.primary]}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon="calendar-outline"
            title="No events yet"
            message="Create your first event to start collecting"
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.background},
  center: {flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background},
  summaryRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
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
  list: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxl,
  },
  eventCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  eventName: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  eventDate: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
  badgeActive: {backgroundColor: colors.successLight},
  badgeConfirmed: {backgroundColor: colors.primaryLight ?? '#E3F2FD'},
  badgeDone: {backgroundColor: colors.divider},
  typeBadge: {flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: colors.infoLight ?? '#E3F2FD', paddingHorizontal: 6, paddingVertical: 2, borderRadius: borderRadius.full ?? 20},
  typeBadgeText: {fontSize: 9, fontWeight: '700', color: colors.info},
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.success,
  },
  eventStats: {
    flexDirection: 'row',
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  stat: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 2,
  },
  statDivider: {width: 1, backgroundColor: colors.divider, marginHorizontal: spacing.sm},
  statValue: {fontSize: fontSize.sm, fontWeight: '700', color: colors.textPrimary, marginLeft: 4},
  offlineBanner: {
    backgroundColor: '#F57C00',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
  },
  offlineText: {color: '#fff', fontSize: 12, fontWeight: '600'},
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    width: '100%',
    textAlign: 'center',
    marginTop: 2,
  },
});
