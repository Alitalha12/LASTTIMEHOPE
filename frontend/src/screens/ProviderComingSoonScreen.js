import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Text, Button, IconButton } from 'react-native-paper';
import * as Animatable from 'react-native-animatable';
import { LinearGradient } from 'expo-linear-gradient';
import useAuthStore from '../store/useAuthStore';
import useSettingsStore from '../store/useSettingsStore';
import { getTheme } from '../utils/themeColors';

const { width } = Dimensions.get('window');

const ProviderComingSoonScreen = () => {
  const logout = useAuthStore(state => state.logout);
  const { theme } = useSettingsStore();
  const colors = getTheme(theme);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient colors={['#1E3A5F', '#0F1B2D']} style={styles.gradient}>
        <Animatable.View animation="bounceIn" duration={1500} style={styles.iconWrap}>
          <IconButton icon="hard-hat" size={80} iconColor="#FFD700" />
        </Animatable.View>

        <Animatable.Text animation="fadeInUp" delay={400} style={styles.title}>
          Provider Portal
        </Animatable.Text>

        <Animatable.Text animation="fadeInUp" delay={600} style={styles.subtitle}>
          🚧 Feature Coming Soon! 🚧
        </Animatable.Text>

        <Animatable.Text animation="fadeInUp" delay={800} style={styles.desc}>
          We're building an amazing dashboard for service providers. You'll be able to manage jobs, view earnings, and connect with customers — all powered by AI.
        </Animatable.Text>

        <Animatable.View animation="fadeInUp" delay={1000}>
          <Button
            mode="contained"
            onPress={logout}
            style={styles.logoutBtn}
            labelStyle={{ fontWeight: 'bold', fontSize: 16 }}
            buttonColor="#EF4444"
          >
            Logout
          </Button>
        </Animatable.View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  gradient: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 },
  iconWrap: {
    width: 140, height: 140, borderRadius: 70,
    backgroundColor: 'rgba(255,215,0,0.1)',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 30, borderWidth: 2, borderColor: 'rgba(255,215,0,0.3)'
  },
  title: { fontSize: 32, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 10 },
  subtitle: { fontSize: 20, fontWeight: '600', color: '#FFD700', marginBottom: 20 },
  desc: { fontSize: 15, color: 'rgba(255,255,255,0.7)', textAlign: 'center', lineHeight: 22, marginBottom: 40, paddingHorizontal: 10 },
  logoutBtn: { borderRadius: 16, paddingHorizontal: 40, elevation: 4 },
});

export default ProviderComingSoonScreen;
