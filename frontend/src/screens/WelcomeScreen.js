import React from 'react';
import { View, StyleSheet, Image, Dimensions, TouchableOpacity } from 'react-native';
import { Text, Button, useTheme } from 'react-native-paper';
import * as Animatable from 'react-native-animatable';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';

import { t } from '../utils/i18n';
import useSettingsStore from '../store/useSettingsStore';

const { width, height } = Dimensions.get('window');

const WelcomeScreen = () => {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const { language } = useSettingsStore();

  return (
    <View style={[styles.container, { backgroundColor: '#F8FAFC' }]}>
      {/* Premium Ambient Background Light */}
      <View style={styles.ambientLight} />

      <Animatable.View animation="fadeInDown" duration={1200} style={styles.topSection}>
        <View style={styles.illustrationWrapper}>
          <Image 
            source={require('../../assets/welcome_man.png')} 
            style={styles.illustration}
            resizeMode="contain"
          />
          {/* Frosted highlight accent */}
          <LinearGradient
            colors={['rgba(255,255,255,0.4)', 'rgba(255,255,255,0)']}
            style={styles.glassShine}
          />
        </View>
      </Animatable.View>

      <Animatable.View animation="fadeInUp" delay={400} duration={1000} style={styles.bottomSection}>
        <View style={[styles.premiumCard, { backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' }]}>
          <View style={styles.contentWrapper}>
            <Text style={styles.title}>{t('welcome_title', language)}</Text>
            <Text style={styles.subtitle}>
              {t('welcome_subtitle', language)}
            </Text>
            
            <View style={styles.dividerLine} />
            
            <View style={styles.guideWrapper}>
              <View style={styles.guideItem}>
                <LinearGradient
                  colors={['#3B82F6', '#2563EB']}
                  style={styles.bulletDot}
                />
                <Text style={styles.guideText}>{t('agentic_automation', language)}</Text>
              </View>
              <View style={styles.guideItem}>
                <LinearGradient
                  colors={['#10B981', '#059669']}
                  style={styles.bulletDot}
                />
                <Text style={styles.guideText}>{t('location_matching', language)}</Text>
              </View>
              <View style={styles.guideItem}>
                <LinearGradient
                  colors={['#6366F1', '#4F46E5']}
                  style={styles.bulletDot}
                />
                <Text style={styles.guideText}>{t('secure_execution', language)}</Text>
              </View>
            </View>
          </View>

          <View style={styles.buttonWrapper}>
            <TouchableOpacity 
              activeOpacity={0.8}
              onPress={() => navigation.navigate('Signup')}
              style={styles.primaryButtonTouch}
            >
              <LinearGradient
                colors={['#2563EB', '#1D4ED8']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.primaryButtonGradient}
              >
                <Text style={styles.primaryButtonText}>
                  {t('create_account', language)}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
            
            <TouchableOpacity 
              onPress={() => navigation.navigate('Login')}
              style={styles.secondaryButton}
              activeOpacity={0.6}
            >
              <Text style={styles.secondaryButtonText}>
                {t('already_account', language)}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animatable.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  ambientLight: {
    position: 'absolute',
    top: -height * 0.1,
    left: width * 0.1,
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: (width * 0.8) / 2,
    backgroundColor: '#DBEAFE',
    opacity: 0.6,
  },
  topSection: {
    height: height * 0.42,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    paddingTop: 30,
  },
  illustrationWrapper: {
    width: width * 0.72,
    height: width * 0.72,
    borderRadius: (width * 0.72) / 2,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  illustration: {
    width: '100%',
    height: '100%',
  },
  glassShine: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '50%',
  },
  bottomSection: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 25,
  },
  premiumCard: {
    flex: 1,
    borderRadius: 32,
    borderWidth: 1.2,
    padding: 24,
    justifyContent: 'space-between',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.08,
    shadowRadius: 30,
    elevation: 6,
  },
  contentWrapper: {
    marginTop: 5,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#0F172A',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 22,
  },
  dividerLine: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 20,
    width: '80%',
    alignSelf: 'center',
  },
  guideWrapper: {
    marginTop: 5,
  },
  guideItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  bulletDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 14,
  },
  guideText: {
    fontSize: 14,
    color: '#334155',
    fontWeight: '600',
  },
  buttonWrapper: {
    marginBottom: 5,
  },
  primaryButtonTouch: {
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  primaryButtonGradient: {
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  secondaryButton: {
    marginTop: 15,
    alignItems: 'center',
    paddingVertical: 10,
  },
  secondaryButtonText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
  }
});

export default WelcomeScreen;
