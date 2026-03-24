import React, {useRef, useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import DateTimePicker, {DateTimePickerEvent} from '@react-native-community/datetimepicker';
import Animated, {FadeInUp} from 'react-native-reanimated';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MapView, {Polyline, Marker, Region} from 'react-native-maps';
import {GooglePlacesAutocomplete} from 'react-native-google-places-autocomplete';
import {colors, spacing, borderRadius, fontSize, shadows} from '../../theme/colors';
import {GradientHeader, IconButton} from '../../components';
import {api, RouteStopInput} from '../../services/api';

// ⚠️  Replace with your Google Maps API key from console.cloud.google.com
const GOOGLE_MAPS_API_KEY = 'AIzaSyBM6NyppTpjovOzE9IlNst0GCbutOwcd2g';

type EventTypeOption = 'GIFT_COLLECTION' | 'CAPACITY_EVENT';
type ConfirmTypeOption = 'AUTO' | 'MANUAL';
type CategoryOption = 'ALL' | 'TRAVEL' | 'MUSIC' | 'SPORT' | 'FOOD' | 'SOCIAL' | 'OTHER';

const CATEGORIES: {key: CategoryOption; label: string; icon: string}[] = [
  {key: 'TRAVEL', label: 'Travel', icon: 'airplane-outline'},
  {key: 'MUSIC', label: 'Music', icon: 'musical-notes-outline'},
  {key: 'SPORT', label: 'Sport', icon: 'football-outline'},
  {key: 'FOOD', label: 'Food', icon: 'restaurant-outline'},
  {key: 'SOCIAL', label: 'Social', icon: 'people-outline'},
  {key: 'OTHER', label: 'Other', icon: 'grid-outline'},
];

// ── Google Polyline decoder ──────────────────────────────────────────────────
function decodePolyline(encoded: string): {latitude: number; longitude: number}[] {
  const pts: {latitude: number; longitude: number}[] = [];
  let idx = 0, lat = 0, lng = 0;
  while (idx < encoded.length) {
    let b, shift = 0, result = 0;
    do { b = encoded.charCodeAt(idx++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lat += (result & 1) ? ~(result >> 1) : result >> 1;
    shift = 0; result = 0;
    do { b = encoded.charCodeAt(idx++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lng += (result & 1) ? ~(result >> 1) : result >> 1;
    pts.push({latitude: lat / 1e5, longitude: lng / 1e5});
  }
  return pts;
}

// ── Haversine distance in km ─────────────────────────────────────────────────
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getEventNameError(value: string): string {
  if (!value.trim()) return '';
  if (value.trim().length <= 3) return 'Event name must be more than 3 characters';
  return '';
}

export default function CreateEventScreen({navigation}: any) {
  const [eventName, setEventName] = useState('');
  const [eventDate, setEventDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [eventTime, setEventTime] = useState<Date | null>(null);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [hostMessage, setHostMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const [eventType, setEventType] = useState<EventTypeOption>('GIFT_COLLECTION');
  const [confirmationType, setConfirmationType] = useState<ConfirmTypeOption>('AUTO');
  const [capacity, setCapacity] = useState('');
  const [pricePerPerson, setPricePerPerson] = useState('');
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState<CategoryOption | ''>('');

  // Visibility
  const [isPublic, setIsPublic] = useState(false);
  const [eventLat, setEventLat] = useState<number | null>(null);
  const [eventLng, setEventLng] = useState<number | null>(null);

  // Route (TRAVEL only)
  const [routeStops, setRouteStops] = useState<RouteStopInput[]>([]);
  const [routePolyline, setRoutePolyline] = useState<{latitude: number; longitude: number}[]>([]);
  const [totalDistanceKm, setTotalDistanceKm] = useState<number>(0);
  const [fetchingRoute, setFetchingRoute] = useState(false);
  const addStopRef = useRef<any>(null);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const maxDate = new Date();
  maxDate.setFullYear(maxDate.getFullYear() + 5);

  const eventNameError = getEventNameError(eventName);
  const isCapacity = eventType === 'CAPACITY_EVENT';
  const isTravel = category === 'TRAVEL';

  const formatDate = (date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const formatDisplayDate = (date: Date): string =>
    date.toLocaleDateString('en-IN', {weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'});

  const formatDisplayTime = (date: Date): string =>
    date.toLocaleTimeString('en-IN', {hour: '2-digit', minute: '2-digit', hour12: true});

  const formatTimeForApi = (date: Date): string => {
    const h = String(date.getHours()).padStart(2, '0');
    const m = String(date.getMinutes()).padStart(2, '0');
    return `${h}:${m}:00`;
  };

  const isEventDateToday = (): boolean => {
    if (!eventDate) return false;
    const t = new Date();
    return (
      eventDate.getFullYear() === t.getFullYear() &&
      eventDate.getMonth() === t.getMonth() &&
      eventDate.getDate() === t.getDate()
    );
  };

  const minAllowedTime = (): Date => {
    const min = new Date();
    min.setMinutes(min.getMinutes() + 30);
    min.setSeconds(0, 0);
    return min;
  };

  const onDateChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (selectedDate) {
      setEventDate(selectedDate);
      if (eventTime) {
        const t = new Date();
        const isToday =
          selectedDate.getFullYear() === t.getFullYear() &&
          selectedDate.getMonth() === t.getMonth() &&
          selectedDate.getDate() === t.getDate();
        if (isToday) {
          const min = minAllowedTime();
          if (
            eventTime.getHours() < min.getHours() ||
            (eventTime.getHours() === min.getHours() && eventTime.getMinutes() < min.getMinutes())
          ) {
            setEventTime(null);
          }
        }
      }
    }
  };

  const onTimeChange = (_event: DateTimePickerEvent, selectedTime?: Date) => {
    if (Platform.OS === 'android') setShowTimePicker(false);
    if (selectedTime) {
      if (isEventDateToday()) {
        const min = minAllowedTime();
        if (
          selectedTime.getHours() < min.getHours() ||
          (selectedTime.getHours() === min.getHours() && selectedTime.getMinutes() < min.getMinutes())
        ) {
          Alert.alert('Invalid Time', `Please select a time at least 30 minutes from now (after ${formatDisplayTime(min)}).`);
          return;
        }
      }
      setEventTime(selectedTime);
    }
  };

  // ── Fetch route via Google Directions API (waypoints) ─────────────────────
  const fetchRoute = async (stops: RouteStopInput[]) => {
    if (stops.length < 2) return;
    setFetchingRoute(true);
    setRoutePolyline([]);
    setTotalDistanceKm(0);
    try {
      const origin = `${stops[0].lat},${stops[0].lng}`;
      const destination = `${stops[stops.length - 1].lat},${stops[stops.length - 1].lng}`;
      const middleStops = stops.slice(1, -1);
      const waypoints = middleStops.map(s => `${s.lat},${s.lng}`).join('|');

      let url =
        `https://maps.googleapis.com/maps/api/directions/json` +
        `?origin=${origin}&destination=${destination}&key=${GOOGLE_MAPS_API_KEY}`;
      if (waypoints) url += `&waypoints=${waypoints}`;

      const res = await fetch(url);
      const data = await res.json();

      if (data.status !== 'OK' || !data.routes?.length) {
        Alert.alert('Route Error', 'Could not find a route between these stops. Try adjusting them.');
        return;
      }

      const route = data.routes[0];
      const legs: any[] = route.legs;

      setRoutePolyline(decodePolyline(route.overview_polyline.points));

      // Fill distanceToNextKm from Directions API legs (exact road distances)
      let totalMeters = 0;
      const stopsWithDist: RouteStopInput[] = stops.map((stop, idx) => {
        if (idx < stops.length - 1) {
          const legMeters = legs[idx].distance.value;
          totalMeters += legMeters;
          return {...stop, distanceToNextKm: legMeters / 1000};
        }
        return {...stop, distanceToNextKm: null};
      });

      setRouteStops(stopsWithDist);
      setTotalDistanceKm(Math.round(totalMeters / 1000));
    } catch (e) {
      Alert.alert('Error', 'Failed to fetch route. Check your internet connection.');
    } finally {
      setFetchingRoute(false);
    }
  };

  const onStopSelected = (details: any) => {
    if (!details?.geometry?.location) return;
    const newStop: RouteStopInput = {
      name: details.name || details.formatted_address || 'Unknown',
      lat: details.geometry.location.lat,
      lng: details.geometry.location.lng,
      distanceToNextKm: null,
    };
    addStopRef.current?.clear();
    const updatedStops = [...routeStops, newStop];
    setRouteStops(updatedStops);
    if (updatedStops.length >= 2) {
      fetchRoute(updatedStops);
    }
  };

  const removeStop = (idx: number) => {
    const updatedStops = routeStops.filter((_, i) => i !== idx);
    setRouteStops(updatedStops);
    if (updatedStops.length >= 2) {
      fetchRoute(updatedStops);
    } else {
      setRoutePolyline([]);
      setTotalDistanceKm(0);
    }
  };

  const mapRegion = (): Region | undefined => {
    if (routePolyline.length === 0) return undefined;
    const lats = routePolyline.map(p => p.latitude);
    const lngs = routePolyline.map(p => p.longitude);
    const minLat = Math.min(...lats), maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: (maxLat - minLat) * 1.4 + 0.01,
      longitudeDelta: (maxLng - minLng) * 1.4 + 0.01,
    };
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const submitCreate = async () => {
    const dateStr = formatDate(eventDate!);
    setLoading(true);
    try {
      const res = await api.createEvent(
        eventName.trim(),
        dateStr,
        hostMessage.trim() || undefined,
        isCapacity ? eventType : undefined,
        isCapacity ? confirmationType : undefined,
        isCapacity ? parseInt(capacity) : undefined,
        isCapacity ? parseInt(pricePerPerson) : undefined,
        isCapacity && !isTravel && location.trim() ? location.trim() : undefined,
        category || undefined,
        eventTime ? formatTimeForApi(eventTime) : undefined,
        isCapacity && isTravel && routeStops.length >= 2 ? routeStops : undefined,
        isCapacity && isTravel && totalDistanceKm > 0 ? totalDistanceKm : undefined,
        isPublic,
        isPublic && eventLat != null ? eventLat : undefined,
        isPublic && eventLng != null ? eventLng : undefined,
      );
      if (res.success) {
        const typeLabel = isCapacity ? (confirmationType === 'AUTO' ? 'Carpool/Auto' : 'Ticketed') : 'Gift Collection';
        Alert.alert(
          'Event Created!',
          `"${res.event.eventName}" has been created.\n\nType: ${typeLabel}${isCapacity ? `\nCapacity: ${capacity}\nPrice: Rs.${pricePerPerson}${isTravel ? ` (total route)` : '/person'}` : ''}\n\nShare the QR code with your helpers and guests.`,
          [{text: 'OK', onPress: () => navigation.goBack()}],
        );
      } else {
        Alert.alert('Error', res.message || 'Failed to create event');
      }
    } catch (e: any) {
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const showMainConfirmation = (date: Date) => {
    const summaryLines = [
      `Event Name: ${eventName.trim()}`,
      `Date: ${formatDisplayDate(date)}`,
      ...(eventTime ? [`Time: ${formatDisplayTime(eventTime)}`] : []),
      `Type: ${isCapacity ? (confirmationType === 'AUTO' ? 'Auto-confirm' : 'Manual confirm') : 'Gift Collection'}`,
    ];
    if (isCapacity) {
      summaryLines.push(`Capacity: ${capacity} seats`);
      summaryLines.push(
        isTravel ? `Full Route Price: Rs.${pricePerPerson}` : `Price: Rs.${pricePerPerson}/person`,
      );
      if (isTravel && routeStops.length >= 2) {
        summaryLines.push(`Route: ${routeStops.map(s => s.name).join(' → ')}`);
        summaryLines.push(`Distance: ~${totalDistanceKm} km`);
      } else if (location.trim()) {
        summaryLines.push(`Location: ${location.trim()}`);
      }
      if (category) summaryLines.push(`Category: ${category}`);
    }
    if (hostMessage.trim()) summaryLines.push(`Message: ${hostMessage.trim()}`);

    Alert.alert(
      'Recheck Before Confirming',
      summaryLines.join('\n') + '\n\nIs all the information correct?',
      [{text: 'Edit', style: 'cancel'}, {text: 'Confirm & Create', onPress: submitCreate}],
    );
  };

  const handleCreate = () => {
    if (!eventName.trim()) { Alert.alert('Required', 'Please enter the event name'); return; }
    if (eventNameError) { Alert.alert('Invalid Event Name', eventNameError); return; }
    if (!eventDate) { Alert.alert('Required', 'Please select the event date'); return; }
    if (!category) { Alert.alert('Required', 'Please select a category'); return; }
    if (isPublic && (eventLat == null || eventLng == null)) {
      Alert.alert('Location Required', 'Public events need a map location so they appear on the Explore map. Tap the map to place a pin.');
      return;
    }
    if (isCapacity) {
      if (!capacity || parseInt(capacity) < 1) {
        Alert.alert('Required', 'Please enter a valid capacity (minimum 1)');
        return;
      }
      if (!pricePerPerson || parseInt(pricePerPerson) < 1) {
        Alert.alert('Required', isTravel ? 'Please enter the total route price' : 'Please enter a valid price per person');
        return;
      }
      if (isTravel && routeStops.length < 2) {
        Alert.alert('Required', 'Please add at least 2 route stops.');
        return;
      }
    }

    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
    if (eventDate > oneYearFromNow) {
      Alert.alert(
        'Date is Over a Year Away',
        `You selected ${formatDisplayDate(eventDate)}.\n\nThis is more than a year from today. Are you sure?`,
        [{text: 'Change Date', style: 'cancel'}, {text: 'Yes, Continue', onPress: () => showMainConfirmation(eventDate)}],
      );
    } else {
      showMainConfirmation(eventDate);
    }
  };

  return (
    <View style={styles.container}>
      <GradientHeader title="New Event" onBack={() => navigation.goBack()} />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled>
        <Animated.View entering={FadeInUp.duration(400).delay(100)} style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="sparkles-outline" size={20} color={colors.primary} />
            <Text style={styles.cardTitle}>Event Details</Text>
          </View>

          {/* Event Type */}
          <Text style={styles.label}>Event Type *</Text>
          <View style={styles.pillRow}>
            <TouchableOpacity
              style={[styles.pill, eventType === 'GIFT_COLLECTION' && styles.pillActive]}
              onPress={() => setEventType('GIFT_COLLECTION')}>
              <Ionicons name="gift-outline" size={14} color={eventType === 'GIFT_COLLECTION' ? colors.white : colors.textSecondary} />
              <Text style={[styles.pillText, eventType === 'GIFT_COLLECTION' && styles.pillTextActive]}>Gift Collection</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.pill, eventType === 'CAPACITY_EVENT' && styles.pillActive]}
              onPress={() => setEventType('CAPACITY_EVENT')}>
              <Ionicons name="people-outline" size={14} color={eventType === 'CAPACITY_EVENT' ? colors.white : colors.textSecondary} />
              <Text style={[styles.pillText, eventType === 'CAPACITY_EVENT' && styles.pillTextActive]}>Capacity Event</Text>
            </TouchableOpacity>
          </View>

          {/* Confirmation Type */}
          {isCapacity && (
            <>
              <Text style={styles.label}>Confirmation Mode *</Text>
              <View style={styles.pillRow}>
                <TouchableOpacity
                  style={[styles.pill, confirmationType === 'AUTO' && styles.pillActive]}
                  onPress={() => setConfirmationType('AUTO')}>
                  <Ionicons name="flash-outline" size={14} color={confirmationType === 'AUTO' ? colors.white : colors.textSecondary} />
                  <Text style={[styles.pillText, confirmationType === 'AUTO' && styles.pillTextActive]}>Auto (fills up)</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.pill, confirmationType === 'MANUAL' && styles.pillActive]}
                  onPress={() => setConfirmationType('MANUAL')}>
                  <Ionicons name="checkmark-circle-outline" size={14} color={confirmationType === 'MANUAL' ? colors.white : colors.textSecondary} />
                  <Text style={[styles.pillText, confirmationType === 'MANUAL' && styles.pillTextActive]}>Manual (I'll confirm)</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.hintText}>
                {confirmationType === 'AUTO'
                  ? 'Event auto-confirms when all seats are filled (e.g. carpool)'
                  : 'You manually confirm when you are satisfied (e.g. DJ night)'}
              </Text>
            </>
          )}

          <Text style={styles.label}>Event Name *</Text>
          <TextInput
            style={[styles.input, eventNameError ? styles.inputError : null]}
            value={eventName}
            onChangeText={setEventName}
            placeholder={isCapacity ? 'e.g., Trip to Goa, DJ Night' : 'e.g., Priya & Rahul Wedding'}
            placeholderTextColor={colors.textMuted}
            autoCapitalize="words"
          />
          {eventNameError ? <Text style={styles.errorText}>{eventNameError}</Text> : null}

          <Text style={styles.label}>Event Date *</Text>
          <TouchableOpacity style={styles.dateBtn} onPress={() => setShowDatePicker(true)}>
            <Ionicons name="calendar-outline" size={18} color={eventDate ? colors.primary : colors.textMuted} />
            <Text style={[styles.dateBtnText, !eventDate && {color: colors.textMuted}]}>
              {eventDate ? formatDisplayDate(eventDate) : 'Tap to select date'}
            </Text>
          </TouchableOpacity>
          {showDatePicker && (
            <View>
              <DateTimePicker
                value={eventDate || new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'calendar'}
                minimumDate={today}
                maximumDate={maxDate}
                onChange={onDateChange}
              />
              {Platform.OS === 'ios' && (
                <TouchableOpacity style={styles.doneDateBtn} onPress={() => setShowDatePicker(false)}>
                  <Text style={styles.doneDateBtnText}>Done</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          <Text style={styles.label}>Approximate Start Time (optional)</Text>
          <TouchableOpacity style={styles.dateBtn} onPress={() => setShowTimePicker(true)}>
            <Ionicons name="time-outline" size={18} color={eventTime ? colors.primary : colors.textMuted} />
            <Text style={[styles.dateBtnText, !eventTime && {color: colors.textMuted}]}>
              {eventTime ? formatDisplayTime(eventTime) : 'Tap to set time'}
            </Text>
            {eventTime && (
              <TouchableOpacity onPress={() => setEventTime(null)} style={{marginLeft: 'auto'}}>
                <Ionicons name="close-circle-outline" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </TouchableOpacity>
          {showTimePicker && (
            <View>
              <DateTimePicker
                value={eventTime || (isEventDateToday() ? minAllowedTime() : new Date())}
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'clock'}
                minimumDate={isEventDateToday() ? minAllowedTime() : undefined}
                onChange={onTimeChange}
              />
              {Platform.OS === 'ios' && (
                <TouchableOpacity style={styles.doneDateBtn} onPress={() => setShowTimePicker(false)}>
                  <Text style={styles.doneDateBtnText}>Done</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Capacity & Price */}
          {isCapacity && (
            <>
              <Text style={styles.label}>Total Seats / Spots *</Text>
              <TextInput
                style={styles.input}
                value={capacity}
                onChangeText={setCapacity}
                placeholder="e.g., 4"
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
              />

              <Text style={styles.label}>
                {isTravel ? 'Full Route Price (Rs.) *' : 'Price Per Person (Rs.) *'}
              </Text>
              <TextInput
                style={styles.input}
                value={pricePerPerson}
                onChangeText={setPricePerPerson}
                placeholder={isTravel ? 'e.g., 1000 (total Mumbai→Goa)' : 'e.g., 150'}
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
              />
              {isTravel && (
                <Text style={styles.hintText}>
                  Guests joining from a middle stop will pay proportionally based on their distance.
                </Text>
              )}

              {!isTravel && (
                <>
                  <Text style={styles.label}>Location (optional)</Text>
                  <TextInput
                    style={styles.input}
                    value={location}
                    onChangeText={setLocation}
                    placeholder="e.g., Pune, CSMT Mumbai"
                    placeholderTextColor={colors.textMuted}
                    autoCapitalize="words"
                  />
                </>
              )}

              <Text style={styles.label}>Category <Text style={{color: colors.error ?? '#E53935'}}>*</Text></Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryRow}>
                {CATEGORIES.map(cat => (
                  <TouchableOpacity
                    key={cat.key}
                    style={[styles.pill, category === cat.key && styles.pillActive]}
                    onPress={() => {
                      const newCat = category === cat.key ? '' : cat.key;
                      setCategory(newCat);
                      if (newCat !== 'TRAVEL') {
                        setRouteStops([]);
                        setRoutePolyline([]);
                        setTotalDistanceKm(0);
                        addStopRef.current?.clear();
                      }
                    }}>
                    <Ionicons
                      name={cat.icon}
                      size={14}
                      color={category === cat.key ? (colors.white ?? '#fff') : colors.textSecondary}
                    />
                    <Text style={[styles.pillText, category === cat.key && styles.pillTextActive]}>{cat.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* ── TRAVEL Route Section ── */}
              {isTravel && (
                <View style={styles.routeSection}>
                  <View style={styles.routeSectionHeader}>
                    <Ionicons name="map-outline" size={18} color={colors.primary} />
                    <Text style={styles.routeSectionTitle}>Route Stops</Text>
                  </View>
                  <Text style={styles.hintText}>Add each stop in order. Route map updates automatically.</Text>

                  {/* Current stops list */}
                  {routeStops.length > 0 && (
                    <View style={styles.stopsList}>
                      {routeStops.map((stop, idx) => (
                        <View key={idx} style={styles.stopRow}>
                          <View style={[
                            styles.stopNumBadge,
                            idx === 0 && {backgroundColor: '#4CAF50'},
                            idx === routeStops.length - 1 && {backgroundColor: '#F44336'},
                          ]}>
                            <Text style={styles.stopNumText}>{idx + 1}</Text>
                          </View>
                          <Text style={styles.stopRowName} numberOfLines={1}>{stop.name}</Text>
                          <TouchableOpacity onPress={() => removeStop(idx)} style={styles.stopRemoveBtn}>
                            <Ionicons name="close-circle" size={20} color={colors.textMuted} />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Add stop autocomplete */}
                  <Text style={styles.label}>
                    {routeStops.length === 0
                      ? 'First Stop *'
                      : routeStops.length === 1
                      ? 'Next Stop *'
                      : 'Add Another Stop'}
                  </Text>
                  <View style={styles.placesWrapper}>
                    <GooglePlacesAutocomplete
                      ref={addStopRef}
                      placeholder={
                        routeStops.length === 0
                          ? 'e.g., Mumbai (starting point)'
                          : routeStops.length === 1
                          ? 'e.g., Pune'
                          : 'e.g., Goa (final or another stop)'
                      }
                      onPress={(_data, details) => onStopSelected(details)}
                      query={{key: GOOGLE_MAPS_API_KEY, language: 'en', components: 'country:in'}}
                      fetchDetails
                      styles={placesStyles}
                      enablePoweredByContainer={false}
                    />
                  </View>

                  {/* Fetching indicator */}
                  {fetchingRoute && (
                    <View style={styles.fetchingRow}>
                      <ActivityIndicator size="small" color={colors.primary} />
                      <Text style={styles.fetchingText}>Updating route…</Text>
                    </View>
                  )}

                  {/* Map */}
                  {routePolyline.length > 0 && mapRegion() && (
                    <MapView
                      style={styles.mapView}
                      region={mapRegion()}
                      scrollEnabled={false}
                      zoomEnabled={false}>
                      <Polyline
                        coordinates={routePolyline}
                        strokeColor={colors.primary}
                        strokeWidth={3}
                      />
                      {routeStops.map((stop, idx) => (
                        <Marker
                          key={idx}
                          coordinate={{latitude: stop.lat, longitude: stop.lng}}
                          title={stop.name}
                          pinColor={idx === 0 ? '#4CAF50' : idx === routeStops.length - 1 ? '#F44336' : colors.primary}
                        />
                      ))}
                    </MapView>
                  )}

                  {/* Route summary */}
                  {routeStops.length >= 2 && totalDistanceKm > 0 && (
                    <View style={styles.detectedStopsBox}>
                      <View style={styles.detectedStopsHeader}>
                        <Ionicons name="git-branch-outline" size={14} color={colors.primary} />
                        <Text style={styles.detectedStopsTitle}>
                          {routeStops.length} stops · ~{totalDistanceKm} km
                        </Text>
                      </View>
                      <Text style={styles.routePreview}>{routeStops.map(s => s.name).join(' → ')}</Text>
                    </View>
                  )}
                </View>
              )}
            </>
          )}

          {/* Visibility toggle */}
          <Text style={styles.label}>Event Visibility</Text>
          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={[styles.toggleBtn, !isPublic && styles.toggleBtnActive]}
              onPress={() => setIsPublic(false)}>
              <Ionicons name="lock-closed-outline" size={16} color={!isPublic ? '#fff' : colors.textSecondary} />
              <Text style={[styles.toggleBtnText, !isPublic && styles.toggleBtnTextActive]}>Private</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, isPublic && styles.toggleBtnActivePublic]}
              onPress={() => setIsPublic(true)}>
              <Ionicons name="earth-outline" size={16} color={isPublic ? '#fff' : colors.textSecondary} />
              <Text style={[styles.toggleBtnText, isPublic && styles.toggleBtnTextActive]}>Public</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.visibilityHint}>
            {isPublic
              ? 'This event will appear as a pin on the Explore map.'
              : 'Only accessible via QR code or link.'}
          </Text>

          {isPublic && (
            <View style={styles.mapPickerContainer}>
              <Text style={styles.mapPickerLabel}>
                <Ionicons name="location-outline" size={13} color={colors.primary} />
                {' '}Tap the map to place your event pin{eventLat != null ? ' ✓' : ''}
              </Text>
              <MapView
                style={styles.mapPicker}
                initialRegion={{latitude: 20.5937, longitude: 78.9629, latitudeDelta: 15, longitudeDelta: 15}}
                onPress={e => {
                  const {latitude, longitude} = e.nativeEvent.coordinate;
                  setEventLat(latitude);
                  setEventLng(longitude);
                }}>
                {eventLat != null && eventLng != null && (
                  <Marker coordinate={{latitude: eventLat, longitude: eventLng}} pinColor={colors.primary} />
                )}
              </MapView>
            </View>
          )}

          <Text style={styles.label}>{isCapacity ? 'Confirmation Message' : 'Thank You Message'}</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            value={hostMessage}
            onChangeText={setHostMessage}
            placeholder={isCapacity ? 'Message to participants on confirmation (optional)' : 'Message for guests after they contribute (optional)'}
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </Animated.View>

        <IconButton
          icon="add-circle-outline"
          label="Create Event"
          variant="primary"
          onPress={handleCreate}
          loading={loading}
          style={styles.createBtn}
        />
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
  content: {padding: spacing.md, paddingBottom: spacing.xxl},
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.md,
  },
  cardTitleRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm},
  cardTitle: {fontSize: fontSize.xl, fontWeight: '700', color: colors.textPrimary},
  label: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    marginTop: spacing.md,
  },
  pillRow: {flexDirection: 'row', gap: spacing.sm},
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full ?? 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  pillActive: {backgroundColor: colors.primary, borderColor: colors.primary},
  pillText: {fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: '500'},
  pillTextActive: {color: colors.white ?? '#fff', fontWeight: '600'},
  hintText: {fontSize: fontSize.xs ?? 11, color: colors.textMuted, marginTop: spacing.xs, fontStyle: 'italic'},
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md - 2,
    fontSize: fontSize.md,
    color: colors.textPrimary,
  },
  inputError: {borderColor: colors.error ?? '#E53935'},
  errorText: {fontSize: fontSize.xs ?? 11, color: colors.error ?? '#E53935', marginTop: 4},
  multiline: {minHeight: 80, paddingTop: spacing.sm},
  dateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
  },
  dateBtnText: {fontSize: fontSize.md, color: colors.textPrimary},
  doneDateBtn: {alignSelf: 'flex-end', paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, marginTop: spacing.xs},
  doneDateBtnText: {fontSize: fontSize.md, fontWeight: '700', color: colors.primary},
  createBtn: {marginTop: spacing.lg},
  categoryRow: {marginTop: 4},
  // Route section
  routeSection: {
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    backgroundColor: colors.background,
  },
  routeSectionHeader: {flexDirection: 'row', alignItems: 'center', gap: spacing.xs},
  routeSectionTitle: {fontSize: fontSize.md, fontWeight: '700', color: colors.primary},
  placesWrapper: {zIndex: 99, marginTop: 4},
  getRouteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.sm + 2,
    marginTop: spacing.md,
  },
  getRouteBtnDisabled: {opacity: 0.6},
  getRouteBtnText: {color: colors.white, fontSize: fontSize.md, fontWeight: '700'},
  mapView: {height: 220, borderRadius: borderRadius.sm, marginTop: spacing.md, overflow: 'hidden'},
  detectedStopsBox: {
    marginTop: spacing.md,
    padding: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  detectedStopsHeader: {flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4},
  detectedStopsTitle: {fontSize: fontSize.xs ?? 11, fontWeight: '600', color: colors.primary},
  routePreview: {fontSize: fontSize.sm, color: colors.textPrimary, fontWeight: '600', marginBottom: spacing.sm},
  stopPillRow: {marginTop: spacing.xs},
  stopPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.full ?? 20,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    marginRight: spacing.xs,
  },
  stopPillNum: {fontSize: fontSize.xs ?? 11, fontWeight: '700', color: colors.primary, marginRight: 2},
  stopPillText: {fontSize: fontSize.sm, color: colors.textPrimary, maxWidth: 100},
  // New manual stop list styles
  stopsList: {marginTop: spacing.sm, marginBottom: spacing.xs},
  stopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  stopNumBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopNumText: {fontSize: fontSize.xs ?? 11, fontWeight: '700', color: colors.white},
  stopRowName: {flex: 1, fontSize: fontSize.md, color: colors.textPrimary, fontWeight: '500'},
  stopRemoveBtn: {padding: 2},
  fetchingRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm},
  fetchingText: {fontSize: fontSize.sm, color: colors.textMuted, fontStyle: 'italic'},
  toggleRow: {flexDirection: 'row', gap: spacing.sm, marginTop: 4},
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  toggleBtnActive: {backgroundColor: colors.textSecondary, borderColor: colors.textSecondary},
  toggleBtnActivePublic: {backgroundColor: colors.primary, borderColor: colors.primary},
  toggleBtnText: {fontSize: fontSize.sm, fontWeight: '600', color: colors.textSecondary},
  toggleBtnTextActive: {color: '#fff'},
  visibilityHint: {fontSize: fontSize.xs, color: colors.textMuted, marginTop: 6, marginBottom: spacing.xs},
  mapPickerContainer: {marginTop: spacing.xs, marginBottom: spacing.sm},
  mapPickerLabel: {fontSize: fontSize.xs, color: colors.primary, fontWeight: '600', marginBottom: spacing.xs},
  mapPicker: {width: '100%', height: 180, borderRadius: borderRadius.md, overflow: 'hidden'},
});
