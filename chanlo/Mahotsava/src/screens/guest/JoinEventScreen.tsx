import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {GooglePlacesAutocomplete} from 'react-native-google-places-autocomplete';
import {colors, spacing, borderRadius, fontSize, shadows} from '../../theme/colors';
import {GradientHeader, IconButton} from '../../components';
import {api, RouteStopResponse} from '../../services/api';

// ⚠️  Must match the key in CreateEventScreen.tsx
const GOOGLE_MAPS_API_KEY = 'AIzaSyBM6NyppTpjovOzE9IlNst0GCbutOwcd2g';

function formatEventTime(timeStr: string): string {
  const [h, m] = timeStr.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m);
  return d.toLocaleTimeString('en-IN', {hour: '2-digit', minute: '2-digit', hour12: true});
}

export default function JoinEventScreen({route, navigation}: any) {
  const {eventId} = route.params;
  const [event, setEvent] = useState<any>(null);
  const [participants, setParticipants] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);

  // Location-based boarding state (TRAVEL events)
  const [boardingCoords, setBoardingCoords] = useState<{lat: number; lng: number} | null>(null);
  const [destCoords, setDestCoords] = useState<{lat: number; lng: number} | null>(null);
  const [checkingAvail, setCheckingAvail] = useState(false);
  const [fromIdx, setFromIdx] = useState<number | null>(null);
  const [toIdx, setToIdx] = useState<number | null>(null);
  const [fromStopName, setFromStopName] = useState<string>('');
  const [toStopName, setToStopName] = useState<string>('');
  const [boardingDistKm, setBoardingDistKm] = useState<number | null>(null);
  const [destDistKm, setDestDistKm] = useState<number | null>(null);
  const [availableSeats, setAvailableSeats] = useState<number | null>(null);
  const [boardingError, setBoardingError] = useState('');
  const [destError, setDestError] = useState('');

  // Standard / shared state
  const [seatsNeeded, setSeatsNeeded] = useState('1');

  useEffect(() => {
    const load = async () => {
      try {
        const [eventRes, pRes] = await Promise.all([
          api.getEventDetails(eventId),
          api.getParticipants(eventId),
        ]);
        if (eventRes.success) setEvent(eventRes.event);
        if (pRes.success) setParticipants(pRes);
      } catch {
        Alert.alert('Error', 'Could not load event details.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [eventId]);

  const isRouteBased = (event?.routeStops?.length ?? 0) >= 2;
  const isTravelEvent = event?.category === 'TRAVEL';
  const seats = Math.max(1, parseInt(seatsNeeded, 10) || 1);

  // km-based price for TRAVEL events
  const calcPrice = (): number => {
    if (!event) return 0;
    if (isRouteBased && isTravelEvent && fromIdx !== null && toIdx !== null && event.totalDistanceKm > 0) {
      const stops: RouteStopResponse[] = event.routeStops;
      let segmentKm = 0;
      for (let k = fromIdx; k < toIdx; k++) {
        segmentKm += stops[k]?.distanceToNextKm ?? 0;
      }
      if (segmentKm > 0) {
        const pricePerKm = event.pricePerPerson / event.totalDistanceKm;
        return Math.max(1, Math.round(pricePerKm * segmentKm * seats));
      }
    }
    return event.pricePerPerson * seats;
  };

  const totalPrice = calcPrice();
  const noSeatsAvail = availableSeats !== null && availableSeats < seats;

  const checkAvailability = async () => {
    if (!boardingCoords || !destCoords) {
      Alert.alert('Required', 'Please select both your boarding location and destination.');
      return;
    }
    setCheckingAvail(true);
    setBoardingError('');
    setDestError('');
    setFromIdx(null);
    setToIdx(null);
    setAvailableSeats(null);

    try {
      const [boardingRes, destRes] = await Promise.all([
        api.findNearestStop(eventId, boardingCoords.lat, boardingCoords.lng),
        api.findNearestStop(eventId, destCoords.lat, destCoords.lng),
      ]);

      if (boardingRes.notFound) {
        setBoardingError('Your boarding location is not on this route.');
        return;
      }
      if (destRes.notFound) {
        setDestError('Your destination is not on this route.');
        return;
      }
      if (boardingRes.stopOrder >= destRes.stopOrder) {
        setDestError('Your destination must be after your boarding stop on this route.');
        return;
      }

      setFromIdx(boardingRes.stopOrder);
      setToIdx(destRes.stopOrder);
      setFromStopName(boardingRes.stopName);
      setToStopName(destRes.stopName);
      setBoardingDistKm(boardingRes.distanceKm);
      setDestDistKm(destRes.distanceKm);

      const availRes = await api.getRouteAvailability(eventId, boardingRes.stopOrder, destRes.stopOrder);
      if (availRes.success) setAvailableSeats(availRes.availableSeats);
    } catch {
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setCheckingAvail(false);
    }
  };

  const handleJoin = () => {
    const routeLabel = isRouteBased && fromIdx !== null
      ? `\nFrom: ${fromStopName} → ${toStopName}\nSeats: ${seats}\n\n`
      : '\n\n';
    Alert.alert(
      'Join Event',
      `Join "${event.eventName}"?${routeLabel}Total: Rs.${totalPrice}\n\nYou will be redirected to UPI payment.`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Join & Pay',
          onPress: async () => {
            setJoining(true);
            try {
              const res = await api.joinEvent(
                eventId,
                isRouteBased && fromIdx !== null ? fromIdx : undefined,
                isRouteBased && toIdx !== null ? toIdx : undefined,
                seats,
              );
              if (res.success) {
                navigation.replace('JoinEventPayment', {
                  hisabId: res.payment.hisabId,
                  amount: res.payment.amount,
                  eventName: res.payment.eventName,
                  upiLinks: res.payment,
                });
              } else {
                Alert.alert('Error', res.message);
              }
            } catch {
              Alert.alert('Error', 'Network error. Please try again.');
            } finally {
              setJoining(false);
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  if (!event) {
    return <View style={styles.center}><Text style={styles.errorText}>Event not found.</Text></View>;
  }

  const spotsLeft = participants ? participants.spotsRemaining : '?';
  const isFull = participants && participants.spotsRemaining === 0;
  const isActive = event.status === 'ACTIVE';

  const routeStops: RouteStopResponse[] = event.routeStops ?? [];
  const routeStopNames = routeStops.map((s: RouteStopResponse) => s.name);

  const canJoin = isActive && !isFull &&
    (!isRouteBased || (fromIdx !== null && toIdx !== null)) &&
    !noSeatsAvail;

  return (
    <View style={styles.container}>
      <GradientHeader title="Join Event" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        {/* Event Info Card */}
        <View style={styles.card}>
          <Text style={styles.eventName}>{event.eventName}</Text>
          <View style={styles.row}>
            <Ionicons name="calendar-outline" size={16} color={colors.textMuted} />
            <Text style={styles.detail}>{event.eventDate}</Text>
          </View>
          {event.eventTime && (
            <View style={styles.row}>
              <Ionicons name="time-outline" size={16} color={colors.textMuted} />
              <Text style={styles.detail}>~{formatEventTime(event.eventTime)}</Text>
            </View>
          )}
          {event.location && (
            <View style={styles.row}>
              <Ionicons name="location-outline" size={16} color={colors.textMuted} />
              <Text style={styles.detail}>{event.location}</Text>
            </View>
          )}
          <View style={styles.row}>
            <Ionicons name="person-outline" size={16} color={colors.textMuted} />
            <Text style={styles.detail}>Hosted by {event.hostName}</Text>
          </View>

          {/* Route bar */}
          {isRouteBased && (
            <View style={styles.routeBar}>
              <Ionicons name="git-branch-outline" size={14} color={colors.primary} />
              <Text style={styles.routeBarText} numberOfLines={2}>
                {routeStopNames.join(' → ')}
              </Text>
              {event.totalDistanceKm > 0 && (
                <Text style={styles.routeDistText}>~{Math.round(event.totalDistanceKm)} km</Text>
              )}
            </View>
          )}

          <View style={styles.divider} />
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>Rs.{event.pricePerPerson}</Text>
              <Text style={styles.statLabel}>{isTravelEvent ? 'Full Route' : 'Price/Seat'}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{event.capacity}</Text>
              <Text style={styles.statLabel}>Total Seats</Text>
            </View>
            {!isRouteBased && (
              <View style={[styles.statBox, isFull && styles.statBoxFull]}>
                <Text style={[styles.statValue, isFull && {color: colors.error}]}>{spotsLeft}</Text>
                <Text style={styles.statLabel}>Spots Left</Text>
              </View>
            )}
          </View>
          <View style={styles.confirmBadge}>
            <Ionicons
              name={event.confirmationType === 'AUTO' ? 'flash-outline' : 'checkmark-circle-outline'}
              size={14} color={colors.info} />
            <Text style={styles.confirmText}>
              {event.confirmationType === 'AUTO'
                ? 'Auto-confirms when all seats fill'
                : 'Host will manually confirm'}
            </Text>
          </View>
        </View>

        {/* ── TRAVEL Route Booking (location-based) ── */}
        {isActive && isRouteBased && isTravelEvent && (
          <View style={styles.bookingCard}>
            <Text style={styles.bookingTitle}>Find Your Journey</Text>

            <Text style={styles.bookingLabel}>Your boarding location</Text>
            <View style={styles.placesWrapper}>
              <GooglePlacesAutocomplete
                placeholder="e.g., Pune"
                onPress={(_, details) => {
                  if (details?.geometry?.location) {
                    setBoardingCoords({lat: details.geometry.location.lat, lng: details.geometry.location.lng});
                    setFromIdx(null);
                    setAvailableSeats(null);
                    setBoardingError('');
                  }
                }}
                query={{key: GOOGLE_MAPS_API_KEY, language: 'en', components: 'country:in'}}
                fetchDetails
                styles={placesStyles}
                enablePoweredByContainer={false}
              />
            </View>
            {boardingError ? <Text style={styles.fieldError}>{boardingError}</Text> : null}

            <Text style={[styles.bookingLabel, {marginTop: spacing.md}]}>Your destination</Text>
            <View style={styles.placesWrapper}>
              <GooglePlacesAutocomplete
                placeholder="e.g., Belgaum"
                onPress={(_, details) => {
                  if (details?.geometry?.location) {
                    setDestCoords({lat: details.geometry.location.lat, lng: details.geometry.location.lng});
                    setToIdx(null);
                    setAvailableSeats(null);
                    setDestError('');
                  }
                }}
                query={{key: GOOGLE_MAPS_API_KEY, language: 'en', components: 'country:in'}}
                fetchDetails
                styles={placesStyles}
                enablePoweredByContainer={false}
              />
            </View>
            {destError ? <Text style={styles.fieldError}>{destError}</Text> : null}

            <TouchableOpacity
              style={[styles.checkBtn, checkingAvail && styles.checkBtnDisabled]}
              onPress={checkAvailability}
              disabled={checkingAvail}>
              {checkingAvail
                ? <ActivityIndicator size="small" color={colors.white} />
                : <Ionicons name="search-outline" size={16} color={colors.white} />}
              <Text style={styles.checkBtnText}>
                {checkingAvail ? 'Checking…' : 'Check Availability'}
              </Text>
            </TouchableOpacity>

            {/* Results */}
            {fromIdx !== null && toIdx !== null && (
              <View style={styles.resultsBox}>
                <View style={styles.resultRow}>
                  <Ionicons name="checkmark-circle" size={16} color={colors.success ?? '#2E7D32'} />
                  <Text style={styles.resultText}>
                    Boarding at: <Text style={styles.resultBold}>{fromStopName}</Text>
                    {boardingDistKm !== null && <Text style={styles.resultMuted}> ({boardingDistKm} km away)</Text>}
                  </Text>
                </View>
                <View style={styles.resultRow}>
                  <Ionicons name="checkmark-circle" size={16} color={colors.success ?? '#2E7D32'} />
                  <Text style={styles.resultText}>
                    Alighting at: <Text style={styles.resultBold}>{toStopName}</Text>
                    {destDistKm !== null && <Text style={styles.resultMuted}> ({destDistKm} km away)</Text>}
                  </Text>
                </View>

                {/* Availability */}
                <View style={styles.availBox}>
                  <View style={styles.availLeft}>
                    <Text style={styles.availLabel}>Available seats from {fromStopName}</Text>
                    {availableSeats !== null && (
                      <View style={styles.availCountRow}>
                        <Text style={[styles.availCount, noSeatsAvail && {color: colors.error}]}>
                          {availableSeats}
                        </Text>
                        <Text style={styles.availOf}> of {event.capacity}</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.seatsInputWrap}>
                    <Text style={styles.bookingLabel}>Seats needed</Text>
                    <TextInput
                      style={styles.seatsInput}
                      value={seatsNeeded}
                      onChangeText={v => setSeatsNeeded(v.replace(/[^0-9]/g, ''))}
                      keyboardType="number-pad"
                      maxLength={2}
                    />
                  </View>
                </View>

                {noSeatsAvail && (
                  <Text style={styles.noSeatsText}>
                    Not enough seats from {fromStopName}. Try fewer seats.
                  </Text>
                )}

                <View style={styles.totalRow}>
                  <View>
                    <Text style={styles.totalLabel}>Your price</Text>
                    {event.totalDistanceKm > 0 && (
                      <Text style={styles.priceBreakdown}>
                        {(() => {
                          let km = 0;
                          for (let k = fromIdx; k < toIdx; k++) km += routeStops[k]?.distanceToNextKm ?? 0;
                          return `~${Math.round(km)} km × Rs.${(event.pricePerPerson / event.totalDistanceKm).toFixed(2)}/km`;
                        })()}
                      </Text>
                    )}
                  </View>
                  <Text style={styles.totalPrice}>Rs.{totalPrice}</Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* ── Standard Route booking (non-TRAVEL route, legacy) ── */}
        {isActive && isRouteBased && !isTravelEvent && (
          <View style={styles.bookingCard}>
            <Text style={styles.bookingTitle}>Select Your Journey</Text>

            <Text style={styles.bookingLabel}>Board at</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.stopRow}>
              {routeStopNames.slice(0, -1).map((stop: string, idx: number) => (
                <TouchableOpacity
                  key={idx}
                  style={[styles.stopBtn, fromIdx === idx && styles.stopBtnActive]}
                  onPress={() => {
                    setFromIdx(idx);
                    if (toIdx !== null && toIdx <= idx) setToIdx(idx + 1);
                    setAvailableSeats(null);
                  }}>
                  <Text style={[styles.stopBtnText, fromIdx === idx && styles.stopBtnTextActive]}>{stop}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.bookingLabel}>Get off at</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.stopRow}>
              {routeStopNames.slice((fromIdx ?? 0) + 1).map((stop: string, i: number) => {
                const idx = (fromIdx ?? 0) + 1 + i;
                return (
                  <TouchableOpacity
                    key={idx}
                    style={[styles.stopBtn, toIdx === idx && styles.stopBtnActive]}
                    onPress={() => { setToIdx(idx); setAvailableSeats(null); }}>
                    <Text style={[styles.stopBtnText, toIdx === idx && styles.stopBtnTextActive]}>{stop}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {fromIdx !== null && toIdx !== null && (
              <>
                <View style={styles.seatsRow}>
                  <View style={styles.seatsInputWrap}>
                    <Text style={styles.bookingLabel}>Seats needed</Text>
                    <TextInput
                      style={styles.seatsInput}
                      value={seatsNeeded}
                      onChangeText={v => setSeatsNeeded(v.replace(/[^0-9]/g, ''))}
                      keyboardType="number-pad"
                      maxLength={2}
                    />
                  </View>
                  <View style={styles.availWrap}>
                    <Text style={styles.bookingLabel}>Available</Text>
                    {checkingAvail
                      ? <ActivityIndicator size="small" color={colors.primary} />
                      : <Text style={[styles.availNum, noSeatsAvail ? {color: colors.error} : {color: colors.success ?? '#2E7D32'}]}>
                          {availableSeats ?? '—'}
                        </Text>}
                  </View>
                </View>
                {noSeatsAvail && (
                  <Text style={styles.noSeatsText}>Not enough seats for this segment.</Text>
                )}
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Total</Text>
                  <Text style={styles.totalPrice}>Rs.{totalPrice}</Text>
                </View>
              </>
            )}
          </View>
        )}

        {/* ── Standard (non-route) capacity event ── */}
        {isActive && !isRouteBased && (
          <View style={styles.bookingCard}>
            <Text style={styles.bookingTitle}>Booking</Text>
            <Text style={styles.bookingLabel}>Seats needed</Text>
            <TextInput
              style={[styles.seatsInput, {marginBottom: spacing.md}]}
              value={seatsNeeded}
              onChangeText={v => setSeatsNeeded(v.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
              maxLength={2}
              placeholder="1"
              placeholderTextColor={colors.textMuted}
            />
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalPrice}>Rs.{totalPrice}</Text>
            </View>
          </View>
        )}

        {isActive && !isFull ? (
          <IconButton
            icon="enter-outline"
            label={`Join & Pay Rs.${totalPrice}`}
            variant="primary"
            onPress={handleJoin}
            loading={joining}
            disabled={!canJoin}
            style={styles.joinBtn}
          />
        ) : (
          <View style={styles.unavailableBanner}>
            <Ionicons name={isFull ? 'lock-closed-outline' : 'close-circle-outline'} size={18} color={colors.error} />
            <Text style={styles.unavailableText}>{isFull ? 'Event is full' : `Event is ${event.status}`}</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const placesStyles = {
  textInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    fontSize: fontSize.md,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
    height: 44,
  },
  listView: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surface,
    zIndex: 99,
  },
  row: {backgroundColor: colors.surface},
  description: {color: colors.textPrimary, fontSize: fontSize.sm},
  container: {flex: 0},
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.background},
  center: {flex: 1, justifyContent: 'center', alignItems: 'center'},
  content: {padding: spacing.md, paddingBottom: spacing.xxl},
  card: {backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.lg, ...shadows.md},
  eventName: {fontSize: fontSize.xl, fontWeight: '800', color: colors.textPrimary, marginBottom: spacing.sm},
  row: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs},
  detail: {fontSize: fontSize.sm, color: colors.textSecondary},
  routeBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    backgroundColor: colors.background,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    marginTop: spacing.xs,
  },
  routeBarText: {fontSize: fontSize.sm, color: colors.primary, fontWeight: '600', flex: 1},
  routeDistText: {fontSize: fontSize.xs ?? 11, color: colors.textMuted, marginTop: 2},
  divider: {height: 1, backgroundColor: colors.divider, marginVertical: spacing.md},
  statsRow: {flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md},
  statBox: {flex: 1, backgroundColor: colors.background, borderRadius: borderRadius.md, padding: spacing.md, alignItems: 'center'},
  statBoxFull: {backgroundColor: colors.errorLight ?? '#FFEBEE'},
  statValue: {fontSize: fontSize.lg, fontWeight: '800', color: colors.textPrimary},
  statLabel: {fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2},
  confirmBadge: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.infoLight ?? '#E3F2FD', padding: spacing.sm, borderRadius: borderRadius.sm},
  confirmText: {fontSize: fontSize.xs, color: colors.info, flex: 1},
  bookingCard: {backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.lg, marginTop: spacing.md, ...shadows.md},
  bookingTitle: {fontSize: fontSize.md, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.md},
  bookingLabel: {fontSize: fontSize.sm, fontWeight: '600', color: colors.textSecondary, marginBottom: spacing.xs},
  placesWrapper: {zIndex: 99, marginBottom: 4},
  fieldError: {fontSize: fontSize.xs ?? 11, color: colors.error, marginBottom: spacing.xs, fontStyle: 'italic'},
  checkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.sm + 2,
    marginTop: spacing.sm,
  },
  checkBtnDisabled: {opacity: 0.6},
  checkBtnText: {color: colors.white, fontSize: fontSize.md, fontWeight: '700'},
  resultsBox: {marginTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.divider, paddingTop: spacing.md},
  resultRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.xs},
  resultText: {fontSize: fontSize.sm, color: colors.textSecondary, flex: 1},
  resultBold: {fontWeight: '700', color: colors.textPrimary},
  resultMuted: {color: colors.textMuted},
  availBox: {flexDirection: 'row', alignItems: 'flex-end', gap: spacing.lg, marginTop: spacing.md, marginBottom: spacing.sm},
  availLeft: {flex: 1},
  availLabel: {fontSize: fontSize.xs ?? 11, fontWeight: '600', color: colors.textSecondary, marginBottom: 4},
  availCountRow: {flexDirection: 'row', alignItems: 'baseline'},
  availCount: {fontSize: 36, fontWeight: '800', color: colors.success ?? '#2E7D32'},
  availOf: {fontSize: fontSize.md, color: colors.textMuted},
  seatsInputWrap: {flex: 1},
  seatsInput: {borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, fontSize: fontSize.lg, fontWeight: '700', color: colors.textPrimary, textAlign: 'center'},
  noSeatsText: {fontSize: fontSize.xs ?? 11, color: colors.error, marginBottom: spacing.sm, fontStyle: 'italic'},
  totalRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', borderTopWidth: 1, borderTopColor: colors.divider, paddingTop: spacing.md, marginTop: spacing.sm},
  totalLabel: {fontSize: fontSize.md, fontWeight: '600', color: colors.textSecondary},
  priceBreakdown: {fontSize: fontSize.xs ?? 11, color: colors.textMuted, marginTop: 2},
  totalPrice: {fontSize: fontSize.xl, fontWeight: '800', color: colors.primary},
  // Legacy stop pickers
  stopRow: {marginBottom: spacing.md},
  stopBtn: {paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.full ?? 20, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background, marginRight: spacing.xs},
  stopBtnActive: {backgroundColor: colors.primary, borderColor: colors.primary},
  stopBtnText: {fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: '500'},
  stopBtnTextActive: {color: colors.white ?? '#fff', fontWeight: '700'},
  seatsRow: {flexDirection: 'row', gap: spacing.lg, alignItems: 'flex-end', marginBottom: spacing.sm},
  availWrap: {flex: 1, alignItems: 'center'},
  availNum: {fontSize: fontSize.xl, fontWeight: '800'},
  joinBtn: {marginTop: spacing.lg},
  unavailableBanner: {flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.errorLight ?? '#FFEBEE', borderRadius: borderRadius.md, padding: spacing.lg, marginTop: spacing.lg},
  unavailableText: {fontSize: fontSize.md, fontWeight: '700', color: colors.error},
  errorText: {fontSize: fontSize.md, color: colors.error},
});
