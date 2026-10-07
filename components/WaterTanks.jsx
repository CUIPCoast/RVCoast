import React, { useState, useEffect, useRef } from "react";
import { View, Text, StyleSheet } from "react-native";
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import useScreenSize from "../helper/useScreenSize.jsx";
import { createCANBusListener } from "../Service/CANBusListener.js";
import { FontFamily } from "../GlobalStyles";

const TANK_COLORS = {
  fresh: '#4FC3F7',
  gray: '#B8AFAF',
  black: '#6B6363',
};

// Fresh water is a problem when low; gray/black waste is a problem when high.
const getLevelStatus = (tankType, pct) => {
  if (tankType === 'fresh') {
    if (pct <= 10) return { label: 'Refill', color: '#FF6B6B' };
    if (pct <= 25) return { label: 'Low', color: '#FFB267' };
    return { label: 'OK', color: '#4ADE80' };
  }
  if (pct >= 90) return { label: 'Dump now', color: '#FF6B6B' };
  if (pct >= 75) return { label: 'High', color: '#FFB267' };
  return { label: 'OK', color: '#4ADE80' };
};

const WaterTanks =({ name, tankType, trackColor }) => {
  const [percentage, setPercentage] = useState(25); // Start with current actual levels
  const [heaterStatus, setHeaterStatus] = useState(false); // Track heater status
  const [rawData, setRawData] = useState(null); // Store raw CAN data for debugging
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const canListener = useRef(null);
  const reconnectTimeout = useRef(null);
  const isTablet = useScreenSize();

  // Calibration offsets - adjust these based on observed differences
  const CALIBRATION_OFFSETS = {
    fresh: -7,  // RV shows 25%, app shows 32%, so subtract 7%
    gray: 0,    // Adjust if needed
    black: 0    // Adjust if needed
  };

  // Tank heater CAN instance mapping (adjust based on your RV's configuration)
  const HEATER_INSTANCES = {
    fresh: 1,   // Fresh water tank heater instance
    gray: 2,    // Gray water tank heater instance  
    black: 3    // Black water tank heater instance (if equipped)
  };

  // Initialize tank levels based on current real data
  useEffect(() => {
    const initializeTankLevels = () => {
      if (tankType === "fresh") {
        setPercentage(25); // Current fresh water level
      } else if (tankType === "gray") {
        setPercentage(0); // Current gray water level
      } else if (tankType === "black") {
        setPercentage(0); // Assuming black tank is also empty
      }
    };

    initializeTankLevels();
  }, [tankType]);

  // Set up CAN bus listener for real-time tank and heater data
  useEffect(() => {
    const setupCANListener = () => {
      try {
        console.log(`TankHeaterControl: Setting up CAN listener for ${name} (${tankType})`);
        
        canListener.current = createCANBusListener();
        
        // Listen for tank status and heater status messages
        canListener.current.on('message', (message) => {
          try {
            // Look for TANK_STATUS messages (DGN 1FFB7)
            if (message.dgn === '1FFB7' || message.name === 'TANK_STATUS') {
              handleTankStatusMessage(message);
            }
            // Look for heater status messages - these could come from different DGNs
            // Common heater/climate control DGNs: 19FEF9, 19FED9, 19FFE2
            else if (message.dgn === '19FEF9' || message.dgn === '1FEF9' || 
                     message.dgn === '19FED9' || message.dgn === '1FED9' ||
                     message.dgn === '19FFE2' || message.dgn === '1FFE2' ||
                     message.type === 'heater' || message.name === 'HEATER_STATUS') {
              handleHeaterStatusMessage(message);
            }
            // Look for DC load status messages that might include heaters
            else if (message.dgn === '1FEDB' || message.dgn === '19FEDB9F' || 
                     message.name === 'DC_DIMMER_STATUS_3') {
              handleDCLoadStatusMessage(message);
            }
          } catch (error) {
            console.error('Error processing tank/heater message:', error);
          }
        });

        canListener.current.on('connected', () => {
          console.log(`TankHeaterControl: CAN listener connected for ${name}`);
          setIsConnected(true);
          setLastUpdate(new Date());
        });

        canListener.current.on('disconnected', () => {
          console.log(`TankHeaterControl: CAN listener disconnected for ${name}`);
          setIsConnected(false);
          scheduleReconnect();
        });

        canListener.current.on('error', (error) => {
          console.error(`TankHeaterControl: CAN listener error for ${name}:`, error);
          setIsConnected(false);
          scheduleReconnect();
        });

        // Start the listener
        canListener.current.start();

      } catch (error) {
        console.error(`TankHeaterControl: Failed to setup CAN listener for ${name}:`, error);
        scheduleReconnect();
      }
    };

    setupCANListener();

    // Cleanup on unmount
    return () => {
      if (canListener.current) {
        canListener.current.stop();
      }
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
    };
  }, [name, tankType]);

  const scheduleReconnect = () => {
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
    }
    
    reconnectTimeout.current = setTimeout(() => {
      console.log(`TankHeaterControl: Attempting to reconnect CAN listener for ${name}`);
      if (canListener.current) {
        canListener.current.start();
      }
    }, 5000); // Retry every 5 seconds
  };

  const handleTankStatusMessage = (message) => {
    try {
      // Parse tank status from CAN message
      const tankInstance = message.instance;
      const instanceDefinition = message["instance definition"];
      const relativeLevel = message["relative level"];
      const resolution = message.resolution || 4;
      
      // Store raw data for debugging
      setRawData({
        instance: tankInstance,
        definition: instanceDefinition,
        relativeLevel: relativeLevel,
        resolution: resolution,
        timestamp: new Date().toISOString()
      });
      
      // Map tank instances to our tank types
      let matchesTankType = false;
      
      if (tankType === "fresh" && (tankInstance === 0 || instanceDefinition === "fresh water")) {
        matchesTankType = true;
      } else if (tankType === "gray" && (tankInstance === 2 || instanceDefinition === "gray water")) {
        matchesTankType = true;
      } else if (tankType === "black" && (tankInstance === 1 || instanceDefinition === "black waste")) {
        matchesTankType = true;
      }
      
      if (matchesTankType && relativeLevel !== undefined) {
        // Try multiple calculation methods to see which matches RV display
        
        // Method 1: Original calculation (what you're currently using)
        const maxLevel = Math.pow(2, resolution) - 1;
        const originalPercentage = Math.round((relativeLevel / maxLevel) * 100);
        
        // Method 2: Discrete 25% increments (common in RVs)
        const discretePercentage = relativeLevel * 25;
        
        // Method 3: Simple division by resolution
        const simplePercentage = Math.round((relativeLevel / resolution) * 100);
        
        // Method 4: Alternative max level calculation
        const altMaxLevel = Math.pow(2, resolution);
        const altPercentage = Math.round((relativeLevel / altMaxLevel) * 100);
        
        console.log(`=== TANK DEBUG: ${name} ===`);
        console.log(`Raw data: level=${relativeLevel}, resolution=${resolution}`);
        console.log(`Method 1 (current): ${originalPercentage}% (${relativeLevel}/${maxLevel})`);
        console.log(`Method 2 (discrete): ${discretePercentage}% (${relativeLevel} * 25)`);
        console.log(`Method 3 (simple): ${simplePercentage}% (${relativeLevel}/${resolution})`);
        console.log(`Method 4 (alt max): ${altPercentage}% (${relativeLevel}/${altMaxLevel})`);
        
        // Choose the calculation method - start with discrete since RVs often use 25% increments
        let calculatedPercentage;
        
        if (resolution === 4 && relativeLevel <= 4) {
          // For resolution 4, try discrete 25% increments first
          calculatedPercentage = discretePercentage;
          console.log(`Using discrete method: ${calculatedPercentage}%`);
        } else {
          // Fall back to original method
          calculatedPercentage = originalPercentage;
          console.log(`Using original method: ${calculatedPercentage}%`);
        }
        
        // Apply calibration offset
        const calibrationOffset = CALIBRATION_OFFSETS[tankType] || 0;
        const finalPercentage = Math.max(0, Math.min(100, calculatedPercentage + calibrationOffset));
        
        console.log(`After calibration offset (${calibrationOffset}%): ${finalPercentage}%`);
        console.log(`=== END DEBUG ===`);
        
        setPercentage(finalPercentage);
        setLastUpdate(new Date());
      }
    } catch (error) {
      console.error(`TankHeaterControl: Error parsing tank status for ${name}:`, error);
    }
  };

  const handleHeaterStatusMessage = (message) => {
    try {
      // Try to determine if this message is for our tank's heater
      const expectedInstance = HEATER_INSTANCES[tankType];
      let isOurHeater = false;
      let heaterOn = false;

      // Method 1: Check by instance number
      if (message.instance === expectedInstance) {
        isOurHeater = true;
      }
      // Method 2: Check by device name or type
      else if (message.device && message.device.includes(tankType)) {
        isOurHeater = true;
      }
      // Method 3: Parse from raw CAN data
      else if (message.rawData && Array.isArray(message.rawData)) {
        const instanceFromData = parseInt(message.rawData[0], 16);
        if (instanceFromData === expectedInstance) {
          isOurHeater = true;
        }
      }

      if (isOurHeater) {
        // Parse heater status from message
        if (message.isOn !== undefined) {
          heaterOn = message.isOn;
        } else if (message.status !== undefined) {
          heaterOn = message.status === 'on' || message.status === 'active' || message.status === 1;
        } else if (message.rawData && Array.isArray(message.rawData)) {
          // Parse from raw CAN data - adjust based on your heater's CAN format
          const statusByte = parseInt(message.rawData[2] || '0', 16);
          heaterOn = statusByte > 0;
        }

        // Update heater state
        setHeaterStatus(heaterOn);
        console.log(`Heater ${name}: ${heaterOn ? 'ON' : 'OFF'}`);
      }
    } catch (error) {
      console.error(`TankHeaterControl: Error parsing heater status for ${name}:`, error);
    }
  };

  const handleDCLoadStatusMessage = (message) => {
    try {
      // Some tank heaters might be controlled as DC loads
      const instance = message.instance;
      
      // Map DC load instances to tank heaters (adjust based on your RV)
      let isOurHeater = false;
      
      // Example mappings - you'll need to adjust these based on your RV's configuration
      if (tankType === "fresh" && (instance === 50 || instance === 51)) {
        isOurHeater = true;
      } else if (tankType === "gray" && (instance === 52 || instance === 53)) {
        isOurHeater = true;
      }
      
      if (isOurHeater && message.isOn !== undefined) {
        setHeaterStatus(message.isOn);
        console.log(`DC Load Heater ${name}: ${message.isOn ? 'ON' : 'OFF'}`);
      }
    } catch (error) {
      console.error(`TankHeaterControl: Error parsing DC load status for ${name}:`, error);
    }
  };

  // Get tank icon based on type
  const getTankIcon = () => {
    switch (tankType) {
      case 'fresh': return 'water';
      case 'gray': return 'water-outline';
      case 'black': return 'trash';
      default: return 'water';
    }
  };
  
  // Get tank colors based on type and level - now returns gradient colors for the fill
  const getTankFillGradient = () => {
    const gradients = {
      fresh: {
        colors: ['#00BFFF', '#0080FF', '#0060FF'], // Light blue to deep blue
        locations: [0, 0.5, 1]
      },
      gray: {
        colors: ['#B0B0B0', '#808080', '#606060'], // Light gray to dark gray
        locations: [0, 0.5, 1]
      },
      black: {
        colors: ['#4A4A4A', '#2A2A2A', '#1A1A1A'], // Dark gray to black
        locations: [0, 0.5, 1]
      }
    };
    return gradients[tankType] || gradients.fresh;
  };
  
  // Get level color based on percentage for status text
  const getLevelColor = () => {
    if (percentage >= 75) return '#FF6B6B'; // Red for high
    if (percentage >= 50) return '#FFB267'; // Orange for medium
    if (percentage >= 25) return '#10B981'; // Green for good
    return '#4FC3F7'; // Blue for low/empty
  };

  // Get connection status indicator
  const getConnectionStatus = () => {
    if (isConnected) {
      return { color: '#10B981', text: '●' }; // Green dot
    } else {
      return { color: '#EF4444', text: '●' }; // Red dot
    }
  };

  const connectionStatus = getConnectionStatus();
  const fillGradient = getTankFillGradient();

  // Tablet: themed capsule tank card
  if (isTablet) {
    const fillColor = TANK_COLORS[tankType] || TANK_COLORS.fresh;
    const level = getLevelStatus(tankType, percentage);

    return (
      <View
        style={tankStyles.card}
        accessible
        accessibilityLabel={`${name} tank ${percentage} percent, ${level.label}`}
      >
        <View style={tankStyles.header}>
          <View style={tankStyles.iconCircle}>
            <Ionicons name={getTankIcon()} size={14} color={fillColor} />
          </View>
          <Text style={tankStyles.name} numberOfLines={1}>{name}</Text>
          <View style={[tankStyles.connDot, { backgroundColor: isConnected ? '#4ADE80' : '#6B6363' }]} />
        </View>

        <View style={tankStyles.capsule}>
          <View style={[tankStyles.fill, { height: `${percentage}%`, backgroundColor: fillColor }]} />
          {[25, 50, 75].map((mark) => (
            <View key={mark} style={[tankStyles.tick, { bottom: `${mark}%` }]} />
          ))}
        </View>

        <Text style={tankStyles.percent}>{percentage}%</Text>
        <View style={[tankStyles.statusPill, { backgroundColor: `${level.color}26` }]}>
          <Text style={[tankStyles.statusText, { color: level.color }]}>{level.label}</Text>
        </View>
      </View>
    );
  }

  // Mobile vertical tank layout
  return (
    <View style={styles.mobileTankContainer}>
      <View style={styles.mobileTankWrapper}>
        <View style={styles.mobileTankHeader}>
          <Ionicons name={getTankIcon()} size={14} color="#FFF" />
          <Text style={styles.mobileTankName}>{name}</Text>
        </View>
        
        <View style={styles.mobileVerticalTankContainer}>
          <View style={styles.mobileTankOutline}>
            <View style={styles.mobileTankFillContainer}>
              <LinearGradient
                colors={fillGradient.colors}
                locations={fillGradient.locations}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={[
                  styles.mobileTankFill,
                  { 
                    height: `${percentage}%`,
                  }
                ]}
              />
            </View>
          </View>
        </View>
        
        <Text style={[styles.mobileTankPercentage, { color: getLevelColor() }]}>
          {percentage}%
        </Text>
      </View>
    </View>
  );
};

