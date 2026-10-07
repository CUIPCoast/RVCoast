import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Color, FontFamily } from '../GlobalStyles';

// Themed on/off control used for vents, water heater/pump and climate modes.
// size: 'compact' (square, fills its row) | 'large' (tablet square) | 'row' (horizontal list item)
const ToggleTile = ({
  label,
  icon,
  isOn,
  onPress,
  disabled,
  size = 'compact',
  onText = 'Running',
  offText = 'Tap to turn on',
  showPill = true,
  style,
}) => {
  const isRow = size === 'row';
  const isLarge = size === 'large';
  const isChip = size === 'chip';
  const iconSize = isLarge ? 44 : isRow || isChip ? 22 : 26;

  const pill = showPill ? (
    <View style={[styles.pill, isLarge && styles.pillLarge, isOn ? styles.pillOn : styles.pillOff]}>
      <Text style={[styles.pillText, isLarge && styles.pillTextLarge, { color: isOn ? '#1B1B1B' : '#9E9696' }]}>
        {isOn ? 'ON' : 'OFF'}
      </Text>
    </View>
  ) : null;

  const iconCircle = (
    <View
      style={[
        styles.iconCircle,
        isLarge && styles.iconCircleLarge,
        (isRow || isChip) && styles.iconCircleRow,
        isOn ? styles.iconCircleOn : styles.iconCircleOff,
      ]}
    >
      <MaterialCommunityIcons name={icon} size={iconSize} color={isOn ? '#1B1B1B' : '#9E9696'} />
    </View>
  );

  const text = (
    <View style={[isRow && styles.rowText, isChip && styles.chipText]}>
      <Text
        style={[styles.label, isLarge && styles.labelLarge, isRow && styles.labelRow, isChip && styles.labelChip]}
        numberOfLines={1}
      >
        {label}
      </Text>
      <Text
        style={[styles.sub, isLarge && styles.subLarge, { color: isOn ? Color.colorSandybrown : '#9E9696' }]}
        numberOfLines={1}
      >
        {isOn ? onText : offText}
      </Text>
    </View>
  );

  return (
    <TouchableOpacity
      style={[
        styles.tile,
        isRow ? styles.tileRow : isChip ? styles.tileChip : isLarge ? styles.tileLarge : styles.tileCompact,
        isOn ? styles.tileOn : styles.tileOff,
        disabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.75}
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: isOn, disabled }}
    >
      {isRow ? (
        <>
          {iconCircle}
          {text}
          {pill}
        </>
      ) : isChip ? (
        <>
          {iconCircle}
          {text}
        </>
      ) : (
        <>
          <View style={styles.top}>
            {iconCircle}
            {pill}
          </View>
          {text}
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  tile: {
    borderWidth: 1,
  },
  tileCompact: {
    flex: 1,
    minHeight: 132,
    borderRadius: 18,
    padding: 14,
    justifyContent: 'space-between',
  },
  tileLarge: {
    width: 260,
    height: 260,
    borderRadius: 28,
    padding: 24,
    justifyContent: 'space-between',
  },
  tileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 68,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  tileChip: {
    flex: 1,
    minHeight: 100,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileOn: {
    backgroundColor: 'rgba(255, 178, 103, 0.12)',
    borderColor: 'rgba(255, 178, 103, 0.6)',
  },
  tileOff: {
    backgroundColor: '#1B1B1B',
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  disabled: {
    opacity: 0.7,
  },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleLarge: {
    width: 84,
    height: 84,
    borderRadius: 42,
  },
  iconCircleRow: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  iconCircleOn: {
    backgroundColor: Color.colorSandybrown,
  },
  iconCircleOff: {
    backgroundColor: '#2A2626',
  },
  rowText: {
    flex: 1,
    marginHorizontal: 12,
  },
  chipText: {
    alignItems: 'center',
  },
  labelChip: {
    fontSize: 14,
    marginTop: 8,
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  pillLarge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
  },
  pillOn: {
    backgroundColor: Color.colorSandybrown,
  },
  pillOff: {
    backgroundColor: '#2A2626',
  },
  pillText: {
    fontSize: 12,
    fontFamily: FontFamily.latoBold,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  pillTextLarge: {
    fontSize: 15,
  },
  label: {
    color: Color.white0,
    fontSize: 17,
    fontFamily: FontFamily.latoBold,
    fontWeight: '700',
    marginTop: 14,
  },
  labelLarge: {
    fontSize: 26,
  },
  labelRow: {
    fontSize: 16,
    marginTop: 0,
  },
  sub: {
    fontSize: 13,
    fontFamily: FontFamily.latoRegular,
    marginTop: 2,
  },
  subLarge: {
    fontSize: 16,
    marginTop: 4,
  },
});

export default ToggleTile;
