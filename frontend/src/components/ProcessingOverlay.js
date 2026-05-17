import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions, Modal, Animated } from 'react-native';
import { Text } from 'react-native-paper';
import { getTheme } from '../utils/themeColors';
import useSettingsStore from '../store/useSettingsStore';

const { width } = Dimensions.get('window');

const ProcessingOverlay = ({ visible, message }) => {
  const { theme } = useSettingsStore();
  const colors = getTheme(theme);

  // Animated values for three staggered dots
  const dot1Y = useRef(new Animated.Value(0)).current;
  const dot2Y = useRef(new Animated.Value(0)).current;
  const dot3Y = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Bouncing animation helper
      const createBounce = (animatedVal, delay) => {
        return Animated.loop(
          Animated.sequence([
            Animated.delay(delay),
            Animated.timing(animatedVal, {
              toValue: -15,
              duration: 350,
              useNativeDriver: true,
            }),
            Animated.timing(animatedVal, {
              toValue: 0,
              duration: 300,
              useNativeDriver: true,
            }),
            Animated.delay(150),
          ])
        );
      };

      // Start all three staggered bounce loops
      const anim1 = createBounce(dot1Y, 0);
      const anim2 = createBounce(dot2Y, 150);
      const anim3 = createBounce(dot3Y, 300);

      Animated.parallel([anim1, anim2, anim3]).start();

      return () => {
        dot1Y.setValue(0);
        dot2Y.setValue(0);
        dot3Y.setValue(0);
      };
    }
  }, [visible]);

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.container}>
        {/* Frosted premium modal card */}
        <View style={[styles.card, { backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' }]}>
          
          {/* Custom Bouncing Bubbles Container */}
          <View style={styles.bubbleContainer}>
            <Animated.View 
              style={[
                styles.bubble, 
                { backgroundColor: colors.primary, transform: [{ translateY: dot1Y }] }
              ]} 
            />
            <Animated.View 
              style={[
                styles.bubble, 
                { backgroundColor: '#3B82F6', transform: [{ translateY: dot2Y }] }
              ]} 
            />
            <Animated.View 
              style={[
                styles.bubble, 
                { backgroundColor: '#60A5FA', transform: [{ translateY: dot3Y }] }
              ]} 
            />
          </View>
          
          {/* Animated Message Text */}
          <Text style={[styles.message, { color: '#0F172A' }]}>
            {message || 'Processing...'}
          </Text>
          <Text style={styles.subMessage}>
            Please keep the application open
          </Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)', // Deep slate translucent overlay
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: width * 0.84,
    paddingVertical: 40,
    paddingHorizontal: 20,
    borderRadius: 36,
    borderWidth: 1.5,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: 0.35,
    shadowRadius: 32,
    elevation: 24,
  },
  bubbleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
    marginBottom: 20,
  },
  bubble: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginHorizontal: 8,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  message: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  subMessage: {
    marginTop: 8,
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    fontWeight: '500',
  }
});

export default ProcessingOverlay;
