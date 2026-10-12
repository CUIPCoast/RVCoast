import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Color, FontFamily } from '../GlobalStyles';

// "All lights" bar: summary of how many lights are on plus an OFF / ON segmented switch.
// onCount / total are optional; without them the subtitle falls back to a hint.
const MasterLightControl = ({ isOn, onToggleOn, onToggleOff, isLoading, onCount, total, style }) => {
  const hasCount = typeof onCount === 'number' && typeof total === 'number';
  const anyOn = hasCount ? onCount > 0 : isOn;

  const subtitle = hasCount
    ? onCount === 0
      ? 'All lights are off'
      : `${onCount} of ${total} on`
    : 'Control every light at once';

  const segment = (label, active, onPress) => (
    <TouchableOpacity
      style={[styles.segment, active && styles.segmentActive]}
      onPress={onPress}
      disabled={isLoading}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={`Turn all lights ${label.toLowerCase()}`}
      accessibilityState={{ selected: active, disabled: isLoading }}
    >
      <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, anyOn && styles.containerOn, style]}>
      <View style={[styles.iconCircle, anyOn ? styles.iconCircleOn : styles.iconCircleOff]}>
        <MaterialCommunityIcons name="lightbulb-group" size={24} color={anyOn ? '#1B1B1B' : '#9E9696'} />
      </View>

      <View style={styles.text}>
        <Text style={styles.title}>All Lights</Text>
        <Text style={[styles.subtitle, { color: anyOn ? Color.colorSandybrown : '#9E9696' }]} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>

      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="small" color={Color.colorSandybrown} />
        </View>
      ) : (
        <View style={styles.segmented}>
          {segment('OFF', !isOn, onToggleOff)}
          {segment('ON', isOn, onToggleOn)}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    marginHorizontal: 20,
    backgroundColor: '#1B1B1B',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  containerOn: {
    borderColor: 'rgba(255, 178, 103, 0.35)',
  },
  iconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleOn: {
    backgroundColor: Color.colorSandybrown,
  },
  iconCircleOff: {
    backgroundColor: '#2A2626',
  },
  text: {
    flex: 1,
    marginHorizontal: 12,
  },
  title: {
    color: Color.white0,
    fontSize: 16,
    fontFamily: FontFamily.latoBold,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: FontFamily.latoRegular,
    marginTop: 2,
  },
  segmented: {
    flexDirection: 'row',
    backgroundColor: '#2A2626',
    borderRadius: 14,
    padding: 3,
  },
  segment: {
    minWidth: 52,
    paddingHorizontal: 12,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: 11,
  },
  segmentActive: {
    backgroundColor: Color.colorSandybrown,
  },
  segmentText: {
    color: '#9E9696',
    fontSize: 13,
    fontFamily: FontFamily.latoBold,
    letterSpacing: 0.5,
  },
  segmentTextActive: {
    color: '#1B1B1B',
  },
  loading: {
    width: 110,
    alignItems: 'center',
  },
});

export default MasterLightControl;
