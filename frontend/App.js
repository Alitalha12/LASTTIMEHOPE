import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { PaperProvider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { View, StyleSheet } from 'react-native';
import useSettingsStore from './src/store/useSettingsStore';
import useAuthStore from './src/store/useAuthStore';
import { getTheme } from './src/utils/themeColors';
import { t } from './src/utils/i18n';

// Screens
import * as SplashScreenNative from 'expo-splash-screen';
import SplashScreen from './src/screens/SplashScreen';
import WelcomeScreen from './src/screens/WelcomeScreen';
import LoginScreen from './src/screens/LoginScreen';
import SignupScreen from './src/screens/SignupScreen';
import HomeScreen from './src/screens/HomeScreen';
import ProcessingScreen from './src/screens/ProcessingScreen';
import ResultsScreen from './src/screens/ResultsScreen';
import TrackingScreen from './src/screens/TrackingScreen';
import BookingsScreen from './src/screens/BookingsScreen';
import ActivityScreen from './src/screens/ActivityScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import PasswordResetScreen from './src/screens/PasswordResetScreen';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';
import OtpVerificationScreen from './src/screens/OtpVerificationScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import ProviderDashboardScreen from './src/screens/ProviderDashboardScreen';
import ChatScreen from './src/screens/ChatScreen';
import LiveTrackingScreen from './src/screens/LiveTrackingScreen';

// Keep the splash screen visible while we fetch resources
SplashScreenNative.preventAutoHideAsync();

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const MainTabs = () => {
  const { theme, language } = useSettingsStore();
  const colors = getTheme(theme);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.subtext,
        tabBarStyle: {
          height: 75,
          paddingBottom: 15,
          paddingTop: 10,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          backgroundColor: colors.card,
          elevation: 10,
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'HomeTab') iconName = focused ? 'robot-excited' : 'robot-excited-outline';
          else if (route.name === 'BookingsTab') iconName = focused ? 'calendar-check' : 'calendar-check-outline';
          else if (route.name === 'ActivityTab') iconName = focused ? 'pulse' : 'pulse';
          else if (route.name === 'ProfileTab') iconName = focused ? 'account-circle' : 'account-circle-outline';
          
          return <MaterialCommunityIcons name={iconName} size={size + 4} color={color} />;
        },
      })}
    >
      <Tab.Screen 
        name="HomeTab" 
        component={HomeScreen} 
        options={{ tabBarLabel: t('home_tab', language) }} 
      />
      <Tab.Screen 
        name="BookingsTab" 
        component={BookingsScreen} 
        options={{ tabBarLabel: t('bookings_tab', language) }} 
      />
      <Tab.Screen 
        name="ActivityTab" 
        component={ActivityScreen} 
        options={{ tabBarLabel: t('activity_tab', language) }} 
      />
      <Tab.Screen 
        name="ProfileTab" 
        component={ProfileScreen} 
        options={{ tabBarLabel: t('profile_tab', language) }} 
      />
    </Tab.Navigator>
  );
};

export default function App() {
  const { isAuthenticated, checkAuth, user } = useAuthStore();
  const [isReady, setIsReady] = React.useState(false);

  React.useEffect(() => {
    async function prepare() {
      try {
        // Run auth check
        await checkAuth();
      } catch (e) {
        console.warn(e);
      } finally {
        setIsReady(true);
        await SplashScreenNative.hideAsync();
      }
    }
    prepare();
  }, []);

  if (!isReady) {
    return null; // Or a custom Loading component
  }

  return (
    <PaperProvider>
      <NavigationContainer>
        <Stack.Navigator 
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
          }}
        >
          {!isAuthenticated ? (
            // AUTH STACK
            <>
              <Stack.Screen name="Splash" component={SplashScreen} />
              <Stack.Screen name="Welcome" component={WelcomeScreen} />
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="Signup" component={SignupScreen} />
              <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
              <Stack.Screen name="OtpVerification" component={OtpVerificationScreen} />
              <Stack.Screen name="PasswordReset" component={PasswordResetScreen} />
            </>
          ) : user?.role === 'provider' ? (
            // PROVIDER STACK
            <>
              <Stack.Screen name="ProviderHome" component={ProviderDashboardScreen} />
              <Stack.Screen name="Chat" component={ChatScreen} />
              <Stack.Screen name="LiveTracking" component={LiveTrackingScreen} />
            </>
          ) : (
            // CUSTOMER MAIN STACK
            <>
              <Stack.Screen name="MainTabs" component={MainTabs} />
              <Stack.Screen name="Processing" component={ProcessingScreen} />
              <Stack.Screen name="Results" component={ResultsScreen} />
              <Stack.Screen name="Tracking" component={TrackingScreen} />
              <Stack.Screen name="LiveTracking" component={LiveTrackingScreen} />
              <Stack.Screen name="Settings" component={SettingsScreen} />
              <Stack.Screen name="Chat" component={ChatScreen} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </PaperProvider>
  );
}
