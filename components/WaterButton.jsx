import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { FontFamily } from '../GlobalStyles';

export default function WaterButton({
  type = 'heater',     // 'heater' | 'pump'
  isOn,
  onPress,
  loading = false,
  compact = false,     // phone = true, tablet = false
  style,               // optional container override (e.g., width)
  width,
  maxWidth,
}) {
  React.useEffect(() => {
    console.log(`WaterButton[${type}]: isOn ->`, isOn);
  }, [isOn, type]);

  const config = type === 'heater'
    ? {
        label: 'Water Heater',
        iconOn: 'flame',
        iconOff: 'flame-outline',
        statusOn: 'Heating',
        statusOff: 'Off',
        activeGradient: ['#FF6B6B', '#FF8E53', '#FF6B35'],
      }
    : {
        label: 'Water Pump',
        iconOn: 'water',
        iconOff: 'water-outline',
        statusOn: 'Running',
        statusOff: 'Off',
        activeGradient: ['#4FC3F7', '#29B6F6', '#0288D1'],
      };

  const inactiveGradient = ['#2C2C34', '#3A3A42', '#2C2C34'];

  const isTablet = !compact;

  // Sizing per variant
  // Slightly smaller tablet sizing
const S = isTablet
  ? { height: 78, iconCircle: 50, icon: 26, label: 17, status: 12, dot: 7, padH: 18, padV: 12 }
  : { height: 70, iconCircle: 46, icon: 24, label: 17, status: 12, dot: 7, padH: 16, padV: 12 };

  return (
     <View
     style={[
       styles.containerBase,
       isTablet ? styles.containerTablet : styles.containerPhone,
       width != null && { width },
       maxWidth != null && { maxWidth },
       style,
     ]}
   >
      <TouchableOpacity
        style={[
          styles.buttonBase,
          { height: S.height, borderRadius: isTablet ? 18 : 16 },
          loading && styles.disabled,
        ]}
        onPress={onPress}
        disabled={loading}
        activeOpacity={0.75}
      >
        <LinearGradient
          colors={isOn ? config.activeGradient : inactiveGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[
            styles.gradient,
            {
              paddingHorizontal: S.padH,
              paddingVertical: S.padV,
              borderRadius: isTablet ? 18 : 16,
            },
          ]}
        >
          {/* Icon */}
          <View
            style={[
              styles.iconCircle,
              {
                width: S.iconCircle,
                height: S.iconCircle,
                borderRadius: S.iconCircle / 2,
                marginRight: isTablet ? 16 : 14,
                backgroundColor: isOn ? 'rgba(255,255,255,0.20)' : 'rgba(255,255,255,0.06)',
                borderColor: isOn ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.10)',
              },
            ]}
          >
            <Ionicons
              name={isOn ? config.iconOn : config.iconOff}
              size={S.icon}
              color={isOn ? '#FFF' : '#B0B0B0'}
            />
          </View>

          {/* Text block (never shrink away) */}
          <View style={styles.textWrap}>
            <Text
              style={[
                styles.label,
                { fontSize: S.label, color: isOn ? '#FFF' : '#E0E0E0' },
              ]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {config.label}
            </Text>

            <View style={styles.statusRow}>
              <View
                style={[
                  styles.statusDot,
                  { width: S.dot, height: S.dot, borderRadius: S.dot / 2, backgroundColor: isOn ? '#4ade80' : '#64748b' },
                ]}
              />
              <Text
                style={[
                  styles.status,
                  { fontSize: S.status, color: isOn ? 'rgba(255,255,255,0.85)' : '#888' },
                ]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {isOn ? config.statusOn : config.statusOff}
              </Text>
            </View>
          </View>

          {/* Loading */}
          {loading && (
            <View style={styles.spinner}>
              <ActivityIndicator size={isTablet ? 'large' : 'small'} color="#FFFFFF" />
            </View>
          )}
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  // container creates its own stacking context so neighbors/elevation can't cover text
  containerBase: {
    width: '100%',
    marginVertical: 6,
    position: 'relative',
    zIndex: 10,
  },
  containerPhone: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  containerTablet: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 9,
    elevation: 10,
  },

  buttonBase: {
    width: '100%',
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(52,73,94,0.4)',
    backgroundColor: 'transparent',
  },

  gradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },

  iconCircle: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    flexShrink: 0,
  },

  // CRITICAL: prevent text from being squeezed away on tablet
  textWrap: {
    flex: 1,
    minWidth: 160,       // guarantees label room on narrow columns
    flexShrink: 0,       // don’t let it collapse when siblings grow
    justifyContent: 'center',
  },

  label: {
    // no fontWeight with custom fonts on Android
    marginBottom: 4,
    letterSpacing: 0.3,
    fontFamily: FontFamily.latoBold,
  },

  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  statusDot: {
    marginRight: 6,
    shadowColor: '#4ade80',
    shadowOpacity: 0.6,
    shadowRadius: 3,
    elevation: 3,
  },

  status: {
    letterSpacing: 0.5,
    fontFamily: FontFamily.latoRegular,
  },

  spinner: {
    marginLeft: 10,
  },

  disabled: {
    opacity: 0.5,
  },
});
