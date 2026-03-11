import React, {useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
  TextInput,
} from 'react-native';
import DateTimePicker, {DateTimePickerEvent} from '@react-native-community/datetimepicker';
import Animated, {FadeInUp} from 'react-native-reanimated';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {colors, spacing, borderRadius, fontSize, shadows} from '../../theme/colors';
import {GradientHeader, IconButton} from '../../components';
import {api} from '../../services/api';

function getEventNameError(value: string): string {
  if (!value.trim()) return '';
  if (value.trim().length <= 3) return 'Event name must be more than 3 characters';
  return '';
}

export default function CreateEventScreen({navigation}: any) {
  const [eventName, setEventName] = useState('');
  const [eventDate, setEventDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [hostMessage, setHostMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const maxDate = new Date();
  maxDate.setFullYear(maxDate.getFullYear() + 5);

  const eventNameError = getEventNameError(eventName);

  const formatDate = (date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const formatDisplayDate = (date: Date): string => {
    return date.toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const onDateChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      setEventDate(selectedDate);
    }
  };

  const submitCreate = async () => {
    const dateStr = formatDate(eventDate!);
    setLoading(true);
    try {
      const res = await api.createEvent(
        eventName.trim(),
        dateStr,
        hostMessage.trim() || undefined,
      );
      if (res.success) {
        Alert.alert(
          'Event Created!',
          `"${res.event.eventName}" has been created.\n\nEvent ID: ${res.event.eventId}\n\nShare the QR code with your helpers and guests.`,
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
    const summary = [
      `Event Name: ${eventName.trim()}`,
      `Date: ${formatDisplayDate(date)}`,
      hostMessage.trim() ? `Thank You Message: ${hostMessage.trim()}` : null,
    ]
      .filter(Boolean)
      .join('\n');

    Alert.alert(
      'Recheck Before Confirming',
      `${summary}\n\nIs all the information correct?`,
      [
        {text: 'Edit', style: 'cancel'},
        {text: 'Confirm & Create', onPress: submitCreate},
      ],
    );
  };

  const handleCreate = () => {
    if (!eventName.trim()) {
      Alert.alert('Required', 'Please enter the event name');
      return;
    }
    if (eventNameError) {
      Alert.alert('Invalid Event Name', eventNameError);
      return;
    }
    if (!eventDate) {
      Alert.alert('Required', 'Please select the event date');
      return;
    }

    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

    if (eventDate > oneYearFromNow) {
      Alert.alert(
        'Date is Over a Year Away',
        `You selected ${formatDisplayDate(eventDate)}.\n\nThis is more than a year from today. Are you sure about this date?`,
        [
          {text: 'Change Date', style: 'cancel'},
          {text: 'Yes, Continue', onPress: () => showMainConfirmation(eventDate)},
        ],
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
        keyboardShouldPersistTaps="handled">
        <Animated.View entering={FadeInUp.duration(400).delay(100)} style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="sparkles-outline" size={20} color={colors.primary} />
            <Text style={styles.cardTitle}>Event Details</Text>
          </View>

          <Text style={styles.label}>Event Name *</Text>
          <TextInput
            style={[styles.input, eventNameError ? styles.inputError : null]}
            value={eventName}
            onChangeText={setEventName}
            placeholder="e.g., Priya & Rahul Wedding"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="words"
          />
          {eventNameError ? <Text style={styles.errorText}>{eventNameError}</Text> : null}

          <Text style={styles.label}>Event Date *</Text>
          <TouchableOpacity
            style={styles.dateBtn}
            onPress={() => setShowDatePicker(true)}>
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
                <TouchableOpacity
                  style={styles.doneDateBtn}
                  onPress={() => setShowDatePicker(false)}>
                  <Text style={styles.doneDateBtnText}>Done</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          <Text style={styles.label}>Thank You Message</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            value={hostMessage}
            onChangeText={setHostMessage}
            placeholder="Message for guests after they contribute (optional)"
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

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.background},
  content: {padding: spacing.md, paddingBottom: spacing.xxl},
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.md,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  cardTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    marginTop: spacing.md,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md - 2,
    fontSize: fontSize.md,
    color: colors.textPrimary,
  },
  inputError: {
    borderColor: colors.error ?? '#E53935',
  },
  errorText: {
    fontSize: fontSize.xs ?? 11,
    color: colors.error ?? '#E53935',
    marginTop: 4,
  },
  multiline: {
    minHeight: 80,
    paddingTop: spacing.sm,
  },
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
  dateBtnText: {
    fontSize: fontSize.md,
    color: colors.textPrimary,
  },
  doneDateBtn: {
    alignSelf: 'flex-end',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    marginTop: spacing.xs,
  },
  doneDateBtnText: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.primary,
  },
  createBtn: {
    marginTop: spacing.lg,
  },
});
