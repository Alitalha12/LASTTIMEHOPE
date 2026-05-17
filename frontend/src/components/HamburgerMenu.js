import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert, FlatList } from 'react-native';
import { Text, List, Avatar, Divider, useTheme, IconButton, Button } from 'react-native-paper';
import * as Animatable from 'react-native-animatable';
import useAuthStore from '../store/useAuthStore';
import useSettingsStore from '../store/useSettingsStore';
import useOrchestrationStore from '../store/useOrchestrationStore';
import { t } from '../utils/i18n';
import { getTheme } from '../utils/themeColors';
import WorkflowGraph from './WorkflowGraph';

const HamburgerMenu = ({ onClose, navigation }) => {
  const { user } = useAuthStore();
  const { 
    aiMode, toggleAiMode, 
    speed, setSpeed, 
    language, setLanguage, 
    theme: currentThemeName, setTheme,
    developerMode, toggleDeveloperMode 
  } = useSettingsStore();

  const colors = getTheme(currentThemeName);
  const { activeSessionId, liveLogs, activeAgents } = useOrchestrationStore();

  const userInitial = user?.fullName?.charAt(0).toUpperCase() || 'U';

  const handleLanguageChange = () => {
    const nextLang = language === 'en' ? 'ur' : 'en';
    setLanguage(nextLang);
  };

  const cycleSpeed = () => {
    if (speed === 1000) setSpeed(500); // Fast
    else if (speed === 500) setSpeed(2000); // Slow
    else setSpeed(1000); // Balanced
  };

  const getSpeedLabel = () => {
    if (speed === 500) return t('fast', language);
    if (speed === 2000) return t('slow', language);
    return t('balanced', language);
  };

  const ThemeOption = ({ name, label, color, icon }) => (
    <TouchableOpacity 
      style={[
        styles.themeOption, 
        { borderColor: currentThemeName === name ? colors.primary : colors.border }
      ]}
      onPress={() => setTheme(name)}
    >
       <IconButton icon={icon} iconColor={color} size={20} style={{ margin: 0 }} />
       <Text style={[styles.themeLabel, { color: colors.text }]}>{label}</Text>
       {currentThemeName === name && <View style={[styles.themeDot, { backgroundColor: colors.primary }]} />}
    </TouchableOpacity>
  );

  return (
    <Animatable.View 
      animation="slideInLeft" 
      duration={400} 
      style={[styles.container, { backgroundColor: colors.card }]}
    >
      <View style={[styles.header, { backgroundColor: colors.header }]}>
         <View style={styles.userInfo}>
            {user?.avatar ? (
              <Avatar.Image size={50} source={{ uri: user.avatar }} />
            ) : (
              <Avatar.Text size={50} label={userInitial} style={{ backgroundColor: colors.primary }} />
            )}
            <View style={styles.userText}>
              <Text style={[styles.userName, { color: colors.text }]}>{user?.fullName}</Text>
              <Text style={[styles.userRole, { color: colors.primary }]}>AI System Manager</Text>
            </View>
         </View>
         <IconButton icon="close" size={24} iconColor={colors.text} onPress={onClose} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* ⭐ LIVE AI BRAIN MONITOR */}
        <View style={styles.monitorSection}>
           <Text style={[styles.sectionTitle, { color: colors.subtext }]}>🧠 LIVE AI BRAIN MONITOR</Text>
           <View style={[styles.graphCard, { backgroundColor: 'rgba(0,0,0,0.05)', borderColor: colors.border }]}>
              <WorkflowGraph activeAgents={activeAgents} />
              
              {activeSessionId && (
                <View style={[styles.sessionBadge, { backgroundColor: colors.primary }]}>
                   <Text style={styles.sessionText}>Active: {activeSessionId}</Text>
                </View>
              )}
           </View>
           
           <View style={styles.logStream}>
              {liveLogs.slice(-2).map((log, index) => (
                <Animatable.View animation="fadeInLeft" key={index} style={styles.logItem}>
                   <Text style={[styles.logAgent, { color: colors.primary }]}>[{log.agent}]</Text>
                   <Text style={styles.logMsg} numberOfLines={1}>{log.reasoning[0]}</Text>
                </Animatable.View>
              ))}
           </View>
        </View>

        <Divider style={{ backgroundColor: colors.border, marginVertical: 10 }} />

        {/* 1. SYSTEM CONTROL */}
        <List.Section>
          <List.Subheader style={[styles.sectionTitle, { color: colors.subtext }]}>{t('system_control', language)}</List.Subheader>
          <View style={styles.menuItem}>
            <List.Item
              title={t('ai_auto_mode', language)}
              titleStyle={{ color: colors.text }}
              description={aiMode ? t('auto_booking', language) : t('manual_mode', language)}
              descriptionStyle={{ color: aiMode ? '#10B981' : '#F59E0B' }}
              left={props => <List.Icon {...props} icon="robot" color={colors.primary} />}
              style={{ flex: 1 }}
            />
            <Switch value={aiMode} onValueChange={toggleAiMode} thumbColor={colors.primary} trackColor={{ true: colors.accent }} />
          </View>
          
          <List.Item
            title={t('speed', language)}
            titleStyle={{ color: colors.text }}
            description={getSpeedLabel()}
            left={props => <List.Icon {...props} icon="bolt" color="#F59E0B" />}
            right={props => <List.Icon {...props} icon="cached" color={colors.subtext} />}
            onPress={cycleSpeed}
          />
        </List.Section>

        <Divider style={{ backgroundColor: colors.border }} />

        {/* 2. THEME SELECTOR (NEW) */}
        <List.Section>
           <List.Subheader style={[styles.sectionTitle, { color: colors.subtext }]}>APP THEME</List.Subheader>
           <View style={styles.themeRow}>
              <ThemeOption name="default" label="Light" color="#2563EB" icon="weather-sunny" />
              <ThemeOption name="midnight" label="Dark Blue" color="#6366F1" icon="weather-night" />
              <ThemeOption name="nature" label="Greenish" color="#059669" icon="leaf" />
           </View>
        </List.Section>

        <Divider style={{ backgroundColor: colors.border }} />

        {/* 3. USER & SETTINGS */}
        <List.Section>
          <List.Subheader style={[styles.sectionTitle, { color: colors.subtext }]}>{t('user_settings', language)}</List.Subheader>
          <List.Item
            title={t('language', language)}
            titleStyle={{ color: colors.text }}
            description={language === 'en' ? 'English' : 'اردو (Urdu)'}
            left={props => <List.Icon {...props} icon="translate" color={colors.subtext} />}
            onPress={handleLanguageChange}
          />
          <List.Item
            title={t('account', language)}
            titleStyle={{ color: colors.text }}
            left={props => <List.Icon {...props} icon="cog-outline" color={colors.subtext} />}
            onPress={() => {
                onClose();
                navigation.navigate('ProfileTab');
            }}
          />
        </List.Section>

        <View style={[styles.demoBanner, { backgroundColor: colors.statusBg, borderColor: colors.border }]}>
           <Text style={[styles.demoText, { color: colors.statusText }]}>{t('demo_mode', language)}</Text>
           <Button 
            mode="text" 
            labelStyle={{ fontSize: 12 }} 
            textColor={colors.primary}
            onPress={() => Alert.alert("Scenario", "AI Agent is simulating a high-demand scenario in G-13 Islamabad.")}
           >
             {t('run_scenario', language)}
           </Button>
        </View>
      </ScrollView>
    </Animatable.View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '85%',
    height: '100%',
    position: 'absolute',
    left: 0,
    top: 0,
    zIndex: 2000,
    elevation: 16,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userText: {
    marginLeft: 15,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  userRole: {
    fontSize: 12,
    fontWeight: '600',
  },
  monitorSection: {
    paddingHorizontal: 15,
    marginTop: 10,
  },
  graphCard: {
    borderRadius: 20,
    padding: 10,
    alignItems: 'center',
    marginVertical: 10,
    borderWidth: 1,
  },
  sessionBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  sessionText: {
    color: 'white',
    fontSize: 8,
    fontWeight: 'bold',
  },
  logStream: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 10,
    height: 60,
  },
  logItem: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  logAgent: {
    fontSize: 10,
    fontWeight: 'bold',
    marginRight: 5,
  },
  logMsg: {
    color: '#94A3B8',
    fontSize: 10,
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 1.5,
    marginTop: 10,
    paddingHorizontal: 15,
  },
  themeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    marginTop: 10,
  },
  themeOption: {
    width: '31%',
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 2,
  },
  themeLabel: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  themeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 5,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 15,
  },
  demoBanner: {
    margin: 20,
    padding: 15,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  demoText: {
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
  }
});

export default HamburgerMenu;
