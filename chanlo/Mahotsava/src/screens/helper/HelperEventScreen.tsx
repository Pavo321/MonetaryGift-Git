import React, {useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {colors, spacing, fontSize, gradients} from '../../theme/colors';
import {GradientHeader} from '../../components';
import CollectScreen from './CollectScreen';
import ExpenseScreen from './ExpenseScreen';

type Tab = 'collect' | 'expenses';

const TAB_CONFIG: {key: Tab; icon: string; label: string}[] = [
  {key: 'collect', icon: 'download-outline', label: 'Collect Money'},
  {key: 'expenses', icon: 'trending-down-outline', label: 'Expenses'},
];

export default function HelperEventScreen({route, navigation}: any) {
  const {eventId, eventName} = route.params;
  const [activeTab, setActiveTab] = useState<Tab>('collect');

  return (
    <View style={styles.container}>
      <GradientHeader
        title={eventName}
        gradientColors={gradients.helperHeader}
        onBack={() => navigation.goBack()}
      />

      {/* Tab bar */}
      <View style={styles.tabRow}>
        {TAB_CONFIG.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}>
            <Ionicons
              name={tab.icon}
              size={18}
              color={activeTab === tab.key ? colors.secondary : colors.textMuted}
            />
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      <View style={styles.content}>
        {activeTab === 'collect' ? (
          <CollectScreen route={{params: {eventId}}} />
        ) : (
          <ExpenseScreen route={{params: {eventId}}} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.background},
  tabRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: colors.secondary,
  },
  tabText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textMuted,
  },
  tabTextActive: {
    color: colors.secondary,
  },
  content: {flex: 1},
});
