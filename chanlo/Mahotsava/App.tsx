import React, {useEffect, useState, useRef} from 'react';
import {StatusBar, ActivityIndicator, View, Text, Alert, Platform, StyleSheet} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {
  NavigationContainer,
  NavigationContainerRef,
} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import Ionicons from 'react-native-vector-icons/Ionicons';

import {api} from './src/services/api';
import {colors, shadows, fontSize} from './src/theme/colors';

// Auth screens
import LoginScreen from './src/screens/auth/LoginScreen';
import OtpScreen from './src/screens/auth/OtpScreen';
import RegisterScreen from './src/screens/auth/RegisterScreen';

// Host screens
import DashboardScreen from './src/screens/host/DashboardScreen';
import CreateEventScreen from './src/screens/host/CreateEventScreen';
import EventDetailScreen from './src/screens/host/EventDetailScreen';
import HelpersScreen from './src/screens/host/HelpersScreen';
import SettlementScreen from './src/screens/host/SettlementScreen';
import HostCollectScreen from './src/screens/host/HostCollectScreen';

// Helper screens
import HelperDashboardScreen from './src/screens/helper/HelperDashboardScreen';
import HelperEventScreen from './src/screens/helper/HelperEventScreen';

// Common screens
import ProfileScreen from './src/screens/common/ProfileScreen';
import VerifyScreen from './src/screens/common/VerifyScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const TAB_HEIGHT = Platform.OS === 'ios' ? 84 : 64;

// Host bottom tabs
function HostTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: 0,
          height: TAB_HEIGHT,
          paddingBottom: Platform.OS === 'ios' ? 24 : 8,
          paddingTop: 8,
          ...shadows.md,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          marginTop: 2,
        },
        headerShown: false,
      }}>
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarLabel: 'Events',
          tabBarIcon: ({color, focused}) => (
            <Ionicons name={focused ? 'calendar' : 'calendar-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Verify"
        component={VerifyScreen}
        options={{
          tabBarLabel: 'Verify',
          tabBarIcon: ({color, focused}) => (
            <Ionicons name={focused ? 'shield-checkmark' : 'shield-checkmark-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({color, focused}) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={24} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

// Helper bottom tabs
function HelperTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: colors.secondary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: 0,
          height: TAB_HEIGHT,
          paddingBottom: Platform.OS === 'ios' ? 24 : 8,
          paddingTop: 8,
          ...shadows.md,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          marginTop: 2,
        },
        headerShown: false,
      }}>
      <Tab.Screen
        name="HelperDashboard"
        component={HelperDashboardScreen}
        options={{
          tabBarLabel: 'Events',
          tabBarIcon: ({color, focused}) => (
            <Ionicons name={focused ? 'calendar' : 'calendar-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="HelperProfile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({color, focused}) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={24} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

function App() {
  const [initialRoute, setInitialRoute] = useState<string | null>(null);
  const navigationRef = useRef<NavigationContainerRef<any>>(null);

  useEffect(() => {
    checkAuth();

    // Handle session expiry — redirect to Login from anywhere in the app
    api.onSessionExpired = () => {
      Alert.alert(
        'Session Expired',
        'Please login again.',
        [
          {
            text: 'OK',
            onPress: () => {
              navigationRef.current?.reset({
                index: 0,
                routes: [{name: 'Login'}],
              });
            },
          },
        ],
      );
    };

    return () => {
      api.onSessionExpired = null;
    };
  }, []);

  const checkAuth = async () => {
    await api.init();
    if (api.getToken()) {
      try {
        const res = await api.getMe();
        if (res.success && res.userId) {
          // Route based on user role
          if (res.role === 'HELPER') {
            setInitialRoute('HelperTabs');
          } else {
            setInitialRoute('HostTabs');
          }
          return;
        }
      } catch {
        // Token invalid
      }
    }
    setInitialRoute('Login');
  };

  if (!initialRoute) {
    return (
      <View style={splashStyles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
        <Ionicons name="gift" size={56} color={colors.accent} style={splashStyles.icon} />
        <Text style={splashStyles.brand}>Mahotsava</Text>
        <ActivityIndicator size="large" color={colors.primary} style={splashStyles.spinner} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <NavigationContainer ref={navigationRef}>
        <Stack.Navigator
          initialRouteName={initialRoute}
          screenOptions={{
            headerShown: false,
          }}>
          {/* Auth */}
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Otp" component={OtpScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />

          {/* Host flow */}
          <Stack.Screen name="HostTabs" component={HostTabs} />
          <Stack.Screen name="CreateEvent" component={CreateEventScreen} />
          <Stack.Screen name="EventDetail" component={EventDetailScreen} />
          <Stack.Screen name="Helpers" component={HelpersScreen} />
          <Stack.Screen name="Settlement" component={SettlementScreen} />
          <Stack.Screen name="HostCollect" component={HostCollectScreen} />

          {/* Helper flow */}
          <Stack.Screen name="HelperTabs" component={HelperTabs} />
          <Stack.Screen name="HelperEvent" component={HelperEventScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const splashStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  icon: {
    marginBottom: 12,
  },
  brand: {
    fontSize: fontSize.xxl,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 1,
  },
  spinner: {
    marginTop: 24,
  },
});

export default App;
