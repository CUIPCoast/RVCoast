// screens/AirCon.jsx - Fixed temperature synchronization and slider responsiveness
import React, { useState, useEffect, useRef } from "react";
import { StyleSheet, View, Text, TouchableOpacity, Keyboard, TouchableWithoutFeedback } from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Color,
  isDarkMode
} from "../GlobalStyles";
import { RadialSlider } from 'react-native-radial-slider';
import { useScreenSize, handleCoolingToggle, handleToeKickToggle, handleTemperatureChange, dismissKeyboard } from "../helper";
import { FontFamily } from "../GlobalStyles";
import { Ionicons } from '@expo/vector-icons';

// Import RV State Management hooks
import { useRVClimate } from "../API/RVStateManager/RVStateHooks";
import rvStateManager from "../API/RVStateManager/RVStateManager";

// Import temperature monitoring service
import temperatureMonitoringService from "../Service/TemperatureMonitoringService";

// Import climate services
import { ClimateService } from '../API/RVControlServices';

const AirCon = ({ onClose }) => {
  const isTablet = useScreenSize();

  // Use RV state management hook for climate data
  const { climate, toggleFurnace, toggleNightMode, toggleDehumidifyMode } = useRVClimate();

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
  
  // Initialize temperature monitoring service
  useEffect(() => {
    console.log('AirCon: Starting temperature monitoring service');
    
    // Start the temperature monitoring service
    temperatureMonitoringService.start();
    
    // Subscribe to temperature changes from CAN bus
    const handleTemperatureUpdate = (data) => {
      const { temperature } = data;
      console.log('AirCon: Real-time temperature update from RV-C:', temperature.fahrenheit);
      
      // Only update if not actively sliding
      if (!isSlidingRef.current) {
        const roundedTemp = Math.round(temperature.fahrenheit);
        setTemp(roundedTemp);
        
        // Update RV state manager with actual temperature
        rvStateManager.updateClimateState({
          actualTemperature: temperature.fahrenheit,
          actualTemperatureCelsius: temperature.celsius,
          lastUpdate: temperature.lastUpdate
        });
      }
    };
    
    // Subscribe to temperature change events
    temperatureMonitoringService.on('temperatureChange', handleTemperatureUpdate);

    // Get initial temperature (but only if we don't already have one from state)
    const currentTemp = temperatureMonitoringService.getCurrentTemperature();
    if (currentTemp.fahrenheit && temp === initialTemp) {
      console.log('AirCon: Initial temperature from RV-C:', currentTemp.fahrenheit);
      const roundedTemp = Math.round(currentTemp.fahrenheit);
      setTemp(roundedTemp);
      setLastTemp(roundedTemp);
      lastSentTempRef.current = roundedTemp;
    }
    
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
        // Only update if not actively sliding, different from our ref, and different from display
        // This prevents race conditions where our own changes trigger external updates
        if (!isSlidingRef.current &&
            newState.climate.temperature !== lastSentTempRef.current &&
            newState.climate.temperature !== temp) {
          const roundedTemp = Math.round(newState.climate.temperature);
          console.log('AirCon: External temperature change detected:', roundedTemp, '(current:', temp, ')');
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
    console.log('AirCon: Slider changed to:', newTemp);

    // Round to prevent floating point jitter
    const roundedTemp = Math.round(newTemp);

    // Mark that we're actively sliding
    isSlidingRef.current = true;

    // Update local state immediately for smooth UI - use rounded value
    setTemp(roundedTemp);

    // Clear any pending timeout
    if (tempChangeTimeoutRef.current) {
      clearTimeout(tempChangeTimeoutRef.current);
    }

    // Set a timeout to mark sliding as complete - increased to 2.5 seconds to prevent race conditions
    tempChangeTimeoutRef.current = setTimeout(() => {
      isSlidingRef.current = false;
      console.log('AirCon: Slider interaction complete');
    }, 2500);
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

  
  // Tablet view
  if (isTablet) {
    return (
      <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
        <View style={tabletStyles.container}>
          <RadialSlider
            value={Math.round(temp)}
            min={60}
            max={85}
            step={1}
            thumbColor={"#FFFFFF"}
            thumbBorderColor={"#848482"}
            sliderTrackColor={"#E5E5E5"}
            linearGradient={[ { offset: '0%', color:'#ffaca6' }, { offset: '100%', color: '#FF8200' }]}
            onChange={handleTempChange}
            onComplete={() => {
              console.log('AirCon: Slider interaction complete');
              isSlidingRef.current = false;
            }}
            subTitle={'Degrees'}
            subTitleStyle={{ color: isDarkMode ? 'white' : 'black', paddingBottom: 25, fontSize: 20 }}
            unitStyle={{ color: isDarkMode ? 'white' : 'black', paddingTop: 5, fontSize: 20 }}
            valueStyle={{ color: isDarkMode ? 'white' : 'black', paddingTop: 5, fontSize: 44 }}
            style={{
              backgroundColor: isDarkMode ? Color.colorGray_200 : Color.colorWhitesmoke_100,
            }}
            buttonContainerStyle={{
              color:"FFFFFF",
            }}
            leftIconStyle={{ backgroundColor: 'white', borderRadius: 10, marginRight: 10, top:20, height: 40, width: 50, paddingLeft: 4 }}
            rightIconStyle={{ backgroundColor: 'white', borderRadius: 10, marginLeft: 10, top:20, height: 40, width: 50, paddingLeft: 5 }}
            isHideTailText={true}
            unit={'°F'}
          />

          <View style={tabletStyles.buttonsContainer}>
            <TouchableOpacity
              style={[
                tabletStyles.button, 
                climate.coolingOn ? tabletStyles.activeButton : null,
                isProcessing ? tabletStyles.disabledButton : null
              ]}
              onPress={handleCoolingPress}
              disabled={isProcessing}
            >
              <Text style={tabletStyles.buttonText}>Cooling</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                tabletStyles.button, 
                climate.toeKickOn ? tabletStyles.activeButton : null,
                isProcessing ? tabletStyles.disabledButton : null
              ]}
              onPress={handleToeKickPress}
              disabled={isProcessing}
            >
              <Text style={tabletStyles.buttonText}>Toe Kick</Text>
            </TouchableOpacity>
          </View>
          
          {/* Status message */}
          {showStatus && (
            <View style={tabletStyles.statusContainer}>
              <Text style={tabletStyles.statusText}>{statusMessage}</Text>
            </View>
          )}
          
          {/* Processing indicator */}
          {isProcessing && (
            <View style={tabletStyles.processingContainer}>
              <Text style={tabletStyles.processingText}>Processing...</Text>
            </View>
          )}
        </View>
      </TouchableWithoutFeedback>
    );
  }
 
  // Mobile view
  return (
    <TouchableWithoutFeedback onPress={dismissKeyboard}>
      <View style={styles.container}>
        {/*Closes the AC Window */}
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeText}>X</Text>
        </TouchableOpacity>

        <Text style={styles.label}>Air Conditioning</Text>

        {/* Radial Slider for Temperature Control */}
        <RadialSlider
          value={Math.round(temp)}
          min={60}
          max={85}
          step={1}
          thumbColor={"#FFFFFF"}
          thumbBorderColor={"#848482"}
          sliderTrackColor={"#E5E5E5"}
          linearGradient={[ { offset: '0%', color:'#ffaca6' }, { offset: '100%', color: '#FF8200' }]}
          onChange={handleTempChange}
          onComplete={() => {
            console.log('AirCon: Slider interaction complete');
            isSlidingRef.current = false;
          }}
          subTitle={'Degrees'}
          subTitleStyle={{ color: isDarkMode ? 'white' : 'black', paddingBottom: 25, fontSize: 20 }}
          unitStyle={{ color: isDarkMode ? 'white' : 'black', paddingTop: 5, fontSize: 20 }}
          valueStyle={{ color: isDarkMode ? 'white' : 'black', paddingTop: 5, fontSize: 24 }}
          style={{
            backgroundColor: isDarkMode ? Color.colorGray_200 : Color.colorWhitesmoke_100,
          }}
          buttonContainerStyle={{
            color:"FFFFFF",
          }}
          leftIconStyle={{ backgroundColor: 'white', borderRadius: 10, marginRight: 10, top:20, height: 40, width: 50, paddingLeft: 4 }}
          rightIconStyle={{ backgroundColor: 'white', borderRadius: 10, marginLeft: 10, top:20, height: 40, width: 50, paddingLeft: 5 }}
          isHideTailText={true}
          unit={'°F'}
        />
        
        {/* Climate Control Buttons - Row 1 */}
        <View style={styles.buttonsContainer}>
          <TouchableOpacity
            style={[
              styles.button,
              climate.coolingOn ? styles.activeButton : null,
              isProcessing ? styles.disabledButton : null
            ]}
            onPress={handleCoolingPress}
            disabled={isProcessing}
          >
            <Ionicons
              name={climate.coolingOn ? "snow" : "snow-outline"}
              size={18}
              color={climate.coolingOn ? "#1a1a1a" : "#ffffff"}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.buttonText, climate.coolingOn && styles.activeButtonText]}>Cooling</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.button,
              climate.toeKickOn ? styles.activeButton : null,
              isProcessing ? styles.disabledButton : null
            ]}
            onPress={handleToeKickPress}
            disabled={isProcessing}
          >
            <Ionicons
              name={climate.toeKickOn ? "flame" : "flame-outline"}
              size={18}
              color={climate.toeKickOn ? "#1a1a1a" : "#ffffff"}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.buttonText, climate.toeKickOn && styles.activeButtonText]}>Toe Kick</Text>
          </TouchableOpacity>
        </View>

        {/* Climate Control Buttons - Row 2 */}
        <View style={styles.buttonsContainer}>
          <View style={{ flex: 0.25 }} />
          <TouchableOpacity
            style={[
              styles.button,
              climate.heatingOn ? styles.activeButton : null,
              isProcessing ? styles.disabledButton : null
            ]}
            onPress={handleFurnacePress}
            disabled={isProcessing}
          >
            <Ionicons
              name={climate.heatingOn ? "bonfire" : "bonfire-outline"}
              size={18}
              color={climate.heatingOn ? "#1a1a1a" : "#ffffff"}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.buttonText, climate.heatingOn && styles.activeButtonText]}>Furnace</Text>
          </TouchableOpacity>
          <View style={{ flex: 0.25 }} />
        </View>

        {/* Climate Control Buttons - Row 3 */}
        <View style={styles.buttonsContainer}>
          <TouchableOpacity
            style={[
              styles.button,
              climate.nightMode ? styles.activeButtonNight : null,
              isProcessing ? styles.disabledButton : null
            ]}
            onPress={handleNightModePress}
            disabled={isProcessing}
          >
            <Ionicons
              name={climate.nightMode ? "moon" : "sunny-outline"}
              size={18}
              color={climate.nightMode ? "#1a1a1a" : "#ffffff"}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.buttonText, climate.nightMode && styles.activeButtonText]}>
              {climate.nightMode ? 'Night' : 'Day'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.button,
              climate.dehumidifyMode ? styles.activeButtonDehumid : null,
              isProcessing ? styles.disabledButton : null
            ]}
            onPress={handleDehumidifyPress}
            disabled={isProcessing}
          >
            <Ionicons
              name={climate.dehumidifyMode ? "water" : "water-outline"}
              size={18}
              color={climate.dehumidifyMode ? "#1a1a1a" : "#ffffff"}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.buttonText, climate.dehumidifyMode && styles.activeButtonText]}>Dehumidify</Text>
          </TouchableOpacity>
        </View>

        {/* Status message */}
        {showStatus && (
          <View style={styles.statusContainer}>
            <Text style={styles.statusText}>{statusMessage}</Text>
          </View>
        )}
        
        {/* Processing indicator */}
        {isProcessing && (
          <View style={styles.processingContainer}>
            <Text style={styles.processingText}>Processing...</Text>
          </View>
        )}
      </View>
    </TouchableWithoutFeedback>
  );
};

