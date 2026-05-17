import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import * as Animatable from 'react-native-animatable';

const { width } = Dimensions.get('window');

const SkeletonLoader = ({ type = 'card' }) => {
  const renderCardSkeleton = () => (
    <View style={styles.cardSkeleton}>
      <View style={styles.headerRow}>
        <View style={styles.circle} />
        <View style={styles.longLine} />
      </View>
      <View style={styles.shortLine} />
      <View style={styles.shortLine} />
    </View>
  );

  const renderInputSkeleton = () => (
    <View style={styles.inputSkeleton} />
  );

  return (
    <Animatable.View 
      animation="pulse" 
      iterationCount="infinite" 
      duration={1500}
      style={styles.container}
    >
      {type === 'card' ? renderCardSkeleton() : renderInputSkeleton()}
    </Animatable.View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: 16,
  },
  cardSkeleton: {
    height: 120,
    backgroundColor: '#E2E8F0',
    borderRadius: 20,
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  circle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#CBD5E1',
  },
  longLine: {
    flex: 1,
    height: 12,
    backgroundColor: '#CBD5E1',
    marginLeft: 12,
    borderRadius: 6,
  },
  shortLine: {
    width: '60%',
    height: 10,
    backgroundColor: '#CBD5E1',
    marginTop: 8,
    borderRadius: 5,
  },
  inputSkeleton: {
    height: 100,
    backgroundColor: '#E2E8F0',
    borderRadius: 20,
  }
});

export default SkeletonLoader;
