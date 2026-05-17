/**
 * LiveTrackingScreen.js
 * Uber-style real-time GPS tracking for the customer.
 * Shows provider's live location, animated ETA, arrival celebration.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, StyleSheet, Dimensions, Animated, TouchableOpacity,
  Alert, Platform, Vibration
} from 'react-native';
import { Text, Avatar, IconButton } from 'react-native-paper';
import MapView, { Marker, Polyline, AnimatedRegion } from 'react-native-maps';
import { useNavigation, useRoute } from '@react-navigation/native';
import { io } from 'socket.io-client';
import axios from 'axios';
import * as Animatable from 'react-native-animatable';
import { LinearGradient } from 'expo-linear-gradient';
import useAuthStore from '../store/useAuthStore';

const { width, height } = Dimensions.get('window');
const API_BASE_URL = 'https://emperor-afraid-reformed.ngrok-free.dev/api';
const SOCKET_URL   = 'https://emperor-afraid-reformed.ngrok-free.dev';

// Haversine distance in km
const haversine = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// ETA in minutes at ~30 km/h urban speed
const calcETA = (distKm) => Math.max(1, Math.round((distKm / 30) * 60));

// Color of the polyline based on ETA
const etaColor = (mins) => {
  if (mins <= 5)  return '#22C55E'; // green
  if (mins <= 15) return '#F59E0B'; // yellow
  return '#EF4444';                  // red
};

export default function LiveTrackingScreen() {
  const navigation = useNavigation();
  const route      = useRoute();
  const { token, user } = useAuthStore();

  const { bookingId, customerLat, customerLng, providerName, providerAvatar } = route.params || {};

  // Customer fixed pin (from route params or default Islamabad)
  const custLat = customerLat || 33.6844;
  const custLng = customerLng || 73.0479;

  const mapRef    = useRef(null);
  const socketRef = useRef(null);

  const [booking,        setBooking]        = useState(null);
  const [provLat,        setProvLat]        = useState(33.7200);
  const [provLng,        setProvLng]        = useState(73.0800);
  const [status,         setStatus]         = useState('en-route');  // en-route | arrived | in-progress | completed
  const [etaMins,        setEtaMins]        = useState(null);
  const [distKm,         setDistKm]         = useState(null);
  const [arrivedVisible, setArrivedVisible] = useState(false);
  const [history,        setHistory]        = useState([]);

  // Animations
  const pulseAnim   = useRef(new Animated.Value(1)).current;
  const slideAnim   = useRef(new Animated.Value(300)).current;
  const arrivalAnim = useRef(new Animated.Value(0)).current;

  // Pulse the provider pin
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.3, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1.0, duration: 700, useNativeDriver: true }),
      ])
    ).start();

    // Slide bottom card up
    Animated.spring(slideAnim, { toValue: 0, tension: 60, friction: 10, useNativeDriver: true }).start();
  }, []);

  // Fetch booking once
  useEffect(() => {
    if (!bookingId || !token) return;
    axios.get(`${API_BASE_URL}/booking/${bookingId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => { if (r.data.success) setBooking(r.data.data); })
      .catch(() => {});

    // Fetch event history
    axios.get(`${API_BASE_URL}/booking/${bookingId}/history`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => { if (r.data.success) setHistory(r.data.data); })
      .catch(() => {});
  }, [bookingId, token]);

  // Calculate ETA whenever provider location changes
  useEffect(() => {
    const d = haversine(provLat, provLng, custLat, custLng);
    setDistKm(d.toFixed(2));
    setEtaMins(calcETA(d));
  }, [provLat, provLng]);

  // Socket.io — subscribe to provider location and arrival events
  useEffect(() => {
    if (!bookingId) return;

    const socket = io(SOCKET_URL, { transports: ['websocket'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join_booking_room', { bookingId });
    });

    socket.on('provider_location_update', ({ latitude, longitude }) => {
      setProvLat(latitude);
      setProvLng(longitude);

      // Smoothly move map to show both pins
      mapRef.current?.animateToRegion({
        latitude:      (latitude + custLat) / 2,
        longitude:     (longitude + custLng) / 2,
        latitudeDelta:  Math.abs(latitude - custLat) * 2.5 + 0.01,
        longitudeDelta: Math.abs(longitude - custLng) * 2.5 + 0.01,
      }, 800);
    });

    socket.on('provider_arrived', () => {
      setStatus('arrived');
      setEtaMins(0);
      triggerArrival();
    });

    socket.on('booking_status_change', ({ status: s }) => {
      setStatus(s);
    });

    // Simulate movement in dev mode if no real socket data after 3s
    const devTimer = setTimeout(() => {
      if (!socketRef.current?.connected) simulateMovement();
    }, 3000);

    return () => {
      socket.disconnect();
      clearTimeout(devTimer);
    };
  }, [bookingId]);

  // Dev simulation: move provider toward customer
  const simStep = useRef(0);
  const simulateMovement = useCallback(() => {
    const steps = 20;
    const startLat = 33.7200, startLng = 73.0800;
    const interval = setInterval(() => {
      simStep.current += 1;
      const progress = simStep.current / steps;
      const lat = startLat + (custLat - startLat) * progress;
      const lng = startLng + (custLng - startLng) * progress;
      setProvLat(lat);
      setProvLng(lng);
      if (simStep.current >= steps) {
        clearInterval(interval);
        triggerArrival();
      }
    }, 1500);
    return interval;
  }, [custLat, custLng]);

  const triggerArrival = () => {
    setStatus('arrived');
    setArrivedVisible(true);
    Vibration.vibrate([0, 400, 200, 400]);
    Animated.spring(arrivalAnim, { toValue: 1, tension: 50, friction: 8, useNativeDriver: true }).start();
  };

  // ── UI ──────────────────────────────────────────────────────────────────────

  const isArrived  = status === 'arrived';
  const polyColor  = etaMins !== null ? etaColor(etaMins) : '#6366F1';
  const pName      = providerName || booking?.providerName || 'Provider';
  const pAvatar    = providerAvatar || booking?.providerAvatar || null;

  return (
    <View style={styles.container}>

      {/* ── MAP ── */}
      <MapView
        ref={mapRef}
        style={styles.map}
        customMapStyle={DARK_MAP_STYLE}
        initialRegion={{
          latitude:      (provLat + custLat) / 2,
          longitude:     (provLng + custLng) / 2,
          latitudeDelta:  0.06,
          longitudeDelta: 0.06,
        }}
        showsUserLocation={false}
        showsCompass={false}
        toolbarEnabled={false}
      >
        {/* Route polyline */}
        <Polyline
          coordinates={[
            { latitude: provLat, longitude: provLng },
            { latitude: custLat, longitude: custLng },
          ]}
          strokeColor={polyColor}
          strokeWidth={4}
          lineDashPattern={isArrived ? undefined : [12, 6]}
        />

        {/* Provider animated pin */}
        <Marker coordinate={{ latitude: provLat, longitude: provLng }} anchor={{ x: 0.5, y: 0.5 }}>
          <Animated.View style={[styles.providerPin, { transform: [{ scale: pulseAnim }] }]}>
            <LinearGradient colors={['#6366F1', '#8B5CF6']} style={styles.providerPinGrad}>
              <Text style={styles.providerPinIcon}>🔧</Text>
            </LinearGradient>
            <View style={styles.providerPinLabel}>
              <Text style={styles.providerPinName}>{pName.split(' ')[0]}</Text>
            </View>
          </Animated.View>
        </Marker>

        {/* Customer home pin */}
        <Marker coordinate={{ latitude: custLat, longitude: custLng }} anchor={{ x: 0.5, y: 1 }}>
          <View style={styles.homePin}>
            <Text style={styles.homePinIcon}>🏠</Text>
            <View style={styles.homePinRing} />
          </View>
        </Marker>
      </MapView>

      {/* ── HEADER OVERLAY ── */}
      <View style={styles.headerOverlay}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerTitle}>
          <Text style={styles.headerTitleText}>Live Tracking</Text>
          <View style={[styles.statusDot, { backgroundColor: isArrived ? '#22C55E' : '#6366F1' }]} />
        </View>
      </View>

      {/* ── ARRIVAL CELEBRATION OVERLAY ── */}
      {arrivedVisible && (
        <Animated.View style={[styles.arrivalOverlay, { opacity: arrivalAnim, transform: [{ scale: arrivalAnim }] }]}>
          <Animatable.Text animation="bounceIn" style={styles.arrivalEmoji}>🎉</Animatable.Text>
          <Text style={styles.arrivalTitle}>Provider Has Arrived!</Text>
          <Text style={styles.arrivalSub}>{pName} is at your doorstep</Text>
          <TouchableOpacity
            style={styles.arrivalBtn}
            onPress={() => setArrivedVisible(false)}
          >
            <Text style={styles.arrivalBtnText}>Dismiss</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* ── BOTTOM CARD ── */}
      <Animated.View style={[styles.bottomCard, { transform: [{ translateY: slideAnim }] }]}>
        <LinearGradient colors={['#0F172A', '#1E293B']} style={styles.bottomCardGrad}>

          {/* Provider row */}
          <View style={styles.providerRow}>
            {pAvatar
              ? <Avatar.Image size={52} source={{ uri: pAvatar }} />
              : <Avatar.Text size={52} label={pName.charAt(0).toUpperCase()} style={{ backgroundColor: '#6366F1' }} />
            }
            <View style={styles.providerInfo}>
              <Text style={styles.providerNameText}>{pName}</Text>
              <Text style={styles.providerSubText}>
                {booking?.service_type || 'Service'} Professional
              </Text>
              {booking?.providerRating && (
                <Text style={styles.ratingText}>⭐ {booking.providerRating}</Text>
              )}
            </View>
            <View style={styles.etaBubble}>
              {isArrived ? (
                <>
                  <Text style={styles.etaNumber}>✅</Text>
                  <Text style={styles.etaLabel}>Arrived</Text>
                </>
              ) : (
                <>
                  <Text style={styles.etaNumber}>{etaMins ?? '—'}</Text>
                  <Text style={styles.etaLabel}>min away</Text>
                </>
              )}
            </View>
          </View>

          {/* Status bar */}
          <View style={styles.statusBar}>
            {['accepted', 'en-route', 'arrived', 'in-progress', 'completed'].map((s, i) => (
              <React.Fragment key={s}>
                <View style={[
                  styles.statusNode,
                  { backgroundColor: isStatusPassed(status, s) ? '#6366F1' : '#334155' }
                ]}>
                  <Text style={styles.statusNodeText}>{statusEmoji(s)}</Text>
                </View>
                {i < 4 && (
                  <View style={[
                    styles.statusLine,
                    { backgroundColor: isStatusPassed(status, s) ? '#6366F1' : '#334155' }
                  ]} />
                )}
              </React.Fragment>
            ))}
          </View>
          <Text style={styles.statusLabel}>{statusLabel(status)}</Text>

          {/* Distance info */}
          {!isArrived && distKm && (
            <View style={styles.distRow}>
              <Text style={styles.distText}>📍 {distKm} km away</Text>
              <View style={[styles.etaTag, { backgroundColor: polyColor + '33', borderColor: polyColor }]}>
                <Text style={[styles.etaTagText, { color: polyColor }]}>
                  ~{etaMins} min ETA
                </Text>
              </View>
            </View>
          )}

          {/* Action buttons */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => navigation.navigate('Chat', { bookingId, partnerName: pName })}
            >
              <Text style={styles.actionBtnIcon}>💬</Text>
              <Text style={styles.actionBtnLabel}>Chat</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={() => Alert.alert('📞 Call Provider', 'Calling ' + pName + '...')}>
              <Text style={styles.actionBtnIcon}>📞</Text>
              <Text style={styles.actionBtnLabel}>Call</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('BookingsTab')}>
              <Text style={styles.actionBtnIcon}>📋</Text>
              <Text style={styles.actionBtnLabel}>Booking</Text>
            </TouchableOpacity>
          </View>

        </LinearGradient>
      </Animated.View>
    </View>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const STATUS_ORDER = ['accepted', 'en-route', 'arrived', 'in-progress', 'completed'];

