import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView, Dimensions, TouchableOpacity, Linking, Alert } from 'react-native';
import { Text, Card, Avatar, Button, IconButton, ActivityIndicator } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { io } from 'socket.io-client';
import axios from 'axios';
import * as Animatable from 'react-native-animatable';
import useAuthStore from '../store/useAuthStore';
import useSettingsStore from '../store/useSettingsStore';
import { getTheme } from '../utils/themeColors';

const { width, height } = Dimensions.get('window');
const API_BASE_URL = 'https://emperor-afraid-reformed.ngrok-free.dev/api';
const SOCKET_SERVER_URL = 'https://emperor-afraid-reformed.ngrok-free.dev';

const TrackingScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { token } = useAuthStore();
  const { theme: currentThemeName } = useSettingsStore();
  const colors = getTheme(currentThemeName);

  const bookingId = route.params?.bookingId;

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [providerCoords, setProviderCoords] = useState(null);
  const [routePoints, setRoutePoints] = useState([]);
  const [eta, setEta] = useState(15); // Default ETA in minutes
  const [socketConnected, setSocketConnected] = useState(false);

  const socketRef = useRef(null);
  const mapRef = useRef(null);

  // Fetch Booking and Provider details
  useEffect(() => {
    const fetchBookingDetails = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${API_BASE_URL}/booking/${bookingId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.data.success) {
          const bookingData = response.data.data;
          setBooking(bookingData);

          // Seed default coordinates for map region
          const custLat = bookingData.location?.latitude || 33.6844;
          const custLng = bookingData.location?.longitude || 73.0479;
          
          // Provider starts slightly offset (simulating arriving from distance)
          setProviderCoords({
            latitude: custLat + 0.015,
            longitude: custLng + 0.015
          });
        }
      } catch (error) {
        console.error("Error fetching booking details:", error);
        Alert.alert("Error", "Could not load active booking tracking details.");
      } finally {
        setLoading(false);
      }
    };

    if (bookingId) {
      fetchBookingDetails();
    }
  }, [bookingId, token]);

  // Connect to Socket.io for live updates
  useEffect(() => {
    if (!bookingId || !booking) return;

    console.log(`[CUSTOMER TRACK] Connecting to Socket for room: ${bookingId}`);
    socketRef.current = io(SOCKET_SERVER_URL, {
      transports: ['websocket'],
      forceNew: true
    });

    socketRef.current.on('connect', () => {
      setSocketConnected(true);
      console.log(`[CUSTOMER TRACK] Socket connected. Joining room: ${bookingId}`);
      socketRef.current.emit('join-room', bookingId);
    });

    // Listen to real-time coordinate streams emitted by provider
    socketRef.current.on('coordinates-updated', (data) => {
      console.log('[CUSTOMER TRACK] Live Coordinate Stream Received:', data);
      if (data.latitude && data.longitude) {
        setProviderCoords({
          latitude: data.latitude,
          longitude: data.longitude
        });
      }
      if (data.routePoints) {
        // Parse array of {latitude, longitude} points
        setRoutePoints(data.routePoints);
      }
      if (data.durationMinutes !== undefined) {
        setEta(Math.round(data.durationMinutes));
      }
    });

    socketRef.current.on('disconnect', () => {
      setSocketConnected(false);
      console.log('[CUSTOMER TRACK] Socket disconnected.');
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [bookingId, booking]);

  // Fit map markers to view dynamically
  useEffect(() => {
    if (mapRef.current && booking && providerCoords) {
      const custLat = booking.location?.latitude || 33.6844;
      const custLng = booking.location?.longitude || 73.0479;

      mapRef.current.fitToCoordinates([
        { latitude: custLat, longitude: custLng },
        providerCoords
      ], {
        edgePadding: { top: 80, right: 80, bottom: 280, left: 80 },
        animated: true,
      });
    }
  }, [booking, providerCoords]);

  if (loading || !booking) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 12, color: colors.subtext }}>Syncing live telemetry...</Text>
      </View>
    );
  }

  const custLat = booking.location?.latitude || 33.6844;
  const custLng = booking.location?.longitude || 73.0479;

  const trackingSteps = [
    { label: 'Order Confirmed', status: ['confirmed', 'accepted', 'in-progress', 'solved', 'completed'].includes(booking.status) ? 'completed' : 'pending' },
    { label: 'Expert On The Way', status: ['accepted', 'in-progress', 'solved', 'completed'].includes(booking.status) ? (booking.status === 'accepted' ? 'current' : 'completed') : 'pending' },
    { label: 'Work In Progress', status: ['in-progress', 'solved', 'completed'].includes(booking.status) ? (booking.status === 'in-progress' ? 'current' : 'completed') : 'pending' },
    { label: 'Task Resolved', status: ['solved', 'completed'].includes(booking.status) ? 'completed' : 'pending' },
  ];

  return (
    <View style={styles.container}>
      {/* Full Screen Live MapView */}
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{
          latitude: custLat,
          longitude: custLng,
          latitudeDelta: 0.04,
          longitudeDelta: 0.04,
        }}
      >
        {/* Customer Location Marker */}
        <Marker 
          coordinate={{ latitude: custLat, longitude: custLng }}
          title="My Home Address"
          description="Service Destination"
        >
          <View style={styles.userMarkerOuter}>
            <View style={[styles.userMarkerInner, { backgroundColor: colors.primary }]} />
          </View>
        </Marker>

        {/* Live Provider Location Marker */}
        {providerCoords && (
          <Marker 
            coordinate={providerCoords}
            title={booking.providerName}
            description="Expert Location"
          >
            <Animatable.View animation="pulse" iterationCount="infinite" duration={1500} style={styles.provMarkerOuter}>
              <IconButton icon="hammer-screwdriver" iconColor="#FFFFFF" size={18} style={{ margin: 0 }} />
            </Animatable.View>
          </Marker>
        )}

        {/* Traffic-Aware Simulated Route Polyline */}
        {routePoints.length > 0 && (
          <Polyline 
            coordinates={routePoints}
            strokeWidth={4}
            strokeColor={colors.primary}
          />
        )}
      </MapView>

      {/* Floating Status & Header Indicator */}
      <Animatable.View animation="fadeInDown" style={styles.headerBar}>
        <View style={styles.headerRow}>
          <IconButton icon="shield-check" iconColor="#10B981" size={20} style={{ margin: 0 }} />
          <Text style={styles.headerStatusText}>
            SafePay Escrow Secured: Rs. {booking.price || booking.cost || 2500}
          </Text>
        </View>
        <Text style={styles.etaIndicatorText}>
          {booking.status === 'accepted' ? `Arriving in ${eta} minutes` : booking.status === 'in-progress' ? 'Work is currently in progress' : 'Expert has arrived'}
        </Text>
      </Animatable.View>

      {/* Slide-Up Bottom Info Panel */}
      <Animatable.View animation="fadeInUp" duration={800} style={styles.bottomSheet}>
        {/* Step-by-Step Interactive Status Timeline */}
        <View style={styles.timelineRow}>
          {trackingSteps.map((step, idx) => (
            <View key={idx} style={{ flex: 1, alignItems: 'center' }}>
              <View style={[
                styles.timelineDot,
                { backgroundColor: step.status === 'completed' ? '#10B981' : step.status === 'current' ? colors.primary : '#E2E8F0' }
              ]}>
                {step.status === 'completed' ? (
                  <IconButton icon="check" iconColor="#FFF" size={10} style={{ margin: 0 }} />
                ) : step.status === 'current' ? (
                  <View style={styles.currentDotCore} />
                ) : null}
              </View>
              <Text numberOfLines={1} style={[
                styles.timelineLabel,
                { color: step.status === 'pending' ? '#94A3B8' : '#0F172A', fontWeight: step.status === 'current' ? 'bold' : '400' }
              ]}>
                {step.label}
              </Text>
            </View>
          ))}
        </View>

        {/* Specialist Details row */}
        <Card style={styles.providerCard}>
          <Card.Content style={styles.providerCardContent}>
            <Avatar.Image 
              size={50} 
              source={{ uri: `https://ui-avatars.com/api/?name=${encodeURIComponent(booking.providerName || 'Provider')}&background=10B981&color=fff` }} 
            />
            <View style={styles.providerDetails}>
              <Text style={styles.pName}>{booking.providerName}</Text>
              <Text style={styles.pSub}>{booking.serviceName} Expert Specialist</Text>
            </View>
            <View style={styles.actionIcons}>
              <IconButton 
                icon="message-text" 
                mode="contained-tonal" 
                iconColor={colors.primary} 
                size={24} 
                onPress={() => navigation.navigate('Chat', { bookingId: bookingId, partnerName: booking.providerName })}
              />
              <IconButton 
                icon="phone" 
                mode="contained" 
                containerColor={colors.primary} 
                iconColor="white" 
                size={24} 
                onPress={() => Linking.openURL(`tel:03001234567`)}
              />
            </View>
          </Card.Content>
        </Card>

        {/* Action button */}
        <Button 
          mode="outlined" 
          style={styles.backBtn}
          onPress={() => navigation.navigate('HomeTab')}
          labelStyle={{ fontWeight: 'bold' }}
        >
          Return to Dashboard
        </Button>
      </Animatable.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  map: {
    width: width,
    height: height,
  },
  userMarkerOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userMarkerInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  provMarkerOuter: {
    backgroundColor: '#8B5CF6',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    elevation: 8,
  },
  headerBar: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 16,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    alignItems: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  headerStatusText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#059669',
    textTransform: 'uppercase',
  },
  etaIndicatorText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 35,
    elevation: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  timelineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  timelineDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  currentDotCore: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFF',
  },
  timelineLabel: {
    fontSize: 10,
    textAlign: 'center',
  },
  providerCard: {
    borderRadius: 20,
    elevation: 4,
    backgroundColor: '#F8FAFC',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  providerCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  providerDetails: {
    flex: 1,
    marginLeft: 12,
  },
  pName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  pSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  actionIcons: {
    flexDirection: 'row',
  },
  backBtn: {
    borderRadius: 12,
    height: 48,
    justifyContent: 'center',
  },
});

export default TrackingScreen;
