import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import useTemperature from "../hooks/useTemperature";
import useScreenSize from "../helper/useScreenSize";
import { FontFamily } from "../GlobalStyles";

const ACCENT = '#FFB267';

/**
 * Real-time Temperature Display Component
 * Shows current ambient temperature from CAN bus with live updates
 * Displays connection status and allows unit switching
 */
const TemperatureDisplay = ({ 
  onTemperaturePress, 
  showSetpoints = false, 
  style = {} 
}) => {
  const [temperatureUnit, setTemperatureUnit] = useState('F');
  const isTablet = useScreenSize();
  
  const {
    temperature,
    formattedTemperature,
    setpoints,
    isConnected,
    isLoading,
    error,
    connectionStatus,
    refresh
  } = useTemperature({ 
    autoStart: true, 
    temperatureUnit 
  });

  // Toggle between Celsius and Fahrenheit
  const toggleTemperatureUnit = () => {
    setTemperatureUnit(prev => prev === 'F' ? 'C' : 'F');
  };

  // Handle temperature display press
  const handlePress = () => {
    if (onTemperaturePress) {
      onTemperaturePress(temperature);
    } else {
      toggleTemperatureUnit();
    }
  };

  // Get connection status indicator
  const getConnectionIndicator = () => {
    if (isLoading) {
      return { color: '#F59E0B', icon: '○' }; // Orange circle for loading
    } else if (isConnected) {
      return { color: '#10B981', icon: '●' }; // Green dot for connected
    } else if (error) {
      return { color: '#EF4444', icon: '●' }; // Red dot for error
    } else {
      return { color: '#6B7280', icon: '○' }; // Gray circle for disconnected
    }
  };

  const connectionIndicator = getConnectionIndicator();

  // Format time since last update
  const getTimeSinceUpdate = () => {
    if (!connectionStatus.lastUpdate) return '';
    
    const now = new Date();
    const diff = Math.floor((now - connectionStatus.lastUpdate) / 1000);
    
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  };

  if (isTablet) {
    const statusLabel = isLoading ? 'Connecting' : isConnected ? 'Live' : error ? 'Error' : 'Offline';
    const statusColor = isLoading ? ACCENT : isConnected ? '#4ADE80' : error ? '#FF6B6B' : '#9E9696';

    return (
      <View style={[tabletStyles.card, style]}>
        <TouchableOpacity
          onPress={handlePress}
          activeOpacity={0.75}
          style={tabletStyles.body}
          accessibilityRole="button"
          accessibilityLabel={`Ambient temperature ${error ? 'unavailable' : formattedTemperature}, ${statusLabel}`}
          accessibilityHint={onTemperaturePress ? undefined : 'Switches between Fahrenheit and Celsius'}
        >
          {/* Header */}
          <View style={tabletStyles.header}>
            <View style={tabletStyles.iconCircle}>
              <MaterialCommunityIcons name="thermometer" size={18} color={ACCENT} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={tabletStyles.title} numberOfLines={1}>Ambient</Text>
              <View style={tabletStyles.statusRow}>
                {isLoading ? (
                  <ActivityIndicator size="small" color={ACCENT} style={{ transform: [{ scale: 0.6 }], marginRight: 2 }} />
                ) : (
                  <View style={[tabletStyles.statusDot, { backgroundColor: statusColor }]} />
                )}
                <Text style={[tabletStyles.statusText, { color: statusColor }]}>{statusLabel}</Text>
              </View>
            </View>
          </View>

          {/* Temperature value */}
          <Text style={tabletStyles.value} numberOfLines={1} adjustsFontSizeToFit>
            {error ? '--' : formattedTemperature}
          </Text>

          {/* Setpoints if requested */}
          {showSetpoints && !error && (
            <View style={tabletStyles.setpoints}>
              <Text style={tabletStyles.setpointText}>
                Heat {setpoints.heat !== null ? `${setpoints.heat.toFixed(0)}${setpoints.unit}` : '--'}
              </Text>
              <Text style={tabletStyles.setpointText}>
                Cool {setpoints.cool !== null ? `${setpoints.cool.toFixed(0)}${setpoints.unit}` : '--'}
              </Text>
            </View>
          )}

          {/* Footer */}
          {error ? (
            <TouchableOpacity
              onPress={refresh}
              style={tabletStyles.retry}
              accessibilityRole="button"
              accessibilityLabel="Retry temperature connection"
            >
              <Ionicons name="refresh" size={14} color={ACCENT} />
              <Text style={tabletStyles.retryText}>Retry</Text>
            </TouchableOpacity>
          ) : (
            <Text style={tabletStyles.updated} numberOfLines={1}>
              {connectionStatus.lastUpdate ? `Updated ${getTimeSinceUpdate()}` : 'Waiting for data'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    );
  }

  // Phone layout (more compact)
  return (
    <View style={[{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12 }, style]}>
      <TouchableOpacity 
        onPress={handlePress}
        activeOpacity={0.7}
        style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
      >
        {/* Connection indicator */}
        {isLoading ? (
          <ActivityIndicator size="small" color="#F59E0B" style={{ marginRight: 8 }} />
        ) : (
          <Text style={{ 
            color: connectionIndicator.color, 
            fontSize: 14, 
            marginRight: 8 
          }}>
            {connectionIndicator.icon}
          </Text>
        )}

        {/* Temperature */}
        <View>
          <Text className="text-white text-2xl font-semibold">
            {error ? '--°F' : formattedTemperature}
          </Text>
          {connectionStatus.lastUpdate && !error && (
            <Text className="text-gray-400 text-xs">
              {getTimeSinceUpdate()}
            </Text>
          )}
        </View>
      </TouchableOpacity>

      {/* Setpoints (compact) */}
      {showSetpoints && !error && (
        <View style={{ alignItems: 'flex-end' }}>
          <Text className="text-gray-400 text-xs">Setpoints</Text>
          <Text className="text-orange-400 text-sm">
            H: {setpoints.heat !== null ? `${setpoints.heat.toFixed(0)}${setpoints.unit}` : '--'}
          </Text>
          <Text className="text-blue-400 text-sm">
            C: {setpoints.cool !== null ? `${setpoints.cool.toFixed(0)}${setpoints.unit}` : '--'}
          </Text>
        </View>
      )}

      {/* Error indicator */}
      {error && (
        <TouchableOpacity onPress={refresh}>
          <Text className="text-red-400 text-sm">Retry</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const tabletStyles = StyleSheet.create({
  card: {
    backgroundColor: '#211D1D',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 178, 103, 0.18)',
  },
  body: {
    flex: 1,
    padding: 14,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255, 178, 103, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: FontFamily.latoBold,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 1,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 5,
  },
  statusText: {
    fontSize: 12,
    fontFamily: FontFamily.latoRegular,
  },
  value: {
    color: '#FFFFFF',
    fontSize: 40,
    fontFamily: FontFamily.latoBold,
    marginTop: 6,
  },
  setpoints: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  setpointText: {
    color: '#C9C1C1',
    fontSize: 12,
    fontFamily: FontFamily.latoRegular,
  },
  updated: {
    color: '#9E9696',
    fontSize: 12,
    fontFamily: FontFamily.latoRegular,
  },
  retry: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    minHeight: 32,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 178, 103, 0.5)',
  },
  retryText: {
    color: ACCENT,
    fontSize: 13,
    fontFamily: FontFamily.latoBold,
    marginLeft: 6,
  },
});

export default TemperatureDisplay;