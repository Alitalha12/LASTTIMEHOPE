import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Dimensions, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Text, TextInput, Button, IconButton } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as Animatable from 'react-native-animatable';
import useAuthStore from '../store/useAuthStore';
import useSettingsStore from '../store/useSettingsStore';
import { getTheme } from '../utils/themeColors';
import ProcessingOverlay from '../components/ProcessingOverlay';

const { width } = Dimensions.get('window');

const PasswordResetScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { resetToken } = route.params || {};
  
  const resetPassword = useAuthStore(state => state.resetPassword);
  const { theme } = useSettingsStore();
  const colors = getTheme(theme);
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!resetToken) {
       setError("Session expired. Please restart the recovery process.");
    }
  }, [resetToken]);

  const handleUpdate = async () => {
    setError('');
    
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    const result = await resetPassword(resetToken, password);
    setLoading(false);

    if (result.success) {
      Alert.alert('Success', 'Your password has been orchestrated securely.');
      navigation.navigate('Login');
    } else {
      setError(result.message || 'Failed to update password. Session may have expired.');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <IconButton icon="chevron-left" size={30} iconColor={colors.text} onPress={() => navigation.goBack()} />
        <Text style={[styles.headerTitle, { color: colors.text }]}>Reset Password</Text>
      </View>

      <Animatable.View animation="fadeInUp" style={styles.content}>
        <View style={styles.infoBox}>
           <IconButton icon="shield-check" size={40} iconColor={colors.primary} />
           <Text style={[styles.infoTitle, { color: colors.text }]}>Secure Reset</Text>
           <Text style={[styles.infoSub, { color: colors.subtext }]}>Your password will be encrypted using industry-standard hashing algorithms (bcrypt).</Text>
        </View>

        {error ? (
          <Animatable.View animation="shake" style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </Animatable.View>
        ) : null}

        <View style={[styles.form, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TextInput
            label="New Password"
            value={password}
            onChangeText={setPassword}
            mode="outlined"
            secureTextEntry
            style={styles.input}
            outlineColor={colors.border}
            activeOutlineColor={colors.primary}
            textColor={colors.text}
          />

          <TextInput
            label="Confirm New Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            mode="outlined"
            secureTextEntry
            style={styles.input}
            outlineColor={colors.border}
            activeOutlineColor={colors.primary}
            textColor={colors.text}
          />

          <Button 
            mode="contained" 
            onPress={handleUpdate} 
            loading={loading}
            style={[styles.button, { backgroundColor: colors.primary }]}
            contentStyle={{ height: 55 }}
          >
            Update & Encrypt
          </Button>
        </View>
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
    fontSize: 20,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 24,
  },
  infoBox: {
    alignItems: 'center',
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  infoTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 10,
  },
  infoSub: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
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
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    elevation: 4,
  },
  input: {
    marginBottom: 15,
    backgroundColor: 'transparent',
  },
  button: {
    marginTop: 10,
    borderRadius: 14,
  }
});

export default PasswordResetScreen;
