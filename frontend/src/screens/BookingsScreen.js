import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, Dimensions, TouchableOpacity, Alert } from 'react-native';
import { Text, Card, Avatar, Button, Chip, SegmentedButtons, Portal, Dialog, TextInput, IconButton, ActivityIndicator, Divider } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import * as Animatable from 'react-native-animatable';
import axios from 'axios';

import useAuthStore from '../store/useAuthStore';
import useSettingsStore from '../store/useSettingsStore';
import { getTheme } from '../utils/themeColors';
import { auth } from '../config/firebase';

const { width } = Dimensions.get('window');
const API_BASE_URL = 'https://emperor-afraid-reformed.ngrok-free.dev/api';

const BookingsScreen = () => {
  const navigation = useNavigation();
  const { user, token } = useAuthStore();
  const { theme } = useSettingsStore();
  const colors = getTheme(theme);

  const [filter, setFilter] = useState('active');
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Favorites state
  const [favorites, setFavorites] = useState([]);

  // Dispute dialog states
  const [disputeVisible, setDisputeVisible] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState(null);
  const [disputeReason, setDisputeReason] = useState('');
  
  // AI Arbitration state
  const [arbitrateVisible, setArbitrateVisible] = useState(false);
  const [arbitrateVerdict, setArbitrateVerdict] = useState(null);
  const [submittingAction, setSubmittingAction] = useState(false);

  // Feature 9: Customer Rating & Review States
  const [reviewVisible, setReviewVisible] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  const fetchBookings = useCallback(async (showIndicator = true) => {
    if (showIndicator) setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/booking/user/${user?.id || user?.uid}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        // Sort bookings by date descending
        const sorted = response.data.data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setBookings(sorted);
      }
    } catch (error) {
      console.error("Error fetching bookings:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, token]);

  const fetchFavorites = useCallback(async () => {
    if (!token) return;
    try {
      const response = await axios.get(`${API_BASE_URL}/providers/favorites`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setFavorites(response.data.data.map(p => p.id));
      }
    } catch (error) {
      console.error("Error fetching favorites:", error);
    }
  }, [token]);

  useEffect(() => {
    fetchBookings();
    fetchFavorites();
  }, [fetchBookings, fetchFavorites]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchBookings(false);
    fetchFavorites();
  };

  const handleToggleFavorite = async (providerId) => {
    if (!token || !providerId) return;
    try {
      const response = await axios.post(`${API_BASE_URL}/providers/${providerId}/favorite`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        if (response.data.isFavorite) {
          setFavorites(prev => [...prev, providerId]);
          Alert.alert("Favorite Added 💜", "You have added this provider to your favorites! They will be prioritized in future matching.");
        } else {
          setFavorites(prev => prev.filter(id => id !== providerId));
          Alert.alert("Favorite Removed", "Removed from your favorite providers list.");
        }
      }
    } catch (error) {
      console.error("Error toggling favorite:", error);
      Alert.alert("Error", "Failed to update favorite status.");
    }
  };

  const handleSubmitReview = async () => {
    if (!selectedBookingId) return;
    setSubmittingReview(true);
    try {
      const res = await axios.post(
        `${API_BASE_URL}/booking/${selectedBookingId}/review`,
        { rating: reviewRating, comment: reviewComment },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.success) {
        Alert.alert("🎉 Review Submitted!", "Your rating and feedback have been logged in Firestore and provider averages updated instantly!");
        setReviewVisible(false);
        onRefresh();
      }
    } catch (e) {
      console.error("Error submitting review:", e);
      Alert.alert("Error", "Failed to submit review. Please try again.");
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleEscrowAction = async (bookingId, action, reason = '') => {
    setSubmittingAction(true);
    try {
      const response = await axios.post(
        `${API_BASE_URL}/booking/${bookingId}/escrow-action`,
        { action, disputeReason: reason },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.data.success) {
        // Refresh local bookings list
        await fetchBookings(false);
        
        // Quietly update wallet details in useAuthStore
        const authStore = useAuthStore.getState();
        if (auth.currentUser) {
          await authStore.fetchUserProfile(auth.currentUser);
        }
      }
    } catch (error) {
      console.error("Error submitting escrow action:", error);
      alert("Failed to submit escrow action.");
    } finally {
      setSubmittingAction(false);
      setDisputeVisible(false);
      setDisputeReason('');
    }
  };

  const handleRunAIArbitration = async (bookingId) => {
    setSubmittingAction(true);
    try {
      const response = await axios.post(
        `${API_BASE_URL}/booking/${bookingId}/arbitrate`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.data.success) {
        setArbitrateVerdict(response.data.verdict);
        setArbitrateVisible(true);
        await fetchBookings(false);
        // Sync wallet profiles
        const authStore = useAuthStore.getState();
        if (auth.currentUser) {
          await authStore.fetchUserProfile(auth.currentUser);
        }
      }
    } catch (error) {
      console.error("AI Arbitration failed:", error);
      alert(error.response?.data?.message || "Arbitration failed.");
    } finally {
      setSubmittingAction(false);
    }
  };

  const filteredBookings = bookings.filter(b => {
    if (filter === 'active') {
      return ['confirmed', 'accepted', 'in-progress', 'solved'].includes(b.status);
    } else if (filter === 'completed') {
      return b.status === 'completed';
    } else {
      return ['cancelled', 'rejected', 'disputed'].includes(b.status);
    }
  });

  const renderBooking = ({ item, index }) => {
    // Determine color coding for statuses
    let statusLabel = item.status;
    let statusBg = colors.primary + '15';
    let statusColor = colors.primary;

    if (item.status === 'confirmed') {
      statusLabel = 'Assigned';
      statusBg = '#F59E0B20';
      statusColor = '#F59E0B';
    } else if (item.status === 'accepted') {
      statusLabel = 'Accepted';
      statusBg = '#3B82F620';
      statusColor = '#3B82F6';
    } else if (item.status === 'in-progress') {
      statusLabel = 'In Progress';
      statusBg = '#8B5CF620';
      statusColor = '#8B5CF6';
    } else if (item.status === 'solved') {
      statusLabel = 'Solved';
      statusBg = '#10B98120';
      statusColor = '#10B981';
    } else if (item.status === 'completed') {
      statusLabel = 'Completed';
      statusBg = '#10B98120';
      statusColor = '#10B981';
    } else if (item.status === 'disputed') {
      statusLabel = 'Disputed';
      statusBg = '#EF444420';
      statusColor = '#EF4444';
    } else if (item.status === 'rejected') {
      statusLabel = 'Rejected';
      statusBg = '#EF444420';
      statusColor = '#EF4444';
    } else if (item.status === 'en-route') {
      statusLabel = '🚗 Provider On Way';
      statusBg = '#6366F120';
      statusColor = '#6366F1';
    } else if (item.status === 'arrived') {
      statusLabel = '📍 Provider Arrived';
      statusBg = '#22C55E20';
      statusColor = '#22C55E';
    }

    return (
      <Animatable.View animation="fadeInUp" delay={index * 100} duration={500}>
        <Card style={[styles.bookingCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Card.Content>
            {/* Header section */}
            <View style={styles.cardHeader}>
              <View style={styles.providerRow}>
                <Avatar.Image 
                  size={42} 
                  source={{ uri: `https://ui-avatars.com/api/?name=${encodeURIComponent(item.providerName || 'Provider')}&background=3B82F6&color=fff` }} 
                />
                <View style={styles.providerInfo}>
                  <Text style={[styles.providerName, { color: colors.text }]}>{item.providerName}</Text>
                  <Text style={[styles.serviceText, { color: colors.subtext }]}>{item.serviceName}</Text>
                </View>
              </View>
              <Chip 
                mode="flat" 
                style={[styles.statusChip, { backgroundColor: statusBg }]}
                textStyle={[styles.statusText, { color: statusColor }]}
              >
                {statusLabel.toUpperCase()}
              </Chip>
            </View>

            {/* Escrow visual locked overlay */}
            {['confirmed', 'accepted', 'in-progress', 'solved', 'en-route', 'arrived'].includes(item.status) && (
              <View style={styles.escrowOverlay}>
                <IconButton icon="shield-check" iconColor="#10B981" size={16} style={{ margin: 0 }} />
                <Text style={styles.escrowOverlayText}>SafePay Escrow Secured</Text>
              </View>
            )}

            {/* 🗺 LIVE TRACKING button for en-route or arrived */}
            {['en-route', 'arrived'].includes(item.status) && (
              <TouchableOpacity
                activeOpacity={0.85}
                style={{
                  backgroundColor: item.status === 'arrived' ? '#22C55E15' : '#6366F115',
                  borderRadius: 16, padding: 14, marginTop: 10,
                  borderWidth: 1,
                  borderColor: item.status === 'arrived' ? '#22C55E' : '#6366F1',
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'
                }}
                onPress={() => navigation.navigate('LiveTracking', {
                  bookingId: item.id,
                  customerLat: user?.latitude || 33.6844,
                  customerLng: user?.longitude || 73.0479,
                  providerName: item.providerName,
                  providerAvatar: item.providerAvatar,
                })}
              >
                <View>
                  <Text style={{ color: item.status === 'arrived' ? '#22C55E' : '#6366F1', fontWeight: '800', fontSize: 15 }}>
                    {item.status === 'arrived' ? '📍 Provider Has Arrived!' : '🚗 Track Provider Live'}
                  </Text>
                  <Text style={{ color: '#94A3B8', fontSize: 12, marginTop: 2 }}>
                    {item.status === 'arrived' ? 'Tap to see arrival details' : 'See live GPS map with ETA'}
                  </Text>
                </View>
                <Text style={{ fontSize: 24 }}>{item.status === 'arrived' ? '🎉' : '🗺️'}</Text>
              </TouchableOpacity>
            )}

            {/* Main details footer */}
            <View style={styles.cardFooter}>
              <View>
                <Text style={styles.footerLabel}>Scheduled Time</Text>
                <Text style={[styles.footerValue, { color: colors.text }]}>
                  {item.scheduledDate} • {item.scheduledTime}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.footerLabel}>Secure Escrow Amount</Text>
                <Text style={[styles.footerValue, { color: colors.text, fontWeight: 'bold' }]}>
                  {item.price || item.cost || 2500} PKR
                </Text>
              </View>
            </View>

            {/* Interactive Yes/No Release block if status is solved */}
            {item.status === 'solved' && (
              <View style={styles.solveBlock}>
                <Text style={[styles.solveTitle, { color: colors.text }]}>
                  🛠️ Job Marked as Solved
                </Text>
                <Text style={styles.solveDescription}>
                  Did the service provider complete the task correctly to your satisfaction?
                </Text>
                <View style={styles.solveBtnRow}>
                  <Button 
                    mode="outlined" 
                    onPress={() => {
                      setSelectedBookingId(item.id);
                      setDisputeVisible(true);
                    }}
                    style={styles.solveBtnNo}
                    labelStyle={{ color: '#EF4444', fontWeight: 'bold', fontSize: 13 }}
                  >
                    No, Dispute
                  </Button>
                  <Button 
                    mode="contained" 
                    onPress={() => handleEscrowAction(item.id, 'release')}
                    style={[styles.solveBtnYes, { backgroundColor: colors.primary }]}
                    labelStyle={{ color: '#FFFFFF', fontWeight: 'bold', fontSize: 13 }}
                  >
                    Yes, Release Funds
                  </Button>
                </View>
              </View>
            )}

            {/* AI Arbitration Trigger block if status is disputed */}
            {item.status === 'disputed' && (
              <View style={[styles.solveBlock, { borderTopColor: '#EF444430', backgroundColor: '#EF444408', padding: 15, borderRadius: 16, marginTop: 15 }]}>
                <Text style={[styles.solveTitle, { color: '#EF4444', fontSize: 15, fontWeight: 'bold', marginBottom: 6 }]}>
                  ⚖️ Escrow Disputed & Locked
                </Text>
                <Text style={[styles.solveDescription, { color: colors.text, marginBottom: 10 }]}>
                  Your complaint: <Text style={{ fontWeight: '600', fontStyle: 'italic' }}>"{item.disputeReason || 'No details provided'}"</Text>
                </Text>
                <Text style={{ fontSize: 11, color: colors.subtext, marginBottom: 12, lineHeight: 15 }}>
                  Settle this complaint instantly via autonomic AI Arbitration. The agent will read logs, ratings, and timeline steps to split the locked escrow balance fairly.
                </Text>
                <Button 
                  mode="contained" 
                  onPress={() => handleRunAIArbitration(item.id)}
                  loading={submittingAction}
                  style={{ backgroundColor: '#EF4444', borderRadius: 12 }}
                  labelStyle={{ color: '#FFFFFF', fontWeight: 'bold', fontSize: 13 }}
                  icon="scale-balance"
                >
                  Settle with AI Arbitrator
                </Button>
              </View>
            )}

            {['confirmed', 'accepted', 'in-progress'].includes(item.status) && (
              <View>
                <Button 
                  mode="contained" 
                  onPress={() => navigation.navigate('Tracking', { bookingId: item.id })}
                  style={[styles.trackButton, { backgroundColor: colors.primary }]}
                  labelStyle={{ fontWeight: 'bold' }}
                  icon="map-marker-distance"
                >
                  Track Live Booking
                </Button>
                
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
                  <Button 
                    mode="outlined" 
                    onPress={() => {
                      const phone = item.providerPhone || "+92 301 8899776";
                      Alert.alert("Call Provider 📞", `Technician Direct Line: ${phone}\n\nStrictly monitored by KaamKonnect AI SafePay Safety Guard.`);
                    }}
                    style={{ flex: 0.47, borderRadius: 12, borderColor: colors.primary, height: 40, justifyContent: 'center' }}
                    labelStyle={{ color: colors.primary, fontWeight: 'bold', fontSize: 11 }}
                    icon="phone-outline"
                  >
                    Call Provider
                  </Button>
                  <Button 
                    mode="contained" 
                    onPress={() => navigation.navigate('Chat', { bookingId: item.id, partnerName: item.providerName })}
                    style={{ flex: 0.47, borderRadius: 12, backgroundColor: '#3B82F6', height: 40, justifyContent: 'center' }}
                    labelStyle={{ color: 'white', fontWeight: 'bold', fontSize: 11 }}
                    icon="message-text-outline"
                  >
                    AI Chat
                  </Button>
                </View>
              </View>
            )}

            {item.status === 'completed' && (
              <View style={{ marginTop: 15 }}>
                <Divider style={{ marginVertical: 10, backgroundColor: colors.border }} />
                
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Button 
                    mode="contained" 
                    onPress={() => {
                      navigation.navigate('Home', {
                        prefillRequest: `Mujhe dobara AC service/repair chahiye provider ${item.providerName || ''} ke saath`,
                        budgetType: 'flexible',
                        selectionMode: 'auto',
                        autoTrigger: false
                      });
                    }}
                    style={{ flex: 0.32, borderRadius: 14, backgroundColor: colors.primary, height: 40, justifyContent: 'center' }}
                    labelStyle={{ fontWeight: 'bold', fontSize: 10, color: 'white' }}
                  >
                    Rebook 🔁
                  </Button>

                  {item.reviewed ? (
                    <View style={{ 
                      flex: 0.32, 
                      height: 40, 
                      backgroundColor: 'rgba(16, 185, 129, 0.08)', 
                      borderRadius: 14, 
                      justifyContent: 'center', 
                      alignItems: 'center', 
                      borderWidth: 1, 
                      borderColor: '#10B981' 
                    }}>
                      <Text style={{ color: '#10B981', fontWeight: 'bold', fontSize: 10 }}>Rated ⭐</Text>
                    </View>
                  ) : (
                    <Button 
                      mode="contained"
                      onPress={() => {
                        setSelectedBookingId(item.id);
                        setReviewRating(5);
                        setReviewComment("");
                        setReviewVisible(true);
                      }}
                      style={{ flex: 0.32, borderRadius: 14, backgroundColor: '#F59E0B', height: 40, justifyContent: 'center' }}
                      labelStyle={{ fontWeight: 'bold', fontSize: 10, color: 'white' }}
                      icon="star"
                    >
                      Rate
                    </Button>
                  )}
                  
                  <Button 
                    mode={favorites.includes(item.providerId) ? "contained" : "outlined"}
                    onPress={() => handleToggleFavorite(item.providerId)}
                    style={{ 
                      flex: 0.32, 
                      borderRadius: 14, 
                      borderColor: '#A855F7', 
                      backgroundColor: favorites.includes(item.providerId) ? '#A855F7' : 'transparent',
                      height: 40,
                      justifyContent: 'center'
                    }}
                    textColor={favorites.includes(item.providerId) ? 'white' : '#A855F7'}
                    labelStyle={{ fontWeight: 'bold', fontSize: 10 }}
                    icon={favorites.includes(item.providerId) ? "star" : "star-outline"}
                  >
                    Fav
                  </Button>
                </View>
              </View>
            )}
          </Card.Content>
        </Card>
      </Animatable.View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header Container */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>My AI Bookings</Text>
        <SegmentedButtons
          value={filter}
          onValueChange={setFilter}
          buttons={[
            { value: 'active', label: 'Active' },
            { value: 'completed', label: 'Completed' },
            { value: 'cancelled', label: 'Disputed' },
          ]}
          style={styles.filters}
          theme={{ colors: { primary: colors.primary } }}
        />
      </View>

      {loading ? (
        <View style={styles.loaderCenter}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loaderText, { color: colors.subtext }]}>Fetching bookings...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredBookings}
          renderItem={renderBooking}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
          }
          ListEmptyComponent={() => (
            <View style={styles.empty}>
              <IconButton icon="calendar-blank" size={48} iconColor={colors.subtext} />
              <Text style={{ color: colors.subtext, fontWeight: '500' }}>No {filter} bookings found.</Text>
            </View>
          )}
        />
      )}

      {/* DISPUTE REFUND REASON MODAL */}
      <Portal>
        <Dialog 
          visible={disputeVisible} 
          onDismiss={() => setDisputeVisible(false)}
          style={{ backgroundColor: colors.card, borderRadius: 24 }}
        >
          <Dialog.Title style={{ color: '#EF4444', fontWeight: 'bold' }}>
            🚨 File Escrow Dispute
          </Dialog.Title>
          <Dialog.Content>
            <Text style={[styles.disputeIntroText, { color: colors.text }]}>
              Please describe the issue or reason for the dispute. Funds will remain securely locked in SafePay escrow until resolved.
            </Text>
            <TextInput
              label="Dispute Reason / Details"
              value={disputeReason}
              onChangeText={setDisputeReason}
              mode="outlined"
              multiline
              numberOfLines={3}
              textColor={colors.text}
              activeOutlineColor="#EF4444"
              style={styles.disputeInput}
            />
          </Dialog.Content>
          <Dialog.Actions style={{ paddingHorizontal: 15, paddingBottom: 15 }}>
            <Button 
              onPress={() => setDisputeVisible(false)}
              labelStyle={{ color: colors.subtext, fontWeight: 'bold' }}
            >
              Cancel
            </Button>
            <Button 
              mode="contained"
              onPress={() => handleEscrowAction(selectedBookingId, 'dispute', disputeReason)}
              style={{ backgroundColor: '#EF4444', borderRadius: 12 }}
              labelStyle={{ color: '#FFFFFF', fontWeight: 'bold' }}
              loading={submittingAction}
              disabled={!disputeReason.trim()}
            >
              Submit Dispute
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

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

      {/* FEATURE 9: CUSTOMER RATINGS & STAR REVIEWS SUBMISSION MODAL */}
      <Portal>
        <Dialog 
          visible={reviewVisible} 
          onDismiss={() => setReviewVisible(false)}
          style={{ backgroundColor: colors.card, borderRadius: 26 }}
        >
          <Dialog.Title style={{ color: colors.primary, fontWeight: 'bold', textAlign: 'center' }}>
            🌟 Rate Your Experience
          </Dialog.Title>
          <Dialog.Content>
            <Text style={{ color: colors.subtext, fontSize: 13, textAlign: 'center', marginBottom: 15 }}>
              Aapka feedback direct service provider aur AI routing engines ko train krne ke liye save kia jaega.
            </Text>

            {/* Interactive Stars Selector */}
            <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 20 }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => setReviewRating(star)}
                  style={{ paddingHorizontal: 6 }}
                >
                  <IconButton
                    icon="star"
                    iconColor={star <= reviewRating ? "#F59E0B" : "rgba(255,255,255,0.15)"}
                    size={36}
                    style={{ margin: 0 }}
                  />
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              mode="outlined"
              label="Apna experience batayein (Roman Urdu)"
              placeholder="e.g. Bohat achi AC technician service thi, jaldi kaam kr dia!"
              value={reviewComment}
              onChangeText={setReviewComment}
              multiline
              numberOfLines={3}
              textColor={colors.text}
              theme={{ colors: { primary: colors.primary } }}
              style={{ backgroundColor: 'transparent' }}
            />
          </Dialog.Content>
          <Dialog.Actions style={{ paddingHorizontal: 20, paddingBottom: 20 }}>
            <Button 
              mode="outlined" 
              onPress={() => setReviewVisible(false)} 
              style={{ flex: 1, marginRight: 10, borderRadius: 12, borderColor: 'rgba(255,255,255,0.2)' }}
              labelStyle={{ color: colors.text }}
            >
              Cancel
            </Button>
            <Button 
              mode="contained" 
              loading={submittingReview}
              onPress={handleSubmitReview} 
              style={{ flex: 1, backgroundColor: colors.primary, borderRadius: 12 }}
              labelStyle={{ color: '#FFF', fontWeight: 'bold' }}
            >
              Submit Review
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
  header: {
    paddingTop: 55,
    paddingHorizontal: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    elevation: 4,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  filters: {
    borderRadius: 20,
  },
  listContent: {
    padding: 20,
    paddingBottom: 30,
  },
  bookingCard: {
    marginBottom: 16,
    borderRadius: 24,
    borderWidth: 1,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  providerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  providerInfo: {
    marginLeft: 12,
  },
  providerName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  serviceText: {
    fontSize: 13,
    marginTop: 2,
  },
  statusChip: {
    height: 24,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  escrowOverlay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderRadius: 12,
    paddingVertical: 2,
    paddingHorizontal: 8,
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  escrowOverlayText: {
    fontSize: 11,
    color: '#10B981',
    fontWeight: 'bold',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  footerLabel: {
    fontSize: 10,
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  footerValue: {
    fontSize: 13,
    marginTop: 2,
  },
  trackButton: {
    marginTop: 15,
    borderRadius: 14,
    height: 44,
    justifyContent: 'center',
  },
  solveBlock: {
    marginTop: 15,
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
    borderRadius: 18,
    padding: 15,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.15)',
  },
  solveTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  solveDescription: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
    marginBottom: 12,
  },
  solveBtnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  solveBtnNo: {
    flex: 0.47,
    borderRadius: 12,
    borderColor: '#EF4444',
  },
  solveBtnYes: {
    flex: 0.47,
    borderRadius: 12,
  },
  loaderCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderText: {
    marginTop: 12,
    fontSize: 14,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 120,
  },
  disputeIntroText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 15,
  },
  disputeInput: {
    backgroundColor: 'transparent',
    marginTop: 5,
  }
});

export default BookingsScreen;
