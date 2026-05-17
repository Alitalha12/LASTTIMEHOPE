import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, StyleSheet, ScrollView, FlatList, TouchableOpacity, RefreshControl, Dimensions, Alert, Vibration } from 'react-native';
import { Text, Card, Avatar, Button, IconButton, Badge, Divider, ActivityIndicator, Portal, Dialog, TextInput } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import * as Animatable from 'react-native-animatable';
import axios from 'axios';
import { io } from 'socket.io-client';
import * as Location from 'expo-location';
import { useNavigation } from '@react-navigation/native';

import useAuthStore from '../store/useAuthStore';
import useSettingsStore from '../store/useSettingsStore';
import useStore from '../store/useStore';
import { getTheme } from '../utils/themeColors';
import { auth } from '../config/firebase';

const { width } = Dimensions.get('window');
const API_BASE_URL = 'https://emperor-afraid-reformed.ngrok-free.dev/api';
const SOCKET_SERVER_URL = 'https://emperor-afraid-reformed.ngrok-free.dev';

const ProviderDashboardScreen = () => {
  const navigation = useNavigation();
  const { user, token, logout } = useAuthStore();
  const { theme } = useSettingsStore();
  const colors = getTheme(theme);

  // Refreshed Store actions
  const notifications = useStore(state => state.notifications);
  const fetchNotifications = useStore(state => state.fetchNotifications);
  const markNotificationRead = useStore(state => state.markNotificationRead);
  const addLocalNotification = useStore(state => state.addLocalNotification);

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);

  // AI Arbitration state
  const [arbitrateVisible, setArbitrateVisible] = useState(false);
  const [arbitrateVerdict, setArbitrateVerdict] = useState(null);
  const [submittingArbitration, setSubmittingArbitration] = useState(false);

  // AI Proof-of-Work States
  const [proofOfWorkVisible, setProofOfWorkVisible] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState(null);
  const [proofPhoto, setProofPhoto] = useState('valid_ac_compressor');
  const [submittingProof, setSubmittingProof] = useState(false);
  const [activeEmergency, setActiveEmergency] = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);

  // Feature 7, 8, & 9 State Bindings
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarData, setCalendarData] = useState({
    offDays: ["Sunday"],
    slots: {
      "09:00 - 11:00": true,
      "11:00 - 13:00": true,
      "13:00 - 15:00": true,
      "15:00 - 17:00": true,
      "17:00 - 19:00": true
    }
  });
  const [savingCalendar, setSavingCalendar] = useState(false);
  const [earningsData, setEarningsData] = useState({ daily: [], weekly: [], monthly: [] });
  const [loadingEarnings, setLoadingEarnings] = useState(false);
  const [reviewsList, setReviewsList] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [replyVisible, setReplyVisible] = useState(false);
  const [selectedReviewId, setSelectedReviewId] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [submittingReply, setSubmittingReply] = useState(false);

  // Feature 10: Service Area Radius states
  const [showRadiusDialog, setShowRadiusDialog] = useState(false);
  const [radiusKm, setRadiusKm] = useState(15);
  const [savingRadius, setSavingRadius] = useState(false);

  const fetchAvailability = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/providers/${user?.id || user?.uid}/availability`);
      if (res.data.success) {
        setCalendarData(res.data.data);
      }
    } catch (e) {
      console.log("Could not load availability settings", e);
    }
  };

  const saveAvailability = async (updatedData) => {
    setSavingCalendar(true);
    try {
      const res = await axios.put(
        `${API_BASE_URL}/providers/availability`,
        updatedData || calendarData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.success) {
        Alert.alert("📅 Schedule Saved!", "Your online slot hours and off-days have been successfully updated in Firestore.");
        setShowCalendar(false);
      }
    } catch (e) {
      Alert.alert("Error", "Failed to update availability schedule.");
    } finally {
      setSavingCalendar(false);
    }
  };

  const fetchEarningsAnalytics = async () => {
    setLoadingEarnings(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/providers/earnings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setEarningsData(res.data.data);
      }
    } catch (e) {
      console.log("Could not load earnings metrics", e);
    } finally {
      setLoadingEarnings(false);
    }
  };

  const fetchProviderReviews = async () => {
    setLoadingReviews(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/providers/${user?.id || user?.uid}/reviews`);
      if (res.data.success) {
        setReviewsList(res.data.data);
      }
    } catch (e) {
      console.log("Could not load reviews feed", e);
    } finally {
      setLoadingReviews(false);
    }
  };

  const handlePostReply = async () => {
    if (!replyText.trim()) return;
    setSubmittingReply(true);
    try {
      const res = await axios.post(
        `${API_BASE_URL}/booking/reviews/${selectedReviewId}/reply`,
        { replyText },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.success) {
        Alert.alert("Reply Posted!", "Your response has been published publicly on the customer portal.");
        setReplyVisible(false);
        setReplyText("");
        await fetchProviderReviews();
      }
    } catch (e) {
      Alert.alert("Error", "Failed to save reply.");
    } finally {
      setSubmittingReply(false);
    }
  };

  const fetchProviderRadius = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/providers/${user?.id || user?.uid}`);
      if (res.data.success && res.data.data.radiusKm) {
        setRadiusKm(res.data.data.radiusKm);
      }
    } catch (e) {
      console.log("Could not load radius settings", e);
    }
  };

  const saveRadiusSettings = async () => {
    setSavingRadius(true);
    try {
      const res = await axios.put(
        `${API_BASE_URL}/providers/radius`,
        { radiusKm: radiusKm },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.success) {
        Alert.alert("🗺️ Radius Limit Saved!", `Your matching service area radius has been set to ${radiusKm}km in Firestore.`);
        setShowRadiusDialog(false);
      }
    } catch (e) {
      Alert.alert("Error", "Failed to update service area radius.");
    } finally {
      setSavingRadius(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchNotifications(user.id);
      fetchAvailability();
      fetchEarningsAnalytics();
      fetchProviderReviews();
      fetchProviderRadius();
    }
  }, [user?.id, bookings]);

  useEffect(() => {
    // Persistent Socket connection for the entire dashboard lifecycle
    const dashboardSocket = io(SOCKET_SERVER_URL, {
      transports: ['websocket'],
    });

    dashboardSocket.on('connect', () => {
      console.log('[PROVIDER DASHBOARD] Global socket connected.');
    });

    dashboardSocket.on('notification_received', (notif) => {
      if (notif.userId === user?.id) {
        addLocalNotification(notif);
        try {
          Vibration.vibrate([0, 200]);
        } catch (e) {}
      }
    });

    dashboardSocket.on('emergency_request_broadcast', (data) => {
      console.log('🚨 Received SYSTEM EMERGENCY broadcast:', data);
      
      // Verify qualified category
      const pService = user?.service_type || 'ac_technician';
      const formattedUserType = pService.replace("_", " ").toLowerCase();
      const formattedRequestType = data.serviceName.replace("🚨 [EMERGENCY] ", "").toLowerCase();
      
      if (formattedRequestType.includes(formattedUserType) || formattedUserType.includes(formattedRequestType)) {
        setActiveEmergency(data);
        // Play vibration pattern
        try {
          Vibration.vibrate([0, 500, 200, 500], true); // Loops until dismissed
        } catch (e) {
          console.log("Vibration not supported", e);
        }
      }
    });

    return () => {
      dashboardSocket.disconnect();
      try {
        Vibration.cancel();
      } catch (e) {}
    };
  }, [user]);

  const handleVerifyProofOfWork = async () => {
    if (!proofPhoto) {
      Alert.alert("Error", "Please select a proof photo to upload.");
      return;
    }

    setSubmittingProof(true);
    try {
      const response = await axios.post(
        `${API_BASE_URL}/booking/${selectedBookingId}/verify-proof-of-work`,
        { proofImage: proofPhoto },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        Alert.alert(
          "AI Proof-of-Work Approved! 🎉",
          `Confidence Score: ${response.data.verification.confidenceScore}%\n\n${response.data.verification.visualMatchInfo}\n\nSafePay Escrow platform release complete!`,
          [{ text: "Awesome", onPress: () => setProofOfWorkVisible(false) }]
        );
        await fetchAssignments(false);
      }
    } catch (error) {
      const errorData = error.response?.data;
      const verif = errorData?.verification;
      Alert.alert(
        "AI Proof-of-Work Rejected ❌",
        `${verif?.visualMatchInfo || "Rejected: Image does not match repair specifications."}\n\nSafePay Escrow locked pending customer review or manual arbitration.`,
        [{ text: "OK", onPress: () => setProofOfWorkVisible(false) }]
      );
      await fetchAssignments(false);
    } finally {
      setSubmittingProof(false);
    }
  };

  const fetchAssignments = useCallback(async (showIndicator = true) => {
    if (showIndicator) setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/booking/provider/${user?.id || user?.uid}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        // Sort bookings by date descending
        const sorted = response.data.data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setBookings(sorted);
      }
      
      // Quietly sync wallet earnings/ratings
      if (auth.currentUser) {
        await useAuthStore.getState().fetchUserProfile(auth.currentUser);
      }
    } catch (error) {
      console.error("Error fetching provider assignments:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, token]);

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  const locationWatcherRef = useRef(null);
  const socketRef = useRef(null);

  // Real-time location coordinate streaming for active job orders
  useEffect(() => {
    const activeInProgressJob = bookings.find(b => b.status === 'in-progress');

    if (activeInProgressJob) {
      const bookingId = activeInProgressJob.id;
      console.log(`[PROVIDER STREAM] Found active in-progress job: ${bookingId}. Initiating socket tracking...`);

      // Initialize Socket connection
      if (!socketRef.current) {
        socketRef.current = io(SOCKET_SERVER_URL, {
          transports: ['websocket'],
          forceNew: true
        });

        socketRef.current.on('connect', () => {
          console.log(`[PROVIDER STREAM] Socket connected. Joining room: ${bookingId}`);
          socketRef.current.emit('join-room', bookingId);
        });

        socketRef.current.on('connect_error', (err) => {
          console.error(`[PROVIDER STREAM] Socket connection error:`, err);
        });
      }

      // Initialize Location watcher
      const startLocationWatch = async () => {
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status !== 'granted') {
            Alert.alert('Permission Denied', 'KaamKonnect requires location access to stream coordinates to the customer map.');
            return;
          }

          // If there is an existing watcher, clear it first
          if (locationWatcherRef.current) {
            locationWatcherRef.current.remove();
            locationWatcherRef.current = null;
          }

          locationWatcherRef.current = await Location.watchPositionAsync({
            accuracy: Location.Accuracy.High,
            timeInterval: 4000, // Emit coordinate updates every 4 seconds
            distanceInterval: 5 // Emit updates if provider moves at least 5 meters
          }, (loc) => {
            const { latitude, longitude } = loc.coords;
            console.log(`[PROVIDER STREAM] Emitting coordinates: [${latitude}, ${longitude}]`);
            if (socketRef.current && socketRef.current.connected) {
              socketRef.current.emit('update-coordinates', {
                bookingId,
                latitude,
                longitude
              });
            }
          });
        } catch (err) {
          console.error('[PROVIDER STREAM] Location watch setup failed:', err);
        }
      };

      startLocationWatch();
    } else {
      // Clean up socket and location watch if no active in-progress job
      cleanupTracking();
    }

    return () => {
      cleanupTracking();
    };

    function cleanupTracking() {
      if (locationWatcherRef.current) {
        console.log('[PROVIDER STREAM] Cleaning up Location Watcher.');
        locationWatcherRef.current.remove();
        locationWatcherRef.current = null;
      }
      if (socketRef.current) {
        console.log('[PROVIDER STREAM] Disconnecting Socket.io.');
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    }
  }, [bookings]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAssignments(false);
  };

  const handleUpdateStatus = async (bookingId, newStatus) => {
    setUpdatingId(bookingId);
    try {
      const response = await axios.put(
        `${API_BASE_URL}/booking/${bookingId}/status`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.data.success) {
        setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: newStatus } : b));
        // Emit socket event so customer sees status change in real time
        if (socketRef.current?.connected) {
          socketRef.current.emit('booking_status_change', { bookingId, status: newStatus, updatedBy: 'provider' });
        }
        if (auth.currentUser) {
          await useAuthStore.getState().fetchUserProfile(auth.currentUser);
        }
      }
    } catch (error) {
      console.error("Error updating status:", error);
      alert("Failed to update status.");
    } finally {
      setUpdatingId(null);
    }
  };

  // ── START VISIT — Provider begins journey to customer ──────────────────────
  const handleStartVisit = async (booking) => {
    setUpdatingId(booking.id);
    try {
      // Get current GPS location
      const { status } = await Location.requestForegroundPermissionsAsync();
      let latitude = null, longitude = null;
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        latitude  = loc.coords.latitude;
        longitude = loc.coords.longitude;
      }

      // Call backend start-visit endpoint
      const res = await axios.post(
        `${API_BASE_URL}/booking/${booking.id}/start-visit`,
        { providerId: user?.id || user?.uid, latitude, longitude, providerName: user?.fullName || user?.displayName, providerAvatar: user?.avatar },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.success) {
        // Update local state
        setBookings(prev => prev.map(b => b.id === booking.id ? { ...b, status: 'en-route' } : b));

        // Emit socket event to notify customer
        if (socketRef.current?.connected) {
          socketRef.current.emit('en_route_started', {
            bookingId: booking.id,
            providerName: user?.fullName || 'Provider',
            providerAvatar: user?.avatar || null,
          });
        }

        Alert.alert(
          '🚗 Visit Started!',
          'The customer has been notified. Your live GPS is now streaming to their map.',
          [{ text: 'Got it!' }]
        );
      }
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Could not start visit.');
    } finally {
      setUpdatingId(null);
    }
  };

  // ── PROVIDER ARRIVED — at customer location ────────────────────────────────
  const handleProviderArrived = async (booking) => {
    setUpdatingId(booking.id);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      let latitude = null, longitude = null;
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        latitude  = loc.coords.latitude;
        longitude = loc.coords.longitude;
      }

      const res = await axios.post(
        `${API_BASE_URL}/booking/${booking.id}/provider-arrived`,
        { providerId: user?.id || user?.uid, latitude, longitude },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.success) {
        setBookings(prev => prev.map(b => b.id === booking.id ? { ...b, status: 'arrived' } : b));

        // Emit socket so customer sees arrival celebration
        if (socketRef.current?.connected) {
          socketRef.current.emit('provider_arrived', { bookingId: booking.id, latitude, longitude });
        }

        Alert.alert(
          '🏠 Arrived!',
          'The customer has been notified you are at their doorstep!',
          [{ text: 'Begin Work', onPress: () => handleUpdateStatus(booking.id, 'in-progress') }]
        );
      }
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Could not mark arrival.');
    } finally {
      setUpdatingId(null);
    }
  };


  const handleRunAIArbitration = async (bookingId) => {
    setSubmittingArbitration(true);
    try {
      const response = await axios.post(
        `${API_BASE_URL}/booking/${bookingId}/arbitrate`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.data.success) {
        setArbitrateVerdict(response.data.verdict);
        setArbitrateVisible(true);
        await fetchAssignments(false);
        // Sync wallet earnings/ratings
        if (auth.currentUser) {
          await useAuthStore.getState().fetchUserProfile(auth.currentUser);
        }
      }
    } catch (error) {
      console.error("AI Arbitration failed:", error);
      alert(error.response?.data?.message || "Arbitration failed.");
    } finally {
      setSubmittingArbitration(false);
    }
  };

  const getBadgeTier = (completedJobsCount) => {
    if (completedJobsCount >= 15) return { label: 'Platinum Crown', color: '#E5E4E2', icon: 'crown' };
    if (completedJobsCount >= 5) return { label: 'Gold Star', color: '#FFD700', icon: 'star' };
    return { label: 'Silver Shield', color: '#C0C0C0', icon: 'shield' };
  };

  const completedJobs = bookings.filter(b => b.status === 'completed').length;
  const badgeInfo = getBadgeTier(completedJobs);

  const renderJobCard = ({ item, index }) => {
    const isUpdating = updatingId === item.id;
    
    // Status stylings
    let statusLabel = item.status;
    let statusColor = colors.primary;
    if (item.status === 'confirmed') {
      statusLabel = 'Pending Review';
      statusColor = '#F59E0B'; // Amber
    } else if (item.status === 'accepted') {
      statusLabel = 'Accepted';
      statusColor = '#3B82F6'; // Blue
    } else if (item.status === 'in-progress') {
      statusLabel = 'In Progress';
      statusColor = '#8B5CF6'; // Purple
    } else if (item.status === 'solved') {
      statusLabel = 'Solved (Awaiting release)';
      statusColor = '#10B981'; // Green
    } else if (item.status === 'completed') {
      statusLabel = 'Completed';
      statusColor = '#10B981';
    } else if (item.status === 'disputed') {
      statusLabel = 'Disputed';
      statusColor = '#EF4444'; // Red
    } else if (item.status === 'en-route') {
      statusLabel = '🚗 En Route';
      statusColor = '#6366F1'; // Indigo
    } else if (item.status === 'arrived') {
      statusLabel = '📍 Arrived';
      statusColor = '#22C55E'; // Green
    }

    return (
      <Animatable.View animation="fadeInUp" delay={index * 100} duration={600}>
        <Card style={[styles.jobCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Card.Content>
            {/* Header info */}
            <View style={styles.cardHeader}>
              <View>
                <Text style={[styles.serviceName, { color: colors.text }]}>{item.serviceName}</Text>
                <Text style={[styles.bookingRef, { color: colors.subtext }]}>{item.bookingId}</Text>
              </View>
              <Badge style={[styles.statusBadge, { backgroundColor: statusColor + '20', color: statusColor, borderColor: statusColor, borderWidth: 1 }]}>
                {statusLabel.toUpperCase()}
              </Badge>
            </View>

            <Divider style={styles.divider} />

            {/* Client address & info */}
            <View style={styles.infoRow}>
              <IconButton icon="map-marker-outline" size={16} iconColor={colors.primary} style={styles.infoIcon} />
              <Text style={[styles.infoText, { color: colors.text }]} numberOfLines={2}>
                {item.area || 'Address not specified'}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <IconButton icon="calendar-clock-outline" size={16} iconColor={colors.primary} style={styles.infoIcon} />
              <Text style={[styles.infoText, { color: colors.text }]}>
                {item.scheduledDate} • {item.scheduledTime}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <IconButton icon="cash-outline" size={16} iconColor={colors.primary} style={styles.infoIcon} />
              <Text style={[styles.infoText, { color: colors.text, fontWeight: 'bold' }]}>
                {item.price || item.cost || 2500} PKR (SafePay Locked)
              </Text>
            </View>

            {/* Complain Cell if Disputed */}
            {item.status === 'disputed' && (
              <View style={styles.complainCell}>
                <View style={styles.complainHeader}>
                  <IconButton icon="alert-octagon" size={18} iconColor="#EF4444" style={{ margin: 0 }} />
                  <Text style={styles.complainTitle}>Active Dispute Complaint</Text>
                </View>
                <Text style={styles.complainReason}>
                  "{item.disputeReason || 'Reason not logged.'}"
                </Text>
              </View>
            )}

            {/* Interactive Actions */}
            <View style={styles.actionRow}>
              {isUpdating ? (
                <ActivityIndicator size="small" color={colors.primary} style={styles.loader} />
              ) : (
                <>
                  {item.status === 'confirmed' && (
                    <View style={styles.btnGroup}>
                      <Button
                        mode="outlined"
                        onPress={() => handleUpdateStatus(item.id, 'rejected')}
                        style={[styles.actionBtn, { borderColor: '#EF4444' }]}
                        labelStyle={{ color: '#EF4444', fontWeight: 'bold' }}
                      >
                        Reject
                      </Button>
                      <Button
                        mode="contained"
                        onPress={() => handleUpdateStatus(item.id, 'accepted')}
                        style={[styles.actionBtn, { backgroundColor: colors.primary }]}
                        labelStyle={{ color: '#FFFFFF', fontWeight: 'bold' }}
                      >
                        Accept
                      </Button>
                    </View>
                  )}

                  {/* ── ACCEPTED: Start Visit button ── */}
                  {item.status === 'accepted' && (
                    <View style={styles.btnGroup}>
                      {/* Start Visit — Uber-style */}
                      <Button
                        mode="contained"
                        onPress={() => handleStartVisit(item)}
                        style={{ flex: 1, backgroundColor: '#6366F1', borderRadius: 14, height: 52, justifyContent: 'center', marginBottom: 10 }}
                        labelStyle={{ color: '#FFFFFF', fontWeight: 'bold', fontSize: 15 }}
                        icon="car-arrow-right"
                        contentStyle={{ height: 52 }}
                      >
                        🚗  Start Visit
                      </Button>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <Button
                          mode="outlined"
                          onPress={() => navigation.navigate('Chat', { bookingId: item.id, partnerName: item.customerName || 'Client' })}
                          style={{ flex: 1, borderRadius: 12, borderColor: colors.primary, height: 40, justifyContent: 'center' }}
                          labelStyle={{ color: colors.primary, fontWeight: 'bold', fontSize: 11 }}
                          icon="message-text"
                        >
                          Chat
                        </Button>
                        <Button
                          mode="outlined"
                          onPress={() => handleUpdateStatus(item.id, 'rejected')}
                          style={{ flex: 1, borderRadius: 12, borderColor: '#EF4444', height: 40, justifyContent: 'center' }}
                          labelStyle={{ color: '#EF4444', fontWeight: 'bold', fontSize: 11 }}
                        >
                          Reject
                        </Button>
                      </View>
                    </View>
                  )}

                  {/* ── EN-ROUTE: I Have Arrived button ── */}
                  {item.status === 'en-route' && (
                    <View style={styles.btnGroup}>
                      <View style={[styles.enRouteCard, { backgroundColor: '#6366F115', borderColor: '#6366F1' }]}>
                        <Text style={{ color: '#6366F1', fontWeight: '700', fontSize: 14, marginBottom: 4 }}>🚗 Driving to Customer</Text>
                        <Text style={{ color: '#94A3B8', fontSize: 12 }}>Your GPS is streaming live to the customer map</Text>
                      </View>
                      <Button
                        mode="contained"
                        onPress={() => handleProviderArrived(item)}
                        style={{ backgroundColor: '#22C55E', borderRadius: 14, height: 52, justifyContent: 'center', marginTop: 10 }}
                        labelStyle={{ color: '#FFFFFF', fontWeight: 'bold', fontSize: 15 }}
                        icon="map-marker-check"
                        contentStyle={{ height: 52 }}
                      >
                        📍  I Have Arrived
                      </Button>
                    </View>
                  )}

                  {/* ── ARRIVED: Begin Work ── */}
                  {item.status === 'arrived' && (
                    <View style={styles.btnGroup}>
                      <View style={[styles.enRouteCard, { backgroundColor: '#22C55E15', borderColor: '#22C55E' }]}>
                        <Text style={{ color: '#22C55E', fontWeight: '700', fontSize: 14, marginBottom: 4 }}>🏠 You Are At Customer's Home</Text>
                        <Text style={{ color: '#94A3B8', fontSize: 12 }}>Ready to begin the service</Text>
                      </View>
                      <Button
                        mode="contained"
                        onPress={() => handleUpdateStatus(item.id, 'in-progress')}
                        style={{ backgroundColor: '#8B5CF6', borderRadius: 14, height: 52, justifyContent: 'center', marginTop: 10 }}
                        labelStyle={{ color: '#FFFFFF', fontWeight: 'bold', fontSize: 15 }}
                        icon="play-circle-outline"
                        contentStyle={{ height: 52 }}
                      >
                        🔧  Begin Work
                      </Button>
                    </View>
                  )}

                  {/* ── OLD ACCEPTED section kept for reference, now replaced by Start Visit ── */}
                  {false && item.status === 'accepted_old' && (
                    <View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Button
                          mode="contained"
                          onPress={() => handleUpdateStatus(item.id, 'in-progress')}
                          style={{ flex: 0.82, backgroundColor: '#8B5CF6', borderRadius: 14, height: 48, justifyContent: 'center' }}
                          labelStyle={{ color: '#FFFFFF', fontWeight: 'bold' }}
                          icon="play-circle-outline"
                        >
                          Start Work
                        </Button>
                        <IconButton 
                          icon="message-text" 
                          mode="contained-tonal" 
                          iconColor={colors.primary} 
                          size={24} 
                          style={{ margin: 0 }}
                          onPress={() => navigation.navigate('Chat', { bookingId: item.id, partnerName: item.customerName || 'Client' })}
                        />
                      </View>
                      
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
                        <Button
                          mode="outlined"
                          onPress={() => {
                            const phone = item.customerPhone || "+92 300 4455667";
                            Alert.alert("Call Client 📞", `Client Direct Line: ${phone}\n\nMonitored by KaamKonnect AI SafePay Safety Guard.`);
                          }}
                          style={{ flex: 0.47, borderRadius: 12, borderColor: colors.primary, height: 38, justifyContent: 'center' }}
                          labelStyle={{ color: colors.primary, fontWeight: 'bold', fontSize: 11 }}
                          icon="phone-outline"
                        >
                          Call Client
                        </Button>
                        <Button
                          mode="outlined"
                          onPress={() => {
                            Alert.alert(
                              "SafePay Complain Center ⚖️",
                              "Report client issue, route delay, or safety hazard directly to KaamKonnect Autonomic AI Auditor.",
                              [
                                  { text: "Dismiss", style: "cancel" },
                                  {
                                    text: "File Complain",
                                    onPress: () => {
                                      Alert.prompt(
                                        "Log Provider Complaint",
                                        "Explain the issue. The AI Auditor will analyze chat history and photos immediately.",
                                        [
                                          { text: "Cancel" },
                                          { text: "Submit", onPress: () => Alert.alert("Complaint Logged", "AI Arbitrator has queued this safety report.") }
                                        ]
                                      );
                                    }
                                  }
                              ]
                            );
                          }}
                          style={{ flex: 0.47, borderRadius: 12, borderColor: '#EF4444', height: 38, justifyContent: 'center' }}
                          labelStyle={{ color: '#EF4444', fontWeight: 'bold', fontSize: 11 }}
                          icon="alert-octagon"
                        >
                          Complain
                        </Button>
                      </View>
                    </View>
                  )}

                  {item.status === 'in-progress' && (
                    <View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Button
                          mode="contained"
                          onPress={() => {
                            setSelectedBookingId(item.id);
                            setProofPhoto('valid_ac_compressor');
                            setProofOfWorkVisible(true);
                          }}
                          style={{ flex: 0.82, backgroundColor: '#10B981', borderRadius: 14, height: 48, justifyContent: 'center' }}
                          labelStyle={{ color: '#FFFFFF', fontWeight: 'bold' }}
                          icon="camera-outline"
                        >
                          Verify & Complete
                        </Button>
                        <IconButton 
                          icon="message-text" 
                          mode="contained-tonal" 
                          iconColor={colors.primary} 
                          size={24} 
                          style={{ margin: 0 }}
                          onPress={() => navigation.navigate('Chat', { bookingId: item.id, partnerName: item.customerName || 'Client' })}
                        />
                      </View>
                      
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
                        <Button
                          mode="outlined"
                          onPress={() => {
                            const phone = item.customerPhone || "+92 300 4455667";
                            Alert.alert("Call Client 📞", `Client Direct Line: ${phone}\n\nMonitored by KaamKonnect AI SafePay Safety Guard.`);
                          }}
                          style={{ flex: 0.47, borderRadius: 12, borderColor: colors.primary, height: 38, justifyContent: 'center' }}
                          labelStyle={{ color: colors.primary, fontWeight: 'bold', fontSize: 11 }}
                          icon="phone-outline"
                        >
                          Call Client
                        </Button>
                        <Button
                          mode="outlined"
                          onPress={() => {
                            Alert.alert(
                              "SafePay Complain Center ⚖️",
                              "Report client issue, route delay, or safety hazard directly to KaamKonnect Autonomic AI Auditor.",
                              [
                                  { text: "Dismiss", style: "cancel" },
                                  {
                                    text: "File Complain",
                                    onPress: () => {
                                      Alert.prompt(
                                        "Log Provider Complaint",
                                        "Explain the issue. The AI Auditor will analyze chat history and photos immediately.",
                                        [
                                          { text: "Cancel" },
                                          { text: "Submit", onPress: () => Alert.alert("Complaint Logged", "AI Arbitrator has queued this safety report.") }
                                        ]
                                      );
                                    }
                                  }
                              ]
                            );
                          }}
                          style={{ flex: 0.47, borderRadius: 12, borderColor: '#EF4444', height: 38, justifyContent: 'center' }}
                          labelStyle={{ color: '#EF4444', fontWeight: 'bold', fontSize: 11 }}
                          icon="alert-octagon"
                        >
                          Complain
                        </Button>
                      </View>
                    </View>
                  )}

                  {item.status === 'solved' && (
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <View style={[styles.awaitingBox, { flex: 0.82 }]}>
                        <IconButton icon="clock-outline" size={16} iconColor={colors.subtext} style={{ margin: 0 }} />
                        <Text style={[styles.awaitingText, { color: colors.subtext }]}>
                          Awaiting Escrow Release...
                        </Text>
                      </View>
                      <IconButton 
                        icon="message-text" 
                        mode="contained-tonal" 
                        iconColor={colors.primary} 
                        size={24} 
                        style={{ margin: 0 }}
                        onPress={() => navigation.navigate('Chat', { bookingId: item.id, partnerName: item.customerName || 'Client' })}
                      />
                    </View>
                  )}

                  {item.status === 'completed' && (
                    <View style={[styles.awaitingBox, { backgroundColor: 'rgba(16, 185, 129, 0.08)' }]}>
                      <IconButton icon="check-all" size={16} iconColor="#10B981" style={{ margin: 0 }} />
                      <Text style={[styles.awaitingText, { color: '#10B981', fontWeight: 'bold' }]}>
                        Funds Released & Settled!
                      </Text>
                    </View>
                  )}

                  {item.status === 'disputed' && (
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Button
                        mode="contained"
                        onPress={() => handleRunAIArbitration(item.id)}
                        loading={submittingArbitration}
                        style={{ flex: 0.82, backgroundColor: '#EF4444', height: 48, justifyContent: 'center', borderRadius: 14 }}
                        labelStyle={{ color: '#FFFFFF', fontWeight: 'bold' }}
                        icon="scale-balance"
                      >
                        Settle with AI
                      </Button>
                      <IconButton 
                        icon="message-text" 
                        mode="contained-tonal" 
                        iconColor={colors.primary} 
                        size={24} 
                        style={{ margin: 0 }}
                        onPress={() => navigation.navigate('Chat', { bookingId: item.id, partnerName: item.customerName || 'Client' })}
                      />
                    </View>
                  )}
                </>
              )}
            </View>
          </Card.Content>
        </Card>
      </Animatable.View>
    );
  };

  const renderReviewsFeed = () => {
    return (
      <View style={{ marginTop: 25, paddingHorizontal: 15, paddingBottom: 40 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
          <IconButton icon="star" iconColor="#F59E0B" size={20} style={{ margin: 0, padding: 0 }} />
          <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.text, marginLeft: 4 }}>
            Customer Reviews & Replies ({reviewsList.length})
          </Text>
        </View>
        
        {reviewsList.length === 0 ? (
          <View style={{ 
            backgroundColor: 'rgba(255,255,255,0.02)', 
            padding: 24, 
            borderRadius: 20, 
            alignItems: 'center', 
            borderWidth: 1, 
            borderColor: 'rgba(255,255,255,0.05)' 
          }}>
            <IconButton icon="star-outline" size={32} iconColor={colors.subtext} style={{ margin: 0 }} />
            <Text style={{ color: colors.subtext, fontSize: 13, textAlign: 'center', fontWeight: '500' }}>
              No client reviews yet.
            </Text>
            <Text style={{ color: colors.subtext, fontSize: 11, textAlign: 'center', marginTop: 2, opacity: 0.8 }}>
              Complete customer requests to receive dynamic ratings!
            </Text>
          </View>
        ) : (
          reviewsList.map((item) => (
            <View 
              key={item.id} 
              style={{ 
                backgroundColor: colors.card, 
                padding: 16, 
                borderRadius: 20, 
                marginBottom: 12, 
                borderWidth: 1, 
                borderColor: 'rgba(255,255,255,0.05)',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.1,
                shadowRadius: 10,
                elevation: 3
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <Text style={{ fontWeight: 'bold', color: colors.text, fontSize: 14 }}>{item.customerName}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(245, 158, 11, 0.1)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 }}>
                  <IconButton icon="star" iconColor="#F59E0B" size={12} style={{ margin: 0, padding: 0 }} />
                  <Text style={{ color: '#F59E0B', fontWeight: 'bold', fontSize: 11, marginLeft: 2 }}>{item.rating}</Text>
                </View>
              </View>
              
              <Text style={{ color: colors.text, fontSize: 13, lineHeight: 18, fontStyle: 'italic', marginBottom: 8, opacity: 0.9 }}>
                "{item.comment || 'No comment provided.'}"
              </Text>
              
              {item.replyText ? (
                <View style={{ 
                  backgroundColor: 'rgba(59, 130, 246, 0.06)', 
                  padding: 12, 
                  borderRadius: 14, 
                  marginTop: 6, 
                  borderLeftWidth: 3, 
                  borderLeftColor: '#3B82F6' 
                }}>
                  <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#3B82F6', marginBottom: 2 }}>Your Public Reply:</Text>
                  <Text style={{ fontSize: 12, color: colors.text, lineHeight: 17 }}>{item.replyText}</Text>
                </View>
              ) : (
                <Button 
                  mode="outlined" 
                  compact 
                  onPress={() => {
                    setSelectedReviewId(item.id);
                    setReplyVisible(true);
                  }}
                  style={{ borderColor: colors.primary, borderRadius: 10, marginTop: 6, alignSelf: 'flex-start' }}
                  labelStyle={{ color: colors.primary, fontSize: 11, fontWeight: 'bold' }}
                >
                  ✍️ Public Reply
                </Button>
              )}
            </View>
          ))
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Sleek Dark/Deep Indigo Gradient Header */}
      <LinearGradient colors={['#1E3A5F', '#0F1B2D']} style={styles.gradientHeader}>
        <View style={styles.headerTop}>
          <View style={styles.profileRow}>
            <Avatar.Image 
              source={{ uri: user?.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.fullName || 'Provider')}` }} 
              size={54} 
              style={styles.avatar} 
            />
            <View>
              <Text style={styles.providerName}>{user?.fullName || 'Expert Provider'}</Text>
              <View style={styles.tierRow}>
                <IconButton icon={badgeInfo.icon} size={14} iconColor={badgeInfo.color} style={{ margin: 0, padding: 0 }} />
                <Text style={[styles.tierLabel, { color: badgeInfo.color }]}>
                  {badgeInfo.label}
                </Text>
              </View>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <IconButton 
              icon="map-marker-radius-outline" 
              iconColor="#FFFFFF" 
              size={24} 
              onPress={() => setShowRadiusDialog(true)} 
            />
            <IconButton 
              icon="calendar-month-outline" 
              iconColor="#FFFFFF" 
              size={24} 
              onPress={() => setShowCalendar(true)} 
            />
            <View style={{ position: 'relative' }}>
              <IconButton 
                icon="bell-outline" 
                iconColor="#FFFFFF" 
                size={24} 
                onPress={() => setShowNotifications(true)} 
              />
              {notifications.filter(n => n.status === 'unread').length > 0 && (
                <View style={{
                  position: 'absolute',
                  right: 4,
                  top: 4,
                  backgroundColor: '#EF4444',
                  borderRadius: 8,
                  width: 16,
                  height: 16,
                  justifyContent: 'center',
                  alignItems: 'center',
                  pointerEvents: 'none'
                }}>
                  <Text style={{ color: 'white', fontSize: 9, fontWeight: 'bold' }}>
                    {notifications.filter(n => n.status === 'unread').length}
                  </Text>
                </View>
              )}
            </View>
            <IconButton icon="logout" iconColor="#EF4444" size={24} onPress={logout} />
          </View>
        </View>

        {/* Real-time Earnings Card */}
        <Animatable.View animation="fadeInDown" delay={200} style={styles.earningsCard}>
          <Text style={styles.earningsTitle}>SIMULATED EARNINGS</Text>
          <Text style={styles.earningsAmt}>{parseFloat(user?.walletBalance || 0.0).toLocaleString()} PKR</Text>
          <View style={styles.escrowRow}>
            <IconButton icon="lock-outline" size={12} iconColor="rgba(255,255,255,0.6)" style={{ margin: 0 }} />
            <Text style={styles.escrowText}>
              Pending Escrow: {parseFloat(user?.escrowLockedBalance || 0.0).toLocaleString()} PKR
            </Text>
          </View>

          {/* Feature 8: Dynamic Visual Earnings Analytics breakdown */}
          <View style={{ marginTop: 15, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', paddingTop: 12 }}>
            <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', fontWeight: 'bold', letterSpacing: 0.5, marginBottom: 8 }}>
              📊 REVENUE METRICS ANALYTICS
            </Text>
            
            {/* Daily (Last 7 days total) */}
            <View style={{ marginBottom: 6 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
                <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)' }}>Daily (7 Days)</Text>
                <Text style={{ fontSize: 11, color: '#FFF', fontWeight: 'bold' }}>
                  {earningsData.daily ? earningsData.daily.reduce((sum, d) => sum + d.value, 0).toLocaleString() : 0} PKR
                </Text>
              </View>
              <View style={{ height: 6, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' }}>
                <View style={{
                  width: `${Math.min(100, ((earningsData.daily ? earningsData.daily.reduce((sum, d) => sum + d.value, 0) : 0) / 15000) * 100)}%`,
                  height: '100%',
                  backgroundColor: '#3B82F6',
                  borderRadius: 3
                }} />
              </View>
            </View>

            {/* Weekly (Last 4 weeks total) */}
            <View style={{ marginBottom: 6 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
                <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)' }}>Weekly (4 Weeks)</Text>
                <Text style={{ fontSize: 11, color: '#FFF', fontWeight: 'bold' }}>
                  {earningsData.weekly ? earningsData.weekly.reduce((sum, w) => sum + w.value, 0).toLocaleString() : 0} PKR
                </Text>
              </View>
              <View style={{ height: 6, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' }}>
                <View style={{
                  width: `${Math.min(100, ((earningsData.weekly ? earningsData.weekly.reduce((sum, w) => sum + w.value, 0) : 0) / 50000) * 100)}%`,
                  height: '100%',
                  backgroundColor: '#10B981',
                  borderRadius: 3
                }} />
              </View>
            </View>

            {/* Monthly (Last 6 months total) */}
            <View style={{ marginBottom: 2 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
                <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)' }}>Monthly (6 Months)</Text>
                <Text style={{ fontSize: 11, color: '#FFF', fontWeight: 'bold' }}>
                  {earningsData.monthly ? earningsData.monthly.reduce((sum, m) => sum + m.value, 0).toLocaleString() : 0} PKR
                </Text>
              </View>
              <View style={{ height: 6, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' }}>
                <View style={{
                  width: `${Math.min(100, ((earningsData.monthly ? earningsData.monthly.reduce((sum, m) => sum + m.value, 0) : 0) / 150000) * 100)}%`,
                  height: '100%',
                  backgroundColor: '#F59E0B',
                  borderRadius: 3
                }} />
              </View>
            </View>
          </View>
        </Animatable.View>
      </LinearGradient>

      {/* Main Jobs Section */}
      <View style={styles.jobsSection}>
        {activeEmergency && (
          <Animatable.View 
            animation="flash" 
            iterationCount="infinite"
            duration={2500}
            style={{
              marginHorizontal: 16,
              marginTop: 16,
              marginBottom: 10,
              backgroundColor: '#FEF2F2',
              borderWidth: 2,
              borderColor: '#EF4444',
              borderRadius: 20,
              padding: 16,
              shadowColor: '#EF4444',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 5
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
              <IconButton icon="alert-octagon" iconColor="#EF4444" size={26} style={{ margin: 0, marginRight: 8 }} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#EF4444', fontWeight: 'bold', fontSize: 16 }}>
                  🚨 URGENT EMERGENCY DISPATCH!
                </Text>
                <Text style={{ color: '#7F1D1D', fontSize: 11, fontWeight: '600' }}>
                  Urgent priority job request is waiting in your area!
                </Text>
              </View>
            </View>
            
            <View style={{ backgroundColor: '#FEE2E2', borderRadius: 12, padding: 12, marginBottom: 12 }}>
              <Text style={{ color: '#991B1B', fontWeight: '700', fontSize: 13, marginBottom: 2 }}>
                💼 {activeEmergency.serviceName}
              </Text>
              <Text style={{ color: '#991B1B', fontSize: 12, marginBottom: 2 }}>
                📍 Location Sector: <Text style={{ fontWeight: 'bold' }}>{activeEmergency.area}</Text>
              </Text>
              <Text style={{ color: '#991B1B', fontSize: 12, marginBottom: 2 }}>
                💰 Payout Premium: <Text style={{ fontWeight: 'bold', fontSize: 14 }}>{activeEmergency.price} PKR</Text> (+50% Rate Applied!)
              </Text>
              <Text style={{ color: '#991B1B', fontSize: 11 }}>
                👤 Client Name: {activeEmergency.customerName}
              </Text>
            </View>
            
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Button
                mode="contained"
                onPress={async () => {
                  try {
                    Vibration.cancel();
                  } catch (e) {}
                  setActiveEmergency(null);
                  setRefreshing(true);
                  await fetchAssignments();
                  Alert.alert("🛡️ Emergency Job Secured!", "Excellent response! Head to the user's location immediately. The client has been notified that an emergency expert is en-route.", [{ text: "GO TO ACTIVE JOBS" }]);
                }}
                style={{ flex: 0.58, backgroundColor: '#EF4444', borderRadius: 12 }}
                labelStyle={{ color: '#FFFFFF', fontWeight: 'bold', fontSize: 11 }}
                icon="shield-check"
              >
                ACCEPT DISPATCH
              </Button>
              <Button
                mode="outlined"
                onPress={() => {
                  try {
                    Vibration.cancel();
                  } catch (e) {}
                  setActiveEmergency(null);
                }}
                style={{ flex: 0.38, borderColor: '#EF4444', borderRadius: 12 }}
                labelStyle={{ color: '#EF4444', fontWeight: 'bold', fontSize: 11 }}
              >
                DISMISS
              </Button>
            </View>
          </Animatable.View>
        )}

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Assigned Job Orders</Text>

        {loading ? (
          <View style={styles.centerLoader}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.subtext }]}>Loading assignments...</Text>
          </View>
        ) : (
          <FlatList
            data={bookings}
            keyExtractor={item => item.id}
            renderItem={renderJobCard}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
            }
            ListEmptyComponent={
              <View style={styles.emptyView}>
                <IconButton icon="playlist-remove" size={48} iconColor={colors.subtext} />
                <Text style={[styles.emptyText, { color: colors.subtext }]}>No job assignments found.</Text>
                <Text style={[styles.emptySubtext, { color: colors.subtext }]}>Pull down to refresh new incoming AI orders.</Text>
              </View>
            }
            ListFooterComponent={renderReviewsFeed}
          />
        )}
      </View>

      {/* AI ARBITRATION VERDICT MODAL */}
      <Portal>
        <Dialog 
          visible={arbitrateVisible} 
          onDismiss={() => setArbitrateVisible(false)}
          style={{ backgroundColor: colors.card, borderRadius: 26 }}
        >
          <Dialog.Title style={{ color: colors.primary, fontWeight: 'bold', textAlign: 'center' }}>
            ⚖️ AI Arbitration Verdict
          </Dialog.Title>
          <Dialog.Content>
            {arbitrateVerdict && (
              <View>
                {/* Urdu Verdict Card */}
                <View style={{ backgroundColor: colors.primary + '10', borderLeftColor: colors.primary, borderLeftWidth: 4, padding: 15, borderRadius: 14, marginBottom: 15 }}>
                  <Text style={{ fontWeight: 'bold', fontSize: 12, color: colors.primary, textTransform: 'uppercase', marginBottom: 4 }}>
                    Automated Court Decision
                  </Text>
                  <Text style={{ fontSize: 14, color: colors.text, lineHeight: 20, fontWeight: '500' }}>
                    {arbitrateVerdict.verdict_urdu}
                  </Text>
                </View>

                {/* Refund split bar */}
                <Text style={{ fontWeight: 'bold', fontSize: 12, color: colors.subtext, marginBottom: 8, textTransform: 'uppercase' }}>
                  Escrow Split Distribution
                </Text>
                <View style={{ flexDirection: 'row', height: 26, borderRadius: 13, overflow: 'hidden', marginBottom: 15 }}>
                  {arbitrateVerdict.customer_refund_percentage > 0 && (
                    <View style={{ flex: arbitrateVerdict.customer_refund_percentage, backgroundColor: '#EF4444', justifyContent: 'center', alignItems: 'center' }}>
                      <Text style={{ color: '#FFF', fontSize: 10, fontWeight: 'bold' }}>
                        Cust: {arbitrateVerdict.customer_refund_percentage}%
                      </Text>
                    </View>
                  )}
                  {arbitrateVerdict.provider_refund_percentage > 0 && (
                    <View style={{ flex: arbitrateVerdict.provider_refund_percentage, backgroundColor: '#10B981', justifyContent: 'center', alignItems: 'center' }}>
                      <Text style={{ color: '#FFF', fontSize: 10, fontWeight: 'bold' }}>
                        Prov: {arbitrateVerdict.provider_refund_percentage}%
                      </Text>
                    </View>
                  )}
                </View>

                {/* English reasoning list */}
                {arbitrateVerdict.reasoning ? (
                  <View>
                    <Text style={{ fontWeight: 'bold', fontSize: 12, color: colors.subtext, marginBottom: 6, textTransform: 'uppercase' }}>
                      Technical Analysis
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.text, fontStyle: 'italic', lineHeight: 17 }}>
                      • {arbitrateVerdict.reasoning}
                    </Text>
                  </View>
                ) : null}
              </View>
            )}
          </Dialog.Content>
          <Dialog.Actions style={{ paddingHorizontal: 15, paddingBottom: 15, justifyContent: 'center' }}>
            <Button 
              mode="contained"
              onPress={() => setArbitrateVisible(false)}
              style={{ backgroundColor: colors.primary, borderRadius: 12, width: '100%', height: 45, justifyContent: 'center' }}
              labelStyle={{ color: '#FFFFFF', fontWeight: 'bold' }}
            >
              Awesome, Thanks! ➔
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* PREMIUM AI PROOF-OF-WORK VERIFICATION MODAL */}
      <Portal>
        <Dialog 
          visible={proofOfWorkVisible} 
          onDismiss={() => {
            if (!submittingProof) {
              setProofOfWorkVisible(false);
            }
          }}
          style={{ backgroundColor: colors.background, borderRadius: 28, borderWidth: 1, borderColor: colors.border }}
        >
          <Dialog.Title style={{ color: colors.text, textAlign: 'center', fontWeight: 'bold', fontSize: 18 }}>
            Proof of Work Verification 📸
          </Dialog.Title>
          <Dialog.Content>
            <Text style={{ fontSize: 12, color: colors.subtext, textAlign: 'center', marginBottom: 15 }}>
              KaamKonnect AI Vision Auditor will inspect your work photo to verify quality and dynamically release SafePay Escrow immediately.
            </Text>

            {/* Simulated Photo Selector Grid */}
            <Text style={{ fontWeight: 'bold', fontSize: 12, color: colors.text, marginBottom: 8, textTransform: 'uppercase' }}>
              Select Job Outcome Photo:
            </Text>
            
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 }}>
              <TouchableOpacity 
                style={{ 
                  flex: 0.31, 
                  height: 64, 
                  borderRadius: 12, 
                  justifyContent: 'center', 
                  alignItems: 'center',
                  backgroundColor: proofPhoto === 'valid_ac_compressor' ? '#00D09C' : colors.card,
                  borderWidth: 1.5,
                  borderColor: proofPhoto === 'valid_ac_compressor' ? '#00D09C' : colors.border,
                  padding: 4
                }}
                onPress={() => setProofPhoto('valid_ac_compressor')}
              >
                <IconButton icon="air-conditioner" size={20} iconColor={proofPhoto === 'valid_ac_compressor' ? '#FFF' : colors.primary} style={{ margin: 0 }} />
                <Text style={{ color: proofPhoto === 'valid_ac_compressor' ? '#FFF' : colors.text, fontWeight: 'bold', fontSize: 8, textAlign: 'center' }}>
                  Valid AC Fix
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={{ 
                  flex: 0.31, 
                  height: 64, 
                  borderRadius: 12, 
                  justifyContent: 'center', 
                  alignItems: 'center',
                  backgroundColor: proofPhoto === 'valid_plumbing_drain' ? '#10B981' : colors.card,
                  borderWidth: 1.5,
                  borderColor: proofPhoto === 'valid_plumbing_drain' ? '#10B981' : colors.border,
                  padding: 4
                }}
                onPress={() => setProofPhoto('valid_plumbing_drain')}
              >
                <IconButton icon="pipe-leak" size={20} iconColor={proofPhoto === 'valid_plumbing_drain' ? '#FFF' : colors.primary} style={{ margin: 0 }} />
                <Text style={{ color: proofPhoto === 'valid_plumbing_drain' ? '#FFF' : colors.text, fontWeight: 'bold', fontSize: 8, textAlign: 'center' }}>
                  Valid Plumbing
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={{ 
                  flex: 0.31, 
                  height: 64, 
                  borderRadius: 12, 
                  justifyContent: 'center', 
                  alignItems: 'center',
                  backgroundColor: proofPhoto === 'invalid_cat_meme' ? '#EF4444' : colors.card,
                  borderWidth: 1.5,
                  borderColor: proofPhoto === 'invalid_cat_meme' ? '#EF4444' : colors.border,
                  padding: 4
                }}
                onPress={() => setProofPhoto('invalid_cat_meme')}
              >
                <IconButton icon="cat" size={20} iconColor={proofPhoto === 'invalid_cat_meme' ? '#FFF' : '#EF4444'} style={{ margin: 0 }} />
                <Text style={{ color: proofPhoto === 'invalid_cat_meme' ? '#FFF' : colors.text, fontWeight: 'bold', fontSize: 8, textAlign: 'center' }}>
                  Random Meme
                </Text>
              </TouchableOpacity>
            </View>

            {/* Dynamic Status Preview Box */}
            <View style={{ backgroundColor: colors.card, borderRadius: 16, padding: 12, borderWidth: 1, borderColor: colors.border }}>
              <Text style={{ fontSize: 10, fontWeight: 'bold', color: colors.subtext, marginBottom: 4, textTransform: 'uppercase' }}>
                Image Visual Meta Tag:
              </Text>
              <Text style={{ color: colors.text, fontSize: 11, fontWeight: '500', lineHeight: 16 }}>
                {proofPhoto === 'valid_ac_compressor' && "📷 [AC_COMPRESSOR_REPAIRED_SUCCESS.JPG] - High resolution photo showing cleaned and re-wired compressor unit."}
                {proofPhoto === 'valid_plumbing_drain' && "📷 [PLUMBING_SINK_PIPE_SEALED.JPG] - Detailed photo showing dynamic pipe connection with zero water leakage."}
                {proofPhoto === 'invalid_cat_meme' && "📷 [FUNNY_CAT_WITH_PLUMBER_HAT.PNG] - Internet meme photo (Unrelated work proof content)."}
              </Text>
            </View>
          </Dialog.Content>
          <Dialog.Actions style={{ paddingHorizontal: 15, paddingBottom: 15, justifyContent: 'center' }}>
            <Button 
              mode="contained" 
              onPress={handleVerifyProofOfWork}
              loading={submittingProof}
              style={{ backgroundColor: '#10B981', borderRadius: 12, width: '100%', height: 45, justifyContent: 'center' }}
              labelStyle={{ color: 'white', fontWeight: 'bold' }}
              icon="robot-outline"
            >
              Verify Work & Release Escrow 🤖
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* LIVE ALERTS NOTIFICATION CENTER PORTAL */}
      <Portal>
        <Dialog 
          visible={showNotifications} 
          onDismiss={() => setShowNotifications(false)}
          style={{ backgroundColor: colors.card, borderRadius: 24, borderWidth: 1, borderColor: colors.border }}
        >
          <Dialog.Title style={{ color: colors.text, fontWeight: 'bold', fontSize: 18 }}>
            🔔 Live Service Alerts
          </Dialog.Title>
          <Dialog.ScrollArea style={{ maxHeight: 320, paddingHorizontal: 0 }}>
            <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8 }}>
              {notifications.length === 0 ? (
                <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                  <IconButton icon="bell-off-outline" size={40} iconColor={colors.subtext} />
                  <Text style={{ color: colors.subtext, fontSize: 13, fontStyle: 'italic' }}>
                    No recent notifications.
                  </Text>
                </View>
              ) : (
                notifications.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    onPress={async () => {
                      await markNotificationRead(item.id);
                      setShowNotifications(false);
                    }}
                    style={{
                      flexDirection: 'row',
                      padding: 12,
                      borderRadius: 16,
                      backgroundColor: item.status === 'unread' ? 'rgba(59, 130, 246, 0.06)' : 'transparent',
                      borderBottomWidth: 1,
                      borderBottomColor: colors.border,
                      alignItems: 'center',
                      marginBottom: 6
                    }}
                  >
                    <View style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: item.status === 'unread' ? colors.primary : 'transparent',
                      marginRight: 8
                    }} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.text, fontWeight: item.status === 'unread' ? 'bold' : 'normal', fontSize: 13, marginBottom: 2 }}>
                        {item.title}
                      </Text>
                      <Text style={{ color: colors.subtext, fontSize: 11, lineHeight: 15 }}>
                        {item.body}
                      </Text>
                      <Text style={{ color: colors.subtext, fontSize: 9, marginTop: 4, opacity: 0.7 }}>
                        {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={() => setShowNotifications(false)} textColor={colors.primary}>Close</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* FEATURE 7: AVAILABILITY CALENDAR & SLOT DIALOG */}
      <Portal>
        <Dialog 
          visible={showCalendar} 
          onDismiss={() => setShowCalendar(false)}
          style={{ backgroundColor: colors.card, borderRadius: 26, maxHeight: '80%' }}
        >
          <Dialog.Title style={{ color: colors.primary, fontWeight: 'bold', textAlign: 'center' }}>
            📅 Availability Calendar
          </Dialog.Title>
          <ScrollView style={{ paddingHorizontal: 20 }}>
            <Text style={{ fontSize: 13, fontWeight: 'bold', color: colors.text, marginBottom: 8, marginTop: 10 }}>
              🚫 SET WEEKLY OFF-DAYS
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 15 }}>
              {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map(day => {
                const isOff = calendarData.offDays.includes(day);
                return (
                  <TouchableOpacity
                    key={day}
                    onPress={() => {
                      const updatedOffDays = isOff
                        ? calendarData.offDays.filter(d => d !== day)
                        : [...calendarData.offDays, day];
                      setCalendarData({ ...calendarData, offDays: updatedOffDays });
                    }}
                    style={{
                      paddingVertical: 6,
                      paddingHorizontal: 12,
                      borderRadius: 12,
                      backgroundColor: isOff ? '#EF4444' : 'rgba(255,255,255,0.06)',
                      marginRight: 6,
                      marginBottom: 6,
                      borderWidth: 1,
                      borderColor: isOff ? '#EF4444' : 'rgba(255,255,255,0.1)'
                    }}
                  >
                    <Text style={{ color: '#FFF', fontSize: 11, fontWeight: 'bold' }}>
                      {day.substring(0, 3)} {isOff ? '❌' : '✅'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={{ fontSize: 13, fontWeight: 'bold', color: colors.text, marginBottom: 8 }}>
              ⏰ SELECT ACTIVE WORKING SLOTS
            </Text>
            {Object.keys(calendarData.slots).map(slot => {
              const isActive = calendarData.slots[slot];
              return (
                <TouchableOpacity
                  key={slot}
                  onPress={() => {
                    const updatedSlots = { ...calendarData.slots, [slot]: !isActive };
                    setCalendarData({ ...calendarData, slots: updatedSlots });
                  }}
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingVertical: 10,
                    paddingHorizontal: 15,
                    borderRadius: 14,
                    backgroundColor: isActive ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255,255,255,0.02)',
                    marginBottom: 8,
                    borderWidth: 1,
                    borderColor: isActive ? '#10B981' : 'rgba(255,255,255,0.05)'
                  }}
                >
                  <Text style={{ color: colors.text, fontSize: 13, fontWeight: '500' }}>{slot}</Text>
                  <Text style={{ color: isActive ? '#10B981' : colors.subtext, fontWeight: 'bold', fontSize: 12 }}>
                    {isActive ? 'ACTIVE' : 'OFFLINE'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <Dialog.Actions style={{ paddingHorizontal: 20, paddingBottom: 20, paddingTop: 10 }}>
            <Button 
              mode="outlined" 
              onPress={() => setShowCalendar(false)} 
              style={{ flex: 1, marginRight: 10, borderRadius: 12, borderColor: 'rgba(255,255,255,0.2)' }}
              labelStyle={{ color: colors.text }}
            >
              Cancel
            </Button>
            <Button 
              mode="contained" 
              loading={savingCalendar}
              onPress={() => saveAvailability()} 
              style={{ flex: 1, backgroundColor: colors.primary, borderRadius: 12 }}
              labelStyle={{ color: '#FFF', fontWeight: 'bold' }}
            >
              Save Schedule
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* FEATURE 9: REVIEW PUBLIC REPLY MODAL */}
      <Portal>
        <Dialog 
          visible={replyVisible} 
          onDismiss={() => setReplyVisible(false)}
          style={{ backgroundColor: colors.card, borderRadius: 26 }}
        >
          <Dialog.Title style={{ color: colors.primary, fontWeight: 'bold' }}>
            ✍️ Public Feedback Reply
          </Dialog.Title>
          <Dialog.Content>
            <Text style={{ color: colors.subtext, fontSize: 12, marginBottom: 12 }}>
              Type your reply publicly to the customer. This response will be visible on the main marketplace portal.
            </Text>
            <TextInput
              mode="outlined"
              label="Write your response (e.g. Shukriya, pasand krne ka!)"
              value={replyText}
              onChangeText={setReplyText}
              multiline
              numberOfLines={3}
              textColor={colors.text}
              theme={{ colors: { primary: colors.primary } }}
              style={{ backgroundColor: 'transparent' }}
            />
          </Dialog.Content>
          <Dialog.Actions style={{ paddingHorizontal: 15, paddingBottom: 15 }}>
            <Button 
              mode="outlined" 
              onPress={() => setReplyVisible(false)} 
              style={{ marginRight: 10, borderRadius: 12, borderColor: 'rgba(255,255,255,0.2)' }}
              labelStyle={{ color: colors.text }}
            >
              Cancel
            </Button>
            <Button 
              mode="contained" 
              loading={submittingReply}
              onPress={handlePostReply} 
              style={{ backgroundColor: colors.primary, borderRadius: 12 }}
              labelStyle={{ color: '#FFF', fontWeight: 'bold' }}
            >
              Post Reply
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* FEATURE 10: SERVICE AREA RADIUS SELECTOR DIALOG */}
      <Portal>
        <Dialog 
          visible={showRadiusDialog} 
          onDismiss={() => setShowRadiusDialog(false)}
          style={{ backgroundColor: colors.card, borderRadius: 26 }}
        >
          <Dialog.Title style={{ color: colors.primary, fontWeight: 'bold', textAlign: 'center' }}>
            🗺️ Service Area Radius
          </Dialog.Title>
          <Dialog.Content>
            <Text style={{ color: colors.text, fontSize: 13, textAlign: 'center', marginBottom: 15, opacity: 0.9 }}>
              Restrict job matching sector radius from your home address coordinate base. AI discovery automatically filters remote requests!
            </Text>

            <View style={{ 
              backgroundColor: 'rgba(255, 255, 255, 0.03)', 
              borderRadius: 20, 
              padding: 16, 
              borderWidth: 1, 
              borderColor: 'rgba(255,255,255,0.06)',
              alignItems: 'center'
            }}>
              <Text style={{ color: colors.subtext, fontSize: 11, fontWeight: 'bold', letterSpacing: 1 }}>
                CURRENT RANGE
              </Text>
              <Text style={{ color: colors.primary, fontSize: 32, fontWeight: 'bold', marginVertical: 6 }}>
                {radiusKm} <Text style={{ fontSize: 18 }}>km</Text>
              </Text>

              {/* STUNNING custom nodes progress bar selector */}
              <View style={{ width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 15, position: 'relative' }}>
                {/* Horizontal line background */}
                <View style={{
                  position: 'absolute',
                  left: 10,
                  right: 10,
                  height: 4,
                  backgroundColor: 'rgba(255,255,255,0.08)',
                  borderRadius: 2,
                  zIndex: 0
                }} />

                {/* Horizontal line progress fill */}
                <View style={{
                  position: 'absolute',
                  left: 10,
                  width: `${((radiusKm - 2) / 28) * 100}%`,
                  height: 4,
                  backgroundColor: colors.primary,
                  borderRadius: 2,
                  zIndex: 1
                }} />

                {/* Circle nodes for distances */}
                {[2, 5, 10, 15, 20, 25, 30].map((val) => {
                  const isSelected = radiusKm === val;
                  const isPassed = radiusKm >= val;
                  return (
                    <TouchableOpacity
                      key={val}
                      onPress={() => setRadiusKm(val)}
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 12,
                        backgroundColor: isSelected ? colors.primary : isPassed ? '#10B981' : colors.card,
                        borderWidth: 2,
                        borderColor: isSelected || isPassed ? '#FFFFFF' : 'rgba(255,255,255,0.2)',
                        justifyContent: 'center',
                        alignItems: 'center',
                        zIndex: 2,
                        shadowColor: colors.primary,
                        shadowOffset: { width: 0, height: 0 },
                        shadowOpacity: isSelected ? 0.8 : 0,
                        shadowRadius: 8,
                        elevation: isSelected ? 4 : 0
                      }}
                    >
                      <Text style={{ color: '#FFFFFF', fontSize: 8, fontWeight: 'bold' }}>{val}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={{ width: '100%', flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, paddingHorizontal: 4 }}>
                <Text style={{ color: colors.subtext, fontSize: 10 }}>2km (Local)</Text>
                <Text style={{ color: colors.subtext, fontSize: 10 }}>30km (City-wide)</Text>
              </View>
            </View>
          </Dialog.Content>

          <Dialog.Actions style={{ paddingHorizontal: 20, paddingBottom: 20 }}>
            <Button 
              mode="outlined" 
              onPress={() => setShowRadiusDialog(false)} 
              style={{ flex: 1, marginRight: 10, borderRadius: 12, borderColor: 'rgba(255,255,255,0.2)' }}
              labelStyle={{ color: colors.text }}
            >
              Cancel
            </Button>
            <Button 
              mode="contained" 
              loading={savingRadius}
              onPress={saveRadiusSettings} 
              style={{ flex: 1, backgroundColor: colors.primary, borderRadius: 12 }}
              labelStyle={{ color: '#FFF', fontWeight: 'bold' }}
            >
              Save Radius
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradientHeader: {
    paddingTop: 55,
    paddingHorizontal: 20,
    paddingBottom: 25,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    marginRight: 12,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  providerName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  tierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  tierLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  earningsCard: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  earningsTitle: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  earningsAmt: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 4,
  },
  escrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  escrowText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },
  jobsSection: {
    flex: 1,
    paddingTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginHorizontal: 20,
    marginBottom: 12,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  jobCard: {
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: 15,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  serviceName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  bookingRef: {
    fontSize: 11,
    marginTop: 2,
  },
  statusBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    height: 22,
    alignSelf: 'center',
  },
  divider: {
    marginVertical: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  infoIcon: {
    margin: 0,
    marginRight: 8,
  },
  infoText: {
    fontSize: 13,
    flex: 1,
  },
  complainCell: {
    backgroundColor: 'rgba(239, 68, 68, 0.06)',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.15)',
    marginTop: 12,
  },
  complainHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  complainTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#EF4444',
  },
  complainReason: {
    fontSize: 12,
    color: '#B91C1C',
    fontStyle: 'italic',
    lineHeight: 16,
  },
  actionRow: {
    marginTop: 15,
    justifyContent: 'center',
  },
  btnGroup: {
    flexDirection: 'column',
    justifyContent: 'flex-start',
  },
  enRouteCard: {
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    marginBottom: 4,
  },
  actionBtn: {
    flex: 0.48,
    borderRadius: 14,
  },
  fullWidthBtn: {
    borderRadius: 14,
    height: 48,
    justifyContent: 'center',
  },
  awaitingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: 14,
    height: 44,
  },
  awaitingText: {
    fontSize: 12,
  },
  loader: {
    marginVertical: 10,
  },
  centerLoader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  emptyView: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 80,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 10,
  },
  emptySubtext: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 5,
    paddingHorizontal: 30,
  }
});

export default ProviderDashboardScreen;
