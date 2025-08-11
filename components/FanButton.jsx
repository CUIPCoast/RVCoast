import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet, Animated } from 'react-native';
import { Feather as Icon } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function FanButton({
  size = 240,
  isOn,
  onPress,
  iconName,
  label,
  loading = false,
}) {
  const animatedValue = React.useRef(new Animated.Value(isOn ? 1 : 0)).current;

  React.useEffect(() => {
    Animated.spring(animatedValue, {
      toValue: isOn ? 1 : 0,
      useNativeDriver: false,
      tension: 100,
      friction: 8,
    }).start();
  }, [isOn]);

  // Scaled dimensions
  const circleDiameter = size * 0.4;
  const iconSize = size * 0.18;
  const fontSize = size * 0.075;
  const badgePadH = size * 0.06;
  const badgePadV = size * 0.025;
  const borderRadius = size * 0.12;

  // Modern color scheme with gradients
  const activeGradient = ['#667eea', '#764ba2'];
  const inactiveGradient = ['#2c3e50', '#34495e'];
  const glowColors = {
    active: '#667eea',
    inactive: '#34495e'
  };

  const shadowOpacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.1, 0.3],
  });

  const glowOpacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.6],
  });

  const scale = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.02],
  });

  return (
    <Animated.View
      style={[
        styles.buttonContainer,
        {
          transform: [{ scale }],
          shadowOpacity,
        },
      ]}
    >
      {/* Glow effect */}
      <Animated.View
        style={[
          styles.glowEffect,
          {
            width: size + 20,
            height: size + 20,
            borderRadius: borderRadius + 10,
            backgroundColor: isOn ? glowColors.active : glowColors.inactive,
            opacity: glowOpacity,
          },
        ]}
      />
      
      <TouchableOpacity
        style={[
          styles.button,
          { 
            width: size, 
            height: size, 
            borderRadius,
          },
          loading && styles.disabled,
        ]}
        onPress={onPress}
        disabled={loading}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={isOn ? activeGradient : inactiveGradient}
          style={[
            styles.gradientBackground,
            { borderRadius }
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {/* Frosted glass overlay */}
          <View style={[styles.frostOverlay, isOn && styles.frostOverlayActive]} />
          
          {/* Icon circle with glassmorphism effect */}
          <View
            style={[
              styles.iconContainer,
              {
                width: circleDiameter,
                height: circleDiameter,
                borderRadius: circleDiameter / 2,
              },
            ]}
          >
            <LinearGradient
              colors={isOn ? ['rgba(255,255,255,0.25)', 'rgba(255,255,255,0.1)'] : ['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
              style={[
                styles.iconGradient,
                {
                  width: circleDiameter,
                  height: circleDiameter,
                  borderRadius: circleDiameter / 2,
                },
              ]}
            >
              <Animated.View
                style={[
                  styles.iconWrapper,
                  {
                    transform: [{
                      rotate: animatedValue.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0deg', '360deg'],
                      })
                    }]
                  }
                ]}
              >
                <Icon 
                  name={iconName} 
                  size={iconSize} 
                  color={isOn ? '#ffffff' : '#b0bec5'} 
                />
              </Animated.View>
            </LinearGradient>
          </View>

          {/* Label with better typography */}
          <Text style={[
            styles.label, 
            { 
              fontSize,
              color: isOn ? '#ffffff' : '#b0bec5',
              fontWeight: isOn ? '700' : '600',
            }
          ]}>
            {label}
          </Text>

          {/* Modern status indicator */}
          <View style={styles.statusContainer}>
            <View
              style={[
                styles.statusDot,
                {
                  backgroundColor: isOn ? '#4ade80' : '#64748b',
                  width: size * 0.03,
                  height: size * 0.03,
                  borderRadius: size * 0.015,
                },
              ]}
            />
            <Text style={[
              styles.statusText, 
              { 
                fontSize: fontSize * 0.8,
                color: isOn ? '#4ade80' : '#64748b',
                marginLeft: size * 0.02,
              }
            ]}>
              {isOn ? 'ACTIVE' : 'INACTIVE'}
            </Text>
          </View>

          {/* Loading indicator overlay */}
          {loading && (
            <View style={styles.loadingOverlay}>
              <View style={styles.loadingSpinner} />
            </View>
          )}
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  buttonContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 16,
  },
  glowEffect: {
    position: 'absolute',
    zIndex: -1,
  },
  button: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  gradientBackground: {
    flex: 1,
    width: '100%',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    padding: 20,
  },
  frostOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    backdropFilter: 'blur(10px)',
  },
  frostOverlayActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  iconGradient: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    fontFamily: 'System',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  statusDot: {
    shadowColor: '#4ade80',
    shadowOpacity: 0.6,
    shadowRadius: 4,
    elevation: 4,
  },
  statusText: {
    fontWeight: '600',
    letterSpacing: 0.8,
    fontSize: 11,
  },
  disabled: {
    opacity: 0.6,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingSpinner: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderTopColor: '#ffffff',
  },
});