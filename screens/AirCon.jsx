// screens/AirCon.jsx - Fixed temperature synchronization and slider responsiveness
import React, { useState, useEffect, useRef } from "react";
import { StyleSheet, View, Text, TouchableOpacity, Keyboard, TouchableWithoutFeedback, ScrollView } from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Color,
  isDarkMode
} from "../GlobalStyles";
import ThermostatDial from '../components/ThermostatDial';
import { useScreenSize, handleCoolingToggle, handleToeKickToggle, handleTemperatureChange, dismissKeyboard } from "../helper";
import { FontFamily } from "../GlobalStyles";
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import ToggleTile from '../components/ToggleTile';

// Import RV State Management hooks
import { useRVClimate } from "../API/RVStateManager/RVStateHooks";
import rvStateManager from "../API/RVStateManager/RVStateManager";

// Import temperature monitoring service
import temperatureMonitoringService from "../Service/TemperatureMonitoringService";

// Import climate services
import { ClimateService } from '../API/RVControlServices';

// Import HeaterControlModal for fan speed
import HeaterControlModal from "../components/HeaterControlModal";

const THERMO_ACCENT = '#FFB267';

const AirCon = ({ onClose }) => {
  const isTablet = useScreenSize();

  // Use RV state management hook for climate data
  const { climate, toggleFurnace, toggleNightMode, toggleDehumidifyMode } = useRVClimate();

  // State for fan speed modal
  const [isFanSpeedModalVisible, setFanSpeedModalVisible] = useState(false);
  // Phone popup: disabled while a finger is on the dial (see dialWrap below)
  const [scrollEnabled, setScrollEnabled] = useState(true);
  
  // Get initial temperature from RV state BEFORE rendering to prevent flash
  const getInitialTemp = () => {
    try {
      const currentClimateState = rvStateManager.getCategoryState('climate');
      if (currentClimateState.temperature !== undefined && currentClimateState.temperature !== null) {
        return Math.round(currentClimateState.temperature);
      }
    } catch (error) {
      console.error('Error getting initial temp:', error);
    }
    return 72; // Only use default if no state exists
  };
  
  const initialTemp = getInitialTemp();
  
  // Local state for UI interactions and status - initialized with RV state value
  const [temp, setTemp] = useState(initialTemp);
  const [lastTemp, setLastTemp] = useState(initialTemp);
  const [statusMessage, setStatusMessage] = useState('');
  const [showStatus, setShowStatus] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Use refs to prevent interference with slider
  const isSlidingRef = useRef(false);
  const tempChangeTimeoutRef = useRef(null);
  const lastSentTempRef = useRef(initialTemp);
  // Mirrors `temp` so the slider callback can tell real drags from echoes.
  const tempRef = useRef(initialTemp);
  tempRef.current = temp;

  // Initialize temperature monitoring service
  useEffect(() => {
    console.log('AirCon: Starting temperature monitoring service');
    
    // Start the temperature monitoring service
    temperatureMonitoringService.start();
    
    // Record the measured room temperature from the CAN bus. This is NOT the
    // setpoint: the slider (`temp`) is what the user wants, so we never
    // overwrite it with the ambient reading (that made the dial jump between
    // the setpoint and the room temperature).
    const handleTemperatureUpdate = (data) => {
      const { temperature } = data;
      rvStateManager.updateClimateState({
        actualTemperature: temperature.fahrenheit,
        actualTemperatureCelsius: temperature.celsius,
        lastUpdate: temperature.lastUpdate
      });
    };

    // Subscribe to temperature change events
    temperatureMonitoringService.on('temperatureChange', handleTemperatureUpdate);
    
    // Cleanup on unmount
    return () => {
      console.log('AirCon: Cleaning up temperature monitoring');
      temperatureMonitoringService.removeListener('temperatureChange', handleTemperatureUpdate);
    };
  }, []);
  
  // Initialize state from RV state manager - FIXED to always use RV state as source of truth
  useEffect(() => {
    const initializeState = async () => {
      try {
        // ALWAYS get current climate state from RV state manager first
        const currentClimateState = rvStateManager.getCategoryState('climate');
        
        console.log('AirCon: Initializing with climate state:', currentClimateState);
        
        // Priority 1: Use temperature from RV state manager (most recent/accurate)
        if (currentClimateState.temperature !== undefined && currentClimateState.temperature !== null) {
          const roundedTemp = Math.round(currentClimateState.temperature);
          console.log('AirCon: Loading temperature from RV state:', roundedTemp);
          setTemp(roundedTemp);
          setLastTemp(roundedTemp);
          lastSentTempRef.current = roundedTemp;
          
          // Also update AsyncStorage to match
          await AsyncStorage.setItem('temperature', roundedTemp.toString());
          return; // Exit early - we found our temperature
        }
        
        // Priority 2: Fall back to AsyncStorage only if RV state has no temperature
        const savedTemp = await AsyncStorage.getItem('temperature');
        if (savedTemp) {
          const tempValue = parseInt(savedTemp, 10);
          console.log('AirCon: Loading temperature from AsyncStorage:', tempValue);
          setTemp(tempValue);
          setLastTemp(tempValue);
          lastSentTempRef.current = tempValue;
          
          // Update RV state to match what we loaded
          rvStateManager.updateClimateState({ 
            temperature: tempValue,
            lastUpdated: new Date().toISOString()
          });
          return;
        }
        
        // Priority 3: Default value if nothing is found
        console.log('AirCon: No saved temperature found, using default 72°F');
        setTemp(72);
        setLastTemp(72);
        lastSentTempRef.current = 72;
        
        // Save default to both storage locations
        await AsyncStorage.setItem('temperature', '72');
        rvStateManager.updateClimateState({ 
          temperature: 72,
          lastUpdated: new Date().toISOString()
        });
        
      } catch (error) {
        console.error('Error initializing AirCon state:', error);
        // Emergency fallback
        setTemp(72);
        setLastTemp(72);
        lastSentTempRef.current = 72;
      }
    };
    
    initializeState();
  }, []); // Empty dependency array - only run once on mount

  // Subscribe to external state changes (from other devices/screens)
  useEffect(() => {
    const unsubscribe = rvStateManager.subscribeToExternalChanges((newState) => {
      if (newState.climate && newState.climate.temperature !== undefined) {
        // Only update if not actively sliding and temperature is different
        if (!isSlidingRef.current && newState.climate.temperature !== temp) {
          const roundedTemp = Math.round(newState.climate.temperature);
          console.log('AirCon: External temperature change detected:', roundedTemp);
          setTemp(roundedTemp);
          setLastTemp(roundedTemp);
          lastSentTempRef.current = roundedTemp;
          
          // Show notification of external change
          setStatusMessage(`Temperature updated to ${roundedTemp}°F`);
          setShowStatus(true);
          setTimeout(() => setShowStatus(false), 3000);
        }
      }
    });
    
    return unsubscribe;
  }, [temp]);

  // Handle cooling toggle with state management
  const handleCoolingPress = async () => {
    if (isProcessing) return;
    
    try {
      await handleCoolingToggle(
        climate.coolingOn,
        setIsProcessing,
        (message) => {
          setStatusMessage(message);
          setShowStatus(true);
          setTimeout(() => setShowStatus(false), 3000);
        }
      );
    } catch (error) {
      // Error already handled in helper
    }
  };
  
  // Handle toe kick toggle with state management
  const handleToeKickPress = async () => {
    if (isProcessing) return;

    try {
      await handleToeKickToggle(
        climate.toeKickOn,
        setIsProcessing,
        (message) => {
          setStatusMessage(message);
          setShowStatus(true);
          setTimeout(() => setShowStatus(false), 3000);
        }
      );
    } catch (error) {
      // Error already handled in helper
    }
  };

  // Handle furnace toggle
  const handleFurnacePress = async () => {
    if (isProcessing) return;

    setIsProcessing(true);
    const newState = !climate.heatingOn;

    try {
      // Update state immediately
      rvStateManager.updateClimateState({
        heatingOn: newState,
        lastUpdated: new Date().toISOString()
      });

      const result = await ClimateService.toggleFurnace();

      if (result.success) {
        setStatusMessage(`Furnace ${newState ? 'turned on' : 'turned off'}`);
        setShowStatus(true);
        setTimeout(() => setShowStatus(false), 3000);
      } else {
        // Revert on failure
        rvStateManager.updateClimateState({
          heatingOn: !newState,
          lastUpdated: new Date().toISOString()
        });
        setStatusMessage('Failed to toggle furnace');
        setShowStatus(true);
        setTimeout(() => setShowStatus(false), 3000);
      }
    } catch (error) {
      // Revert on error
      rvStateManager.updateClimateState({
        heatingOn: !newState,
        lastUpdated: new Date().toISOString()
      });
      setStatusMessage('Error toggling furnace');
      setShowStatus(true);
      setTimeout(() => setShowStatus(false), 3000);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle night mode toggle
  const handleNightModePress = async () => {
    if (isProcessing) return;

    setIsProcessing(true);
    const newState = !climate.nightMode;

    try {
      // Update state immediately
      rvStateManager.updateClimateState({
        nightMode: newState,
        lastUpdated: new Date().toISOString()
      });

      const result = await ClimateService.setNightMode();

      if (result.success) {
        await AsyncStorage.setItem('nightMode', JSON.stringify(newState));
        setStatusMessage(`${newState ? 'Night' : 'Day'} mode enabled`);
        setShowStatus(true);
        setTimeout(() => setShowStatus(false), 3000);
      } else {
        // Revert on failure
        rvStateManager.updateClimateState({
          nightMode: !newState,
          lastUpdated: new Date().toISOString()
        });
        setStatusMessage('Failed to toggle mode');
        setShowStatus(true);
        setTimeout(() => setShowStatus(false), 3000);
      }
    } catch (error) {
      // Revert on error
      rvStateManager.updateClimateState({
        nightMode: !newState,
        lastUpdated: new Date().toISOString()
      });
      setStatusMessage('Error toggling mode');
      setShowStatus(true);
      setTimeout(() => setShowStatus(false), 3000);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle dehumidify toggle
  const handleDehumidifyPress = async () => {
    if (isProcessing) return;

    setIsProcessing(true);
    const newState = !climate.dehumidifyMode;

    try {
      // Update state immediately
      rvStateManager.updateClimateState({
        dehumidifyMode: newState,
        lastUpdated: new Date().toISOString()
      });

      const result = await ClimateService.setDehumidifyMode();

      if (result.success) {
        await AsyncStorage.setItem('dehumidMode', JSON.stringify(newState));
        setStatusMessage(`Dehumidify ${newState ? 'enabled' : 'disabled'}`);
        setShowStatus(true);
        setTimeout(() => setShowStatus(false), 3000);
      } else {
        // Revert on failure
        rvStateManager.updateClimateState({
          dehumidifyMode: !newState,
          lastUpdated: new Date().toISOString()
        });
        setStatusMessage('Failed to toggle dehumidify');
        setShowStatus(true);
        setTimeout(() => setShowStatus(false), 3000);
      }
    } catch (error) {
      // Revert on error
      rvStateManager.updateClimateState({
        dehumidifyMode: !newState,
        lastUpdated: new Date().toISOString()
      });
      setStatusMessage('Error toggling dehumidify');
      setShowStatus(true);
      setTimeout(() => setShowStatus(false), 3000);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle temperature change from slider with improved responsiveness
  const handleTempChange = (newTemp) => {
    // Guard against echoes of our own value (onChange should only be user input).
    if (newTemp === tempRef.current) return;
    tempRef.current = newTemp;
    console.log('AirCon: Slider changed to:', newTemp);

    // Mark that we're actively sliding
    isSlidingRef.current = true;
    
    // Update local state immediately for smooth UI
    setTemp(newTemp);
    
    // Clear any pending timeout
    if (tempChangeTimeoutRef.current) {
      clearTimeout(tempChangeTimeoutRef.current);
    }
    
    // Set a timeout to mark sliding as complete
    tempChangeTimeoutRef.current = setTimeout(() => {
      isSlidingRef.current = false;
      console.log('AirCon: Slider interaction complete');
    }, 500);
  };
  
  // Send temperature changes to API with debouncing - FIXED to always save to RV state
  useEffect(() => {
    const sendTempChange = async () => {
      // Skip if temperature hasn't actually changed
      if (temp === lastSentTempRef.current) {
        return;
      }
      
      // ALWAYS update RV state immediately, even if no climate control is active
      // This ensures the temperature persists when navigating between screens
      rvStateManager.updateClimateState({
        temperature: temp,
        lastUpdated: new Date().toISOString()
      });
      
      // Also save to AsyncStorage immediately for backup
      try {
        await AsyncStorage.setItem('temperature', temp.toString());
        console.log('AirCon: Temperature saved to storage:', temp);
      } catch (storageError) {
        console.error('AirCon: Failed to save to AsyncStorage:', storageError);
      }
      
      // Skip API call if no climate control is active
      if (!climate.coolingOn && !climate.toeKickOn) {
        console.log('AirCon: Temperature updated in state but not sent to API (no climate control active)');
        lastSentTempRef.current = temp;
        setLastTemp(temp);
        return;
      }
      
      try {
        console.log('AirCon: Sending temperature change from', lastSentTempRef.current, 'to', temp);
        
        await handleTemperatureChange(
          temp,
          lastSentTempRef.current,
          climate.coolingOn || climate.toeKickOn,
          setIsProcessing,
          (message) => {
            setStatusMessage(message);
            setShowStatus(true);
            setTimeout(() => setShowStatus(false), message.includes('Failed') ? 3000 : 2000);
          }
        );
        
        // Update references after successful API call
        setLastTemp(temp);
        lastSentTempRef.current = temp;
        
      } catch (error) {
        console.error('AirCon: Failed to send temperature change:', error);
        // Don't revert - the state is already saved, just the API call failed
        // Keep the new temperature in state and storage
        lastSentTempRef.current = temp;
        setLastTemp(temp);
      }
    };
    
    // Debounce the temperature change to avoid too many API calls
    const timeoutId = setTimeout(sendTempChange, 1000);
    return () => clearTimeout(timeoutId);
  }, [temp, climate.coolingOn, climate.toeKickOn]);

  
  const modeSummary = climate.coolingOn
    ? `Cooling to ${temp}°F`
    : climate.toeKickOn
      ? `Heating to ${temp}°F`
      : climate.heatingOn
        ? 'Furnace on'
        : 'System off';
  const isRunning = climate.coolingOn || climate.toeKickOn || climate.heatingOn;

  const statusToast = showStatus || isProcessing ? (
    <View style={styles.toast} pointerEvents="none">
      <View style={[styles.toastDot, { backgroundColor: isProcessing ? THERMO_ACCENT : '#4ADE80' }]} />
      <Text style={styles.toastText} numberOfLines={1}>
        {isProcessing ? 'Sending…' : statusMessage}
      </Text>
    </View>
  ) : null;

  const sliderHandlers = {
    value: temp,
    onChange: handleTempChange,
    onChangeEnd: () => {
      isSlidingRef.current = false;
    },
  };

  // Tablet view (narrow column on the home screen: Cooling + Toe Kick)
  if (isTablet) {
    return (
      <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
        <View style={styles.tabletContainer}>
          <View style={styles.summaryRow}>
            <View style={[styles.summaryDot, { backgroundColor: isRunning ? THERMO_ACCENT : '#6B6363' }]} />
            <Text style={styles.summaryText}>{modeSummary}</Text>
          </View>

          <View style={[styles.dialWrap, styles.tabletDialWrap]}>
            <ThermostatDial size={180} {...sliderHandlers} />
          </View>

          <View style={styles.tabletModes}>
            <ToggleTile
              size="row"
              label="Cooling"
              icon="snowflake"
              isOn={climate.coolingOn}
              onPress={handleCoolingPress}
              disabled={isProcessing}
              onText="On"
              offText="Off"
              showPill={false}
              style={styles.tabletModeTile}
            />
            <ToggleTile
              size="row"
              label="Toe Kick"
              icon="radiator"
              isOn={climate.toeKickOn}
              onPress={handleToeKickPress}
              disabled={isProcessing}
              onText="Heating"
              offText="Off"
              showPill={false}
              style={styles.tabletModeTile}
            />
          </View>

          {statusToast}
        </View>
      </TouchableWithoutFeedback>
    );
  }

  // Mobile view (opened as a modal from Home)
  const modes = [
    { key: 'cool', label: 'Cooling', icon: 'snowflake', isOn: climate.coolingOn, onPress: handleCoolingPress, onText: 'On' },
    { key: 'toe', label: 'Toe Kick', icon: 'radiator', isOn: climate.toeKickOn, onPress: handleToeKickPress, onText: 'Heating' },
    { key: 'furnace', label: 'Furnace', icon: 'fire', isOn: climate.heatingOn, onPress: handleFurnacePress, onText: 'On' },
    { key: 'fan', label: 'Fan Speed', icon: 'fan', isOn: false, onPress: () => setFanSpeedModalVisible(true), offText: 'Adjust' },
    { key: 'night', label: climate.nightMode ? 'Night' : 'Day', icon: climate.nightMode ? 'weather-night' : 'white-balance-sunny', isOn: climate.nightMode, onPress: handleNightModePress, onText: 'Quiet mode', offText: 'Normal' },
    { key: 'dehumid', label: 'Dehumidify', icon: 'water-percent', isOn: climate.dehumidifyMode, onPress: handleDehumidifyPress, onText: 'On' },
  ];

  return (
    <TouchableWithoutFeedback onPress={dismissKeyboard}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <MaterialCommunityIcons name="thermostat" size={22} color={THERMO_ACCENT} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Climate</Text>
            <View style={styles.summaryRow}>
              <View style={[styles.summaryDot, { backgroundColor: isRunning ? THERMO_ACCENT : '#6B6363' }]} />
              <Text style={styles.summaryText}>{modeSummary}</Text>
            </View>
          </View>
          {onClose && (
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close climate controls"
            >
              <Ionicons name="close" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          scrollEnabled={scrollEnabled}
        >
          {/* Lock scrolling while a finger is on the dial so the ScrollView
              can't steal the drag from the slider knob. */}
          <View
            style={styles.dialWrap}
            onTouchStart={() => setScrollEnabled(false)}
            onTouchEnd={() => setScrollEnabled(true)}
            onTouchCancel={() => setScrollEnabled(true)}
          >
            <ThermostatDial size={230} {...sliderHandlers} />
          </View>

          <View style={styles.grid}>
            {[modes.slice(0, 3), modes.slice(3)].map((row, i) => (
              <View key={i} style={styles.gridRow}>
                {row.map(({ key, ...mode }) => (
                  <ToggleTile
                    key={key}
                    size="chip"
                    disabled={isProcessing}
                    offText="Off"
                    {...mode}
                  />
                ))}
              </View>
            ))}
          </View>
        </ScrollView>

        <HeaterControlModal
          isVisible={isFanSpeedModalVisible}
          onClose={() => setFanSpeedModalVisible(false)}
        />

        {statusToast}
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  // Tablet
  tabletContainer: {
    flex: 1,
    alignItems: 'stretch',
    justifyContent: 'space-between',
    paddingTop: 12,
    paddingBottom: 16,
  },
  tabletDialWrap: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 12,
  },
  tabletModeTile: {
    minHeight: 76,
  },
  tabletModes: {
    gap: 12,
  },

  // Mobile
  container: {
    flex: 1,
    backgroundColor: '#211D1D',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 178, 103, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 22,
    fontFamily: FontFamily.latoBold,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  grid: {
    gap: 10,
    marginTop: 8,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 10,
  },

  // Shared
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  summaryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  summaryText: {
    color: '#C9C1C1',
    fontSize: 13,
    fontFamily: FontFamily.latoRegular,
  },
  dialWrap: {
    alignItems: 'center',
    marginVertical: 4,
  },
  toast: {
    position: 'absolute',
    bottom: 16,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: '90%',
    backgroundColor: 'rgba(27, 27, 27, 0.95)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 178, 103, 0.3)',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  toastDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: FontFamily.latoRegular,
  },
});

export default AirCon;
