import React from 'react';
import { View, StyleSheet, ScrollView, Dimensions, TouchableOpacity } from 'react-native';
import { Text, Card, Button, Avatar, useTheme, List, Chip, Divider, IconButton } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import useStore from '../store/useStore';
import * as Animatable from 'react-native-animatable';

const { width } = Dimensions.get('window');

const ResultsScreen = () => {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const { result, aiReasoning } = useStore();

  if (!result || !result.data) {
    return (
      <View style={styles.center}>
        <Text>No results found. Please try again.</Text>
        <Button onPress={() => navigation.navigate('HomeTab')}>Go Home</Button>
      </View>
    );
  }

  const { recommended_provider, quote, booking, parsed_intent } = result.data;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        <Animatable.View animation="bounceIn" style={styles.successHeader}>
          <Avatar.Icon size={80} icon="check-decagram" style={{ backgroundColor: colors.success }} iconColor="white" />
          <Text style={styles.successTitle}>Booking Confirmed!</Text>
          <Text style={styles.successSubtitle}>AI Orchestrator has finalized your request</Text>
        </Animatable.View>

        {/* Selected Provider Card */}
        <Animatable.View animation="fadeInUp" delay={200}>
          <Card style={styles.providerCard}>
            <Card.Content>
              <Text style={styles.sectionLabel}>SELECTED PROVIDER</Text>
              <View style={styles.providerHeader}>
                <Avatar.Image size={60} source={{ uri: recommended_provider.image || `https://i.pravatar.cc/150?u=${recommended_provider.id}` }} />
                <View style={styles.providerInfo}>
                  <Text style={styles.providerName}>{recommended_provider.name}</Text>
                  <View style={styles.row}>
                    <Chip icon="star" style={styles.ratingChip}>{recommended_provider.rating || '4.8'}</Chip>
                    <Text style={styles.distanceText}>{recommended_provider.distance_km || '2.4'} km away</Text>
                  </View>
                  
                  {/* Custom Shimmer Tiers Badge (Feature 12) */}
                  {(() => {
                    const tier = recommended_provider.badgeTier || '';
                    let badgeInfo = { label: 'Silver Shield 🛡️', color: '#64748B', icon: 'shield', bg: 'rgba(100, 116, 139, 0.1)' };
                    if (tier === 'Diamond') {
                      badgeInfo = { label: 'Diamond Shield 🛡️💎', color: '#3B82F6', icon: 'crown', bg: 'rgba(59, 130, 246, 0.1)' };
                    } else if (tier === 'Gold') {
                      badgeInfo = { label: 'Gold Shield 🛡️⭐', color: '#D97706', icon: 'star', bg: 'rgba(217, 119, 6, 0.1)' };
                    } else {
                      // Dynamic evaluation fallback
                      const rateVal = parseFloat(recommended_provider.rating || 4.8);
                      const jobs = parseInt(recommended_provider.completedJobs || 0);
                      if (jobs >= 10 && rateVal >= 4.7) {
                        badgeInfo = { label: 'Diamond Shield 🛡️💎', color: '#3B82F6', icon: 'crown', bg: 'rgba(59, 130, 246, 0.1)' };
                      } else if (jobs >= 5 && rateVal >= 4.2) {
                        badgeInfo = { label: 'Gold Shield 🛡️⭐', color: '#D97706', icon: 'star', bg: 'rgba(217, 119, 6, 0.1)' };
                      }
                    }
                    return (
                      <View style={[styles.tierBadge, { backgroundColor: badgeInfo.bg }]}>
                        <IconButton icon={badgeInfo.icon} size={14} iconColor={badgeInfo.color} style={{ margin: 0, padding: 0 }} />
                        <Text style={[styles.tierText, { color: badgeInfo.color }]}>{badgeInfo.label}</Text>
                      </View>
                    );
                  })()}
                </View>
              </View>
              
              <Divider style={styles.divider} />
              
              {/* Why this provider? */}
              <View style={styles.reasoningBox}>
                <Text style={styles.reasoningTitle}>Why this professional?</Text>
                {aiReasoning.slice(2, 5).map((reason, idx) => (
                  <View key={idx} style={styles.reasonRow}>
                    <Avatar.Icon size={16} icon="check" style={{ backgroundColor: colors.success + '20' }} iconColor={colors.success} />
                    <Text style={styles.reasonText}>{reason}</Text>
                  </View>
                ))}
              </View>
            </Card.Content>
          </Card>
        </Animatable.View>
 
        {/* Booking Details */}
        <Animatable.View animation="fadeInUp" delay={400}>
          <Card style={styles.detailCard}>
            <Card.Content>
              <View style={styles.detailRow}>
                <View>
                  <Text style={styles.detailLabel}>Booking ID</Text>
                  <Text style={styles.detailValue}>#{booking.booking_id.substring(0, 8).toUpperCase()}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.detailLabel}>Status</Text>
                  <Chip style={{ backgroundColor: colors.success + '15' }} textStyle={{ color: colors.success }}>CONFIRMED</Chip>
                </View>
              </View>
              
              <Divider style={styles.divider} />
              
              <View style={styles.detailRow}>
                <View>
                  <Text style={styles.detailLabel}>Service</Text>
                  <Text style={styles.detailValue}>{parsed_intent.service_type.toUpperCase()}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.detailLabel}>Estimated Cost</Text>
                  <Text style={[styles.detailValue, { color: colors.primary }]}>Rs. {quote.final_cost}</Text>
                </View>
              </View>
            </Card.Content>
          </Card>
        </Animatable.View>
 
        {/* AI Trace Timeline Shortcut */}
        <TouchableOpacity 
          style={[styles.traceButton, { borderColor: colors.primary }]}
          onPress={() => navigation.navigate('ActivityTab')}
        >
          <IconButton icon="history" iconColor={colors.primary} size={20} />
          <Text style={[styles.traceButtonText, { color: colors.primary }]}>View AI Execution Trace</Text>
        </TouchableOpacity>
 
        <Button 
          mode="contained" 
          style={styles.mainButton} 
          onPress={() => navigation.navigate('Tracking')}
        >
          Track Provider Live
        </Button>
 
      </ScrollView>
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
    padding: 20,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 60,
  },
  successHeader: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 30,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 15,
  },
  successSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 5,
    textAlign: 'center',
  },
  providerCard: {
    borderRadius: 24,
    backgroundColor: 'white',
    elevation: 4,
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#94A3B8',
    letterSpacing: 1,
    marginBottom: 15,
  },
  providerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  providerInfo: {
    marginLeft: 15,
    flex: 1,
  },
  providerName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  ratingChip: {
    height: 24,
    backgroundColor: '#FFFBEB',
  },
  distanceText: {
    fontSize: 12,
    color: '#64748B',
    marginLeft: 10,
  },
  divider: {
    marginVertical: 20,
  },
  reasoningBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 15,
  },
  reasoningTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  reasonText: {
    fontSize: 13,
    color: '#475569',
    marginLeft: 10,
    flex: 1,
  },
  detailCard: {
    borderRadius: 24,
    backgroundColor: 'white',
    elevation: 2,
    marginBottom: 30,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 11,
    color: '#94A3B8',
    textTransform: 'uppercase',
  },
  detailValue: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 2,
  },
  traceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 16,
    height: 50,
    marginBottom: 15,
  },
  traceButtonText: {
    fontWeight: 'bold',
  },
  mainButton: {
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
  },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingRight: 8,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  tierText: {
    fontSize: 11,
    fontWeight: 'bold',
  }
});

export default ResultsScreen;
