import React, { useEffect, useRef } from 'react';
import { View, Animated, Easing } from 'react-native';

const AnimatedAwning = ({ width = 120, height = 120, style }) => {
  // Animation values
  const awningExtension = useRef(new Animated.Value(0.3)).current; // Start partially extended
  const fabricWave = useRef(new Animated.Value(0)).current;
  const shadowOpacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    // Create a gentle breathing animation for the awning
    const breathingAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(awningExtension, {
          toValue: 0.7,
          duration: 4000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
        Animated.timing(awningExtension, {
          toValue: 0.3,
          duration: 4000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
      ])
    );

    // Create a gentle fabric wave animation
    const waveAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(fabricWave, {
          toValue: 1,
          duration: 3000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
        Animated.timing(fabricWave, {
          toValue: -1,
          duration: 3000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
      ])
    );

    // Sync shadow with extension
    const shadowAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(shadowOpacity, {
          toValue: 0.6,
          duration: 4000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
        Animated.timing(shadowOpacity, {
          toValue: 0.3,
          duration: 4000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
      ])
    );

    // Start all animations
    breathingAnimation.start();
    waveAnimation.start();
    shadowAnimation.start();

    // Cleanup
    return () => {
      breathingAnimation.stop();
      waveAnimation.stop();
      shadowAnimation.stop();
    };
  }, []);

  return (
    <View style={[styles.container, { width, height }, style]}>
      {/* Ground */}
      <View style={styles.ground} />
      
      {/* Shadow on ground */}
      <Animated.View 
        style={[
          styles.groundShadow,
          {
            opacity: shadowOpacity,
            transform: [{
              scaleX: awningExtension.interpolate({
                inputRange: [0, 1],
                outputRange: [0.5, 1.8]
              })
            }]
          }
        ]} 
      />

      {/* RV Body */}
      <View style={styles.rv}>
        <View style={styles.rvWindow} />
        <View style={styles.rvVent} />
        <View style={styles.motorHousing} />
      </View>
      
      {/* Awning Mount */}
      <View style={styles.awningMount} />
      
      {/* Main Awning Fabric */}
      <Animated.View 
        style={[
          styles.awningFabric, 
          { 
            width: awningExtension.interpolate({
              inputRange: [0, 1],
              outputRange: [15, 70]
            }),
            height: awningExtension.interpolate({
              inputRange: [0, 1],
              outputRange: [6, 12]
            }),
            transform: [
              {
                translateY: fabricWave.interpolate({
                  inputRange: [-1, 0, 1],
                  outputRange: [-1, 0, 2]
                })
              },
              { rotate: '2deg' }
            ]
          }
        ]}
      />

      {/* Awning Support Arm */}
      <Animated.View 
        style={[
          styles.awningArm, 
          { 
            width: awningExtension.interpolate({
              inputRange: [0, 1],
              outputRange: [8, 35]
            }),
            transform: [
              { 
                rotateZ: awningExtension.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0deg', '-12deg']
                })
              }
            ]
          }
        ]} 
      />

      {/* Support Posts */}
      <Animated.View 
        style={[
          styles.supportPost1,
          {
            opacity: awningExtension.interpolate({
              inputRange: [0, 0.5, 1],
              outputRange: [0, 0.5, 1]
            }),
            transform: [
              { 
                translateX: awningExtension.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 30]
                })
              }
            ]
          }
        ]} 
      />
      
      <Animated.View 
        style={[
          styles.supportPost2,
          {
            opacity: awningExtension.interpolate({
              inputRange: [0, 0.5, 1],
              outputRange: [0, 0.5, 1]
            }),
            transform: [
              { 
                translateX: awningExtension.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 50]
                })
              }
            ]
          }
        ]} 
      />
    </View>
  );
};

const styles = {
  container: {
    position: 'relative',
    backgroundColor: '#F0F8FF',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#4682B4',
  },
  
  // Ground
  ground: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 25,
    backgroundColor: '#2D2D2D',
  },
  
  // Shadow
  groundShadow: {
    position: 'absolute',
    bottom: 23,
    left: 30,
    width: 25,
    height: 4,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 5,
  },
  
  // RV
  rv: {
    width: 35,
    height: 55,
    backgroundColor: '#1B1B1B',
    borderRadius: 4,
    position: 'absolute',
    left: 10,
    bottom: 25,
    borderWidth: 1,
    borderColor: '#A9A9A9',
  },
  rvWindow: {
    width: 15,
    height: 12,
    backgroundColor: '#ADD8E6',
    borderRadius: 2,
    position: 'absolute',
    top: 8,
    right: 5,
    borderWidth: 0.5,
    borderColor: '#4682B4',
  },
  rvVent: {
    width: 18,
    height: 3,
    backgroundColor: '#696969',
    borderRadius: 1,
    position: 'absolute',
    top: 3,
    right: 4,
  },
  motorHousing: {
    width: 6,
    height: 4,
    backgroundColor: '#2F2F2F',
    borderRadius: 1,
    position: 'absolute',
    top: 25,
    right: -3,
    borderWidth: 0.5,
    borderColor: '#000',
  },
  
  // Awning mount
  awningMount: {
    width: 4,
    height: 4,
    backgroundColor: '#2F2F2F',
    borderRadius: 2,
    position: 'absolute',
    left: 45,
    top: 50,
    borderWidth: 0.5,
    borderColor: '#000',
  },
  
  // Awning fabric
  awningFabric: {
    backgroundColor: '#111111',
    position: 'absolute',
    left: 45,
    bottom: 65,
    borderRadius: 1,
    borderWidth: 0.5,
    borderColor: '#353839',
  },
  
  // Awning arm
  awningArm: {
    height: 2,
    backgroundColor: '#A9A9A9',
    position: 'absolute',
    left: 45,
    bottom: 64,
    borderRadius: 1,
    borderWidth: 0.5,
    borderColor: '#808080',
    transformOrigin: 'left center',
  },

  // Support posts
  supportPost1: {
    width: 2,
    height: 15,
    backgroundColor: '#A9A9A9',
    position: 'absolute',
    left: 60,
    bottom: 25,
    borderRadius: 1,
  },
  supportPost2: {
    width: 2,
    height: 15,
    backgroundColor: '#A9A9A9',
    position: 'absolute',
    left: 70,
    bottom: 25,
    borderRadius: 1,
  },
};

export default AnimatedAwning;