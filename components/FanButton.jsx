import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet, Animated, ActivityIndicator } from 'react-native';
import { Feather as Icon } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function FanButton({
  size = 240,
  isOn,
  onPress,
  iconName,
  label,
  loading = false,
  compact = false, // New prop for horizontal mobile layout
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

  // For compact mode (mobile horizontal layout)
  if (compact) {
    const scale = animatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 1.01],
    });

    return (
      <Animated.View
        style={[
          styles.compactButtonContainer,
          {
            transform: [{ scale }],
          },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.compactButton,
            isOn ? styles.compactButtonActive : styles.compactButtonInactive,
            loading && styles.disabled,
          ]}
          onPress={onPress}
          disabled={loading}
          activeOpacity={0.7}
        >
          <LinearGradient
            colors={isOn ? ['#667eea', '#764ba2'] : ['#2c3e50', '#34495e']}
            style={styles.compactGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            {/* Icon Circle */}
            <View style={[
              styles.compactIconCircle,
              isOn ? styles.compactIconCircleActive : styles.compactIconCircleInactive
            ]}>
              <Animated.View
                style={{
                  transform: [{
                    rotate: animatedValue.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', '180deg'],
                    })
                  }]
                }}
              >
                <Icon
                  name={iconName}
                  size={24}
                  color={isOn ? '#ffffff' : '#b0bec5'}
                />
              </Animated.View>
            </View>

            {/* Label and Status */}
            <View style={styles.compactTextContainer}>
              <Text style={[
                styles.compactLabel,
                { color: isOn ? '#ffffff' : '#b0bec5' }
              ]}>
                {label}
              </Text>
              <View style={styles.compactStatusRow}>
                <View style={[
                  styles.compactStatusDot,
                  { backgroundColor: isOn ? '#4ade80' : '#64748b' }
                ]} />
                <Text style={[
                  styles.compactStatusText,
                  { color: isOn ? '#4ade80' : '#64748b' }
                ]}>
                  {isOn ? 'ON' : 'OFF'}
                </Text>
              </View>
            </View>

            {/* Loading Indicator */}
            {loading && (
              <View style={styles.compactLoadingContainer}>
                <ActivityIndicator size="small" color="#ffffff" />
              </View>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  // Original square layout for tablet/larger screens
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
  // Compact (Mobile) Styles
  compactButtonContainer: {
    width: '100%',
    marginVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  compactButton: {
    width: '100%',
    height: 70,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1.5,
  },
  compactButtonActive: {
    borderColor: 'rgba(102, 126, 234, 0.6)',
  },
  compactButtonInactive: {
    borderColor: 'rgba(52, 73, 94, 0.4)',
  },
  compactGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  compactIconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    borderWidth: 1,
  },
  compactIconCircleActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  compactIconCircleInactive: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  compactTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  compactLabel: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  compactStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactStatusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginRight: 6,
    shadowColor: '#4ade80',
    shadowOpacity: 0.6,
    shadowRadius: 3,
    elevation: 3,
  },
  compactStatusText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  compactLoadingContainer: {
    marginLeft: 10,
  },

  // Original (Tablet/Large) Styles
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