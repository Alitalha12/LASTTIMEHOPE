import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Dimensions, TouchableOpacity, Alert } from 'react-native';
import { Text, Card, ActivityIndicator, IconButton, List, Divider, Chip, Portal, Dialog, Button, TextInput } from 'react-native-paper';
import useAuthStore from '../store/useAuthStore';
import useSettingsStore from '../store/useSettingsStore';
import { useNavigation } from '@react-navigation/native';
import useStore from '../store/useStore';
import * as Animatable from 'react-native-animatable';
import { getTheme } from '../utils/themeColors';

const { width } = Dimensions.get('window');

const ProcessingScreen = () => {
  const navigation = useNavigation();
  const { theme: currentThemeName } = useSettingsStore();
  const colors = getTheme(currentThemeName);
  const { steps, isProcessing, result, error, aiReasoning, extractedData, shortlist, confirmManualSelection } = useStore();
  const [showInsights, setShowInsights] = useState(false);
  const { user } = useAuthStore();
  const orchestrate = useStore(state => state.sendServiceRequest);

  // Refill Modal States
  const [topupVisible, setTopupVisible] = useState(false);
  const [topupAmount, setTopupAmount] = useState('2500');
  const [topupPhone, setTopupPhone] = useState(user?.phone || '');
  const [gateway, setGateway] = useState('sadapay');
  const [checkoutStep, setCheckoutStep] = useState('details');
  const [sessionId, setSessionId] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [simulatedOtpText, setSimulatedOtpText] = useState('');
  const [topupLoading, setTopupLoading] = useState(false);

  const handleInitiateGatewayTopUp = async () => {
    if (!topupAmount || isNaN(topupAmount) || parseFloat(topupAmount) <= 0) {
      Alert.alert('Error', 'Please enter a valid top-up amount.');
      return;
    }
    if (!topupPhone || topupPhone.length < 9) {
      Alert.alert('Error', 'Please enter a valid phone number.');
      return;
    }

    setTopupLoading(true);
    const authStore = useAuthStore.getState();
    const result = await authStore.initiateGatewayTopUp(parseFloat(topupAmount), topupPhone, gateway);
    setTopupLoading(false);

    if (result.success) {
      setSessionId(result.sessionId);
      setSimulatedOtpText(result.otpSimulated);
      setCheckoutStep('otp');
    } else {
      Alert.alert('Error', result.message || 'Checkout failed.');
    }
  };

  const handleVerifyGatewayTopUp = async () => {
    if (!otpCode || otpCode.length < 4) {
      Alert.alert('Error', 'Please enter a valid 4-digit verification code.');
      return;
    }

    setTopupLoading(true);
    const authStore = useAuthStore.getState();
    const result = await authStore.verifyGatewayTopUp(sessionId, otpCode);
    setTopupLoading(false);

    if (result.success) {
      Alert.alert('Success 🎉', `Rs. ${topupAmount} successfully credited to your SafePay wallet via ${gateway.toUpperCase()}!`);
      setTopupVisible(false);
      setCheckoutStep('details');
      setSessionId('');
      setOtpCode('');
      setSimulatedOtpText('');
    } else {
      Alert.alert('Error', result.message || 'Verification failed. Incorrect OTP.');
    }
  };

  const retryOrchestration = async () => {
    const lastInput = result?.data?.userInput || steps[0].description;
    await orchestrate(lastInput);
  };

  useEffect(() => {
    if (!isProcessing && result) {
      setTimeout(() => {
        navigation.replace('Results');
      }, 1500);
    }
  }, [isProcessing, result]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header with AI Orb */}
      <View style={styles.header}>
        <Animatable.View 
          animation="pulse" 
          iterationCount="infinite" 
          duration={1500} 
          style={[styles.aiOrb, { backgroundColor: colors.primary + '20' }]}
        >
          <IconButton icon="robot" iconColor={colors.primary} size={40} />
        </Animatable.View>
        <Text style={styles.title}>AI Agents Working...</Text>
        <Text style={styles.subtitle}>Executing multi-agent orchestration pipeline</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {shortlist ? (
          <Animatable.View animation="fadeInUp" style={{ paddingHorizontal: 15, paddingVertical: 10 }}>
            <View style={{ backgroundColor: '#F8FAFC', borderRadius: 20, padding: 15, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 20 }}>
              <Text style={{ fontWeight: 'bold', fontSize: 16, color: '#1E293B', textAlign: 'center', marginBottom: 5 }}>
                Shortlisted AI Provider Bids ⚡
              </Text>
              <Text style={{ fontSize: 12, color: '#64748B', textAlign: 'center' }}>
                Bids have been filtered based on your budget cap. Select a professional to lock SafePay escrow.
              </Text>
            </View>

            {shortlist.map((item) => (
              <Animatable.View key={item.id} animation="fadeInLeft" style={{ marginBottom: 15 }}>
                <Card style={{ borderRadius: 16, borderWidth: 1.5, borderColor: '#E2E8F0', backgroundColor: '#FFFFFF', overflow: 'hidden' }}>
                  <Card.Content style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 15 }}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                        <Text style={{ fontWeight: 'bold', fontSize: 15, color: '#1E293B' }}>{item.name}</Text>
                        <View style={{ backgroundColor: '#FEF08A', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginLeft: 8, flexDirection: 'row', alignItems: 'center' }}>
                          <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#854D0E' }}>⭐ {item.rating}</Text>
                        </View>
                      </View>
                      <Text style={{ fontSize: 12, color: '#64748B' }}>📍 {item.distance_km} km away (GPS verified)</Text>
                      <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#10B981', marginTop: 8 }}>Rs. {item.price} PKR</Text>
                    </View>

                    <Button 
                      mode="contained" 
                      onPress={async () => {
                        Alert.alert(
                          "Confirm Booking? 🔒",
                          `Confirm matching with ${item.name} for Rs. ${item.price} PKR? Funds will be locked in SafePay Escrow immediately.`,
                          [
                            { text: "Cancel", style: "cancel" },
                            { text: "Yes, Lock Funds", onPress: () => confirmManualSelection(item.id) }
                          ]
                        );
                      }}
                      style={{ backgroundColor: '#3B82F6', borderRadius: 12, height: 40, justifyContent: 'center' }}
                      labelStyle={{ color: 'white', fontWeight: 'bold', fontSize: 11 }}
                    >
                      Book Deal
                    </Button>
                  </Card.Content>
                </Card>
              </Animatable.View>
            ))}
          </Animatable.View>
        ) : (
          steps.map((step, index) => (
            <Animatable.View 
              key={step.id} 
              animation="fadeInLeft" 
              delay={index * 100}
              style={styles.stepWrapper}
            >
              <Card style={[
                styles.stepCard, 
                step.status === 'loading' && { borderColor: colors.primary, borderWidth: 1, backgroundColor: colors.primary + '05' }
              ]}>
                <Card.Content style={styles.stepContent}>
                  <View style={styles.iconContainer}>
                    {step.status === 'loading' ? (
                      <ActivityIndicator size={24} color={colors.primary} />
                    ) : step.status === 'success' ? (
                      <Animatable.View animation="bounceIn">
                        <IconButton icon="check-circle" iconColor={colors.success} size={24} style={styles.statusIcon} />
                      </Animatable.View>
                    ) : step.status === 'error' ? (
                      <IconButton icon="alert-circle" iconColor={colors.error} size={24} style={styles.statusIcon} />
                    ) : (
                      <View style={[styles.dot, { backgroundColor: '#E2E8F0' }]} />
                    )}
                  </View>
                  <View style={styles.textContainer}>
                    <Text style={[
                      styles.stepTitle, 
                      step.status === 'pending' && { color: '#94A3B8' }
                    ]}>
                      {step.title}
                    </Text>
                    <Text style={[
                      styles.stepDesc,
                      step.status === 'pending' && { color: '#CBD5E1' }
                    ]} numberOfLines={2}>
                      {step.description}
                    </Text>
                  </View>
                </Card.Content>
              </Card>
            </Animatable.View>
          ))
        )}
      </ScrollView>

      {/* Expandable Side Insights Panel */}
      <Animatable.View 
        style={[styles.insightsPanel, { backgroundColor: 'white', borderTopColor: colors.border }]}
        animation={showInsights ? "slideInUp" : "slideInUp"}
        duration={500}
      >
        <TouchableOpacity 
          style={styles.panelHeader} 
          onPress={() => setShowInsights(!showInsights)}
        >
          <View style={styles.panelHandle} />
          <View style={styles.panelHeaderRow}>
            <Text style={styles.panelTitle}>AI Reasoning & Insights</Text>
            <IconButton icon={showInsights ? "chevron-down" : "chevron-up"} size={20} />
          </View>
        </TouchableOpacity>

        {showInsights && (
          <ScrollView style={styles.panelContent}>
            {/* Extracted Data Section */}
            <View style={styles.insightSection}>
              <Text style={styles.sectionTitle}>EXTRACTED INTENT</Text>
              <View style={styles.tagContainer}>
                {extractedData ? (
                  <>
                    <Chip style={styles.chip} textStyle={styles.chipText}>{extractedData.service_type}</Chip>
                    <Chip style={styles.chip} textStyle={styles.chipText}>{extractedData.location}</Chip>
                    <Chip style={styles.chip} textStyle={styles.chipText}>{extractedData.urgency}</Chip>
                  </>
                ) : (
                  <Text style={styles.waitingText}>Analyzing request...</Text>
                )}
              </View>
            </View>

            <Divider style={styles.divider} />

            {/* Step reasoning logic */}
            <View style={styles.insightSection}>
              <Text style={styles.sectionTitle}>ORCHESTRATION LOGIC</Text>
              {aiReasoning.length > 0 ? aiReasoning.map((reason, idx) => (
                <List.Item
                  key={idx}
                  title={reason}
                  titleNumberOfLines={3}
                  titleStyle={styles.reasonText}
                  left={props => <List.Icon {...props} icon="brain" color={colors.primary} />}
                />
              )) : (
                <Text style={styles.waitingText}>Awaiting agent insights...</Text>
              )}
            </View>
          </ScrollView>
        )}
      </Animatable.View>

      {error && (
        <Animatable.View animation="shake" style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          
          {error.toLowerCase().includes('wallet') || error.toLowerCase().includes('balance') || error.toLowerCase().includes('insufficient') ? (
            <View style={{ flexDirection: 'row', width: '100%', justifyContent: 'space-between', marginTop: 10 }}>
              <Button 
                mode="outlined" 
                onPress={() => navigation.goBack()}
                style={{ flex: 0.45, borderColor: '#991B1B' }}
                labelStyle={{ color: '#991B1B', fontWeight: 'bold' }}
              >
                Cancel
              </Button>
              <Button 
                mode="contained" 
                onPress={() => setTopupVisible(true)}
                style={{ flex: 0.52, backgroundColor: '#10B981' }}
                labelStyle={{ color: 'white', fontWeight: 'bold' }}
                icon="cash-plus"
              >
                Refill Wallet
              </Button>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', width: '100%', justifyContent: 'space-between', marginTop: 10 }}>
              <Button 
                mode="outlined" 
                onPress={() => navigation.goBack()}
                style={{ flex: 0.45, borderColor: '#991B1B' }}
                labelStyle={{ color: '#991B1B', fontWeight: 'bold' }}
              >
                Cancel
              </Button>
              <Button 
                mode="contained" 
                onPress={retryOrchestration}
                style={{ flex: 0.52, backgroundColor: '#3B82F6' }}
                labelStyle={{ color: 'white', fontWeight: 'bold' }}
                icon="refresh"
              >
                Retry
              </Button>
            </View>
          )}
        </Animatable.View>
      )}

      {/* PREMIUM INLINE CHECKOUT MODAL */}
      <Portal>
        <Dialog 
          visible={topupVisible} 
          onDismiss={() => {
            setTopupVisible(false);
            setCheckoutStep('details');
            setOtpCode('');
            setSimulatedOtpText('');
          }}
          style={{ backgroundColor: colors.background, borderRadius: 28, borderWidth: 1, borderColor: colors.border }}
        >
          <Dialog.Title style={{ color: colors.text, textAlign: 'center', fontWeight: 'bold', fontSize: 18 }}>
            {checkoutStep === 'details' ? 'Refill SafePay Wallet' : 'OTP Secure Authorization 🔒'}
          </Dialog.Title>
          <Dialog.Content>
            <Text style={{ fontSize: 12, color: colors.subtext, textAlign: 'center', marginBottom: 15 }}>
              {checkoutStep === 'details' 
                ? 'Your wallet balance is insufficient to lock this escrow order. Select a local gateway to top up.' 
                : 'Enter the verification PIN code sent to your mobile device to verify funds.'}
            </Text>

            {checkoutStep === 'details' ? (
              <View>
                {/* Gateway selection */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 }}>
                  <TouchableOpacity 
                    style={{ 
                      flex: 0.31, 
                      height: 48, 
                      borderRadius: 12, 
                      justifyContent: 'center', 
                      alignItems: 'center',
                      backgroundColor: gateway === 'sadapay' ? '#00D09C' : colors.card,
                      borderWidth: 1.5,
                      borderColor: gateway === 'sadapay' ? '#00D09C' : colors.border
                    }}
                    onPress={() => setGateway('sadapay')}
                  >
                    <Text style={{ color: gateway === 'sadapay' ? '#FFF' : colors.text, fontWeight: 'bold', fontSize: 12 }}>
                      SadaPay
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={{ 
                      flex: 0.31, 
                      height: 48, 
                      borderRadius: 12, 
                      justifyContent: 'center', 
                      alignItems: 'center',
                      backgroundColor: gateway === 'jazzcash' ? '#EAB308' : colors.card,
                      borderWidth: 1.5,
                      borderColor: gateway === 'jazzcash' ? '#EAB308' : colors.border
                    }}
                    onPress={() => setGateway('jazzcash')}
                  >
                    <Text style={{ color: gateway === 'jazzcash' ? '#000' : colors.text, fontWeight: 'bold', fontSize: 12 }}>
                      JazzCash
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={{ 
                      flex: 0.31, 
                      height: 48, 
                      borderRadius: 12, 
                      justifyContent: 'center', 
                      alignItems: 'center',
                      backgroundColor: gateway === 'easypaisa' ? '#10B981' : colors.card,
                      borderWidth: 1.5,
                      borderColor: gateway === 'easypaisa' ? '#10B981' : colors.border
                    }}
                    onPress={() => setGateway('easypaisa')}
                  >
                    <Text style={{ color: gateway === 'easypaisa' ? '#FFF' : colors.text, fontWeight: 'bold', fontSize: 12 }}>
                      EasyPaisa
                    </Text>
                  </TouchableOpacity>
                </View>

                <TextInput
                  label="Mobile Number"
                  value={topupPhone}
                  onChangeText={setTopupPhone}
                  mode="outlined"
                  keyboardType="phone-pad"
                  style={{ marginBottom: 12, backgroundColor: 'transparent' }}
                  left={<TextInput.Icon icon="phone" color={colors.primary} />}
                />

                <TextInput
                  label="Amount to Refill (PKR)"
                  value={topupAmount}
                  onChangeText={setTopupAmount}
                  mode="outlined"
                  keyboardType="numeric"
                  style={{ marginBottom: 12, backgroundColor: 'transparent' }}
                  left={<TextInput.Icon icon="cash" color={colors.primary} />}
                />
              </View>
            ) : (
              <View>
                {simulatedOtpText ? (
                  <Animatable.View 
                    animation="bounceInDown" 
                    style={{ 
                      backgroundColor: '#FEF3C7', 
                      borderColor: '#F59E0B', 
                      borderWidth: 1, 
                      borderRadius: 12, 
                      padding: 10, 
                      flexDirection: 'row', 
                      alignItems: 'center',
                      marginBottom: 15
                    }}
                  >
                    <IconButton icon="message-processing-outline" iconColor="#D97706" size={20} style={{ margin: 0 }} />
                    <View style={{ flex: 1, marginLeft: 6 }}>
                      <Text style={{ fontWeight: 'bold', color: '#B45309', fontSize: 10 }}>
                        SIMULATED SMS PIN
                      </Text>
                      <Text style={{ color: '#78350F', fontSize: 12 }}>
                        Your OTP is: <Text style={{ fontWeight: 'bold', fontSize: 13 }}>{simulatedOtpText}</Text>
                      </Text>
                    </View>
                  </Animatable.View>
                ) : null}

                <TextInput
                  label="Enter 4-Digit Secure PIN"
                  value={otpCode}
                  onChangeText={(t) => setOtpCode(t.replace(/\D/g, '').slice(0, 4))}
                  mode="outlined"
                  keyboardType="numeric"
                  maxLength={4}
                  style={{ marginBottom: 12, backgroundColor: 'transparent' }}
                  placeholder="xxxx"
                  left={<TextInput.Icon icon="lock" color={colors.primary} />}
                />
              </View>
            )}
          </Dialog.Content>
          <Dialog.Actions style={{ paddingHorizontal: 15, paddingBottom: 15, justifyContent: 'center' }}>
            {checkoutStep === 'details' ? (
              <Button 
                mode="contained" 
                onPress={handleInitiateGatewayTopUp}
                loading={topupLoading}
                style={{ backgroundColor: colors.primary, borderRadius: 12, width: '100%', height: 45, justifyContent: 'center' }}
                labelStyle={{ color: 'white', fontWeight: 'bold' }}
              >
                Initiate Refill ➔
              </Button>
            ) : (
              <View style={{ width: '100%' }}>
                <Button 
                  mode="contained" 
                  onPress={handleVerifyGatewayTopUp}
                  loading={topupLoading}
                  style={{ backgroundColor: '#10B981', borderRadius: 12, width: '100%', height: 45, justifyContent: 'center', marginBottom: 10 }}
                  labelStyle={{ color: 'white', fontWeight: 'bold' }}
                >
                  Verify & Refill Wallet 🔒
                </Button>
                <TouchableOpacity 
                  style={{ alignItems: 'center' }} 
                  onPress={() => {
                    setCheckoutStep('details');
                    setOtpCode('');
                  }}
                >
                  <Text style={{ color: colors.primary, fontWeight: 'bold', fontSize: 12 }}>
                    ← Change Details
                  </Text>
                </TouchableOpacity>
              </View>
            )}
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
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 20,
  },
  aiOrb: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 5,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 150, // Space for the panel
  },
  stepWrapper: {
    marginBottom: 12,
  },
  stepCard: {
    borderRadius: 20,
    backgroundColor: 'white',
    elevation: 1,
  },
  stepContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusIcon: {
    margin: 0,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  textContainer: {
    marginLeft: 15,
    flex: 1,
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  stepDesc: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  insightsPanel: {
    position: 'absolute',
    bottom: 0,
    width: width,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    maxHeight: '60%',
  },
  panelHeader: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  panelHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    marginBottom: 10,
  },
  panelHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 24,
  },
  panelTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  panelContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  insightSection: {
    marginTop: 15,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#94A3B8',
    letterSpacing: 1,
    marginBottom: 10,
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  chip: {
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: '#F1F5F9',
    height: 32,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  reasonText: {
    fontSize: 13,
    color: '#334155',
  },
  waitingText: {
    fontSize: 12,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  divider: {
    marginVertical: 15,
  },
  errorContainer: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },
  errorText: {
    color: '#991B1B',
    fontWeight: '600',
    marginBottom: 10,
    textAlign: 'center',
  },
});

export default ProcessingScreen;