const tankStyles = StyleSheet.create({
  card: {
    width: 132,
    margin: 6,
    padding: 12,
    borderRadius: 18,
    backgroundColor: '#1B1B1B',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    marginBottom: 12,
  },
  iconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#2A2626',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  name: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: FontFamily.latoBold,
  },
  connDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  capsule: {
    width: 60,
    height: 120,
    borderRadius: 18,
    backgroundColor: '#2A2626',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  fill: {
    width: '100%',
    minHeight: 3,
    opacity: 0.9,
  },
  tick: {
    position: 'absolute',
    left: 10,
    right: 10,
    height: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  percent: {
    color: '#FFFFFF',
    fontSize: 24,
    fontFamily: FontFamily.latoBold,
    marginTop: 10,
  },
  statusPill: {
    marginTop: 4,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 12,
    fontFamily: FontFamily.latoBold,
  },
});

const styles = {
  // Tablet styles
  tankContainer: {
    marginHorizontal: 8,
    marginVertical: 8,
    width: 140,
  },
  tankWrapper: {
    backgroundColor: 'rgba(53,56,57,0.3)',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    alignItems: 'center',
  },
  tankHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 12,
  },
  tankIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#4FC3F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tankInfo: {
    flex: 1,
    marginLeft: 8,
    alignItems: 'flex-start',
  },
  tankName: {
    color: '#FFF',  // Changed from '#333' to '#FFF' for white text
    fontSize: 12,
    fontFamily: FontFamily.latoRegular,
    fontWeight: '600',
  },
  tankPercentage: {
    fontSize: 14,
    fontFamily: FontFamily.latoRegular,
    fontWeight: '700',
    marginTop: 1,
  },
  statusIndicators: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  connectionDot: {
    fontSize: 12,
  },
  verticalTankContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    height: 120,
    marginBottom: 8,
  },
  tankOutline: {
    width: 40,
    height: 120,
    borderWidth: 2,
    borderColor: '#DDD',
    borderRadius: 8,
    backgroundColor: 'rgba(240,240,240,0.5)',
    position: 'relative',
    overflow: 'hidden',
  },
  tankFillContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '100%',
    justifyContent: 'flex-end',
  },
  tankFill: {
    width: '100%',
    borderRadius: 6,
    minHeight: 2,
  },
  levelMarkers: {
    position: 'absolute',
    right: -8,
    top: 0,
    bottom: 0,
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  levelMarker: {
    width: 6,
    height: 1,
    backgroundColor: '#BBB',
  },
  levelLabels: {
    marginLeft: 8,
    height: 120,
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  levelLabel: {
    fontSize: 10,
    color: '#666',
    lineHeight: 10,
  },
  tankStatusText: {
    color: '#666',
    fontSize: 11,
    textAlign: 'center',
    marginBottom: 4,
  },
  lastUpdateText: {
    color: '#999',
    fontSize: 9,
    textAlign: 'center',
  },
  
  // Mobile styles
  mobileTankContainer: {
    width: 80,
    marginHorizontal: 4,
  },
  mobileTankWrapper: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  mobileTankHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  mobileTankName: {
    color: '#FFF',  // Changed from '#333' to '#FFF' for white text
    fontSize: 11,
    fontFamily: FontFamily.latoRegular,
    fontWeight: '600',
    marginLeft: 4,
  },
  mobileVerticalTankContainer: {
    alignItems: 'center',
    marginBottom: 8,
  },
  mobileTankOutline: {
    width: 24,
    height: 60,
    borderWidth: 1.5,
    borderColor: '#DDD',
    borderRadius: 4,
    backgroundColor: 'rgba(240,240,240,0.5)',
    position: 'relative',
    overflow: 'hidden',
  },
  mobileTankFillContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '100%',
    justifyContent: 'flex-end',
  },
  mobileTankFill: {
    width: '100%',
    borderRadius: 2,
    minHeight: 1,
  },
  mobileTankPercentage: {
    fontSize: 12,
    fontFamily: FontFamily.latoRegular,
    fontWeight: '700',
  },
};

export default WaterTanks;