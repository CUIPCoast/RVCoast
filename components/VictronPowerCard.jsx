// components/VictronPowerCard.jsx
// Lit, color-coded panel used on the tablet Victron overview.
// The caller's `style` owns size and position (the power lines are drawn at fixed
// coordinates around these cards), this component only owns the look.
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { FontFamily } from '../GlobalStyles';

const VictronPowerCard = ({
  title,
  icon,
  value,
  unit,
  subtitle,
  badge,
  colors,
  glow,
  compact = false,
  style,
  children,
}) => (
  // Solid base color keeps the card opaque so lines and photos behind it never show through
  <View style={[styles.shell, { shadowColor: glow || colors[0], backgroundColor: colors[colors.length - 1] }, style]}>
    {/* Clipped layer: gradient + watermark stay inside the rounded card */}
    <View style={styles.clip} pointerEvents="none">
      <LinearGradient
        colors={colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {/* Oversized watermark icon gives each panel its own silhouette */}
      <MaterialCommunityIcons
        name={icon}
        size={compact ? 96 : 150}
        color="#FFFFFF"
        style={[styles.watermark, compact && styles.watermarkCompact]}
      />
    </View>

    <View style={[styles.content, compact && styles.contentCompact]}>
      <View style={styles.header}>
        <View style={[styles.iconChip, compact && styles.iconChipCompact]}>
          <MaterialCommunityIcons name={icon} size={compact ? 16 : 20} color="#FFFFFF" />
        </View>
        <Text style={[styles.title, compact && styles.titleCompact]} numberOfLines={1}>
          {title}
        </Text>
        {badge ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText} numberOfLines={1}>{badge}</Text>
          </View>
        ) : null}
      </View>

      {children || (
        <View>
          <Text style={[styles.value, compact && styles.valueCompact]} numberOfLines={1}>
            {value}
            {unit ? <Text style={[styles.unit, compact && styles.unitCompact]}> {unit}</Text> : null}
          </Text>
          {subtitle ? (
            <Text style={[styles.subtitle, compact && styles.subtitleCompact]} numberOfLines={2}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      )}
    </View>
  </View>
);

const styles = StyleSheet.create({
  shell: {
    borderRadius: 20,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.75,
    shadowRadius: 16,
    elevation: 10,
  },
  clip: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.22)',
  },
  watermark: {
    position: 'absolute',
    right: -22,
    bottom: -28,
    opacity: 0.13,
  },
  watermarkCompact: {
    right: -14,
    bottom: -18,
  },
  content: {
    flex: 1,
    padding: 18,
    justifyContent: 'space-between',
  },
  contentCompact: {
    padding: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconChip: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  iconChipCompact: {
    width: 28,
    height: 28,
    borderRadius: 9,
    marginRight: 8,
  },
  title: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 19,
    fontFamily: FontFamily.latoBold,
  },
  titleCompact: {
    fontSize: 15,
  },
  badge: {
    backgroundColor: 'rgba(0, 0, 0, 0.28)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginLeft: 8,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: FontFamily.latoBold,
  },
  value: {
    color: '#FFFFFF',
    fontSize: 44,
    fontFamily: FontFamily.latoBold,
  },
  valueCompact: {
    fontSize: 28,
  },
  unit: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 20,
    fontFamily: FontFamily.latoRegular,
  },
  unitCompact: {
    fontSize: 14,
  },
  subtitle: {
    color: 'rgba(255, 255, 255, 0.82)',
    fontSize: 14,
    fontFamily: FontFamily.latoRegular,
    marginTop: 2,
  },
  subtitleCompact: {
    fontSize: 12,
  },
});

export default VictronPowerCard;