function isStatusPassed(current, check) {
  return STATUS_ORDER.indexOf(current) >= STATUS_ORDER.indexOf(check);
}

function statusEmoji(s) {
  const map = { accepted: '✅', 'en-route': '🚗', arrived: '📍', 'in-progress': '🔧', completed: '🎉' };
  return map[s] || '⏳';
}

function statusLabel(s) {
  const map = {
    accepted:      '✅ Booking Confirmed — Provider is preparing',
    'en-route':    '🚗 Provider is on the way to your home',
    arrived:       '📍 Provider has arrived at your doorstep!',
    'in-progress': '🔧 Work in progress',
    completed:     '🎉 Service completed successfully!',
  };
  return map[s] || '⏳ Waiting...';
}

// ── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: '#0F172A' },
  map:              { flex: 1 },

  headerOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingHorizontal: 16, paddingBottom: 12,
    backgroundColor: 'rgba(15,23,42,0.7)',
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(99,102,241,0.25)',
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  backBtnText:  { color: '#fff', fontSize: 24, marginTop: -2 },
  headerTitle:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitleText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  statusDot: { width: 8, height: 8, borderRadius: 4 },

  // Provider pin
  providerPin:     { alignItems: 'center' },
  providerPinGrad: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', elevation: 6 },
  providerPinIcon: { fontSize: 22 },
  providerPinLabel: {
    marginTop: 2, backgroundColor: '#6366F1', borderRadius: 8,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  providerPinName:  { color: '#fff', fontSize: 9, fontWeight: '700' },

  // Home pin
  homePin:     { alignItems: 'center' },
  homePinIcon: { fontSize: 32 },
  homePinRing: {
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: '#22C55E44', borderWidth: 2, borderColor: '#22C55E',
    marginTop: 2,
  },

  // Arrival celebration
  arrivalOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(15,23,42,0.92)',
    alignItems: 'center', justifyContent: 'center', zIndex: 100,
  },
  arrivalEmoji: { fontSize: 80, marginBottom: 12 },
  arrivalTitle: { color: '#fff', fontSize: 28, fontWeight: '800', marginBottom: 6 },
  arrivalSub:   { color: '#94A3B8', fontSize: 15, marginBottom: 28 },
  arrivalBtn: {
    backgroundColor: '#6366F1', paddingVertical: 14, paddingHorizontal: 40,
    borderRadius: 28,
  },
  arrivalBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },

  // Bottom card
  bottomCard:     { position: 'absolute', bottom: 0, left: 0, right: 0 },
  bottomCardGrad: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36 },

  providerRow:   { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  providerInfo:  { flex: 1, marginLeft: 14 },
  providerNameText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  providerSubText:  { color: '#94A3B8', fontSize: 13, marginTop: 2 },
  ratingText:       { color: '#FCD34D', fontSize: 12, marginTop: 2 },

  etaBubble: {
    alignItems: 'center', backgroundColor: '#1E293B',
    borderRadius: 14, padding: 10, borderWidth: 1, borderColor: '#334155', minWidth: 60,
  },
  etaNumber: { color: '#fff', fontSize: 22, fontWeight: '800' },
  etaLabel:  { color: '#64748B', fontSize: 11, marginTop: 2 },

  // Status progress bar
  statusBar:  { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  statusNode: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  statusNodeText: { fontSize: 14 },
  statusLine: { flex: 1, height: 3, marginHorizontal: 2 },
  statusLabel: { color: '#94A3B8', fontSize: 12, textAlign: 'center', marginBottom: 10 },

  distRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  distText: { color: '#64748B', fontSize: 13 },
  etaTag: {
    borderWidth: 1, borderRadius: 20, paddingVertical: 4, paddingHorizontal: 12,
  },
  etaTagText: { fontWeight: '700', fontSize: 13 },

  actionRow: { flexDirection: 'row', justifyContent: 'space-around' },
  actionBtn: { alignItems: 'center', gap: 4 },
  actionBtnIcon:  { fontSize: 26 },
  actionBtnLabel: { color: '#94A3B8', fontSize: 11, fontWeight: '600' },
});

// ── Google Maps Dark Style (Uber-like) ────────────────────────────────────────
const DARK_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#0f172a' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0f172a' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#94a3b8' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1e293b' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#334155' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#334155' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#475569' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#1e293b' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#475569' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#172033' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#475569' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#1e293b' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#334155' }] },
  { featureType: 'administrative.country', elementType: 'labels.text.fill', stylers: [{ color: '#64748b' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#94a3b8' }] },
];
