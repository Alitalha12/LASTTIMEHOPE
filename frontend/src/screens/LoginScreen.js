import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Image, Dimensions, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, TextInput, Button } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import * as Animatable from 'react-native-animatable';

import useAuthStore from '../store/useAuthStore';
import useSettingsStore from '../store/useSettingsStore';
import { getTheme } from '../utils/themeColors';
import { t } from '../utils/i18n';
import ProcessingOverlay from '../components/ProcessingOverlay';

const { width } = Dimensions.get('window');

const LoginScreen = () => {
  const navigation = useNavigation();
  const login = useAuthStore(state => state.login);
  const { theme, language } = useSettingsStore();
  const colors = getTheme(theme);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [errors, setErrors] = useState({
    email: '',
    password: '',
    general: ''
  });

  // Auto-hide validation errors after 4 seconds
  useEffect(() => {
    const hasErrors = Object.values(errors).some(err => err !== '');
    if (hasErrors) {
      const timer = setTimeout(() => {
        setErrors({
          email: '',
          password: '',
          general: ''
        });
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [errors]);

  const handleLogin = async () => {
    // Reset validations
    const newErrors = { email: '', password: '', general: '' };
    let hasValidationError = false;

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      newErrors.email = 'Email is required';
      hasValidationError = true;
    } else if (!emailRegex.test(email.trim())) {
      newErrors.email = 'Invalid email structure';
      hasValidationError = true;
    }

    // Validate password
    if (!password) {
      newErrors.password = 'Password is required';
      hasValidationError = true;
    }

    if (hasValidationError) {
      setErrors(newErrors);
      return;
    }
    
    setLoading(true);
    // Call Firebase Auth authentication
    const result = await login(email.trim(), password);
    setLoading(false);
    
    if (result.success) {
      if (result.role === 'provider') {
        navigation.replace('ProviderHome');
      } else {
        navigation.replace('MainTabs');
      }
    } else {
      setErrors(prev => ({ 
        ...prev, 
        general: result.message || 'Invalid email or password. Please check your credentials.' 
      }));
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View style={styles.content}>
        <Animatable.View 
            animation="bounceIn" 
            duration={1500} 
            style={styles.logoContainer}
        >
          <Image 
            source={require('../../assets/kaamkonnect_logo.png')} 
            style={styles.logo} 
            resizeMode="contain"
          />
          <Text style={[styles.brandName, { color: colors.text }]}>KaamKonnect</Text>
          <Text style={[styles.brandTagline, { color: colors.subtext }]}>{t('orchestrating', language)}</Text>
        </Animatable.View>

        {errors.general ? (
          <Animatable.View animation="shake" style={styles.errorBanner}>
            <Text style={styles.errorText}>{errors.general}</Text>
          </Animatable.View>
        ) : null}

        <Animatable.View animation="fadeInUp" delay={500} style={[styles.form, { backgroundColor: colors.card, borderColor: colors.border }]}>
          
          {/* Email input field */}
          <View style={styles.fieldWrapper}>
            <TextInput
              label={t('email_placeholder', language)}
              value={email}
              onChangeText={setEmail}
              mode="outlined"
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.input}
              outlineColor={errors.email ? '#EF4444' : colors.border}
              activeOutlineColor={errors.email ? '#EF4444' : colors.primary}
              textColor={colors.text}
              left={<TextInput.Icon icon="email-outline" color={colors.subtext} />}
            />
            {errors.email ? <Text style={styles.inlineError}>{errors.email}</Text> : null}
          </View>

          {/* Password input field */}
          <View style={styles.fieldWrapper}>
            <TextInput
              label={t('password_placeholder', language)}
              value={password}
              onChangeText={setPassword}
              mode="outlined"
              secureTextEntry
              style={styles.input}
              outlineColor={errors.password ? '#EF4444' : colors.border}
              activeOutlineColor={errors.password ? '#EF4444' : colors.primary}
              textColor={colors.text}
              left={<TextInput.Icon icon="lock-outline" color={colors.subtext} />}
            />
            {errors.password ? <Text style={styles.inlineError}>{errors.password}</Text> : null}
          </View>

          <TouchableOpacity style={styles.forgotPass} onPress={() => navigation.navigate('ForgotPassword')}>
             <Text style={[styles.forgotText, { color: colors.primary }]}>{t('forgot_password', language)}</Text>
          </TouchableOpacity>

          <Button 
            mode="contained" 
            onPress={handleLogin} 
            loading={loading}
            style={[styles.loginButton, { backgroundColor: colors.primary }]}
            contentStyle={{ height: 55 }}
            labelStyle={{ fontSize: 16, fontWeight: 'bold' }}
          >
            {t('login_btn', language)}
          </Button>

          <View style={styles.signupPrompt}>
            <Text style={[styles.promptText, { color: colors.subtext }]}>{t('already_account', language).split('?')[0]}? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
              <Text style={[styles.signupText, { color: colors.primary }]}>{t('signup_btn', language)}</Text>
            </TouchableOpacity>
          </View>
        </Animatable.View>
      </View>

      {/* Frosted custom staggered bubbles overlay */}
      <ProcessingOverlay 
        visible={loading} 
        message={t('verifying_user', language) || "User Verification in Progress..."} 
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 35,
  },
  logo: {
    width: 90,
    height: 90,
  },
  brandName: {
    fontSize: 26,
    fontWeight: 'bold',
    marginTop: 10,
    letterSpacing: 0.8,
  },
  brandTagline: {
    fontSize: 13,
    marginTop: 5,
  },
  errorBanner: {
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  form: {
    borderRadius: 30,
    padding: 25,
    elevation: 8,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
  },
  fieldWrapper: {
    marginBottom: 15,
  },
  input: {
    backgroundColor: 'transparent',
    borderRadius: 16,
    overflow: 'hidden'
  },
  inlineError: {
    color: '#EF4444',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
    marginLeft: 4,
  },
  forgotPass: {
    alignSelf: 'flex-end',
    marginBottom: 25,
  },
  forgotText: {
    fontSize: 13,
    fontWeight: '600',
  },
  loginButton: {
    borderRadius: 18,
    elevation: 4,
  },
  signupPrompt: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 25,
  },
  promptText: {
    fontSize: 14,
  },
  signupText: {
    fontSize: 14,
    fontWeight: 'bold',
  }
});

export default LoginScreen;
