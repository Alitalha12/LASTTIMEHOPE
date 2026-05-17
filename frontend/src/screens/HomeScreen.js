import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Image, Dimensions } from 'react-native';
import { Text, TextInput, IconButton, useTheme, Avatar, Portal, Dialog, Button, ActivityIndicator } from 'react-native-paper';
import axios from 'axios';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as Animatable from 'react-native-animatable';
import useAuthStore from '../store/useAuthStore';
import useStore from '../store/useStore';
import useSettingsStore from '../store/useSettingsStore';
import HamburgerMenu from '../components/HamburgerMenu';
import { t } from '../utils/i18n';
import { getTheme } from '../utils/themeColors';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';

const { width } = Dimensions.get('window');

const HomeScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { user, userProfile } = useAuthStore();
  const { language, theme: currentThemeName } = useSettingsStore();
  const orchestrate = useStore(state => state.sendServiceRequest);
  
  // Refreshed Store actions
  const notifications = useStore(state => state.notifications);
  const fetchNotifications = useStore(state => state.fetchNotifications);
  const markNotificationRead = useStore(state => state.markNotificationRead);
  const addLocalNotification = useStore(state => state.addLocalNotification);
  const refreshUserProfile = useAuthStore(state => state.refreshUserProfile);

  const colors = getTheme(currentThemeName);
  
  const [request, setRequest] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { userSettings } = useAuthStore();
  const [preflightVisible, setPreflightVisible] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranslatingVoice, setIsTranslatingVoice] = useState(false);
  const [simulatedVoiceNote, setSimulatedVoiceNote] = useState('');
  const [recording, setRecording] = useState(null);
  
  // Advanced Bidding & Safety States
  const [budgetType, setBudgetType] = useState('flexible');
  const [maxBudget, setMaxBudget] = useState('3000');
  const [selectionMode, setSelectionMode] = useState('auto');
  const [scheduleMode, setScheduleMode] = useState('auto');
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const [hasConfirmedPreflight, setHasConfirmedPreflight] = useState(false);
  const [emergencyMode, setEmergencyMode] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [redeemCoins, setRedeemCoins] = useState(false);
  
  // Real-time synchronization
  React.useEffect(() => {
    if (!user?.id) return;

    fetchNotifications(user.id);
    refreshUserProfile();

    // Socket.io real-time connection
    let socket;
    try {
      const { io } = require('socket.io-client');
      socket = io('https://emperor-afraid-reformed.ngrok-free.dev', { transports: ['websocket'] });

      socket.on('connect', () => {
        console.log("Connected to Realtime Notification Node");
      });

      socket.on('notification_received', (notif) => {
        if (notif.userId === user.id) {
          addLocalNotification(notif);
          refreshUserProfile();
          
          // Gentle micro-haptic vibration
          const { Vibration } = require('react-native');
          Vibration.vibrate([0, 200]);
        }
      });
    } catch (sockErr) {
      console.log("Socket connection issue in HomeScreen:", sockErr.message);
    }

    return () => {
      if (socket) socket.disconnect();
    };
  }, [user?.id]);

  React.useEffect(() => {
    if (route.params?.prefillRequest) {
      setRequest(route.params.prefillRequest);
      if (route.params.budgetType) setBudgetType(route.params.budgetType);
      if (route.params.maxBudget) setMaxBudget(String(route.params.maxBudget));
      if (route.params.selectionMode) setSelectionMode(route.params.selectionMode);
      if (route.params.scheduleMode) setScheduleMode(route.params.scheduleMode);
      
      if (route.params.autoTrigger) {
        const trigger = async () => {
          await orchestrate(route.params.prefillRequest, {
            budgetType: route.params.budgetType || 'flexible',
            maxBudget: parseFloat(route.params.maxBudget) || 3000,
            selectionMode: route.params.selectionMode || 'auto',
            scheduleMode: route.params.scheduleMode || 'auto',
            redeemCoins
          });
          setRedeemCoins(false);
          navigation.navigate('Processing');
        };
        setTimeout(trigger, 600);
      }
    }
  }, [route.params]);

  const startVoiceRecording = async () => {
    try {
      console.log("Requesting microphone permissions...");
      
      // Safety check: is Audio defined and has requestPermissionsAsync?
      if (!Audio || typeof Audio.requestPermissionsAsync !== 'function') {
        throw new Error("Microphone API not supported in this client environment.");
      }

      const permission = await Audio.requestPermissionsAsync();
      
      if (permission && permission.status === 'granted') {
        if (typeof Audio.setAudioModeAsync === 'function') {
          await Audio.setAudioModeAsync({
            allowsRecordingIOS: true,
            playsInSilentModeIOS: true,
          });
        }
        
        console.log("Starting Audio Recording...");
        if (Audio.Recording && typeof Audio.Recording.createAsync === 'function') {
          const { recording: newRecording } = await Audio.Recording.createAsync(
            Audio.RecordingOptionsPresets.HIGH_QUALITY
          );
          setRecording(newRecording);
          setIsRecording(true);
          setSimulatedVoiceNote(''); // Clear simulation
        } else {
          throw new Error("Audio Recording class not available.");
        }
      } else {
        alert("Microphone permission is required to record voice notes!");
      }
    } catch (err) {
      console.log("Graceful microphone simulation fallback activated:", err.message);
      setIsRecording(true);
      setRecording(null); // Triggers simulated preset dialog
      setSimulatedVoiceNote('Yaar mere ghar ka AC bilkul thanda nahi kar raha, jaldi se kisi repairer ko bhej do.');
    }
  };

  const stopVoiceRecordingAndTranscribe = async () => {
    if (!recording) {
      // Fallback if no real recording active (simulated mode)
      setIsRecording(false);
      setIsTranslatingVoice(true);
      try {
        const response = await axios.post('https://emperor-afraid-reformed.ngrok-free.dev/api/chat/voice-transcribe', {
          audioDescription: simulatedVoiceNote || 'Yaar mere ghar ka AC bilkul thanda nahi kar raha, jaldi se kisi repairer ko bhej do.'
        });
        if (response.data.success) {
          setRequest(response.data.transcription);
        }
      } catch (err) {
        console.error("Fallback transcription failed:", err);
        setRequest(simulatedVoiceNote || 'Yaar mere ghar ka AC bilkul thanda nahi kar raha, jaldi se kisi repairer ko bhej do.');
      } finally {
        setIsTranslatingVoice(false);
      }
      return;
    }

    setIsRecording(false);
    setIsTranslatingVoice(true);
    
    try {
      console.log("Stopping Audio Recording...");
      await recording.stopAndUnloadAsync();
      
      const uri = recording.getURI();
      console.log("Recorded file local URI:", uri);
      
      // Read the audio file as a base64 string
      const base64Audio = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      console.log("Uploading audio file for real-time speech transcription...");
      
      const response = await axios.post('https://emperor-afraid-reformed.ngrok-free.dev/api/chat/voice-transcribe', {
        audioBase64: base64Audio,
      });
      
      if (response.data.success) {
        setRequest(response.data.transcription);
      } else {
        alert("Speech translation was not able to understand clearly. Please try again.");
      }
    } catch (error) {
      console.error('Transcription failed:', error);
      alert("Microphone capture failed. Please ensure speech features are working.");
    } finally {
      setRecording(null);
      setIsTranslatingVoice(false);
    }
  };

  const handleOrchestrate = async () => {
    if (!request.trim()) return;

    // Pre-flight check: show custom dialog if defaults are in place and hasn't been bypassed
    if (!hasConfirmedPreflight && (!userSettings || userSettings.preferredLanguage === 'roman_urdu')) {
      setPreflightVisible(true);
      return;
    }

    await orchestrate(request, {
      budgetType,
      maxBudget: parseFloat(maxBudget) || 3000,
      selectionMode,
      scheduleMode,
      emergencyMode,
      redeemCoins
    });
    setRedeemCoins(false);
    navigation.navigate('Processing');
  };

  const handleOrchestrateProactive = async () => {
    const promptText = "Mujhe kal subah AC technician chahiye preventive tuning k liye G-13 Islamabad mein";
    setRequest(promptText);
    await orchestrate(promptText, {
      budgetType: 'flexible',
      selectionMode: 'auto',
      scheduleMode: 'auto',
      emergencyMode: false,
      redeemCoins
    });
    setRedeemCoins(false);
    navigation.navigate('Processing');
  };

  const handleProceedWithDefaults = async () => {
    setPreflightVisible(false);
    setHasConfirmedPreflight(true);
    await orchestrate(request, {
      budgetType,
      maxBudget: parseFloat(maxBudget) || 3000,
      selectionMode,
      scheduleMode,
      emergencyMode,
      redeemCoins
    });
    setRedeemCoins(false);
    navigation.navigate('Processing');
  };

  const handleGoToSettings = () => {
    setPreflightVisible(false);
    navigation.navigate('Settings');
  };

  const userInitial = user?.fullName?.charAt(0).toUpperCase() || 'U';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* HEADER WITH HAMBURGER */}
      <View style={[styles.header, { backgroundColor: colors.header, borderBottomColor: colors.border }]}>
        <IconButton 
          icon="menu" 
          size={28} 
          iconColor={colors.text}
          onPress={() => setIsMenuOpen(true)} 
        />
        <View style={styles.headerLogo}>
           <Image 
             source={require('../../assets/kaamkonnect_logo.png')} 
             style={styles.logoMini} 
             resizeMode="contain"
           />
           <Text style={[styles.headerTitle, { color: colors.text }]}>KaamKonnect</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <IconButton 
            icon="cog-outline" 
            size={24} 
            iconColor={colors.subtext}
            onPress={() => navigation.navigate('Settings')}
          />
          <View style={{ position: 'relative' }}>
            <IconButton 
              icon="bell-outline" 
              size={24} 
              iconColor={colors.subtext} 
              onPress={() => setShowNotifications(true)}
            />
            {notifications.filter(n => n.status === 'unread').length > 0 && (
              <View style={{
                position: 'absolute',
                right: 6,
                top: 6,
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
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* GREETING */}
        <Animatable.View animation="fadeIn" style={styles.greetingSection}>
          <Text style={[styles.welcomeText, { color: colors.text }]}>{t('salam', language)}, {user?.fullName?.split(' ')[0] || 'User'}! 👋</Text>
          <Text style={[styles.tagline, { color: colors.subtext }]}>{t('how_help', language)}</Text>
        </Animatable.View>

        {/* AI INPUT CENTER */}
        <Animatable.View animation="zoomIn" delay={300} style={[styles.inputCard, { backgroundColor: colors.card, shadowColor: colors.text }]}>
          {/* 🚨 Emergency Switch Row */}
          <View style={{ 
            flexDirection: 'row', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            backgroundColor: emergencyMode ? 'rgba(239, 68, 68, 0.08)' : 'transparent',
            borderRadius: 14,
            paddingHorizontal: 12,
            paddingVertical: 8,
            marginBottom: 12,
            borderWidth: 1,
            borderColor: emergencyMode ? 'rgba(239, 68, 68, 0.25)' : 'transparent'
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 }}>
              <IconButton 
                icon="alert-octagon" 
                iconColor={emergencyMode ? "#EF4444" : colors.subtext} 
                size={22} 
                style={{ margin: 0, marginRight: 4 }} 
              />
              <View style={{ flex: 1 }}>
                <Text style={{ 
                  color: emergencyMode ? '#EF4444' : colors.text, 
                  fontWeight: 'bold', 
                  fontSize: 13 
                }} numberOfLines={1} ellipsizeMode="tail">
                  🚨 Emergency / Urgent Mode
                </Text>
                <Text style={{ color: colors.subtext, fontSize: 10 }} numberOfLines={1} ellipsizeMode="tail">
                  Restrict search range to 5km & secure swift booking
                </Text>
              </View>
            </View>
            <TouchableOpacity 
              onPress={() => setEmergencyMode(!emergencyMode)}
              style={{
                width: 48,
                height: 26,
                borderRadius: 13,
                backgroundColor: emergencyMode ? '#EF4444' : '#E5E7EB',
                justifyContent: 'center',
                paddingHorizontal: 2
              }}
            >
              <Animatable.View 
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  backgroundColor: '#FFFFFF',
                  alignSelf: emergencyMode ? 'flex-end' : 'flex-start',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.2,
                  shadowRadius: 1,
                  elevation: 2
                }}
              />
            </TouchableOpacity>
          </View>

          {/* 🚨 Emergency Active Alert Flasher */}
          {emergencyMode && (
            <Animatable.View 
              animation="flash" 
              iterationCount="infinite"
              duration={2000}
              style={{ 
                backgroundColor: 'rgba(239, 68, 68, 0.08)', 
                borderRadius: 12, 
                padding: 10, 
                marginBottom: 12, 
                borderWidth: 1, 
                borderColor: 'rgba(239, 68, 68, 0.25)',
                flexDirection: 'row',
                alignItems: 'center'
              }}
            >
              <IconButton icon="alert-decagram" iconColor="#EF4444" size={18} style={{ margin: 0, marginRight: 5 }} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#EF4444', fontWeight: 'bold', fontSize: 11, marginBottom: 2 }}>
                  🚨 EMERGENCY DISPATCH ACTIVE:
                </Text>
                <Text style={{ color: colors.text, fontSize: 10, lineHeight: 14 }}>
                  Proximity search range locked to <Text style={{fontWeight:'bold'}}>&lt; 5km</Text>. Maximum budget cap raised by 50% for high priority!
                </Text>
              </View>
            </Animatable.View>
          )}

          {selectionMode === 'auto' && (
            <Animatable.View 
              animation="fadeIn" 
              duration={400}
              style={{ 
                backgroundColor: 'rgba(59, 130, 246, 0.08)', 
                borderRadius: 12, 
                padding: 10, 
                marginBottom: 10, 
                borderWidth: 1, 
                borderColor: 'rgba(59, 130, 246, 0.25)',
                flexDirection: 'row',
                alignItems: 'center'
              }}
            >
              <IconButton icon="information-outline" iconColor="#3B82F6" size={18} style={{ margin: 0, marginRight: 5 }} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#3B82F6', fontWeight: 'bold', fontSize: 11, marginBottom: 2 }}>
                  ⚡ AI Auto-Pilot Active:
                </Text>
                <Text style={{ color: colors.text, fontSize: 10, lineHeight: 14 }}>
                  Apni query mein Booking Date, Time aur Amsla (problem) bilkul saaf saaf likhein takay Agent sab khud book kar sake!
                </Text>
              </View>
            </Animatable.View>
          )}

          {useSettingsStore.getState().aiMemoryEnabled && (
            <Animatable.View 
              animation="fadeIn" 
              duration={400}
              style={{ 
                backgroundColor: 'rgba(168, 85, 247, 0.08)', 
                borderRadius: 12, 
                padding: 10, 
                marginBottom: 10, 
                borderWidth: 1, 
                borderColor: 'rgba(168, 85, 247, 0.25)',
                flexDirection: 'row',
                alignItems: 'center'
              }}
            >
              <IconButton icon="brain" iconColor="#A855F7" size={18} style={{ margin: 0, marginRight: 5 }} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#A855F7', fontWeight: 'bold', fontSize: 11, marginBottom: 2 }}>
                  🧠 AI Memory Personalization Active:
                </Text>
                <Text style={{ color: colors.text, fontSize: 10, lineHeight: 14 }}>
                  AI will auto-fill your preferred sector/budget & prioritize favorite professionals based on your <Text style={{fontWeight:'bold'}}>{useSettingsStore.getState().historyDepth === 'last10' ? 'Last 10 Bookings' : useSettingsStore.getState().historyDepth === 'last30days' ? 'Last 30 Days' : useSettingsStore.getState().historyDepth === 'last90days' ? 'Last 3 Months' : 'All Time History'}</Text>!
                </Text>
              </View>
            </Animatable.View>
          )}

          <TextInput
            placeholder={
              selectionMode === 'auto'
                ? "Specify date, time, and service issue clearly (e.g. AC service tomorrow 10am)..."
                : "Type your service query here (e.g. AC thanda nahi kar raha)..."
            }
            placeholderTextColor={colors.subtext}
            value={request}
            onChangeText={setRequest}
            mode="flat"
            multiline
            textColor={colors.text}
            style={[styles.chatInput, { backgroundColor: 'transparent' }]}
            underlineColor="transparent"
            activeUnderlineColor="transparent"
          />
          <View style={styles.inputActions}>
             <IconButton 
               icon="cog-outline" 
               iconColor={showSettingsPanel ? colors.primary : colors.subtext} 
               size={24} 
               onPress={() => setShowSettingsPanel(!showSettingsPanel)}
             />
             <IconButton 
               icon="microphone" 
               iconColor={isRecording ? '#EF4444' : colors.subtext} 
               size={24} 
               onPress={isRecording ? stopVoiceRecordingAndTranscribe : startVoiceRecording}
             />
             <TouchableOpacity style={[styles.sendButton, { backgroundColor: colors.primary }]} onPress={handleOrchestrate}>
                <IconButton icon="send" iconColor="white" size={20} />
              </TouchableOpacity>
          </View>

          {/* Golden KaamCoins Loyalty Card & Checkout Toggle */}
          {user?.kaamCoins !== undefined && (
            <Animatable.View 
              animation="fadeIn" 
              duration={400}
              style={{ 
                flexDirection: 'row', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                backgroundColor: 'rgba(218, 165, 32, 0.08)', 
                borderRadius: 14,
                paddingHorizontal: 12,
                paddingVertical: 8,
                marginTop: 10,
                borderWidth: 1,
                borderColor: redeemCoins ? 'rgba(218, 165, 32, 0.5)' : 'rgba(218, 165, 32, 0.2)'
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <IconButton 
                  icon="star-circle" 
                  iconColor="#DAA520" 
                  size={20} 
                  style={{ margin: 0, marginRight: 8 }} 
                />
                <View style={{ flex: 1 }}>
                  <Text style={{ 
                    color: '#DAA520', 
                    fontWeight: 'bold', 
                    fontSize: 12 
                  }}>
                    🪙 Your KaamCoins: {user.kaamCoins} Coins
                  </Text>
                  <Text style={{ color: colors.subtext, fontSize: 10 }}>
                    Redeem coins for direct booking discounts! (1 Coin = Rs. 1)
                  </Text>
                </View>
              </View>
              {user.kaamCoins > 0 ? (
                <TouchableOpacity 
                  onPress={() => setRedeemCoins(!redeemCoins)}
                  style={{
                    width: 44,
                    height: 24,
                    borderRadius: 12,
                    backgroundColor: redeemCoins ? '#DAA520' : '#E5E7EB',
                    justifyContent: 'center',
                    paddingHorizontal: 2
                  }}
                >
                  <Animatable.View 
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 10,
                      backgroundColor: '#FFFFFF',
                      alignSelf: redeemCoins ? 'flex-end' : 'flex-start',
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.2,
                      shadowRadius: 1,
                      elevation: 2
                    }}
                  />
                </TouchableOpacity>
              ) : (
                <Text style={{ color: colors.subtext, fontSize: 10, fontStyle: 'italic' }}>No coins</Text>
              )}
            </Animatable.View>
          )}

          {showSettingsPanel && (
            <Animatable.View animation="fadeInDown" duration={300} style={{ borderTopWidth: 1, borderColor: colors.border, paddingTop: 12, marginTop: 10 }}>
              <Text style={{ color: colors.text, fontWeight: 'bold', fontSize: 11, marginBottom: 8, textTransform: 'uppercase' }}>
                ⚙️ AI Orchestrator Parameters:
              </Text>

              {/* 1. Plan Type */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <Text style={{ color: colors.subtext, fontSize: 12, fontWeight: '600' }}>Budget Constraint Plan:</Text>
                <View style={{ flexDirection: 'row', backgroundColor: colors.background, borderRadius: 8, padding: 2 }}>
                  <TouchableOpacity 
                    style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, backgroundColor: budgetType === 'flexible' ? colors.primary : 'transparent' }}
                    onPress={() => setBudgetType('flexible')}
                  >
                    <Text style={{ color: budgetType === 'flexible' ? '#FFF' : colors.text, fontSize: 10, fontWeight: 'bold' }}>Flexible</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, backgroundColor: budgetType === 'fixed' ? colors.primary : 'transparent' }}
                    onPress={() => setBudgetType('fixed')}
                  >
                    <Text style={{ color: budgetType === 'fixed' ? '#FFF' : colors.text, fontSize: 10, fontWeight: 'bold' }}>Fixed Budget</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Fixed budget input threshold */}
              {budgetType === 'fixed' && (
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background, borderRadius: 10, paddingHorizontal: 10, marginBottom: 10, height: 38, borderWidth: 1, borderColor: colors.border }}>
                  <Text style={{ color: colors.subtext, fontSize: 11, fontWeight: 'bold', marginRight: 5 }}>Max Cap (PKR):</Text>
                  <TextInput
                    value={maxBudget}
                    onChangeText={setMaxBudget}
                    keyboardType="numeric"
                    textColor={colors.text}
                    placeholder="e.g. 2800"
                    placeholderTextColor={colors.subtext}
                    style={{ flex: 1, fontSize: 11, height: 32, backgroundColor: 'transparent' }}
                    underlineColor="transparent"
                    activeUnderlineColor="transparent"
                  />
                </View>
              )}

              {/* 2. Selection Mode */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <Text style={{ color: colors.subtext, fontSize: 12, fontWeight: '600' }}>Bidding Match Logic:</Text>
                <View style={{ flexDirection: 'row', backgroundColor: colors.background, borderRadius: 8, padding: 2 }}>
                  <TouchableOpacity 
                    style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, backgroundColor: selectionMode === 'auto' ? colors.primary : 'transparent' }}
                    onPress={() => setSelectionMode('auto')}
                  >
                    <Text style={{ color: selectionMode === 'auto' ? '#FFF' : colors.text, fontSize: 10, fontWeight: 'bold' }}>AI Auto-Match</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, backgroundColor: selectionMode === 'manual' ? colors.primary : 'transparent' }}
                    onPress={() => setSelectionMode('manual')}
                  >
                    <Text style={{ color: selectionMode === 'manual' ? '#FFF' : colors.text, fontSize: 10, fontWeight: 'bold' }}>Manual Selection</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* 3. Schedule Mode */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ color: colors.subtext, fontSize: 12, fontWeight: '600' }}>Scheduling Preference:</Text>
                <View style={{ flexDirection: 'row', backgroundColor: colors.background, borderRadius: 8, padding: 2 }}>
                  <TouchableOpacity 
                    style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, backgroundColor: scheduleMode === 'auto' ? colors.primary : 'transparent' }}
                    onPress={() => setScheduleMode('auto')}
                  >
                    <Text style={{ color: scheduleMode === 'auto' ? '#FFF' : colors.text, fontSize: 10, fontWeight: 'bold' }}>Auto Chat Book</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, backgroundColor: scheduleMode === 'manual' ? colors.primary : 'transparent' }}
                    onPress={() => setScheduleMode('manual')}
                  >
                    <Text style={{ color: scheduleMode === 'manual' ? '#FFF' : colors.text, fontSize: 10, fontWeight: 'bold' }}>Manual Picker</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Animatable.View>
          )}
        </Animatable.View>

         {/* PROACTIVE AI WEATHER SHIELD */}
        <Animatable.View 
          animation="fadeInUp" 
          delay={350} 
          style={{ 
            backgroundColor: colors.card, 
            borderColor: '#F59E0B', 
            borderWidth: 1.5, 
            borderRadius: 24, 
            padding: 16, 
            marginBottom: 16,
            shadowColor: '#F59E0B',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 12,
            elevation: 4
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <Avatar.Icon size={32} icon="weather-sunny" style={{ backgroundColor: '#FEF3C7' }} color="#D97706" />
            <Text style={{ fontWeight: 'bold', color: colors.text, fontSize: 15, marginLeft: 10 }}>
              ☀️ Proactive AI Weather Shield
            </Text>
          </View>
          <Text style={{ color: '#D97706', fontWeight: 'bold', fontSize: 12, marginBottom: 4 }}>
            Extreme Heatwave Predicted Tomorrow (39°C) in {userProfile?.currentLocation?.area || 'G-13'}!
          </Text>
          <Text style={{ color: colors.subtext, fontSize: 12, lineHeight: 18, marginBottom: 12 }}>
            Your neighborhood sector is expected to hit severe temperatures. AI recommends scheduling a preventive AC tuning slot today at a **15% dynamic discount** before crisis price surges set in!
          </Text>
          <Button 
            mode="contained" 
            onPress={handleOrchestrateProactive}
            style={{ backgroundColor: '#F59E0B', borderRadius: 12 }}
            labelStyle={{ color: 'white', fontWeight: 'bold', fontSize: 11 }}
            icon="clock-check-outline"
          >
            Pre-emptively Book AC Tuning (-15% Off)
          </Button>
        </Animatable.View>

        {/* GEOGRAPHIC NEIGHBORHOOD TRENDS */}
        <Animatable.View 
          animation="fadeInLeft" 
          delay={400} 
          style={[styles.trendsCard, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <View style={styles.trendsHeader}>
            <IconButton icon="lightning-bolt" size={16} iconColor={colors.primary} style={{ margin: 0 }} />
            <Text style={[styles.trendsTitle, { color: colors.text }]}>
              Neighborhood Trends (within 5km)
            </Text>
          </View>
          <Text style={[styles.trendsText, { color: colors.subtext }]}>
             🔥 {userProfile?.currentLocation?.area || 'G-13'} Hotspots: 18 neighbors booked AC services and Plumbers today!
          </Text>
        </Animatable.View>

        {/* QUICK SERVICES */}
        <View style={styles.sectionHeader}>
           <Text style={[styles.sectionTitle, { color: colors.subtext }]}>{t('quick_orchestrations', language)}</Text>
        </View>
        <View style={styles.servicesGrid}>
          {['AC Repair', 'Plumber', 'Electrician', 'Tutor'].map((service, index) => (
            <Animatable.View 
              key={service} 
              animation="fadeInUp" 
              delay={400 + (index * 100)}
              style={styles.serviceItem}
            >
              <TouchableOpacity 
                style={[styles.serviceCard, { backgroundColor: colors.card, shadowColor: colors.text }]}
                onPress={() => setRequest(language === 'ur' ? `Mujhe kal subah ${service} chahiye` : `I need ${service} tomorrow morning`)}
              >
                 <Avatar.Icon size={40} icon={getServiceIcon(service)} style={{ backgroundColor: colors.statusBg }} color={colors.primary} />
                 <Text style={[styles.serviceText, { color: colors.text }]}>{service}</Text>
              </TouchableOpacity>
            </Animatable.View>
          ))}
        </View>

        {/* SYSTEM STATUS */}
        <View style={[styles.statusCard, { backgroundColor: colors.statusBg }]}>
           <View style={[styles.statusDot, { backgroundColor: colors.statusText }]} />
           <Text style={[styles.statusText, { color: colors.statusText }]}>{t('online_ready', language)}</Text>
        </View>
      </ScrollView>

      {/* FLOATING PROFILE BUTTON */}
      <View style={styles.bottomBar}>
         <TouchableOpacity 
            style={[styles.profileFloat, { borderColor: colors.card, shadowColor: colors.primary }]} 
            onPress={() => navigation.navigate('ProfileTab')}
          >
            {user?.avatar ? (
              <Avatar.Image size={50} source={{ uri: user.avatar }} />
            ) : (
              <Avatar.Text size={50} label={userInitial} style={{ backgroundColor: colors.primary }} />
            )}
         </TouchableOpacity>
      </View>

      {/* PRE-FLIGHT SETTINGS DIALOG */}
      <Portal>
        <Dialog 
          visible={preflightVisible} 
          onDismiss={() => setPreflightVisible(false)}
          style={{ backgroundColor: colors.card, borderRadius: 24, borderWidth: 1, borderColor: colors.border }}
        >
          <Dialog.Title style={{ color: colors.text, fontWeight: 'bold' }}>
            ⚙️ AI Pre-Flight Triage
          </Dialog.Title>
          <Dialog.Content>
            <Text style={{ color: colors.text, fontSize: 14, lineHeight: 20 }}>
              Assalam-o-Alaikum! Before we orchestrate your AI Agent, would you like to confirm your preferred chat language (Urdu, English, Roman Urdu) and instant notification channels, or proceed with defaults?
            </Text>
          </Dialog.Content>
          <Dialog.Actions style={{ paddingHorizontal: 15, paddingBottom: 15 }}>
            <Button 
              onPress={handleProceedWithDefaults} 
              labelStyle={{ color: colors.subtext, fontWeight: 'bold' }}
            >
              Use Defaults
            </Button>
            <Button 
              mode="contained"
              onPress={handleGoToSettings} 
              style={{ backgroundColor: colors.primary, borderRadius: 12 }}
              labelStyle={{ color: '#FFFFFF', fontWeight: 'bold' }}
            >
              Customize
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* VOICE RECORDING SIMULATOR PORTAL */}
      <Portal>
        <Dialog 
          visible={isRecording} 
          onDismiss={() => setIsRecording(false)}
          style={{ backgroundColor: colors.card, borderRadius: 24, borderWidth: 1, borderColor: colors.border }}
        >
          <Dialog.Title style={{ color: colors.text, textAlign: 'center', fontWeight: 'bold' }}>
            🎙️ {recording ? "Real Mic Recording Active" : "Voice Portal & Presets"}
          </Dialog.Title>
          <Dialog.Content style={{ paddingBottom: 5 }}>
            <Text style={{ color: colors.subtext, fontSize: 12, marginBottom: 12, textAlign: 'center' }}>
              {recording 
                ? "KaamKonnect is listening to your microphone... Speak clearly in Urdu/Roman Urdu." 
                : "Real microphone is inactive or permission bypassed. Select a realistic Roman Urdu preset query below or type your speech notes manually!"
              }
            </Text>
            
            <View style={{ alignItems: 'center', marginBottom: 15 }}>
              <Animatable.View 
                animation="pulse" 
                iterationCount="infinite" 
                duration={1000}
                style={{ 
                  width: 70, 
                  height: 70, 
                  borderRadius: 35, 
                  backgroundColor: recording ? 'rgba(239, 68, 68, 0.15)' : 'rgba(59, 130, 246, 0.15)', 
                  justifyContent: 'center', 
                  alignItems: 'center', 
                  elevation: 6 
                }}
              >
                <IconButton 
                  icon="microphone" 
                  iconColor={recording ? "#EF4444" : colors.primary} 
                  size={36} 
                  style={{ margin: 0 }} 
                />
              </Animatable.View>
            </View>

            {/* Editable Simulated Voice Note */}
            <View style={{ marginBottom: 12 }}>
              <Text style={{ color: colors.text, fontWeight: '700', fontSize: 11, marginBottom: 4, textTransform: 'uppercase' }}>
                ✏️ Speech Transcript Content:
              </Text>
              <TextInput
                value={simulatedVoiceNote || 'Yaar mere ghar ka AC bilkul thanda nahi kar raha, jaldi se kisi repairer ko bhej do.'}
                onChangeText={(txt) => setSimulatedVoiceNote(txt)}
                multiline
                numberOfLines={3}
                textColor={colors.text}
                style={{ 
                  backgroundColor: colors.background, 
                  borderRadius: 12, 
                  paddingHorizontal: 10, 
                  fontSize: 12, 
                  minHeight: 60,
                  borderWidth: 1,
                  borderColor: colors.border
                }}
                activeUnderlineColor="transparent"
                underlineColor="transparent"
              />
            </View>

            {/* Simulated Presets Selector (Visible if no physical recording is running) */}
            {!recording && (
              <View style={{ maxHeight: 150 }}>
                <Text style={{ color: colors.subtext, fontWeight: 'bold', fontSize: 10, marginBottom: 6, textTransform: 'uppercase' }}>
                  🎯 TAP TO SIMULATE SPEECH INTENTS:
                </Text>
                <ScrollView nestedScrollEnabled style={{ maxHeight: 110 }}>
                  <TouchableOpacity 
                    onPress={() => setSimulatedVoiceNote('Yaar mere ghar ka AC bilkul thanda nahi kar raha, gas leak lagti hai. Kisi expert AC technician ko G-13 Islamabad mein bhej do kal dopahar 2 baje.')}
                    style={{ 
                      backgroundColor: colors.background, 
                      padding: 8, 
                      borderRadius: 10, 
                      marginBottom: 6, 
                      borderWidth: 1, 
                      borderColor: colors.border,
                      flexDirection: 'row',
                      alignItems: 'center'
                    }}
                  >
                    <IconButton icon="air-conditioner" size={16} iconColor="#EF4444" style={{ margin: 0, marginRight: 6 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.text, fontWeight: 'bold', fontSize: 11 }}>🛠️ AC Repair Specialist (G-13)</Text>
                      <Text style={{ color: colors.subtext, fontSize: 10 }} numberOfLines={1}>"AC thanda nahi kar raha, gas leak lagti hai..."</Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    onPress={() => setSimulatedVoiceNote('Washroom ke shower pipe se pani bohot tezi se leak ho raha hai. Emergency mein kisi specialist plumber ko jaldi bhej do price flexible hai.')}
                    style={{ 
                      backgroundColor: colors.background, 
                      padding: 8, 
                      borderRadius: 10, 
                      marginBottom: 6, 
                      borderWidth: 1, 
                      borderColor: colors.border,
                      flexDirection: 'row',
                      alignItems: 'center'
                    }}
                  >
                    <IconButton icon="water-pump" size={16} iconColor="#3B82F6" style={{ margin: 0, marginRight: 6 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.text, fontWeight: 'bold', fontSize: 11 }}>💧 Plumber Urgently Required (ASAP)</Text>
                      <Text style={{ color: colors.subtext, fontSize: 10 }} numberOfLines={1}>"Washroom shower pipe leak ho raha hai..."</Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    onPress={() => setSimulatedVoiceNote('UPS system short circuit ho gaya hai aur backup nahi de raha. Kal dopahar kisi experienced electrician ko bhej dein.')}
                    style={{ 
                      backgroundColor: colors.background, 
                      padding: 8, 
                      borderRadius: 10, 
                      marginBottom: 6, 
                      borderWidth: 1, 
                      borderColor: colors.border,
                      flexDirection: 'row',
                      alignItems: 'center'
                    }}
                  >
                    <IconButton icon="flash" size={16} iconColor="#F59E0B" style={{ margin: 0, marginRight: 6 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.text, fontWeight: 'bold', fontSize: 11 }}>⚡ Short Circuit Electrician</Text>
                      <Text style={{ color: colors.subtext, fontSize: 10 }} numberOfLines={1}>"UPS system short circuit ho gaya hai..."</Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    onPress={() => setSimulatedVoiceNote('Mera beta primary school mein parhta hai. Us ke liye Math aur Science ka expert home tutor chahiye G-13 mein, monthly fee 5000 tk ho.')}
                    style={{ 
                      backgroundColor: colors.background, 
                      padding: 8, 
                      borderRadius: 10, 
                      marginBottom: 6, 
                      borderWidth: 1, 
                      borderColor: colors.border,
                      flexDirection: 'row',
                      alignItems: 'center'
                    }}
                  >
                    <IconButton icon="book-education-outline" size={16} iconColor="#10B981" style={{ margin: 0, marginRight: 6 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.text, fontWeight: 'bold', fontSize: 11 }}>📚 Primary Math & Science Tutor</Text>
                      <Text style={{ color: colors.subtext, fontSize: 10 }} numberOfLines={1}>"Mera beta primary mein parhta hai, Math aur Science..."</Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    onPress={() => setSimulatedVoiceNote('Behn ki shadi k liye home-service beauty expert beautician chahiye makeup aur styling ke liye. 25 June ko book kar dein.')}
                    style={{ 
                      backgroundColor: colors.background, 
                      padding: 8, 
                      borderRadius: 10, 
                      marginBottom: 6, 
                      borderWidth: 1, 
                      borderColor: colors.border,
                      flexDirection: 'row',
                      alignItems: 'center'
                    }}
                  >
                    <IconButton icon="face-woman-shimmer-outline" size={16} iconColor="#EC4899" style={{ margin: 0, marginRight: 6 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.text, fontWeight: 'bold', fontSize: 11 }}>💅 Beautician Home Service (25 June)</Text>
                      <Text style={{ color: colors.subtext, fontSize: 10 }} numberOfLines={1}>"Behn ki shadi k liye makeup beautician chahiye..."</Text>
                    </View>
                  </TouchableOpacity>
                </ScrollView>
              </View>
            )}
          </Dialog.Content>
          <Dialog.Actions style={{ justifyContent: 'center', paddingBottom: 15, paddingTop: 5 }}>
            <Button 
              mode="contained" 
              onPress={stopVoiceRecordingAndTranscribe}
              style={{ backgroundColor: colors.primary, borderRadius: 12 }}
              labelStyle={{ color: 'white', fontWeight: 'bold', fontSize: 12 }}
              icon="microphone-off"
            >
              {recording ? "Stop & Process Mic Audio" : "Finish Speech & Optimize"}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* TRANSLATING VOICE SPINNER OVERLAY */}
      <Portal>
        <Dialog 
          visible={isTranslatingVoice} 
          dismissable={false}
          style={{ backgroundColor: colors.card, borderRadius: 24 }}
        >
          <Dialog.Content style={{ alignItems: 'center', paddingVertical: 30 }}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={{ color: colors.text, fontWeight: 'bold', marginTop: 15 }}>
              🤖 AI Translating Voice to Roman Urdu...
            </Text>
          </Dialog.Content>
        </Dialog>
      </Portal>

      {/* LIVE SYSTEM ALERTS NOTIFICATION CENTER PORTAL */}
      <Portal>
        <Dialog 
          visible={showNotifications} 
          onDismiss={() => setShowNotifications(false)}
          style={{ backgroundColor: colors.card, borderRadius: 24, borderWidth: 1, borderColor: colors.border }}
        >
          <Dialog.Title style={{ color: colors.text, fontWeight: 'bold', fontSize: 18 }}>
            🔔 Live System Alerts
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
                      if (item.bookingId) {
                        navigation.navigate('Bookings', { highlightBookingId: item.bookingId });
                      }
                    }}
                    style={{
                      flexDirection: 'row',
                      padding: 12,
                      borderRadius: 16,
                      backgroundColor: item.status === 'unread' ? 'rgba(168, 85, 247, 0.06)' : 'transparent',
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

      {/* HAMBURGER OVERLAY */}
      {isMenuOpen && (
        <HamburgerMenu 
          onClose={() => setIsMenuOpen(false)} 
          navigation={navigation}
        />
      )}
    </View>
  );
};

