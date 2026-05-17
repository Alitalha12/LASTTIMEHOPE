import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Dimensions, Keyboard, Alert, TextInput } from 'react-native';
import { Text, Button, IconButton } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as Animatable from 'react-native-animatable';
import useSettingsStore from '../store/useSettingsStore';
import { getTheme } from '../utils/themeColors';
import useAuthStore from '../store/useAuthStore';
import ProcessingOverlay from '../components/ProcessingOverlay';

const { width } = Dimensions.get('window');

const OtpVerificationScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { method, target } = route.params || { method: 'email', target: 'user@example.com' };
  
  const { theme } = useSettingsStore();
  const colors = getTheme(theme);
  const verifyOtp = useAuthStore(state => state.verifyOtp);
  const sendOtp = useAuthStore(state => state.sendOtp);
  
  const [otp, setOtp] = useState(['', '', '', '', '', '']); // 6 digits
  const [timer, setTimer] = useState(600); // 10 minutes
  const [resendTimer, setResendTimer] = useState(30); 
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  
  const inputRefs = [useRef(), useRef(), useRef(), useRef(), useRef(), useRef()];

  useEffect(() => {
    const interval = setInterval(() => {
      setTimer(prev => (prev > 0 ? prev - 1 : 0));
      setResendTimer(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleOtpChange = (value, index) => {
    setError('');
    if (value.length > 1) {
      value = value.charAt(value.length - 1);
    }
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs[index + 1].current.focus();
    }
    
    // Final check
    if (newOtp.every(digit => digit !== '') && index === 5) {
      Keyboard.dismiss();
      handleVerify(newOtp.join(''));
    }
  };

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs[index - 1].current.focus();
    }
  };

  const handleVerify = async (code) => {
    setVerifying(true);
    const result = await verifyOtp(target, code, method);
    setVerifying(false);

    if (result.success) {
      navigation.navigate('ResetPassword', { resetToken: result.resetToken });
    } else {
      setError(result.message || 'Invalid OTP code');
      setOtp(['', '', '', '', '', '']);
      inputRefs[0].current.focus();
    }
  };

  const handleResend = async () => {
    if (resendTimer > 0) return;
    setError('');
    const result = await sendOtp(target, method);
    if (result.success) {
      setResendTimer(30);
      setTimer(600);
      Alert.alert('OTP Resent', `A new code has been sent to your ${method}.`);
    } else {
      setError('Failed to resend code');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <IconButton icon="arrow-left" size={28} iconColor={colors.text} onPress={() => navigation.goBack()} />
        <Text style={[styles.headerTitle, { color: colors.text }]}>Verification</Text>
      </View>

      <Animatable.View animation="fadeInUp" style={styles.content}>
        <View style={styles.iconBox}>
           <Animatable.View animation="pulse" iterationCount="infinite" duration={2000}>
             <IconButton icon={method === 'email' ? "email-check" : "whatsapp"} size={60} iconColor={colors.primary} />
           </Animatable.View>
           <Text style={[styles.title, { color: colors.text }]}>Enter Code</Text>
           <Text style={[styles.subtitle, { color: colors.subtext }]}>
             We've sent a 6-digit verification code to {method === 'email' ? 'your email' : 'WhatsApp'} 
             {'\n'}<Text style={{ color: colors.primary, fontWeight: 'bold' }}>{target}</Text>
           </Text>
        </View>

        {error ? (
          <Animatable.View animation="shake" style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </Animatable.View>
        ) : null}

        {/* OTP INPUTS */}
        <View style={styles.otpRow}>
          {otp.map((digit, index) => (
            <Animatable.View 
              key={index} 
              animation="bounceIn" 
              delay={index * 50}
              style={[styles.otpBox, { borderColor: digit ? colors.primary : colors.border, backgroundColor: colors.card }]}
            >
              <TextInput
                ref={inputRefs[index]}
                value={digit}
                onChangeText={(val) => handleOtpChange(val, index)}
                onKeyPress={(e) => handleKeyPress(e, index)}
                keyboardType="numeric"
                maxLength={1}
                style={[styles.otpInput, { color: colors.text }]}
                placeholderTextColor={colors.subtext}
                autoFocus={index === 0}
              />
            </Animatable.View>
          ))}
        </View>

        <View style={styles.timerRow}>
           <View style={styles.timerItem}>
              <Text style={[styles.timerLabel, { color: colors.subtext }]}>Code Expires in:</Text>
              <Text style={[styles.timerValue, { color: timer < 30 ? '#EF4444' : colors.primary }]}>{formatTime(timer)}</Text>
           </View>
        </View>

        <View style={styles.actionRow}>
           <Button 
             mode="text" 
             onPress={handleResend} 
             disabled={resendTimer > 0}
             textColor={resendTimer > 0 ? colors.subtext : colors.primary}
           >
             Resend Code {resendTimer > 0 ? `(${resendTimer}s)` : ''}
           </Button>
        </View>

        <Button 
          mode="contained" 
          onPress={() => handleVerify(otp.join(''))} 
          disabled={otp.some(d => !d) || verifying}
          style={[styles.verifyButton, { backgroundColor: colors.primary }]}
          contentStyle={{ height: 55 }}
        >
          Verify & Continue
        </Button>
      </Animatable.View>

      <ProcessingOverlay 
        visible={verifying} 
        message="Verifying OTP..." 
      />
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
    alignItems: 'center',
  },
  iconBox: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 10,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 22,
  },
  errorBanner: {
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#EF4444',
    width: '100%',
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 5,
    marginBottom: 40,
  },
  otpBox: {
    width: 45,
    height: 55,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  otpInput: {
    width: '100%',
    height: '100%',
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  timerRow: {
    marginBottom: 30,
    alignItems: 'center',
  },
  timerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.03)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 12,
  },
  timerLabel: {
    fontSize: 12,
    marginRight: 8,
  },
  timerValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  actionRow: {
    marginBottom: 30,
  },
  verifyButton: {
    width: '100%',
    borderRadius: 14,
    elevation: 4,
  }
});

export default OtpVerificationScreen;
