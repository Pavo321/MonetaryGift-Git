import React, {useState, useCallback, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import MapView, {Marker, Callout, Region} from 'react-native-maps';
import {useFocusEffect} from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {colors, spacing, borderRadius, fontSize, shadows} from '../../theme/colors';
import {api} from '../../services/api';

const INDIA_REGION: Region = {
  latitude: 20.5937,
  longitude: 78.9629,
  latitudeDelta: 15,
  longitudeDelta: 15,
};

const CATEGORY_COLORS: Record<string, string> = {
  TRAVEL: '#E53935',
  MUSIC: '#8E24AA',
  SPORT: '#00897B',
  FOOD: '#F4511E',
  SOCIAL: '#1E88E5',
  OTHER: '#757575',
};

export default function ExploreMapScreen() {
  const [events, setEvents] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const mapRef = useRef<MapView>(null);

  const loadEvents = useCallback(async () => {
    try {
      const res = await api.exploreEvents();
      if (res.success) {
        setEvents(res.events || []);
      }
    } catch (e) {
      console.error('Failed to load explore events', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadEvents();
    }, [loadEvents]),
  );

  const filtered = search.trim()
    ? events.filter(e =>
        e.eventName?.toLowerCase().includes(search.toLowerCase()) ||
        e.category?.toLowerCase().includes(search.toLowerCase()) ||
        e.location?.toLowerCase().includes(search.toLowerCase()),
      )
    : events;

  return (
    <View style={styles.container}>
      {/* Search bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={16} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search events, category..."
            placeholderTextColor={colors.textMuted}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={loadEvents}>
          <Ionicons name="refresh-outline" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Map */}
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={INDIA_REGION}
        showsUserLocation
        showsMyLocationButton>
        {filtered.map(event => (
          <Marker
            key={String(event.eventId)}
            coordinate={{latitude: event.lat, longitude: event.lng}}
            pinColor={CATEGORY_COLORS[event.category] || CATEGORY_COLORS.OTHER}>
            <Callout tooltip>
              <View style={styles.callout}>
                <View style={[styles.calloutCategoryDot, {backgroundColor: CATEGORY_COLORS[event.category] || CATEGORY_COLORS.OTHER}]} />
                <Text style={styles.calloutName} numberOfLines={2}>{event.eventName}</Text>
                <Text style={styles.calloutDate}>{event.eventDate}</Text>
                {event.location ? (
                  <View style={styles.calloutRow}>
                    <Ionicons name="location-outline" size={11} color={colors.textMuted} />
                    <Text style={styles.calloutMeta}>{event.location}</Text>
                  </View>
                ) : null}
                <View style={styles.calloutRow}>
                  <Ionicons name="person-outline" size={11} color={colors.textMuted} />
                  <Text style={styles.calloutMeta}>{event.hostName}</Text>
                </View>
                {event.category ? (
                  <View style={[styles.calloutBadge, {backgroundColor: (CATEGORY_COLORS[event.category] || CATEGORY_COLORS.OTHER) + '22'}]}>
                    <Text style={[styles.calloutBadgeText, {color: CATEGORY_COLORS[event.category] || CATEGORY_COLORS.OTHER}]}>
                      {event.category}
                    </Text>
                  </View>
                ) : null}
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>

      {/* Loading overlay */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}

      {/* Count badge */}
      {!loading && (
        <View style={styles.countBadge}>
          <Ionicons name="location" size={13} color={colors.primary} />
          <Text style={styles.countText}>{filtered.length} event{filtered.length !== 1 ? 's' : ''}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1},
  map: {flex: 1},
  searchContainer: {
    position: 'absolute',
    top: 12,
    left: spacing.md,
    right: spacing.md,
    zIndex: 10,
    flexDirection: 'row',
    gap: spacing.xs,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm - 2,
    gap: spacing.xs,
    ...shadows.md,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    padding: 0,
  },
  refreshBtn: {
    backgroundColor: colors.surface,
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
  },
  callout: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    minWidth: 160,
    maxWidth: 200,
    ...shadows.md,
  },
  calloutCategoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 4,
  },
  calloutName: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  calloutDate: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginBottom: 4,
  },
  calloutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginBottom: 2,
  },
  calloutMeta: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  calloutBadge: {
    marginTop: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  calloutBadgeText: {
    fontSize: 9,
    fontWeight: '700',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  countBadge: {
    position: 'absolute',
    bottom: spacing.lg,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    ...shadows.md,
  },
  countText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textPrimary,
  },
});