const getServiceIcon = (s) => {
  if (s === 'AC Repair') return 'air-conditioner';
  if (s === 'Plumber') return 'pipe';
  if (s === 'Electrician') return 'flash';
  return 'book-open-variant';
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 15,
    height: 110,
    elevation: 2,
    borderBottomWidth: 1,
  },
  headerLogo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoMini: {
    width: 30,
    height: 30,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 120,
  },
  greetingSection: {
    marginTop: 10,
    marginBottom: 25,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  tagline: {
    fontSize: 14,
    marginTop: 4,
  },
  inputCard: {
    borderRadius: 24,
    padding: 15,
    elevation: 4,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    marginBottom: 30,
  },
  chatInput: {
    height: 100,
    fontSize: 16,
  },
  inputActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  sendButton: {
    borderRadius: 14,
  },
  sectionHeader: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 1.5,
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  serviceItem: {
    width: '48%',
    marginBottom: 15,
  },
  serviceCard: {
    borderRadius: 20,
    padding: 15,
    alignItems: 'center',
    elevation: 2,
  },
  serviceText: {
    marginTop: 10,
    fontSize: 14,
    fontWeight: '600',
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginTop: 10,
    alignSelf: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 30,
    width: '100%',
    alignItems: 'center',
  },
  profileFloat: {
    elevation: 10,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    borderWidth: 3,
    borderRadius: 30,
  },
  trendsCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 15,
    marginBottom: 25,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
  },
  trendsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  trendsTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  trendsText: {
    fontSize: 12,
    lineHeight: 18,
    paddingLeft: 6,
  }
});

export default HomeScreen;
