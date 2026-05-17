import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Switch, TouchableOpacity, Alert } from 'react-native';
import { Text, Card, RadioButton, Button, IconButton, Portal, Dialog, Divider, ActivityIndicator } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import * as Animatable from 'react-native-animatable';
import axios from 'axios';

import useAuthStore from '../store/useAuthStore';
import useStore from '../store/useStore';
import { getTheme } from '../utils/themeColors';
import useSettingsStore from '../store/useSettingsStore';

const API_BASE_URL = 'https://emperor-afraid-reformed.ngrok-free.dev/api';

const SettingsScreen = () => {
  const navigation = useNavigation();
  const { theme: storeTheme } = useSettingsStore();
  const colors = getTheme(storeTheme);
  
  const { user, token, userSettings, updateSettings } = useAuthStore();
  const isProcessing = useStore(state => state.isProcessing);

  // AI Memory from useSettingsStore
  const { 
    aiMemoryEnabled, 
    historyDepth, 
    consentGiven, 
    setAiMemoryEnabled, 
    setHistoryDepth, 
    setConsentGiven 
  } = useSettingsStore();

  const isLocked = isProcessing;

  const [lang, setLang] = useState(userSettings?.preferredLanguage || 'roman_urdu');
  const [notifyWhatsApp, setNotifyWhatsApp] = useState(userSettings?.communicationPreference?.whatsapp ?? true);
  const [notifySMS, setNotifySMS] = useState(userSettings?.communicationPreference?.sms ?? false);
  const [notifyPush, setNotifyPush] = useState(userSettings?.communicationPreference?.push ?? true);
  const [saving, setSaving] = useState(false);

  // AI Memory local UI States
  const [localMemoryEnabled, setLocalMemoryEnabled] = useState(aiMemoryEnabled);
  const [localHistoryDepth, setLocalHistoryDepth] = useState(historyDepth);
  const [consentVisible, setConsentVisible] = useState(false);
  const [memorySummary, setMemorySummary] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [clearingMemory, setClearingMemory] = useState(false);

  useEffect(() => {
    if (userSettings) {
      setLang(userSettings.preferredLanguage || 'roman_urdu');
      setNotifyWhatsApp(userSettings.communicationPreference?.whatsapp ?? true);
      setNotifySMS(userSettings.communicationPreference?.sms ?? false);
      setNotifyPush(userSettings.communicationPreference?.push ?? true);
    }
  }, [userSettings]);

  // Fetch AI Memory Summary from Backend
  const fetchMemorySummary = async (depthVal = localHistoryDepth) => {
    if (!user || !token || !localMemoryEnabled) return;
    setLoadingSummary(true);
    try {
      const userId = user.id || user.uid;
      const res = await axios.get(`${API_BASE_URL}/memory/${userId}?depth=${depthVal}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setMemorySummary(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch AI memory summary:', err.message);
    } finally {
      setLoadingSummary(false);
    }
  };

  useEffect(() => {
    if (localMemoryEnabled) {
      fetchMemorySummary();
    } else {
      setMemorySummary(null);
    }
  }, [localMemoryEnabled, localHistoryDepth]);

  // Handle AI Memory Toggle
  const handleToggleMemory = (val) => {
    if (isLocked) return;
    if (val && !consentGiven) {
      // Trigger Consent Dialog if not already given
      setConsentVisible(true);
    } else {
      setLocalMemoryEnabled(val);
    }
  };

  // Agree to AI Consent
  const handleAcceptConsent = () => {
    setConsentGiven(true);
    setConsentVisible(false);
    setLocalMemoryEnabled(true);
  };

  // Clear AI Memory
  const handleClearMemory = async () => {
    if (isLocked || !user || !token) return;
    Alert.alert(
      '🧠 Reset AI Memory Cache?',
      'This will erase all AI patterns, average budget estimates, preferred service times, and favorite providers. Your booking history will remain secure, but AI personalized answers will start fresh.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            setClearingMemory(true);
            try {
              const userId = user.id || user.uid;
              const res = await axios.delete(`${API_BASE_URL}/memory/${userId}`, {
                headers: { Authorization: `Bearer ${token}` }
              });
              if (res.data.success) {
                setLocalMemoryEnabled(false);
                setAiMemoryEnabled(false);
                setMemorySummary(null);
                Alert.alert('Memory Cleared', 'Your AI memory profile has been successfully reset! ⚡');
              }
            } catch (err) {
              Alert.alert('Error', 'Failed to clear AI memory. Please try again.');
            } finally {
              setClearingMemory(false);
            }
          }
        }
      ]
    );
  };

  // Save Settings
  const handleSave = async () => {
    if (isLocked) return;
    setSaving(true);
    try {
      const settingsData = {
        preferredLanguage: lang,
        communicationPreference: {
          whatsapp: notifyWhatsApp,
          sms: notifySMS,
          push: notifyPush
        }
      };
      await updateSettings(settingsData);

      // Save AI Memory settings in store
      setAiMemoryEnabled(localMemoryEnabled);
      setHistoryDepth(localHistoryDepth);

      // Sync AI Memory settings with Backend API
      if (user && token) {
        const userId = user.id || user.uid;
        await axios.put(`${API_BASE_URL}/memory/${userId}/settings`, {
          aiMemoryEnabled: localMemoryEnabled,
          historyDepth: localHistoryDepth
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }

      navigation.goBack();
    } catch (err) {
      console.error('Failed to save settings:', err);
      Alert.alert('Save Error', 'Some settings failed to sync with the cloud.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Portal.Host>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <IconButton icon="arrow-left" onPress={() => navigation.goBack()} iconColor={colors.text} />
          <Text style={[styles.headerTitle, { color: colors.text }]}>AI & Alert Settings</Text>
          <IconButton icon="tune-variant" iconColor={colors.primary} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {isLocked && (
            <Animatable.View animation="shake" style={styles.lockBanner}>
              <IconButton icon="lock" iconColor="#B91C1C" size={20} style={{ margin: 0 }} />
              <Text style={styles.lockText}>
                Settings are locked during an active AI Chat Session!
              </Text>
            </Animatable.View>
          )}

          {/* 🧠 1. AI MEMORY & HISTORY DEPTH SECTION */}
          <Animatable.View animation="fadeInUp" delay={50}>
            <Card style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Card.Title 
                title="🧠 AI Memory & History Mode" 
                subtitle="Personalize booking agents using past patterns."
                titleStyle={[styles.cardTitle, { color: colors.text }]}
                subtitleStyle={{ color: colors.subtext }}
                left={(props) => <IconButton {...props} icon="brain" iconColor={colors.primary} />}
              />
              <Card.Content>
                <View style={styles.switchRow}>
                  <View style={styles.switchLabelCol}>
                    <Text style={[styles.switchLabel, { color: colors.text }]}>Enable AI Memory</Text>
                    <Text style={[styles.switchSubLabel, { color: colors.subtext }]}>
                      Allows AI to auto-fill preferred areas, budget constraints, and prioritize favorite providers.
                    </Text>
                  </View>
                  <Switch 
                    value={localMemoryEnabled} 
                    onValueChange={handleToggleMemory} 
                    disabled={isLocked}
                    trackColor={{ false: colors.border, true: colors.primary }}
                    thumbColor="#ffffff"
                  />
                </View>

                {localMemoryEnabled && (
                  <Animatable.View animation="fadeIn" duration={400} style={{ marginTop: 15 }}>
                    <Divider style={{ marginVertical: 10, backgroundColor: colors.border }} />
                    <Text style={[styles.sectionSubtitle, { color: colors.text }]}>History Analysis Depth</Text>
                    <Text style={[styles.switchSubLabel, { color: colors.subtext, marginBottom: 12 }]}>
                      How far back should the AI analyze your bookings for personalization?
                    </Text>
                    
                    <RadioButton.Group 
                      onValueChange={value => {
                        setLocalHistoryDepth(value);
                        fetchMemorySummary(value);
                      }} 
                      value={localHistoryDepth}
                    >
                      <View style={styles.depthOptionRow}>
                        <RadioButton.Item 
                          label="Last 10 Bookings Only (Vibrant & Current)" 
                          value="last10" 
                          color={colors.primary} 
                          labelStyle={{ fontSize: 13, color: colors.text }}
                          style={{ paddingVertical: 0 }}
                        />
                        <RadioButton.Item 
                          label="Last 30 Days (Recent Month)" 
                          value="last30days" 
                          color={colors.primary} 
                          labelStyle={{ fontSize: 13, color: colors.text }}
                          style={{ paddingVertical: 0 }}
                        />
                        <RadioButton.Item 
                          label="Last 3 Months (Quarterly Trends)" 
                          value="last90days" 
                          color={colors.primary} 
                          labelStyle={{ fontSize: 13, color: colors.text }}
                          style={{ paddingVertical: 0 }}
                        />
                        <RadioButton.Item 
                          label="All Time History (Entire Lifecycle)" 
                          value="allTime" 
                          color={colors.primary} 
                          labelStyle={{ fontSize: 13, color: colors.text }}
                          style={{ paddingVertical: 0 }}
                        />
                      </View>
                    </RadioButton.Group>

                    {/* 📊 REAL TIME AI ANALYSIS REPORT */}
                    {loadingSummary ? (
                      <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 15 }} />
                    ) : memorySummary ? (
                      <Animatable.View animation="zoomIn" duration={300} style={[styles.summaryBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
                        <Text style={[styles.summaryTitle, { color: colors.primary }]}>📊 Active Memory Insights</Text>
                        <Text style={[styles.summaryText, { color: colors.text }]}>
                          • Total Bookings: <Text style={{ fontWeight: 'bold' }}>{memorySummary.totalBookings}</Text>
                        </Text>
                        {memorySummary.topService && (
                          <Text style={[styles.summaryText, { color: colors.text }]}>
                            • Frequent Category: <Text style={{ fontWeight: 'bold' }}>{memorySummary.topService.replace('_', ' ').toUpperCase()}</Text>
                          </Text>
                        )}
                        {memorySummary.preferredArea && (
                          <Text style={[styles.summaryText, { color: colors.text }]}>
                            • Preferred Sector: <Text style={{ fontWeight: 'bold' }}>{memorySummary.preferredArea}</Text>
                          </Text>
                        )}
                        {memorySummary.avgBudget && (
                          <Text style={[styles.summaryText, { color: colors.text }]}>
                            • Average Budget: <Text style={{ fontWeight: 'bold' }}>{memorySummary.avgBudget} PKR</Text>
                          </Text>
                        )}
                        {memorySummary.favoriteProvider && (
                          <Text style={[styles.summaryText, { color: colors.text }]}>
                            • Favorite Provider: <Text style={{ fontWeight: 'bold' }}>{memorySummary.favoriteProvider.name} ({memorySummary.favoriteProvider.rating}★)</Text>
                          </Text>
                        )}
                      </Animatable.View>
                    ) : (
                      <View style={[styles.summaryBox, { backgroundColor: colors.background, borderColor: colors.border, alignItems: 'center' }]}>
                        <Text style={[styles.summarySubText, { color: colors.subtext }]}>
                          No completed bookings found in this range yet to train the AI. Complete more bookings to see insights!
                        </Text>
                      </View>
                    )}

                    <Button 
                      mode="outlined" 
                      onPress={handleClearMemory} 
                      loading={clearingMemory}
                      textColor="#EF4444" 
                      style={{ borderColor: '#EF4444', marginTop: 15, borderRadius: 12 }}
                      labelStyle={{ fontSize: 13, fontWeight: 'bold' }}
                    >
                      Clear AI Memory Profile 🗑️
                    </Button>
                  </Animatable.View>
                )}
              </Card.Content>
            </Card>
          </Animatable.View>

          {/* AI Language Selection */}
          <Animatable.View animation="fadeInUp" delay={100}>
            <Card style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Card.Title 
                title="AI Agent Chat Language" 
                subtitle="Select the primary language your AI agent uses to converse."
                titleStyle={[styles.cardTitle, { color: colors.text }]}
                subtitleStyle={{ color: colors.subtext }}
                left={(props) => <IconButton {...props} icon="translate" iconColor={colors.primary} />}
              />
              <Card.Content style={styles.cardContent}>
                <RadioButton.Group onValueChange={value => !isLocked && setLang(value)} value={lang}>
                  <TouchableOpacity 
                    style={styles.radioRow} 
                    onPress={() => !isLocked && setLang('roman_urdu')}
                    disabled={isLocked}
                  >
                    <RadioButton value="roman_urdu" color={colors.primary} uncheckedColor={colors.border} />
                    <View style={styles.radioLabelCol}>
                      <Text style={[styles.radioLabel, { color: colors.text }]}>Roman Urdu (Urdu in English letters)</Text>
                      <Text style={[styles.radioSubLabel, { color: colors.subtext }]}>E.g., "AC repair krna hai, plumber bhejein"</Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.radioRow} 
                    onPress={() => !isLocked && setLang('urdu')}
                    disabled={isLocked}
                  >
                    <RadioButton value="urdu" color={colors.primary} uncheckedColor={colors.border} />
                    <View style={styles.radioLabelCol}>
                      <Text style={[styles.radioLabel, { color: colors.text }]}>Urdu (اردو)</Text>
                      <Text style={[styles.radioSubLabel, { color: colors.subtext }]}>E.g., "اے سی کی سروس کروانی ہے"</Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.radioRow} 
                    onPress={() => !isLocked && setLang('english')}
                    disabled={isLocked}
                  >
                    <RadioButton value="english" color={colors.primary} uncheckedColor={colors.border} />
                    <View style={styles.radioLabelCol}>
                      <Text style={[styles.radioLabel, { color: colors.text }]}>English</Text>
                      <Text style={[styles.radioSubLabel, { color: colors.subtext }]}>E.g., "I need an AC general cleaning service"</Text>
                    </View>
                  </TouchableOpacity>
                </RadioButton.Group>
              </Card.Content>
            </Card>
          </Animatable.View>

          {/* Notification Channels */}
          <Animatable.View animation="fadeInUp" delay={200}>
            <Card style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Card.Title 
                title="Notification Channels" 
                subtitle="Where should our AI agent send confirmations & tracking alerts?"
                titleStyle={[styles.cardTitle, { color: colors.text }]}
                subtitleStyle={{ color: colors.subtext }}
                left={(props) => <IconButton {...props} icon="bell-ring-outline" iconColor={colors.primary} />}
              />
              <Card.Content>
                <View style={styles.switchRow}>
                  <View style={styles.switchLabelCol}>
                    <Text style={[styles.switchLabel, { color: colors.text }]}>WhatsApp Alerts</Text>
                    <Text style={[styles.switchSubLabel, { color: colors.subtext }]}>Live booking status sent to WhatsApp</Text>
                  </View>
                  <Switch 
                    value={notifyWhatsApp} 
                    onValueChange={setNotifyWhatsApp} 
                    disabled={isLocked}
                    trackColor={{ false: colors.border, true: colors.primary }}
                    thumbColor="#ffffff"
                  />
                </View>

                <View style={styles.switchRow}>
                  <View style={styles.switchLabelCol}>
                    <Text style={[styles.switchLabel, { color: colors.text }]}>SMS Notifications</Text>
                    <Text style={[styles.switchSubLabel, { color: colors.subtext }]}>Standard network SMS tracking texts</Text>
                  </View>
                  <Switch 
                    value={notifySMS} 
                    onValueChange={setNotifySMS} 
                    disabled={isLocked}
                    trackColor={{ false: colors.border, true: colors.primary }}
                    thumbColor="#ffffff"
                  />
                </View>

                <View style={styles.switchRow}>
                  <View style={styles.switchLabelCol}>
                    <Text style={[styles.switchLabel, { color: colors.text }]}>Push Notifications</Text>
                    <Text style={[styles.switchSubLabel, { color: colors.subtext }]}>App pop-up notification reminders</Text>
                  </View>
                  <Switch 
                    value={notifyPush} 
                    onValueChange={setNotifyPush} 
                    disabled={isLocked}
                    trackColor={{ false: colors.border, true: colors.primary }}
                    thumbColor="#ffffff"
                  />
                </View>
              </Card.Content>
            </Card>
          </Animatable.View>

          {/* Save Button */}
          <Animatable.View animation="fadeInUp" delay={300} style={{ marginTop: 20 }}>
            <Button 
              mode="contained" 
              onPress={handleSave} 
              loading={saving}
              disabled={isLocked}
              style={[styles.saveBtn, { backgroundColor: isLocked ? colors.border : colors.primary }]}
              contentStyle={{ height: 55 }}
              labelStyle={{ fontSize: 16, fontWeight: 'bold' }}
            >
              Save Settings
            </Button>
          </Animatable.View>
        </ScrollView>

        {/* 🤝 PREMIUM AI MEMORY CONSENT DIALOG */}
        <Portal>
          <Dialog visible={consentVisible} onDismiss={() => setConsentVisible(false)} style={{ borderRadius: 24, backgroundColor: colors.card }}>
            <Dialog.Title style={{ color: colors.text, fontWeight: 'bold', fontSize: 20 }}>
              🧠 Privacy & Consent Policy
            </Dialog.Title>
            <Dialog.Content>
              <Text style={{ color: colors.text, fontSize: 14, lineHeight: 21, marginBottom: 12 }}>
                KaamKonnect uses advanced local and secure machine learning algorithms to personalize service recommendations. By enabling AI Memory, you agree to allow our AI Agent to:
              </Text>
              <Text style={{ color: colors.text, fontSize: 13, lineHeight: 18, marginLeft: 10, marginBottom: 8 }}>
                • Analyze past completed bookings to understand typical service category trends.
              </Text>
              <Text style={{ color: colors.text, fontSize: 13, lineHeight: 18, marginLeft: 10, marginBottom: 8 }}>
                • Auto-complete preferred areas (e.g., G-13, DHA) when location details are omitted.
              </Text>
              <Text style={{ color: colors.text, fontSize: 13, lineHeight: 18, marginLeft: 10, marginBottom: 8 }}>
                • Prioritize highly-rated providers you have previously successfully booked.
              </Text>
              <Text style={{ color: colors.text, fontSize: 13, lineHeight: 18, marginLeft: 10, marginBottom: 12 }}>
                • Learn average price constraints to optimize bidding pricing algorithms.
              </Text>
              <Text style={{ color: colors.subtext, fontSize: 12, fontStyle: 'italic' }}>
                Your data is strictly end-to-end encrypted, processed safely, and can be cleared instantly at any time.
              </Text>
            </Dialog.Content>
            <Dialog.Actions style={{ paddingHorizontal: 20, paddingBottom: 15 }}>
              <Button onPress={() => setConsentVisible(false)} textColor={colors.subtext}>Decline</Button>
              <Button mode="contained" onPress={handleAcceptConsent} buttonColor={colors.primary} style={{ borderRadius: 12 }}>
                I Agree
              </Button>
            </Dialog.Actions>
          </Dialog>
        </Portal>
      </View>
    </Portal.Host>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 50,
    height: 100,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    elevation: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  scrollContent: {
    padding: 20,
  },
  lockBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#EF4444',
    borderRadius: 16,
    padding: 12,
    marginBottom: 20,
  },
  lockText: {
    color: '#B91C1C',
    fontWeight: 'bold',
    fontSize: 13,
    flex: 1,
    marginLeft: 8,
  },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: 20,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  cardContent: {
    paddingTop: 10,
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  radioLabelCol: {
    marginLeft: 12,
    flex: 1,
  },
  radioLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  radioSubLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
  },
  switchLabelCol: {
    flex: 1,
    paddingRight: 10,
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  switchSubLabel: {
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  sectionSubtitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 10,
  },
  depthOptionRow: {
    marginVertical: 10,
  },
  summaryBox: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 15,
    marginTop: 12,
  },
  summaryTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 4,
  },
  summarySubText: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  saveBtn: {
    borderRadius: 18,
    elevation: 4,
  }
});

export default SettingsScreen;