const tabletStyles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    marginTop: 120,
    backgroundColor: isDarkMode ? Color.colorGray_200 : Color.colorWhitesmoke_100,
  },
  closeButton: {
    position: 'absolute',
    top: 3,
    right: 75,
    padding: 10,
    zIndex: 1,
    backgroundColor: 'white',
    borderRadius: 20,
    opacity: 0.5,
    height: 25,
    alignItems: 'center',
  },
  closeText: {
    color: 'black',
    fontSize: 10,
    marginTop: -4,
  },
  label: {
    color:  isDarkMode ? Color.white0 : Color.colorDarkslategray_200,
    fontWeight: 'bold',
    backgroundColor: isDarkMode ? Color.colorGray_200 : Color.colorWhitesmoke_100,
    margin: 10,
  },
  buttonsContainer: {
    flexDirection: 'row',
    marginTop: 30,
  },
  button: {
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 5,
    marginHorizontal: 5,
    backgroundColor: 'white',
    borderColor: 'black'
  },
  activeButton: {
    backgroundColor: '#FFB267',
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 12,
  },
  statusContainer: {
    position: 'absolute',
    bottom: 100,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 5,
    alignSelf: 'center',
  },
  statusText: {
    color: 'white',
    fontWeight: 'bold',
  },
  processingContainer: {
    position: 'absolute',
    top: '50%',
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
    alignSelf: 'center',
  },
  processingText: {
    color: 'white',
    fontWeight: 'bold',
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    marginTop: 40,
    backgroundColor: isDarkMode ? Color.colorGray_200 : Color.colorWhitesmoke_100,
    paddingHorizontal: 16,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 12,
    zIndex: 1,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 178, 103, 0.15)',
    height: 48,
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    color: '#FFB267',
    fontSize: 22,
    fontWeight: "700",
    marginTop: -2,
  },
  label: {
    color: isDarkMode ? Color.white0 : Color.colorDarkslategray_200,
    fontSize: 24,
    fontFamily: FontFamily.latoBold,
    fontWeight: '700',
    backgroundColor: isDarkMode ? Color.colorGray_200 : Color.colorWhitesmoke_100,
    marginTop: 20,
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  buttonsContainer: {
    flexDirection: 'row',
    marginTop: 28,
    gap: 12,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 16,
    marginHorizontal: 6,
    backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.05)',
    borderWidth: 1,
    borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  activeButton: {
    backgroundColor: '#FFB267',
    borderColor: '#FFB267',
    shadowColor: '#FFB267',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  activeButtonNight: {
    backgroundColor: '#FFBA00',
    borderColor: '#FFBA00',
    shadowColor: '#FFBA00',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  activeButtonDehumid: {
    backgroundColor: '#00B9E8',
    borderColor: '#00B9E8',
    shadowColor: '#00B9E8',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  disabledButton: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 15,
    fontFamily: FontFamily.latoBold,
    fontWeight: '600',
    color: isDarkMode ? Color.white0 : Color.colorDarkslategray_200,
    letterSpacing: 0.4,
  },
  activeButtonText: {
    color: '#1a1a1a',
    fontWeight: '700',
  },
  statusContainer: {
    position: 'absolute',
    bottom: 60,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  statusText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
    fontFamily: FontFamily.latoRegular,
    letterSpacing: 0.2,
  },
  processingContainer: {
    position: 'absolute',
    top: '50%',
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  processingText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 15,
    fontFamily: FontFamily.latoRegular,
    letterSpacing: 0.3,
  },
});

export default AirCon;
