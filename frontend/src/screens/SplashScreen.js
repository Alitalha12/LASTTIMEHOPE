import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Image, Dimensions, Animated, Easing } from 'react-native';
import { Text } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import * as Animatable from 'react-native-animatable';
import { LinearGradient } from 'expo-linear-gradient';
import useAuthStore from '../store/useAuthStore';
import useSettingsStore from '../store/useSettingsStore';
import { t } from '../utils/i18n';

const { width, height } = Dimensions.get('window');

const SplashScreen = () => {
  const navigation = useNavigation();
  const { checkAuth, isAuthenticated } = useAuthStore();
  const { language } = useSettingsStore();
  
  // Animation Refs
  const progress = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 1. Start Progress Bar Animation (5 seconds)
    Animated.timing(progress, {
      toValue: 1,
      duration: 5000,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
      useNativeDriver: false,
    }).start();

    // 2. Initial Fade In
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();

    let timeoutId;

    // 3. Logic to redirect after 5s
    const init = async () => {
      try {
        await checkAuth();
      } catch (err) {
        console.warn("Auth check failed in splash:", err);
      }
      
      timeoutId = setTimeout(() => {
        // Read fresh Zustand state directly to avoid stale react hook closure issues
        const freshAuthState = useAuthStore.getState().isAuthenticated;
        if (freshAuthState) {
          navigation.replace('MainTabs');
        } else {
          navigation.replace('Welcome');
        }
      }, 5000);
    };
    init();

    // Cleanup to prevent memory leaks if unmounted before 5 seconds
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  const progressWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.container}>
      {/* BACKGROUND ANIMATION EFFECTS */}
      <View style={StyleSheet.absoluteFill}>
        <LinearGradient
          colors={['#0F172A', '#1E293B', '#0F172A']}
          style={styles.background}
        />
        {/* Floating Glow Orbs */}
        <Animatable.View 
          animation={{
            0: { translateX: -50, translateY: -50, scale: 1 },
            0.5: { translateX: 100, translateY: 150, scale: 1.5 },
            1: { translateX: -50, translateY: -50, scale: 1 }
          }}
          iterationCount="infinite"
          duration={8000}
          style={[styles.orb, { top: '10%', left: '10%', backgroundColor: '#3B82F633' }]} 
        />
        <Animatable.View 
          animation={{
            0: { translateX: 50, translateY: 100, scale: 1.2 },
            0.5: { translateX: -80, translateY: -50, scale: 0.8 },
            1: { translateX: 50, translateY: 100, scale: 1.2 }
          }}
          iterationCount="infinite"
          duration={10000}
          style={[styles.orb, { bottom: '15%', right: '10%', backgroundColor: '#6366F122' }]} 
        />
      </View>

      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        {/* LOGO ANIMATION */}
        <Animatable.View 
          animation="bounceIn" 
          duration={1500} 
          style={styles.logoContainer}
        >
          <View style={styles.logoCircle}>
             <Image 
               source={require('../../assets/kaamkonnect_logo.png')} 
               style={styles.logo} 
               resizeMode="contain"
             />
          </View>
        </Animatable.View>

        {/* APP NAME ANIMATION */}
        <Animatable.View 
          animation="fadeInUp" 
          delay={500}
          duration={1000}
        >
          <Text style={styles.appName}>KaamKonnect</Text>
          <Animatable.Text 
            animation="pulse" 
            iterationCount="infinite" 
            style={styles.tagline}
          >
            {t('orchestrating', language)}
          </Animatable.Text>
        </Animatable.View>
      </Animated.View>

      {/* DYNAMIC PROGRESS BAR */}
      <View style={styles.footer}>
        <View style={styles.progressContainer}>
           <Animated.View style={[styles.progressBar, { width: progressWidth }]}>
              <LinearGradient
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                colors={['#3B82F6', '#6366F1', '#A855F7']}
                style={StyleSheet.absoluteFill}
              />
              {/* Laser Tip Glow */}
              <View style={styles.laserTip} />
           </Animated.View>
        </View>
        <Text style={styles.loadingText}>{t('initializing', language)}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  background: {
    flex: 1,
  },
  orb: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
  },
  content: {
    alignItems: 'center',
    zIndex: 10,
  },
  logoContainer: {
    marginBottom: 20,
  },
  logoCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  logo: {
    width: 90,
    height: 90,
  },
  appName: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: 2,
    textAlign: 'center',
  },
  tagline: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 8,
    textAlign: 'center',
    letterSpacing: 1,
  },
  footer: {
    position: 'absolute',
    bottom: 80,
    width: '80%',
    alignItems: 'center',
  },
  progressContainer: {
    width: '100%',
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 15,
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  laserTip: {
    position: 'absolute',
    right: 0,
    width: 10,
    height: '100%',
    backgroundColor: '#FFFFFF',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 10,
  },
  loadingText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
  }
});

export default SplashScreen;
