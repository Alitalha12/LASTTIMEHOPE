import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform, Dimensions } from 'react-native';
import { Text, TextInput, IconButton, Avatar, Card, Portal, Dialog, Button, ActivityIndicator } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as Animatable from 'react-native-animatable';
import axios from 'axios';
import useAuthStore from '../store/useAuthStore';
import useSettingsStore from '../store/useSettingsStore';
import { getTheme } from '../utils/themeColors';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';

const { width } = Dimensions.get('window');
const API_BASE_URL = 'https://emperor-afraid-reformed.ngrok-free.dev/api';

const ChatScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { user, token } = useAuthStore();
  const { theme: currentThemeName, language } = useSettingsStore();
  
  const colors = getTheme(currentThemeName);

  const bookingId = route.params?.bookingId || 'BK-MOCK';
  const partnerName = route.params?.partnerName || 'Specialist Expert';

  const [messages, setMessages] = useState([
    {
      id: '1',
      text: 'Assalam-o-Alaikum! Please bring a new copper pipe and standard capacitor with you.',
      translation: 'Assalam-o-Alaikum! Meharbani karke apne sath naya copper pipe aur standard capacitor le kar aein.',
      sender: 'customer',
      timestamp: '5 mins ago'
    },
    {
      id: '2',
      text: 'Walaikum Assalam! G bilkul, main naya capacitor aur pipe sath le kar aa raha hoon. DHA Phase 5 thora door hai lekin main time pe pohnch jaonga.',
      translation: 'Walaikum Assalam! Yes absolutely, I am bringing the new capacitor and pipe with me. DHA Phase 5 is slightly far but I will arrive on time.',
      sender: 'provider',
      timestamp: '3 mins ago'
    }
  ]);

  const [inputMessage, setInputMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isTranslatingVoice, setIsTranslatingVoice] = useState(false);
  const [simulatedVoiceNote, setSimulatedVoiceNote] = useState('');
  const [recording, setRecording] = useState(null);
  
  const scrollViewRef = useRef(null);

  // Auto-scroll to end of messages
  useEffect(() => {
    if (scrollViewRef.current) {
      setTimeout(() => scrollViewRef.current.scrollToEnd({ animated: true }), 100);
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const newMessage = {
      id: Date.now().toString(),
      text: inputMessage,
      translation: 'Translating real-time...',
      sender: user?.role === 'provider' ? 'provider' : 'customer',
      timestamp: 'Just now'
    };

    setMessages(prev => [...prev, newMessage]);
    setInputMessage('');

    // Call Real-time Translation Backend API
    try {
      const targetLanguage = user?.role === 'provider' ? 'english' : 'roman_urdu';
      const response = await axios.post(`${API_BASE_URL}/chat/translate`, {
        text: inputMessage,
        targetLanguage: targetLanguage
      });

      if (response.data.success) {
        setMessages(prev =>
          prev.map(msg =>
            msg.id === newMessage.id
              ? { ...msg, translation: response.data.translatedText }
              : msg
          )
        );
      }
    } catch (error) {
      console.error('Translation failed:', error);
      // Fail-safe direct transcription
      setMessages(prev =>
        prev.map(msg =>
          msg.id === newMessage.id
            ? { ...msg, translation: inputMessage }
            : msg
        )
      );
    }
  };

  // Simulates micro-animations voice recorder
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
      console.log("Graceful mic fallback in ChatScreen:", err.message);
      setIsRecording(true);
      setRecording(null);
      setSimulatedVoiceNote(user?.role === 'provider' 
        ? 'Main naya copper pipe aur tools le kar 15 minutes mein pohnch raha hoon.'
        : 'Meharbani karke naya capacitor aur pipe sath le kar aana, main ghar pe hi hoon.'
      );
    }
  };

  const stopVoiceRecordingAndTranscribe = async () => {
    if (!recording) {
      // Fallback if no real recording active (simulated mode)
      setIsRecording(false);
      setIsTranslatingVoice(true);
      try {
        const response = await axios.post(`${API_BASE_URL}/chat/voice-transcribe`, {
          audioDescription: simulatedVoiceNote || 'Meharbani karke naya capacitor aur pipe sath le kar aana, main ghar pe hi hoon.'
        });
        if (response.data.success) {
          setInputMessage(response.data.transcription);
        }
      } catch (err) {
        console.error("Fallback transcription failed:", err);
        setInputMessage(simulatedVoiceNote || 'Meharbani karke naya capacitor aur pipe sath le kar aana, main ghar pe hi hoon.');
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
      
      const response = await axios.post(`${API_BASE_URL}/chat/voice-transcribe`, {
        audioBase64: base64Audio,
      });
      
      if (response.data.success) {
        setInputMessage(response.data.transcription);
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

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      {/* HEADER */}
      <View style={[styles.header, { backgroundColor: colors.header, borderBottomColor: colors.border }]}>
        <IconButton 
          icon="arrow-left" 
          size={24} 
          iconColor={colors.text} 
          onPress={() => navigation.goBack()} 
        />
        <Avatar.Image 
          size={40} 
          source={{ uri: `https://ui-avatars.com/api/?name=${encodeURIComponent(partnerName)}&background=EF4444&color=fff` }} 
        />
        <View style={styles.headerDetails}>
          <Text style={[styles.hName, { color: colors.text }]}>{partnerName}</Text>
          <Text style={[styles.hSub, { color: '#10B981' }]}>🟢 Live Translation Active</Text>
        </View>
        <IconButton icon="phone-outline" iconColor={colors.subtext} size={22} onPress={() => {}} />
      </View>

      {/* CHAT MESSAGES SCROLL */}
      <ScrollView 
        ref={scrollViewRef}
        contentContainerStyle={styles.messagesList}
      >
        {messages.map((msg, index) => {
          const isMe = (user?.role === 'provider' && msg.sender === 'provider') || 
                       (user?.role !== 'provider' && msg.sender === 'customer');

          return (
            <Animatable.View 
              key={msg.id}
              animation={isMe ? "fadeInRight" : "fadeInLeft"}
              duration={400}
              style={[
                styles.messageContainer,
                isMe ? styles.myMessageAlign : styles.theirMessageAlign
              ]}
            >
              <Card style={[
                styles.messageCard,
                { backgroundColor: isMe ? colors.primary : colors.card }
              ]}>
                <Card.Content style={styles.cardContent}>
                  <Text style={[
                    styles.messageText,
                    { color: isMe ? '#FFFFFF' : colors.text }
                  ]}>
                    {msg.text}
                  </Text>
                  
                  {/* Real-time Translation pill */}
                  <View style={[
                    styles.translationBlock,
                    { borderTopColor: isMe ? 'rgba(255,255,255,0.2)' : colors.border }
                  ]}>
                    <View style={styles.translationHeader}>
                      <IconButton icon="translate" iconColor={isMe ? '#FFF' : colors.primary} size={12} style={{ margin: 0 }} />
                      <Text style={[
                        styles.translationTitle,
                        { color: isMe ? 'rgba(255,255,255,0.8)' : colors.subtext }
                      ]}>
                        AI Real-Time Translation
                      </Text>
                    </View>
                    <Text style={[
                      styles.translationText,
                      { color: isMe ? '#F3F4F6' : colors.text }
                    ]}>
                      {msg.translation}
                    </Text>
                  </View>
                </Card.Content>
              </Card>
              <Text style={styles.timestamp}>{msg.timestamp}</Text>
            </Animatable.View>
          );
        })}
      </ScrollView>

      {/* INPUT ACTIONS AREA */}
      <View style={[styles.inputContainer, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
        <TextInput
          placeholder="Type message (or use Microphone)..."
          placeholderTextColor={colors.subtext}
          value={inputMessage}
          onChangeText={setInputMessage}
          mode="flat"
          textColor={colors.text}
          style={[styles.inputField, { backgroundColor: 'transparent' }]}
          underlineColor="transparent"
          activeUnderlineColor="transparent"
        />

        <View style={styles.actionsRow}>
          {/* Micro-animations Voice Microphone */}
          <IconButton 
            icon="microphone" 
            mode="contained-tonal"
            iconColor={isRecording ? '#FFFFFF' : colors.primary} 
            containerColor={isRecording ? '#EF4444' : colors.statusBg}
            size={24} 
            onPress={isRecording ? stopVoiceRecordingAndTranscribe : startVoiceRecording}
          />
          <TouchableOpacity 
            style={[styles.sendBtn, { backgroundColor: colors.primary }]} 
            onPress={handleSendMessage}
          >
            <IconButton icon="send" iconColor="white" size={20} />
          </TouchableOpacity>
        </View>
      </View>

      {/* VOICE RECORDING SIMULATOR PORTAL */}
      <Portal>
        <Dialog 
          visible={isRecording} 
          onDismiss={() => setIsRecording(false)}
          style={{ backgroundColor: colors.card, borderRadius: 24, borderWidth: 1, borderColor: colors.border }}
        >
          <Dialog.Title style={{ color: colors.text, textAlign: 'center', fontWeight: 'bold' }}>
            🎙️ {recording ? "Chat Mic Recording Active" : "Chat Voice Portal & Presets"}
          </Dialog.Title>
          <Dialog.Content style={{ paddingBottom: 5 }}>
            <Text style={{ color: colors.subtext, fontSize: 12, marginBottom: 12, textAlign: 'center' }}>
              {recording 
                ? "KaamKonnect is recording your voice message... Speak in Urdu/Roman Urdu." 
                : `Real microphone bypassed. Select a realistic ${user?.role === 'provider' ? 'Provider' : 'Customer'} Roman Urdu preset coordination message or type manually below!`
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
                ✏️ Voice Message Transcript:
              </Text>
              <TextInput
                value={simulatedVoiceNote || ''}
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
                  🎯 QUICK SELECT COORDINATION PRESETS:
                </Text>
                <ScrollView nestedScrollEnabled style={{ maxHeight: 110 }}>
                  {user?.role === 'provider' ? (
                    <>
                      <TouchableOpacity 
                        onPress={() => setSimulatedVoiceNote('Main naya copper pipe aur replacement capacitor le kar 15 minutes mein pohnch raha hoon.')}
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
                        <IconButton icon="truck-delivery" size={16} iconColor={colors.primary} style={{ margin: 0, marginRight: 6 }} />
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: colors.text, fontWeight: 'bold', fontSize: 11 }}>🚚 ETA & Materials Update</Text>
                          <Text style={{ color: colors.subtext, fontSize: 10 }} numberOfLines={1}>"Naya copper pipe aur capacitor le kar 15 mins..."</Text>
                        </View>
                      </TouchableOpacity>

                      <TouchableOpacity 
                        onPress={() => setSimulatedVoiceNote('Main raste mein hoon thora traffic heavy hai, lekin main inshallah agle 10 minute tak pohnch jaonga.')}
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
                        <IconButton icon="map-marker-distance" size={16} iconColor="#F59E0B" style={{ margin: 0, marginRight: 6 }} />
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: colors.text, fontWeight: 'bold', fontSize: 11 }}>🚦 Heavy Traffic Alert</Text>
                          <Text style={{ color: colors.subtext, fontSize: 10 }} numberOfLines={1}>"Thora traffic heavy hai, 10 minute mein..."</Text>
                        </View>
                      </TouchableOpacity>

                      <TouchableOpacity 
                        onPress={() => setSimulatedVoiceNote('Kaam bilkul complete ho gaya hai aur cooling behtareen ho rahi hai. Meharbani karke invoice verify karein aur verification OTP share kar dein.')}
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
                        <IconButton icon="checkbox-marked-circle" size={16} iconColor="#10B981" style={{ margin: 0, marginRight: 6 }} />
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: colors.text, fontWeight: 'bold', fontSize: 11 }}>✅ Verification OTP Request</Text>
                          <Text style={{ color: colors.subtext, fontSize: 10 }} numberOfLines={1}>"Kaam complete ho gaya hai, OTP share kar dein..."</Text>
                        </View>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <>
                      <TouchableOpacity 
                        onPress={() => setSimulatedVoiceNote('Meharbani karke naya copper pipe aur standard condenser capacitor bhi sath le kar aana, purana kharab lag raha hai.')}
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
                        <IconButton icon="tools" size={16} iconColor={colors.primary} style={{ margin: 0, marginRight: 6 }} />
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: colors.text, fontWeight: 'bold', fontSize: 11 }}>🛠️ Request New Materials</Text>
                          <Text style={{ color: colors.subtext, fontSize: 10 }} numberOfLines={1}>"Naya copper pipe aur capacitor sath le kar aana..."</Text>
                        </View>
                      </TouchableOpacity>

                      <TouchableOpacity 
                        onPress={() => setSimulatedVoiceNote('Aap kab tak pohnchein ge? Main ghar pe hi wait kar raha hoon, meharbani karke time pe aana.')}
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
                        <IconButton icon="clock" size={16} iconColor="#F59E0B" style={{ margin: 0, marginRight: 6 }} />
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: colors.text, fontWeight: 'bold', fontSize: 11 }}>⏱️ Request Arrival Update</Text>
                          <Text style={{ color: colors.subtext, fontSize: 10 }} numberOfLines={1}>"Aap kab tak pohnchein ge? Ghar pe wait kar raha..."</Text>
                        </View>
                      </TouchableOpacity>

                      <TouchableOpacity 
                        onPress={() => setSimulatedVoiceNote('Ghar ke main gate pr aakar bell baja dena aur security guard ko KaamKonnect ka keh dena.')}
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
                        <IconButton icon="gate" size={16} iconColor="#10B981" style={{ margin: 0, marginRight: 6 }} />
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: colors.text, fontWeight: 'bold', fontSize: 11 }}>🚪 Main Gate Instructions</Text>
                          <Text style={{ color: colors.subtext, fontSize: 10 }} numberOfLines={1}>"Main gate par aakar security guard ko keh dena..."</Text>
                        </View>
                      </TouchableOpacity>
                    </>
                  )}
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
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 10,
    height: 110,
    borderBottomWidth: 1,
    elevation: 4,
  },
  headerDetails: {
    flex: 1,
    marginLeft: 12,
  },
  hName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  hSub: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  messagesList: {
    padding: 15,
    paddingBottom: 30,
  },
  messageContainer: {
    marginBottom: 20,
    maxWidth: '82%',
  },
  myMessageAlign: {
    alignSelf: 'flex-end',
  },
  theirMessageAlign: {
    alignSelf: 'flex-start',
  },
  messageCard: {
    borderRadius: 20,
    elevation: 2,
  },
  cardContent: {
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  translationBlock: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  translationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  translationTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
    marginLeft: -4,
  },
  translationText: {
    fontSize: 13,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  timestamp: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 4,
    marginHorizontal: 8,
    alignSelf: 'flex-end',
  },
  inputContainer: {
    borderTopWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inputField: {
    flex: 1,
    fontSize: 15,
    height: 50,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendBtn: {
    borderRadius: 14,
    marginLeft: 8,
  },
  glowingMic: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 12,
  }
});

export default ChatScreen;
