import React, {useState, useEffect, useCallback, useRef} from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {colors, spacing, borderRadius, fontSize, shadows} from '../../theme/colors';
import {GradientHeader, EmptyState} from '../../components';
import {api} from '../../services/api';

type CategoryOption = 'ALL' | 'TRAVEL' | 'MUSIC' | 'SPORT' | 'FOOD' | 'SOCIAL' | 'OTHER';

const CATEGORIES: {key: CategoryOption; label: string; icon: string}[] = [
  {key: 'ALL', label: 'All', icon: 'apps-outline'},
  {key: 'TRAVEL', label: 'Travel', icon: 'airplane-outline'},
  {key: 'MUSIC', label: 'Music', icon: 'musical-notes-outline'},
  {key: 'SPORT', label: 'Sport', icon: 'football-outline'},
  {key: 'FOOD', label: 'Food', icon: 'restaurant-outline'},
  {key: 'SOCIAL', label: 'Social', icon: 'people-outline'},
  {key: 'OTHER', label: 'Other', icon: 'grid-outline'},
];

export default function BrowseEventsScreen({navigation}: any) {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [nameQuery, setNameQuery] = useState('');
  const [locationQuery, setLocationQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryOption>('ALL');

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchEvents = useCallback(async (name: string, loc: string, cat: CategoryOption) => {
    setLoading(true);
    try {
      const res = await api.browseEvents(
        name.trim() || undefined,
        loc.trim() || undefined,
        cat !== 'ALL' ? cat : undefined,
      );
      if (res.success) {
        setEvents(res.events || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced search on filter change
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      fetchEvents(nameQuery, locationQuery, selectedCategory);
    }, 400);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [nameQuery, locationQuery, selectedCategory, fetchEvents]);

  const renderEvent = ({item, index}: any) => {
    const spotsLeft = item.capacity != null ? Math.max(0, item.capacity - (item.activeParticipants || 0)) : null;
    const isFull = spotsLeft === 0;

    return (
      <TouchableOpacity
        activeOpacity={0.85}
        style={[styles.card, isFull && styles.cardFull]}
        onPress={() => navigation.navigate('JoinEvent', {eventId: item.eventId})}>
        <View style={styles.cardHeader}>
          <View style={{flex: 1}}>
            <Text style={styles.eventName} numberOfLines={1}>{item.eventName}</Text>
            <View style={styles.metaRow}>
              <Ionicons name="calendar-outline" size={13} color={colors.textMuted} />
              <Text style={styles.metaText}>{item.eventDate}</Text>
              {item.location ? (
                <>
                  <Ionicons name="location-outline" size={13} color={colors.textMuted} />
                  <Text style={styles.metaText}>{item.location}</Text>
                </>
              ) : null}
            </View>
            <Text style={styles.hostText}>By {item.hostName}</Text>
            {item.routeStops?.length >= 2 && (
              <View style={styles.routeRow}>
                <Ionicons name="git-branch-outline" size={12} color={colors.primary} />
                <Text style={styles.routeText} numberOfLines={1}>{(item.routeStops as string[]).join(' → ')}</Text>
              </View>
            )}
          </View>
          {item.category ? (
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryBadgeText}>{item.category}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>Rs.{item.pricePerPerson}</Text>
            <Text style={styles.statLabel}>Per Seat</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{item.capacity}</Text>
            <Text style={styles.statLabel}>Total Seats</Text>
          </View>
          <View style={[styles.statItem, isFull && styles.statItemFull]}>
            <Text style={[styles.statValue, isFull && {color: colors.error}]}>{spotsLeft}</Text>
            <Text style={styles.statLabel}>Spots Left</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons
              name={item.confirmationType === 'AUTO' ? 'flash-outline' : 'checkmark-circle-outline'}
              size={16}
              color={colors.info}
            />
            <Text style={styles.statLabel}>{item.confirmationType === 'AUTO' ? 'Auto' : 'Manual'}</Text>
          </View>
        </View>

        {!isFull && (
          <View style={styles.joinHint}>
            <Ionicons name="enter-outline" size={14} color={colors.primary} />
            <Text style={styles.joinHintText}>Tap to join</Text>
          </View>
        )}
        {isFull && (
          <View style={styles.fullBanner}>
            <Ionicons name="lock-closed-outline" size={14} color={colors.error} />
            <Text style={styles.fullBannerText}>Event Full</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <GradientHeader title="Browse Events" />

      {/* Search Filters */}
      <View style={styles.filtersCard}>
        <View style={styles.inputRow}>
          <Ionicons name="search-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
          <TextInput
            style={styles.searchInput}
            value={nameQuery}
            onChangeText={setNameQuery}
            placeholder="Search by event name..."
            placeholderTextColor={colors.textMuted}
          />
          {nameQuery.length > 0 && (
            <TouchableOpacity onPress={() => setNameQuery('')}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.inputRow}>
          <Ionicons name="location-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
          <TextInput
            style={styles.searchInput}
            value={locationQuery}
            onChangeText={setLocationQuery}
            placeholder="Filter by city or area..."
            placeholderTextColor={colors.textMuted}
            autoCapitalize="words"
          />
          {locationQuery.length > 0 && (
            <TouchableOpacity onPress={() => setLocationQuery('')}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
          {CATEGORIES.map(cat => (
            <TouchableOpacity
              key={cat.key}
              style={[styles.catPill, selectedCategory === cat.key && styles.catPillActive]}
              onPress={() => setSelectedCategory(cat.key)}>
              <Ionicons
                name={cat.icon}
                size={14}
                color={selectedCategory === cat.key ? (colors.white ?? '#fff') : colors.textSecondary}
              />
              <Text style={[styles.catPillText, selectedCategory === cat.key && styles.catPillTextActive]}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={events}
          renderItem={renderEvent}
          keyExtractor={item => String(item.eventId)}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <EmptyState
              icon="search-outline"
              title="No events found"
              message="Try adjusting your filters or check back later"
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.background},
  center: {flex: 1, justifyContent: 'center', alignItems: 'center'},
  filtersCard: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    gap: spacing.sm,
    ...shadows.sm,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
  },
  inputIcon: {marginRight: 4},
  searchInput: {
    flex: 1,
    paddingVertical: spacing.sm,
    fontSize: fontSize.md,
    color: colors.textPrimary,
  },
  categoryScroll: {marginTop: 2},
  catPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm - 2,
    borderRadius: borderRadius.full ?? 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    marginRight: spacing.sm,
  },
  catPillActive: {backgroundColor: colors.primary, borderColor: colors.primary},
  catPillText: {fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: '500'},
  catPillTextActive: {color: colors.white ?? '#fff', fontWeight: '600'},
  list: {padding: spacing.md, paddingBottom: spacing.xxl},
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    ...shadows.sm,
  },
  cardFull: {borderLeftColor: colors.error, opacity: 0.7},
  cardHeader: {flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.sm},
  eventName: {fontSize: fontSize.md, fontWeight: '700', color: colors.textPrimary, marginBottom: 2},
  metaRow: {flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap'},
  metaText: {fontSize: fontSize.xs, color: colors.textMuted, marginRight: 4},
  hostText: {fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2},
  routeRow: {flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2},
  routeText: {fontSize: fontSize.xs, color: colors.primary, fontWeight: '600', flex: 1},
  categoryBadge: {
    backgroundColor: colors.infoLight ?? '#E3F2FD',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.full ?? 20,
    marginLeft: spacing.sm,
  },
  categoryBadgeText: {fontSize: 10, fontWeight: '700', color: colors.info},
  statsRow: {flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm},
  statItem: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    alignItems: 'center',
  },
  statItemFull: {backgroundColor: colors.errorLight ?? '#FFEBEE'},
  statValue: {fontSize: fontSize.sm, fontWeight: '800', color: colors.textPrimary},
  statLabel: {fontSize: 10, color: colors.textMuted, marginTop: 1},
  joinHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    justifyContent: 'flex-end',
  },
  joinHintText: {fontSize: fontSize.xs, color: colors.primary, fontWeight: '600'},
  fullBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
  },
  fullBannerText: {fontSize: fontSize.xs, color: colors.error, fontWeight: '600'},
});
