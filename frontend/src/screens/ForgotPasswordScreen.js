import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Dimensions, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Text, TextInput, Button, IconButton } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import * as Animatable from 'react-native-animatable';
import useSettingsStore from '../store/useSettingsStore';
import { getTheme } from '../utils/themeColors';

import { t } from '../utils/i18n';
import { auth } from '../config/firebase';
import { sendPasswordResetEmail } from 'firebase/auth';

const { width } = Dimensions.get('window');

const ForgotPasswordScreen = () => {
  const navigation = useNavigation();
  const { theme, language } = useSettingsStore();
  const colors = getTheme(theme);
  
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSendReset = async () => {
    setError('');
    setSuccess('');

    if (!email) {
      setError('Please enter your registered email');
      return;
    }

    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email.trim().toLowerCase());
      setLoading(false);
      setSuccess('Reset link sent! Please check your inbox.');
      
      Alert.alert(
        'Email Sent Successfully',
        'We have sent a secure password reset link to your email. Please click that link to set a new password.',
        [{ text: 'Got it!', onPress: () => navigation.goBack() }]
      );
    } catch (err) {
      setLoading(false);
      let message = 'Failed to send reset email';
      if (err.code === 'auth/invalid-email') message = 'Invalid email format';
      if (err.code === 'auth/user-not-found') message = 'No account found with this email';
      setError(message);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <IconButton icon="arrow-left" size={28} iconColor={colors.text} onPress={() => navigation.goBack()} />
        <Text style={[styles.headerTitle, { color: colors.text }]}>Reset Password</Text>
      </View>

      <Animatable.View animation="fadeInUp" style={styles.content}>
        <View style={styles.iconBox}>
           <Animatable.View animation="pulse" iterationCount="infinite" duration={3000}>
              <IconButton icon="shield-key-outline" size={100} iconColor={colors.primary} />
           </Animatable.View>
           <Text style={[styles.title, { color: colors.text }]}>Security Check</Text>
           <Text style={[styles.subtitle, { color: colors.subtext }]}>
             Enter your registered email below. We will send you a secure encryption link to reset your account credentials safely.
           </Text>
        </View>

        {error ? (
          <Animatable.View animation="shake" style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </Animatable.View>
        ) : null}

        {success ? (
          <Animatable.View animation="pulse" style={styles.successBanner}>
            <Text style={styles.successText}>{success}</Text>
          </Animatable.View>
        ) : null}

        <View style={styles.inputWrapper}>
          <TextInput
            label="Registered Email Address"
            value={email}
            onChangeText={setEmail}
            mode="outlined"
            placeholder="example@email.com"
            style={[styles.input, { borderRadius: 16 }]}
            outlineColor={colors.border}
            activeOutlineColor={colors.primary}
            textColor={colors.text}
            keyboardType="email-address"
            autoCapitalize="none"
            left={<TextInput.Icon icon="email-lock" iconColor={colors.primary} />}
          />
        </View>

        <Button 
          mode="contained" 
          onPress={handleSendReset} 
          loading={loading}
          disabled={loading}
          style={[styles.button, { backgroundColor: colors.primary }]}
          contentStyle={{ height: 60 }}
          labelStyle={{ fontWeight: 'bold', fontSize: 16, letterSpacing: 1 }}
        >
          Send Reset Link
        </Button>

        <TouchableOpacity 
          style={styles.backToLogin} 
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={[styles.backToLoginText, { color: colors.primary }]}>Back to Login</Text>
        </TouchableOpacity>
      </Animatable.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 50,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 24,
  },
  iconBox: {
    alignItems: 'center',
    marginBottom: 40,
    marginTop: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 10,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  inputWrapper: {
    marginBottom: 30,
  },
  input: {
    backgroundColor: 'transparent',
  },
  button: {
    borderRadius: 16,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  backToLogin: {
    alignItems: 'center',
    marginTop: 40,
  },
  backToLoginText: {
    fontWeight: 'bold',
    fontSize: 15,
  },
  errorBanner: {
    backgroundColor: '#FEE2E2',
    padding: 15,
    borderRadius: 14,
    marginBottom: 25,
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  successBanner: {
    backgroundColor: '#D1FAE5',
    padding: 15,
    borderRadius: 14,
    marginBottom: 25,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  successText: {
    color: '#047857',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  }
});

export default ForgotPasswordScreen;
