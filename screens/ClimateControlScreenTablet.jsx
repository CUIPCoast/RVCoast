// screens/ClimateControlScreenTablet.jsx - Fixed temperature synchronization and persistence
import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, Image, TouchableOpacity, TouchableWithoutFeedback, Keyboard, ScrollView } from "react-native";
import { Color, isDarkMode } from "../GlobalStyles";
import useScreenSize from "../helper/useScreenSize.jsx";
import { Col, Row, Grid } from "react-native-easy-grid";
import { RadialSlider } from 'react-native-radial-slider';
import moment from 'moment';
import { ClimateService } from '../API/RVControlServices.js';
import { RVControlService } from "../API/rvAPI";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

// Import RV State Management hooks
import { useRVClimate } from "../API/RVStateManager/RVStateHooks";
import rvStateManager from "../API/RVStateManager/RVStateManager";

const ClimateControlScreenTablet = () => {
  // Use RV state management hook for climate data
  const { climate, setTemperature, toggleCooling, toggleHeating } = useRVClimate();
  
  const [activeButtons, setActiveButtons] = useState([]); 
  const [speed, setSpeed] = useState(0);
  const [isNightToggled, setIsNightToggled] = useState(false);
  const [isDehumidToggled, setIsDehumidToggled] = useState(false);
  const [isCoolToggled, setIsCoolToggled] = useState(false);
  const [isToekickToggled, setIsToekickToggled] = useState(false);
  const [isFurnaceToggled, setIsFurnaceToggled] = useState(false);
  const [isAutoModeActive, setIsAutoModeActive] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  
  const [statusMessage, setStatusMessage] = useState('');
  const [showStatus, setShowStatus] = useState(false);
  
  const [weatherData, setWeatherData] = useState(null);
  const [weatherError, setWeatherError] = useState(false);

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

  // Temperature state with refs for better control - initialized with RV state value
  const [temp, setTemp] = useState(initialTemp);
  const [lastTemp, setLastTemp] = useState(initialTemp);
  
  // Use refs to prevent interference with slider
  const isSlidingRef = useRef(false);
  const tempChangeTimeoutRef = useRef(null);
  const lastSentTempRef = useRef(initialTemp);
  
  var now = moment().format();
  var currentDate = moment().format("MMMM Do, YYYY");
  var DayOfTheWeek = moment().format("dddd");

  const moonImage = require("../assets/moon.png");
  const sunImage = require("../assets/sun.png");
  
  const features = [
    { label: "Cool", fanSpeed: "High" },
    { label: "Toe Kick", fanSpeed: "Med" },
    { label: "Furnace", fanSpeed: "Low" }
  ];

  const isTablet = useScreenSize();

  // Initialize state from RV state manager - FIXED to always use RV state as source of truth
  useEffect(() => {
    const initializeState = async () => {
      try {
        // ALWAYS get current climate state from RV state manager first
        const currentClimateState = rvStateManager.getCategoryState('climate');
        
        console.log('ClimateControl: Initializing with climate state:', currentClimateState);
        
        // Priority 1: Use temperature from RV state manager (most recent/accurate)
        if (currentClimateState.temperature !== undefined && currentClimateState.temperature !== null) {
          const roundedTemp = Math.round(currentClimateState.temperature);
          console.log('ClimateControl: Loading temperature from RV state:', roundedTemp);
          setTemp(roundedTemp);
          setLastTemp(roundedTemp);
          lastSentTempRef.current = roundedTemp;
          
          // Also update AsyncStorage to match
          await AsyncStorage.setItem('temperature', roundedTemp.toString());
        } else {
          // Priority 2: Fall back to AsyncStorage only if RV state has no temperature
          const savedTemp = await AsyncStorage.getItem('temperature');
          if (savedTemp) {
            const tempValue = parseInt(savedTemp, 10);
            console.log('ClimateControl: Loading temperature from AsyncStorage:', tempValue);
            setTemp(tempValue);
            setLastTemp(tempValue);
            lastSentTempRef.current = tempValue;
            
            // Update RV state to match what we loaded
            rvStateManager.updateClimateState({ 
              temperature: tempValue,
              lastUpdated: new Date().toISOString()
            });
          } else {
            // Priority 3: Default value if nothing is found
            console.log('ClimateControl: No saved temperature found, using default 72°F');
            setTemp(72);
            setLastTemp(72);
            lastSentTempRef.current = 72;
            
            // Save default to both storage locations
            await AsyncStorage.setItem('temperature', '72');
            rvStateManager.updateClimateState({ 
              temperature: 72,
              lastUpdated: new Date().toISOString()
            });
          }
        }
        
        // Set climate control states from RV state manager
        if (currentClimateState.coolingOn !== undefined) {
          setIsCoolToggled(currentClimateState.coolingOn);
        }
        if (currentClimateState.toeKickOn !== undefined) {
          setIsToekickToggled(currentClimateState.toeKickOn);
        }
        if (currentClimateState.heatingOn !== undefined) {
          setIsFurnaceToggled(currentClimateState.heatingOn);
        }
        if (currentClimateState.nightMode !== undefined) {
          setIsNightToggled(currentClimateState.nightMode);
        }
        if (currentClimateState.dehumidifyMode !== undefined) {
          setIsDehumidToggled(currentClimateState.dehumidifyMode);
        }
        if (currentClimateState.autoMode !== undefined) {
          setIsAutoModeActive(currentClimateState.autoMode);
        }
        if (currentClimateState.fanSpeed) {
          setSpeed(currentClimateState.fanSpeed);
        }
        
      } catch (error) {
        console.error('Error initializing ClimateControlScreenTablet state:', error);
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
      if (newState.climate) {
        // Update temperature when external changes occur - but only if not sliding
        if (newState.climate.temperature !== undefined && !isSlidingRef.current && newState.climate.temperature !== temp) {
          const roundedTemp = Math.round(newState.climate.temperature);
          console.log('ClimateControl: External temperature change detected:', roundedTemp);
          setTemp(roundedTemp);
          setLastTemp(roundedTemp);
          lastSentTempRef.current = roundedTemp;
        }
        
        // External climate control changes handled silently
        if (newState.climate.coolingOn !== undefined && newState.climate.coolingOn !== isCoolToggled) {
          setIsCoolToggled(newState.climate.coolingOn);
        }
        
        if (newState.climate.toeKickOn !== undefined && newState.climate.toeKickOn !== isToekickToggled) {
          setIsToekickToggled(newState.climate.toeKickOn);
        }
        
        if (newState.climate.heatingOn !== undefined && newState.climate.heatingOn !== isFurnaceToggled) {
          setIsFurnaceToggled(newState.climate.heatingOn);
        }
      }
    });
    
    return unsubscribe;
  }, [temp, isCoolToggled, isToekickToggled, isFurnaceToggled]);

  // Handle temperature change from RadialSlider with improved responsiveness
  const handleTempChange = (newTemp) => {
    console.log('ClimateControl: Slider changed to:', newTemp);
    
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
      console.log('ClimateControl: Slider interaction complete');
    }, 500);
  };
  
  // Temperature change implementation - FIXED to always save to RV state
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
        console.log('ClimateControl: Temperature saved to storage:', temp);
      } catch (storageError) {
        console.error('ClimateControl: Failed to save to AsyncStorage:', storageError);
      }
      
      // Skip API call if no climate control is active
      if (!isCoolToggled && !isToekickToggled && !isFurnaceToggled) {
        console.log('ClimateControl: Temperature updated in state but not sent to API (no climate control active)');
        lastSentTempRef.current = temp;
        setLastTemp(temp);
        return;
      }
      
      try {
        setIsLoading(true);
        
        // Determine if we need to increase or decrease temperature
        if (temp > lastSentTempRef.current) {
          const steps = temp - lastSentTempRef.current;
          for (let i = 0; i < steps; i++) {
            await RVControlService.executeCommand('temp_increase');
            await new Promise(resolve => setTimeout(resolve, 100));
          }
          console.log(`Temperature increased to ${temp}°F`);
          
          setStatusMessage(`Temperature set to ${temp}°F`);
          setShowStatus(true);
          setTimeout(() => setShowStatus(false), 2000);
        } else {
          const steps = lastSentTempRef.current - temp;
          for (let i = 0; i < steps; i++) {
            await RVControlService.executeCommand('temp_decrease');
            await new Promise(resolve => setTimeout(resolve, 100));
          }
          console.log(`Temperature decreased to ${temp}°F`);
          
          setStatusMessage(`Temperature set to ${temp}°F`);
          setShowStatus(true);
          setTimeout(() => setShowStatus(false), 2000);
        }
        
        lastSentTempRef.current = temp;
        setLastTemp(temp);
        
        setErrorMessage(null);
      } catch (error) {
        console.error('Failed to change temperature:', error);
        // Don't revert - the state is already saved, just the API call failed
        lastSentTempRef.current = temp;
        setLastTemp(temp);
        
        const isNetworkError = error.message.includes('Network') || 
                              error.name === 'AxiosError' || 
                              !navigator.onLine;
                              
        if (isNetworkError) {
          setStatusMessage('Network error: Temperature change stored locally');
          setShowStatus(true);
          setTimeout(() => setShowStatus(false), 3000);
          
          setErrorMessage('Network unavailable. Your temperature preference has been saved and will be applied when connection is restored.');
        } else {
          setStatusMessage('Failed to change temperature');
          setShowStatus(true);
          setTimeout(() => setShowStatus(false), 3000);
          
          setErrorMessage(`Failed to change temperature: ${error.message}`);
        }
      } finally {
        setIsLoading(false);
      }
    };
    
    // Debounce the temperature change to avoid too many API calls
    const timeoutId = setTimeout(sendTempChange, 1000);
    return () => clearTimeout(timeoutId);
  }, [temp, isCoolToggled, isToekickToggled, isFurnaceToggled]);

  // Dismiss keyboard when tapping anywhere
  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  // Night Setting Toggle
  const handleNightPress = async () => {
    setIsLoading(true);
    const newNightState = !isNightToggled;
    
    try {
      rvStateManager.updateClimateState({ 
        nightMode: newNightState,
        lastUpdated: new Date().toISOString()
      });
      setIsNightToggled(newNightState);
      
      const result = await ClimateService.setNightMode();
      if (result.success) {
        await AsyncStorage.setItem('nightMode', JSON.stringify(newNightState));
        
        setStatusMessage(`Night mode ${newNightState ? 'enabled' : 'disabled'}`);
        setShowStatus(true);
        setTimeout(() => setShowStatus(false), 3000);
        
        setErrorMessage(null);
      } else {
        rvStateManager.updateClimateState({ 
          nightMode: !newNightState,
          lastUpdated: new Date().toISOString()
        });
        setIsNightToggled(!newNightState);
        
        setErrorMessage(`Failed to set night mode: ${result.error}`);
        setStatusMessage('Failed to toggle night mode');
        setShowStatus(true);
        setTimeout(() => setShowStatus(false), 3000);
      }
    } catch (error) {
      rvStateManager.updateClimateState({ 
        nightMode: !newNightState,
        lastUpdated: new Date().toISOString()
      });
      setIsNightToggled(!newNightState);
      
      setErrorMessage(`Error: ${error.message}`);
      setStatusMessage('Failed to toggle night mode');
      setShowStatus(true);
      setTimeout(() => setShowStatus(false), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  // Dehumid Setting Toggle
  const handleDehumidPress = async () => {
    setIsLoading(true);
    const newDehumidState = !isDehumidToggled;
    
    try {
      rvStateManager.updateClimateState({ 
        dehumidifyMode: newDehumidState,
        lastUpdated: new Date().toISOString()
      });
      setIsDehumidToggled(newDehumidState);
      
      const result = await ClimateService.setDehumidifyMode();
      if (result.success) {
        await AsyncStorage.setItem('dehumidMode', JSON.stringify(newDehumidState));
        
        setStatusMessage(`Dehumidify mode ${newDehumidState ? 'enabled' : 'disabled'}`);
        setShowStatus(true);
        setTimeout(() => setShowStatus(false), 3000);
        
        setErrorMessage(null);
      } else {
        rvStateManager.updateClimateState({ 
          dehumidifyMode: !newDehumidState,
          lastUpdated: new Date().toISOString()
        });
        setIsDehumidToggled(!newDehumidState);
        
        setErrorMessage(`Failed to set dehumidify mode: ${result.error}`);
        setStatusMessage('Failed to toggle dehumidify mode');
        setShowStatus(true);
        setTimeout(() => setShowStatus(false), 3000);
      }
    } catch (error) {
      rvStateManager.updateClimateState({ 
        dehumidifyMode: !newDehumidState,
        lastUpdated: new Date().toISOString()
      });
      setIsDehumidToggled(!newDehumidState);
      
      setErrorMessage(`Error: ${error.message}`);
      setStatusMessage('Failed to toggle dehumidify mode');
      setShowStatus(true);
      setTimeout(() => setShowStatus(false), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle feature button press (Cool, Toe Kick, Furnace)
  const handleButtonPress = async (label) => {
    setIsLoading(true);
    
    const isActive = activeButtons.includes(label);
    
    try {
      let result;
      let newState;
      
      switch (label) {
        case "Cool":
          newState = !isCoolToggled;
          rvStateManager.updateClimateState({ 
            coolingOn: newState,
            lastUpdated: new Date().toISOString()
          });
          setIsCoolToggled(newState);
          
          result = await ClimateService.toggleCooling();
          if (result.success) {
            await AsyncStorage.setItem('coolingState', JSON.stringify(newState));
            
            setStatusMessage(`Cooling ${newState ? 'turned on' : 'turned off'}`);
            setShowStatus(true);
            setTimeout(() => setShowStatus(false), 3000);
          } else {
            rvStateManager.updateClimateState({ 
              coolingOn: !newState,
              lastUpdated: new Date().toISOString()
            });
            setIsCoolToggled(!newState);
          }
          break;
          
        case "Toe Kick":
          newState = !isToekickToggled;
          rvStateManager.updateClimateState({ 
            toeKickOn: newState,
            lastUpdated: new Date().toISOString()
          });
          setIsToekickToggled(newState);
          
          result = await ClimateService.toggleToeKick();
          if (result.success) {
            await AsyncStorage.setItem('toeKickState', JSON.stringify(newState));
            
            setStatusMessage(`Toe Kick ${newState ? 'turned on' : 'turned off'}`);
            setShowStatus(true);
            setTimeout(() => setShowStatus(false), 3000);
          } else {
            rvStateManager.updateClimateState({ 
              toeKickOn: !newState,
              lastUpdated: new Date().toISOString()
            });
            setIsToekickToggled(!newState);
          }
          break;
          
        case "Furnace":
          newState = !isFurnaceToggled;
          rvStateManager.updateClimateState({ 
            heatingOn: newState,
            lastUpdated: new Date().toISOString()
          });
          setIsFurnaceToggled(newState);
          
          result = await ClimateService.toggleFurnace();
          if (result.success) {
            setStatusMessage(`Furnace ${newState ? 'turned on' : 'turned off'}`);
            setShowStatus(true);
            setTimeout(() => setShowStatus(false), 3000);
          } else {
            rvStateManager.updateClimateState({ 
              heatingOn: !newState,
              lastUpdated: new Date().toISOString()
            });
            setIsFurnaceToggled(!newState);
          }
          break;
          
        default:
          setErrorMessage(`Unknown feature: ${label}`);
          setIsLoading(false);
          return;
      }
      
      if (result && result.success) {
        setActiveButtons((prev) =>
          isActive
            ? prev.filter((item) => item !== label)
            : [...prev, label]
        );
        setErrorMessage(null);
      } else if (result) {
        setErrorMessage(`Error: ${result.error}`);
        
        setStatusMessage(`Failed to toggle ${label}`);
        setShowStatus(true);
        setTimeout(() => setShowStatus(false), 3000);
      }
    } catch (error) {
      setErrorMessage(`Unexpected error: ${error.message}`);
      
      setStatusMessage(`Failed to toggle ${label}`);
      setShowStatus(true);
      setTimeout(() => setShowStatus(false), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle fan speed button press
  const handleFanSpeedPress = async (speed) => {
    setIsLoading(true);
    const previousSpeed = speed;
    
    try {
      rvStateManager.updateClimateState({ 
        fanSpeed: speed,
        autoMode: speed === "Auto",
        lastUpdated: new Date().toISOString()
      });
      setSpeed(speed);
      if (speed === "Auto") {
        setIsAutoModeActive(true);
      } else {
        setIsAutoModeActive(false);
      }
      
      let result;
      
      switch (speed) {
        case "Low":
          result = await setLowFanSpeed();
          break;
        case "Med":
          result = await ClimateService.setMediumFanSpeed();
          break;
        case "High":
          result = await ClimateService.setHighFanSpeed();
          break;
        case "Auto":
          result = await setAutoMode();
          break;
        default:
          setErrorMessage(`Unknown fan speed: ${speed}`);
          setIsLoading(false);
          return;
      }
      
      if (result && result.success) {
        await AsyncStorage.setItem('fanSpeed', speed);
        await AsyncStorage.setItem('autoModeState', JSON.stringify(speed === "Auto"));
        
        setErrorMessage(null);
        
        setStatusMessage(`Fan speed set to ${speed}`);
        setShowStatus(true);
        setTimeout(() => setShowStatus(false), 3000);
      } else if (result) {
        rvStateManager.updateClimateState({ 
          fanSpeed: previousSpeed,
          autoMode: previousSpeed === "Auto",
          lastUpdated: new Date().toISOString()
        });
        setSpeed(previousSpeed);
        setIsAutoModeActive(previousSpeed === "Auto");
        
        setErrorMessage(`Error setting fan speed: ${result.error}`);
        setStatusMessage(`Failed to set fan speed to ${speed}`);
        setShowStatus(true);
        setTimeout(() => setShowStatus(false), 3000);
      }
    } catch (error) {
      rvStateManager.updateClimateState({ 
        fanSpeed: previousSpeed,
        autoMode: previousSpeed === "Auto",
        lastUpdated: new Date().toISOString()
      });
      setSpeed(previousSpeed);
      setIsAutoModeActive(previousSpeed === "Auto");
      
      setErrorMessage(`Unexpected error: ${error.message}`);
      setStatusMessage(`Failed to set fan speed to ${speed}`);
      setShowStatus(true);
      setTimeout(() => setShowStatus(false), 3000);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Direct implementation of low fan speed using raw commands
  const setLowFanSpeed = async () => {
    try {
      const commands = [
        '19FED99F#FF96AA0F3200D1FF',
        '195FCE98#AA00320000000000',
        '19FEF998#A110198A24AE19FF'
      ];
      
      for (const command of commands) {
        await RVControlService.executeRawCommand(command);
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      return { success: true };
    } catch (error) {
      console.error('Failed to set low fan speed:', error);
      return { 
        success: false, 
        error: error.message,
        details: 'Error sending raw fan speed commands. Check server logs for details.'
      };
    }
  };
  
  // Direct implementation of auto mode using raw commands
  const setAutoMode = async () => {
    try {
      const commands = [
        '19FEF99F#01C0FFFFFFFFFFFF',
        '19FED99F#FF96AA0F0000D1FF',
        '19FFE198#010064A924A92400'
      ];
      
      for (const command of commands) {
        await RVControlService.executeRawCommand(command);
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      return { success: true };
    } catch (error) {
      console.error('Failed to set auto mode:', error);
      return { 
        success: false, 
        error: error.message,
        details: 'Error sending raw auto mode commands. Check server logs for details.'
      };
    }
  };

  // Load saved states on component mount
  useEffect(() => {
    const loadSavedStates = async () => {
      try {
        const currentClimateState = rvStateManager.getCategoryState('climate');
        
        // Load cooling state
        if (currentClimateState.coolingOn !== undefined) {
          setIsCoolToggled(currentClimateState.coolingOn);
          if (currentClimateState.coolingOn && !activeButtons.includes("Cool")) {
            setActiveButtons(prev => [...prev, "Cool"]);
          }
        } else {
          const savedCoolingState = await AsyncStorage.getItem('coolingState');
          if (savedCoolingState !== null) {
            const coolingState = JSON.parse(savedCoolingState);
            setIsCoolToggled(coolingState);
            rvStateManager.updateClimateState({ coolingOn: coolingState });
            
            if (coolingState && !activeButtons.includes("Cool")) {
              setActiveButtons(prev => [...prev, "Cool"]);
            }
          }
        }
        
        // Load toe kick state
        if (currentClimateState.toeKickOn !== undefined) {
          setIsToekickToggled(currentClimateState.toeKickOn);
          if (currentClimateState.toeKickOn && !activeButtons.includes("Toe Kick")) {
            setActiveButtons(prev => [...prev, "Toe Kick"]);
          }
        } else {
          const savedToeKickState = await AsyncStorage.getItem('toeKickState');
          if (savedToeKickState !== null) {
            const toeKickState = JSON.parse(savedToeKickState);
            setIsToekickToggled(toeKickState);
            rvStateManager.updateClimateState({ toeKickOn: toeKickState });
            
            if (toeKickState && !activeButtons.includes("Toe Kick")) {
              setActiveButtons(prev => [...prev, "Toe Kick"]);
            }
          }
        }
        
        // Load other states
        if (currentClimateState.nightMode !== undefined) {
          setIsNightToggled(currentClimateState.nightMode);
        } else {
          const savedNightMode = await AsyncStorage.getItem('nightMode');
          if (savedNightMode !== null) {
            const nightMode = JSON.parse(savedNightMode);
            setIsNightToggled(nightMode);
            rvStateManager.updateClimateState({ nightMode });
          }
        }
        
        if (currentClimateState.dehumidifyMode !== undefined) {
          setIsDehumidToggled(currentClimateState.dehumidifyMode);
        } else {
          const savedDehumidMode = await AsyncStorage.getItem('dehumidMode');
          if (savedDehumidMode !== null) {
            const dehumidMode = JSON.parse(savedDehumidMode);
            setIsDehumidToggled(dehumidMode);
            rvStateManager.updateClimateState({ dehumidifyMode: dehumidMode });
          }
        }
        
        if (currentClimateState.autoMode !== undefined) {
          setIsAutoModeActive(currentClimateState.autoMode);
        } else {
          const savedAutoMode = await AsyncStorage.getItem('autoModeState');
          if (savedAutoMode !== null) {
            const autoMode = JSON.parse(savedAutoMode);
            setIsAutoModeActive(autoMode);
            rvStateManager.updateClimateState({ autoMode });
          }
        }
        
        if (currentClimateState.fanSpeed) {
          setSpeed(currentClimateState.fanSpeed);
        } else {
          const savedFanSpeed = await AsyncStorage.getItem('fanSpeed');
          if (savedFanSpeed !== null) {
            setSpeed(savedFanSpeed);
            rvStateManager.updateClimateState({ fanSpeed: savedFanSpeed });
          }
        }
      } catch (error) {
        console.error('Error loading saved states:', error);
      }
    };
    
    loadSavedStates();
  }, []);

  // If the screen is a tablet, render the climate control interface
  if (isTablet) {
    return (
      <TouchableWithoutFeedback onPress={dismissKeyboard}>
        <Grid className="bg-black">
          <Row size={10}>
            <Row className="bg-black" size={9}>
              <Col className="m-1 ml-3">
                <Text className="text-3xl text-white">{DayOfTheWeek}</Text>
                <Text className="text-lg text-white">{currentDate}</Text>
              </Col>
            </Row>
            <Row className="bg-black" size={1}>
              <View className="pt-3 pl-3">
                <Image
                  source={require("../assets/images/icon.png")}
                  style={{
                    width: 90,
                    height: 55,
                    right: 0,
                    paddingTop: 0,
                    backgroundColor: "white"
                  }}
                />
              </View>
            </Row>
          </Row>

          {/* Weather error indicator */}
          {weatherError && (
            <View style={styles.weatherErrorIndicator}>
              <Text style={styles.weatherErrorText}>Offline Mode</Text>
            </View>
          )}

          {/* Error message display */}
          {errorMessage && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{errorMessage}</Text>
              <TouchableOpacity 
                style={styles.dismissButton}
                onPress={() => setErrorMessage(null)}
              >
                <Text style={styles.dismissButtonText}>Dismiss</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Loading indicator */}
          {isLoading && (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Processing command...</Text>
            </View>
          )}
          
          {/* Status message */}
          {showStatus && (
            <View style={styles.statusContainer}>
              <Text style={styles.statusText}>{statusMessage}</Text>
            </View>
          )}

          <View
            style={{
              flexDirection: "row",
              justifyContent: "center",
              alignItems: "center",
              marginHorizontal: 20,
              flexWrap: "wrap",
              right: 40,
            }}
          >
            <Col
              style={{
                width: "30%",
                height: 450,
                backgroundColor: "#1B1B1B",
                borderRadius: 10,
                justifyContent: "flex-start",
                padding: 20,
                margin: 50,
                shadowColor: "#FFFFFF",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.5,
                shadowRadius: 6,
                elevation: 6,
              }}
            >
              <Text
                style={{
                  color: "white",
                  fontSize: 16,
                  position: "absolute",
                  top: 20,
                  left: 10,
                }}
              >
                Main (Front)
              </Text>
              <View
                style={{
                  height: 1,
                  backgroundColor: "white",
                  width: "100%",
                  marginTop: 50,
                }}
              />
              <View style={styles.container}>
                <RadialSlider
                  value={temp}
                  min={60}
                  max={85}
                  thumbColor={"#FFFFFF"}
                  thumbBorderColor={"#848482"}
                  sliderTrackColor={"#E5E5E5"}
                  linearGradient={[
                    { offset: '0%', color: '#ffaca6' },
                    { offset: '100%', color: '#FF8200' },
                  ]}
                  onChange={handleTempChange}
                  onComplete={() => {
                    console.log('ClimateControl: Slider interaction complete');
                    isSlidingRef.current = false;
                  }}
                  subTitle={'Degrees'}
                  subTitleStyle={{
                    color: isDarkMode ? 'white' : 'black',
                    paddingBottom: 15,
                    fontSize: 20,
                  }}
                  unitStyle={{
                    color: isDarkMode ? 'white' : 'black',
                    paddingTop: 5,
                  }}
                  valueStyle={{
                    color: isDarkMode ? 'white' : 'black',
                    paddingTop: 5,
                    fontSize: 48,
                  }}
                  style={{
                    backgroundColor: '#1B1B1B', 
                  }}
                  buttonContainerStyle={{
                    color: "FFFFFF",
                  }}
                  leftIconStyle={{
                    backgroundColor: 'white',
                    borderRadius: 10,
                    marginRight: 10,
                    top: 40,
                    height: 40,
                    width: 50,
                    paddingLeft: 4,
                  }}
                  rightIconStyle={{
                    backgroundColor: 'white',
                    borderRadius: 10,
                    marginLeft: 10,
                    top: 40,
                    height: 40,
                    width: 50,
                    paddingLeft: 5,
                  }}
                  isHideTailText={true}
                  unit={'°F'}
                />
              </View>
            </Col>
            
            <View
              style={{
                flexDirection: "row",
                justifyContent: "center",
                alignItems: "flex-start",
                marginHorizontal: 20,
                flexWrap: "wrap",
              }}
            >
              {/* Truma Logo and Auxiliary Box */}
              <View style={{ width: "50%", height: "100px", alignItems: "center" }}>
                <Image
                  source={require("../assets/truma-logo-333-100.png")}
                  className="h-30 w-30 left-3"
                  style={{ resizeMode: "contain", marginBottom: 220 }}
                />

                <View style={{ flexDirection: "row", alignItems: "flex-start", marginTop: 10 }}>
                  {/* Auxiliary Box */}
                  <Col
                    style={{
                      width: 420,
                      height: 330,
                      backgroundColor: "#1B1B1B",
                      borderRadius: 10,
                      justifyContent: "flex-start",
                      padding: 20,
                      marginB: 25,
                      right: 80,
                      bottom: 100,
                      shadowColor: "#FFFFFF",
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.5,
                      shadowRadius: 6,
                      elevation: 6,
                    }}
                  >
                    <Text
                      style={{
                        color: "white",
                        fontSize: 16,
                        position: "absolute",
                        top: 20,
                        left: 10,
                      }}
                    >
                      Auxiliary (Back)
                    </Text>
                    <View
                      style={{
                        height: 1,
                        backgroundColor: "white",
                        width: "100%",
                        marginTop: 40,
                      }}
                    />
                    
                    {/* Feature buttons and fan speed side by side layout */}
                    <View style={{ 
                      flex: 1, 
                      flexDirection: "row", 
                      marginTop: 10
                    }}>
                      {/* Left column: Feature buttons */}
                      <View style={{ 
                        flex: 0.75, 
                        justifyContent: "flex-start"
                      }}>
                        {features.map((feature, index) => {
                          const isActive = (feature.label === "Cool" && isCoolToggled) ||
                                          (feature.label === "Toe Kick" && isToekickToggled) ||
                                          (feature.label === "Furnace" && isFurnaceToggled);
                          
                          const getGradientColors = (label, active) => {
                            if (!active) return ["#2C2C34", "#3A3A42", "#2C2C34"];
                            
                            switch (label) {
                              case "Cool":
                                return ["#4FC3F7", "#29B6F6", "#0288D1"];
                              case "Toe Kick":
                                return ["#FF9800", "#FFB74D", "#FF8F00"];
                              case "Furnace":
                                return ["#FF6B6B", "#FF8E53", "#FF6B35"];
                              default:
                                return ["#2C2C34", "#3A3A42", "#2C2C34"];
                            }
                          };
                          
                          const getIconName = (label, active) => {
                            switch (label) {
                              case "Cool":
                                return active ? "snow" : "snow-outline";
                              case "Toe Kick":
                                return active ? "flame" : "flame-outline";
                              case "Furnace":
                                return active ? "bonfire" : "bonfire-outline";
                              default:
                                return "help-outline";
                            }
                          };
                          
                          return (
                            <TouchableOpacity
                              key={index}
                              onPress={() => handleButtonPress(feature.label)}
                              disabled={isLoading}
                              activeOpacity={0.8}
                              style={[
                                styles.modernButton,
                                isLoading && { opacity: 0.6 }
                              ]}
                            >
                              <LinearGradient
                                colors={getGradientColors(feature.label, isActive)}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.modernGradientButton}
                              >
                                <View style={styles.modernButtonContent}>
                                  <View style={[
                                    styles.modernIconContainer,
                                    { backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)' }
                                  ]}>
                                    <Ionicons
                                      name={getIconName(feature.label, isActive)}
                                      size={20}
                                      color={isActive ? "#FFF" : "#B0B0B0"}
                                    />
                                  </View>
                                  <View style={styles.modernTextContainer}>
                                    <Text style={[
                                      styles.modernButtonTitle,
                                      { color: isActive ? "#FFF" : "#E0E0E0" }
                                    ]}>
                                      {feature.label}
                                    </Text>
                                  </View>
                                  <View style={[
                                    styles.modernStatusIndicator,
                                    { backgroundColor: isActive ? "#4CAF50" : "#666" }
                                  ]} />
                                </View>
                              </LinearGradient>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                      
                      {/* Right column: Fan Speed container */}
                      <View style={{ 
                        flex: 0.25, 
                        marginLeft: 10,
                        alignItems: "center"
                      }}>
                        <Text style={{ 
                          color: "white", 
                          fontSize: 14,
                          marginBottom: 5,
                          textAlign: "center"
                        }}>
                          Fan Speed
                        </Text>
                        <View style={styles.fanSpeedContainer}>
                          <ScrollView 
                            horizontal={false}
                            contentContainerStyle={styles.fanSpeedScrollContent}
                            showsVerticalScrollIndicator={false}
                          >
                            <FanSpeedButton 
                              speed="High" 
                              onPress={() => handleFanSpeedPress("High")} 
                              isLoading={isLoading}
                              isActive={speed === "High"}
                            />
                            
                            <FanSpeedButton 
                              speed="Med" 
                              onPress={() => handleFanSpeedPress("Med")} 
                              isLoading={isLoading}
                              isActive={speed === "Med"}
                            />
                            
                            <FanSpeedButton 
                              speed="Low" 
                              onPress={() => handleFanSpeedPress("Low")} 
                              isLoading={isLoading}
                              isActive={speed === "Low"}
                            />
                            
                            <FanSpeedButton 
                              speed="Auto" 
                              onPress={() => handleFanSpeedPress("Auto")} 
                              isLoading={isLoading}
                              isActive={isAutoModeActive}
                            />
                          </ScrollView>
                        </View>
                      </View>
                    </View>
                  </Col>
                  
                  <View style={styles.fixedToggleContainer}>
                    {/* Day/Night Toggle */}
                    <TouchableOpacity
                      onPress={handleNightPress}
                      disabled={isLoading}
                      style={[
                        styles.toggleBase,
                        isNightToggled && styles.toggleActiveDay
                      ]}
                      activeOpacity={0.8}
                    >
                      <Image source={isNightToggled ? moonImage : sunImage} style={styles.toggleIcon} />
                      <Text style={styles.toggleText}>
                        {isNightToggled ? 'Night Mode' : 'Day Mode'}
                      </Text>
                    </TouchableOpacity>

                    {/* Dehumidify Toggle */}
                    <TouchableOpacity
                      onPress={handleDehumidPress}
                      disabled={isLoading}
                      style={[
                        styles.toggleBase,
                        isDehumidToggled && styles.toggleActiveDehumid
                      ]}
                      activeOpacity={0.8}
                    >
                      <Image source={require("../assets/drop.png")} style={styles.toggleIcon} />
                      <Text style={styles.toggleText}>
                        Dehumidify
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </Grid>
      </TouchableWithoutFeedback>
    );
  }
  return null;
}

const FanSpeedButton = ({ speed, onPress, isLoading, isActive }) => {
  const getBackgroundColor = () => {
    return isActive 
      ? '#4CAF50'
      : '#242124';
  };
  
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isLoading}
      style={[
        styles.fanSpeedButton,
        { backgroundColor: getBackgroundColor() }
      ]}
      activeOpacity={0.7}
    >
      <Text style={{ color: "white", fontSize: 16 }}>{speed}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  modernButton: {
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    marginVertical: 8,
  },
  modernGradientButton: {
    borderRadius: 16,
    padding: 2,
  },
  modernButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    minWidth: 200,
    minHeight: 55,
    position: 'relative',
  },
  modernIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  modernTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  modernButtonTitle: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  modernStatusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    position: 'absolute',
    top: 12,
    right: 12,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
  },
  errorContainer: {
    backgroundColor: "rgba(255, 0, 0, 0.1)",
    padding: 15,
    margin: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "red",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    zIndex: 1000,
  },
  errorText: {
    color: "white",
    textAlign: "left",
    flex: 1,
  },
  dismissButton: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    padding: 5,
    borderRadius: 3,
    marginLeft: 10,
  },
  dismissButtonText: {
    color: "white",
    fontSize: 12,
  },
  loadingContainer: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: [{ translateX: -100 }, { translateY: -25 }],
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    padding: 20,
    borderRadius: 10,
    zIndex: 1000,
  },
  loadingText: {
    color: "white",
    fontSize: 16,
  },
  fixedToggleContainer: {
    position: 'absolute',
    top: 20,
    left: 400,
    zIndex: 1000,
    alignItems: 'center',
  },
  statusContainer: {
    position: "absolute",
    bottom: 80,
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 5,
    alignSelf: "center",
    zIndex: 1000,
  },
  statusText: {
    color: "white",
    fontWeight: "bold",
  },
  weatherErrorIndicator: {
    position: "absolute",
    top: 10,
    right: 85,
    backgroundColor: "rgba(255, 165, 0, 0.8)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    zIndex: 1000,
  },
  weatherErrorText: {
    color: "white",
    fontSize: 12,
    fontWeight: "bold",
  },
  fanSpeedContainer: {
    width: 80,
    height: 195,
    marginTop:5,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 5,
    overflow: 'hidden',
  },
  fanSpeedScrollContent: {
    alignItems: 'center',
    paddingVertical: 2,
  },
  fanSpeedButton: {
    padding: 10,
    borderRadius: 5,
    alignItems: "center",
    justifyContent: "center",
    width: 76,
    margin: 2,
  },
  toggleBase: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    width: 180,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 30,
    marginVertical: 10,
    backgroundColor: '#2C2C2E',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  toggleActiveDay: {
    backgroundColor: '#FFBA00',
  },
  toggleActiveDehumid: {
    backgroundColor: '#00B9E8',
  },
  toggleIcon: {
    width: 26,
    height: 26,
    marginRight: 12,
    tintColor: 'white',
  },
  toggleText: {
    color: 'white',
    fontSize: 17,
    fontWeight: '600',
  },
});

export default ClimateControlScreenTablet;