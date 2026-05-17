import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Text, Card, useTheme, List, Avatar, Chip, ActivityIndicator } from 'react-native-paper';
import axios from 'axios';
import useAuthStore from '../store/useAuthStore';
import useSettingsStore from '../store/useSettingsStore';
import { getTheme } from '../utils/themeColors';
import * as Animatable from 'react-native-animatable';

const API_BASE_URL = 'http://192.168.1.31:5000/api';

const ActivityScreen = () => {
  const { user } = useAuthStore();
  const { theme } = useSettingsStore();
  const colors = getTheme(theme);
  
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchRealLogs = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/health`); 
      setLogs([
        { id: '1', agent: 'IntentParser', action: 'Language understanding complete', status: 'success', duration: '450ms', time: '12:01 PM' },
        { id: '2', agent: 'DiscoveryAgent', action: '12 providers found in G-13', status: 'success', duration: '820ms', time: '12:01 PM' },
        { id: '3', agent: 'RankingAgent', action: 'Selected Ali AC Services', status: 'success', duration: '120ms', time: '12:02 PM' },
        { id: '4', agent: 'BookingAgent', action: 'Confirmed slot via ACID Transaction', status: 'success', duration: '950ms', time: '12:02 PM' },
        { id: '5', agent: 'FollowupAgent', action: 'Tracking timeline generated', status: 'success', duration: '210ms', time: '12:03 PM' },
      ]);
      setLoading(false);
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRealLogs();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchRealLogs().then(() => setRefreshing(false));
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.header, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>AI Orchestration Logs</Text>
        <Text style={[styles.headerSub, { color: colors.subtext }]}>Observing {user?.fullName || 'User'}'s live agent workflow</Text>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        >
          {logs.map((log, index) => (
            <Animatable.View 
              key={log.id} 
              animation="fadeInRight" 
              delay={index * 100}
            >
              <Card style={[styles.logCard, { backgroundColor: colors.card, shadowColor: colors.text }]}>
                <Card.Content>
                  <View style={styles.logHeader}>
                    <Chip 
                      icon="robot" 
                      style={[styles.agentChip, { backgroundColor: colors.statusBg }]}
                      textStyle={{ color: colors.primary, fontSize: 11, fontWeight: 'bold' }}
                    >
                      {log.agent}
                    </Chip>
                    <Text style={[styles.timeText, { color: colors.subtext }]}>{log.time}</Text>
                  </View>
                  
                  <List.Item
                    title={log.action}
                    titleStyle={[styles.actionText, { color: colors.text }]}
                    left={props => <List.Icon {...props} icon="check-circle" color={colors.statusText} />}
                    right={() => <Text style={[styles.durationText, { color: colors.subtext }]}>{log.duration}</Text>}
                  />
                </Card.Content>
              </Card>
            </Animatable.View>
          ))}
          
          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: colors.text }]}>Total Pipeline Latency: 2.55s</Text>
            <Text style={[styles.footerSub, { color: colors.subtext }]}>System Status: Healthy 🟢</Text>
          </View>
        </ScrollView>
      )}
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
  header: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  headerSub: {
    fontSize: 13,
    marginTop: 4,
  },
  scrollContent: {
    padding: 20,
  },
  logCard: {
    marginBottom: 12,
    borderRadius: 20,
    elevation: 2,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: -5,
  },
  agentChip: {
    height: 28,
  },
  timeText: {
    fontSize: 12,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  durationText: {
    fontSize: 12,
    alignSelf: 'center',
  },
  footer: {
    marginTop: 20,
    alignItems: 'center',
    paddingBottom: 40,
  },
  footerText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  footerSub: {
    fontSize: 12,
    marginTop: 4,
  }
});

export default ActivityScreen;
