import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { Feather as Icon } from '@expo/vector-icons';

export default function FanButton({
  size = 240,
  isOn,
  onPress,
  iconName,
  label,
  loading = false,
}) {
  // Scaled dimensions - increased sizes for text and icons
  const circleDiameter = size * 0.35;
  const iconSize       = size * 0.2;  // Increased from 0.15 to 0.2
  const fontSize       = size * 0.08; // Increased from 0.065 to 0.08
  const badgePadH      = size * 0.05;
  const badgePadV      = size * 0.02;
  const borderRadius   = size * 0.07;

  const activeColor   = '#4F7BFA';
  const inactiveColor = '#323845';

  return (
    <TouchableOpacity
      style={[
        styles.button,
        { width: size, height: size, borderRadius },
        { backgroundColor: '#27303F', borderColor: isOn ? activeColor : inactiveColor },
        loading && styles.disabled,
      ]}
      onPress={onPress}
      disabled={loading}
    >
      {/* Icon circle */}
      <View
        style={[
          styles.circle,
          {
            width: circleDiameter,
            height: circleDiameter,
            borderRadius: circleDiameter / 2,
            backgroundColor: isOn ? activeColor : inactiveColor,
          },
        ]}
      >
        <Icon name={iconName} size={iconSize} color="#FFF" />
      </View>

      {/* Label */}
      <Text style={[styles.label, { fontSize }]}>{label}</Text>

      {/* Status badge */}
      <View
        style={[
          styles.badge,
          {
            paddingHorizontal: badgePadH,
            paddingVertical: badgePadV,
            backgroundColor: isOn ? activeColor : inactiveColor,
            borderRadius: badgePadH,
          },
        ]}
      >
        <Text style={[styles.badgeText, { fontSize: fontSize * 0.85 }]}>            
          {isOn ? 'ON' : 'OFF'}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    justifyContent: 'space-evenly',
    alignItems: 'center',
    shadowColor: '#FFF',
    shadowOpacity: 0.7,
    shadowRadius: 5,
    elevation: 10,
    borderWidth: 1,
  },
  disabled: {
    opacity: 0.5,
  },
  circle: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    color: '#FFF',
    fontWeight: '600',
  },
  badge: {
    alignItems: 'center',
  },
  badgeText: {
    color: '#FFF',
    fontWeight: '700',
  },
});