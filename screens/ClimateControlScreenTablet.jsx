import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, Image, TouchableOpacity, TouchableWithoutFeedback, Keyboard, ScrollView } from "react-native";
import { Border, Color, Gap, FontSize, FontFamily, isDarkMode } from "../GlobalStyles";
import useScreenSize from "../helper/useScreenSize.jsx";
import { Col, Row, Grid } from "react-native-easy-grid";
import { RadialSlider } from 'react-native-radial-slider';
import moment from 'moment';
import { ClimateService } from '../API/RVControlServices.js';
import { RVControlService } from "../API/rvAPI";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';

// Import RV State Management hooks
import { useRVClimate } from "../API/RVStateManager/RVStateHooks";
import rvStateManager from "../API/RVStateManager/RVStateManager";

const ClimateControlScreenTablet = () => {
  // Use RV state management hook for climate data
  const { climate, setTemperature, toggleCooling, toggleHeating } = useRVClimate();
  
  const [activeButtons, setActiveButtons] = useState([]); // State for active buttons
  const [speed, setSpeed] = useState(0);
  const [isNightToggled, setIsNightToggled] = useState(false);
  const [isDehumidToggled, setIsDehumidToggled] = useState(false);
  const [isCoolToggled, setIsCoolToggled] = useState(false);
  const [isToekickToggled, setIsToekickToggled] = useState(false);
  const [isFurnaceToggled, setIsFurnaceToggled] = useState(false);
  const [isAutoModeActive, setIsAutoModeActive] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  
  // Status message for user feedback - added from AirCon
  const [statusMessage, setStatusMessage] = useState('');
  const [showStatus, setShowStatus] = useState(false);
  
  // Weather data state and error handling
  const [weatherData, setWeatherData] = useState(null);
  const [weatherError, setWeatherError] = useState(false);

  // Temperature state with loading from RV state manager
  const [temp, setTemp] = useState(72);
  const [lastTemp, setLastTemp] = useState(72);
  
  var now = moment().format();
  var currentDate = moment().format("MMMM Do, YYYY");
  var DayOfTheWeek = moment().format("dddd");

  // Preload images
  const moonImage = require("../assets/moon.png");
  const sunImage = require("../assets/sun.png");
  
  // Features with their corresponding fan speeds
  const features = [
    { label: "Cool", fanSpeed: "High" },
    { label: "Toe Kick", fanSpeed: "Med" },
    { label: "Furnace", fanSpeed: "Low" }
  ];

  const isTablet = useScreenSize(); // Check if the screen is large enough to be considered a tablet

  // Initialize state from RV state manager
  useEffect(() => {
    const initializeState = async () => {
      try {
        // Get current climate state from RV state manager
        const currentClimateState = rvStateManager.getCategoryState('climate');
        
        // Set temperature from state
        if (currentClimateState.temperature) {
          setTemp(currentClimateState.temperature);
          setLastTemp(currentClimateState.temperature);
        } else {
          // Fall back to AsyncStorage for backwards compatibility
          const savedTemp = await AsyncStorage.getItem('temperature');
          if (savedTemp) {
            const tempValue = parseInt(savedTemp, 10);
            setTemp(tempValue);
            setLastTemp(tempValue);
            // Update RV state with loaded temperature
            rvStateManager.updateClimateState({ temperature: tempValue });
          } else {
            setTemp(72);
            setLastTemp(72);
            rvStateManager.updateClimateState({ temperature: 72 });
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
      }
    };
    
    initializeState();
  }, []);

  // Subscribe to external state changes (from other devices/screens)
  useEffect(() => {
    const unsubscribe = rvStateManager.subscribeToExternalChanges((newState) => {
      if (newState.climate) {
        // Update local state when external changes occur
        if (newState.climate.temperature && newState.climate.temperature !== temp) {
          setTemp(newState.climate.temperature);
          setLastTemp(newState.climate.temperature);
          
          // Show notification of external change
          setStatusMessage(`Temperature updated remotely to ${newState.climate.temperature}°F`);
          setShowStatus(true);
          setTimeout(() => setShowStatus(false), 3000);
        }
        
        // Update other climate states if they changed externally
        if (newState.climate.coolingOn !== undefined && newState.climate.coolingOn !== isCoolToggled) {
          setIsCoolToggled(newState.climate.coolingOn);
          setStatusMessage(`Cooling ${newState.climate.coolingOn ? 'turned on' : 'turned off'} remotely`);
          setShowStatus(true);
          setTimeout(() => setShowStatus(false), 3000);
        }
        
        if (newState.climate.toeKickOn !== undefined && newState.climate.toeKickOn !== isToekickToggled) {
          setIsToekickToggled(newState.climate.toeKickOn);
          setStatusMessage(`Toe Kick ${newState.climate.toeKickOn ? 'turned on' : 'turned off'} remotely`);
          setShowStatus(true);
          setTimeout(() => setShowStatus(false), 3000);
        }
        
        if (newState.climate.heatingOn !== undefined && newState.climate.heatingOn !== isFurnaceToggled) {
          setIsFurnaceToggled(newState.climate.heatingOn);
          setStatusMessage(`Furnace ${newState.climate.heatingOn ? 'turned on' : 'turned off'} remotely`);
          setShowStatus(true);
          setTimeout(() => setShowStatus(false), 3000);
        }
      }
    });
    
    return unsubscribe;
  }, [temp, isCoolToggled, isToekickToggled, isFurnaceToggled]);

  // Handle temperature change from RadialSlider
  const handleTempChange = (newTemp) => {
    setTemp(newTemp);
    
    // Update RV state immediately for UI responsiveness
    rvStateManager.updateClimateState({ 
      temperature: newTemp,
      lastUpdated: new Date().toISOString()
    });
  };
  
  // Temperature change implementation from AirCon.jsx
  useEffect(() => {
    const sendTempChange = async () => {
      if (temp === lastTemp || (!isCoolToggled && !isToekickToggled && !isFurnaceToggled)) return;
      
      try {
        setIsLoading(true);
        
        // Determine if we need to increase or decrease temperature
        if (temp > lastTemp) {
          // Send temperature increase command based on the difference
          const steps = temp - lastTemp;
          for (let i = 0; i < steps; i++) {
            await RVControlService.executeCommand('temp_increase');
            // Short delay to avoid overwhelming the CAN bus
            await new Promise(resolve => setTimeout(resolve, 100));
          }
          console.log(`Temperature increased to ${temp}°F`);
          
          // Show status message
          setStatusMessage(`Temperature set to ${temp}°F`);
          setShowStatus(true);
          setTimeout(() => setShowStatus(false), 2000);
        } else {
          // Send temperature decrease command based on the difference
          const steps = lastTemp - temp;
          for (let i = 0; i < steps; i++) {
            await RVControlService.executeCommand('temp_decrease');
            // Short delay to avoid overwhelming the CAN bus
            await new Promise(resolve => setTimeout(resolve, 100));
          }
          console.log(`Temperature decreased to ${temp}°F`);
          
          // Show status message
          setStatusMessage(`Temperature set to ${temp}°F`);
          setShowStatus(true);
          setTimeout(() => setShowStatus(false), 2000);
        }
        
        setLastTemp(temp);
        
        // Update AsyncStorage for backwards compatibility
        await AsyncStorage.setItem('temperature', temp.toString());
        
        // Update RV state with confirmed temperature
        rvStateManager.updateClimateState({ 
          temperature: temp,
          lastUpdated: new Date().toISOString()
        });
        
        // Clear any error messages
        setErrorMessage(null);
      } catch (error) {
        console.error('Failed to change temperature:', error);
        // Revert to last successful temperature
        setTemp(lastTemp);
        
        // Revert RV state
        rvStateManager.updateClimateState({ 
          temperature: lastTemp,
          lastUpdated: new Date().toISOString()
        });
        
        // Check if it's a network error
        const isNetworkError = error.message.includes('Network') || 
                              error.name === 'AxiosError' || 
                              !navigator.onLine;
                              
        if (isNetworkError) {
          // Show specific network error message
          setStatusMessage('Network error: Temperature change stored locally');
          setShowStatus(true);
          setTimeout(() => setShowStatus(false), 3000);
          
          // Store the intended temperature change in AsyncStorage to sync later
          try {
            AsyncStorage.setItem('pendingTempChange', JSON.stringify({
              targetTemp: temp,
              timestamp: Date.now()
            }));
            
            // Let the user know we've saved their preference
            setErrorMessage('Network unavailable. Your temperature preference has been saved and will be applied when connection is restored.');
          } catch (storageError) {
            console.error('Failed to store pending temperature change:', storageError);
          }
        } else {
          // Show generic error message for non-network errors
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
    const timeoutId = setTimeout(sendTempChange, 800);
    return () => clearTimeout(timeoutId);
  }, [temp, lastTemp, isCoolToggled, isToekickToggled, isFurnaceToggled]);

  // Dismiss keyboard when tapping anywhere - Added from AirCon
  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  // Night Setting Toggle - Using service with RV state management
  const handleNightPress = async () => {
    setIsLoading(true);
    const newNightState = !isNightToggled;
    
    try {
      // Update RV state first for immediate UI feedback
      rvStateManager.updateClimateState({ 
        nightMode: newNightState,
        lastUpdated: new Date().toISOString()
      });
      setIsNightToggled(newNightState);
      
      const result = await ClimateService.setNightMode();
      if (result.success) {
        // Save to AsyncStorage for backwards compatibility
        await AsyncStorage.setItem('nightMode', JSON.stringify(newNightState));
        
        // Add status message
        setStatusMessage(`Night mode ${newNightState ? 'enabled' : 'disabled'}`);
        setShowStatus(true);
        setTimeout(() => setShowStatus(false), 3000);
        
        setErrorMessage(null);
      } else {
        // Revert state on error
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
      // Revert state on error
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

  // Dehumid Setting Toggle - Using service with RV state management
  const handleDehumidPress = async () => {
    setIsLoading(true);
    const newDehumidState = !isDehumidToggled;
    
    try {
      // Update RV state first for immediate UI feedback
      rvStateManager.updateClimateState({ 
        dehumidifyMode: newDehumidState,
        lastUpdated: new Date().toISOString()
      });
      setIsDehumidToggled(newDehumidState);
      
      const result = await ClimateService.setDehumidifyMode();
      if (result.success) {
        // Save to AsyncStorage for backwards compatibility
        await AsyncStorage.setItem('dehumidMode', JSON.stringify(newDehumidState));
        
        // Add status message
        setStatusMessage(`Dehumidify mode ${newDehumidState ? 'enabled' : 'disabled'}`);
        setShowStatus(true);
        setTimeout(() => setShowStatus(false), 3000);
        
        setErrorMessage(null);
      } else {
        // Revert state on error
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
      // Revert state on error
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

  // Handle feature button press (Cool, Toe Kick, Furnace) with improved implementation from AirCon
  const handleButtonPress = async (label) => {
    setIsLoading(true);
    
    // Check if the button is already active
    const isActive = activeButtons.includes(label);
    
    try {
      let result;
      let newState;
      
      // Execute corresponding service methods based on the button label
      switch (label) {
        case "Cool":
          newState = !isCoolToggled;
          // Update RV state first for immediate UI feedback
          rvStateManager.updateClimateState({ 
            coolingOn: newState,
            lastUpdated: new Date().toISOString()
          });
          setIsCoolToggled(newState);
          
          result = await ClimateService.toggleCooling();
          if (result.success) {
            // Update AsyncStorage to match AirCon implementation
            await AsyncStorage.setItem('coolingState', JSON.stringify(newState));
            
            // Add status message
            setStatusMessage(`Cooling ${newState ? 'turned on' : 'turned off'}`);
            setShowStatus(true);
            setTimeout(() => setShowStatus(false), 3000);
          } else {
            // Revert state on error
            rvStateManager.updateClimateState({ 
              coolingOn: !newState,
              lastUpdated: new Date().toISOString()
            });
            setIsCoolToggled(!newState);
          }
          break;
          
        case "Toe Kick":
          newState = !isToekickToggled;
          // Update RV state first for immediate UI feedback
          rvStateManager.updateClimateState({ 
            toeKickOn: newState,
            lastUpdated: new Date().toISOString()
          });
          setIsToekickToggled(newState);
          
          result = await ClimateService.toggleToeKick();
          if (result.success) {
            // Update AsyncStorage to match AirCon implementation
            await AsyncStorage.setItem('toeKickState', JSON.stringify(newState));
            
            // Add status message
            setStatusMessage(`Toe Kick ${newState ? 'turned on' : 'turned off'}`);
            setShowStatus(true);
            setTimeout(() => setShowStatus(false), 3000);
          } else {
            // Revert state on error
            rvStateManager.updateClimateState({ 
              toeKickOn: !newState,
              lastUpdated: new Date().toISOString()
            });
            setIsToekickToggled(!newState);
          }
          break;
          
        case "Furnace":
          newState = !isFurnaceToggled;
          // Update RV state first for immediate UI feedback
          rvStateManager.updateClimateState({ 
            heatingOn: newState,
            lastUpdated: new Date().toISOString()
          });
          setIsFurnaceToggled(newState);
          
          result = await ClimateService.toggleFurnace();
          if (result.success) {
            // Add status message
            setStatusMessage(`Furnace ${newState ? 'turned on' : 'turned off'}`);
            setShowStatus(true);
            setTimeout(() => setShowStatus(false), 3000);
          } else {
            // Revert state on error
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
        // Update active buttons state
        setActiveButtons((prev) =>
          isActive
            ? prev.filter((item) => item !== label) // Remove if already active
            : [...prev, label] // Add if not active
        );
        setErrorMessage(null);
      } else if (result) {
        setErrorMessage(`Error: ${result.error}`);
        
        // Add status message
        setStatusMessage(`Failed to toggle ${label}`);
        setShowStatus(true);
        setTimeout(() => setShowStatus(false), 3000);
      }
    } catch (error) {
      setErrorMessage(`Unexpected error: ${error.message}`);
      
      // Add status message
      setStatusMessage(`Failed to toggle ${label}`);
      setShowStatus(true);
      setTimeout(() => setShowStatus(false), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle fan speed button press with RV state management
  const handleFanSpeedPress = async (speed) => {
    setIsLoading(true);
    const previousSpeed = speed;
    
    try {
      // Update RV state first for immediate UI feedback
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
          // Use the direct raw command approach that's working
          result = await setLowFanSpeed();
          break;
        case "Med":
          result = await ClimateService.setMediumFanSpeed();
          break;
        case "High":
          result = await ClimateService.setHighFanSpeed();
          break;
        case "Auto":
          // Use direct raw command approach for auto setting
          result = await setAutoMode();
          break;
        default:
          setErrorMessage(`Unknown fan speed: ${speed}`);
          setIsLoading(false);
          return;
      }
      
      if (result && result.success) {
        // Store the selected fan speed and auto mode state
        await AsyncStorage.setItem('fanSpeed', speed);
        await AsyncStorage.setItem('autoModeState', JSON.stringify(speed === "Auto"));
        
        setErrorMessage(null);
        
        // Add status message
        setStatusMessage(`Fan speed set to ${speed}`);
        setShowStatus(true);
        setTimeout(() => setShowStatus(false), 3000);
      } else if (result) {
        // Revert state on error
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
      // Revert state on error
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
      // Attempt to execute the individual commands instead of the command group
      // This is a workaround for the 400 error issue
      const commands = [
        '19FED99F#FF96AA0F3200D1FF', // low_fan_speed_1
        '195FCE98#AA00320000000000', // low_fan_speed_2
        '19FEF998#A110198A24AE19FF'  // low_fan_speed_3
      ];
      
      // Send each command individually using the raw command API
      for (const command of commands) {
        await RVControlService.executeRawCommand(command);
        // Short delay to avoid overwhelming the CAN bus
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      return { success: true };
    } catch (error) {
      console.error('Failed to set low fan speed:', error);
      
      // Provide a more detailed error message for debugging
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
      // Auto setting commands from server.js
      const commands = [
        '19FEF99F#01C0FFFFFFFFFFFF', // auto_setting_on_1
        '19FED99F#FF96AA0F0000D1FF', // auto_setting_on_2
        '19FFE198#010064A924A92400'  // auto_setting_on_3
      ];
      
      // Send each command individually using the raw command API
      for (const command of commands) {
        await RVControlService.executeRawCommand(command);
        // Short delay to avoid overwhelming the CAN bus
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      return { success: true };
    } catch (error) {
      console.error('Failed to set auto mode:', error);
      
      // Provide a more detailed error message for debugging
      return { 
        success: false, 
        error: error.message,
        details: 'Error sending raw auto mode commands. Check server logs for details.'
      };
    }
  };

  // Load saved states on component mount - updated with RV state management
  useEffect(() => {
    const loadSavedStates = async () => {
      try {
        // First, try to get states from RV state manager
        const currentClimateState = rvStateManager.getCategoryState('climate');
        
        // Load cooling state
        if (currentClimateState.coolingOn !== undefined) {
          setIsCoolToggled(currentClimateState.coolingOn);
          if (currentClimateState.coolingOn && !activeButtons.includes("Cool")) {
            setActiveButtons(prev => [...prev, "Cool"]);
          }
        } else {
          // Fall back to AsyncStorage
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
          // Fall back to AsyncStorage
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
        
        // Load other states with RV state manager fallback to AsyncStorage
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

  // Add useEffect to check for and apply pending temperature changes
  useEffect(() => {
    const checkPendingChanges = async () => {
      try {
        // Skip if we're currently loading or if there's no active climate control
        if (isLoading || (!isCoolToggled && !isToekickToggled && !isFurnaceToggled)) return;
        
        // Check for pending temperature changes
        const pendingChangesString = await AsyncStorage.getItem('pendingTempChange');
        
        if (pendingChangesString) {
          const pendingChanges = JSON.parse(pendingChangesString);
          const pendingTemp = pendingChanges.targetTemp;
          const timestamp = pendingChanges.timestamp;
          
          // Only apply changes that are less than 24 hours old
          const isRecent = (Date.now() - timestamp) < 24 * 60 * 60 * 1000;
          
          if (isRecent && pendingTemp !== temp) {
            // Show user we're applying their saved preference
            setStatusMessage('Applying saved temperature setting...');
            setShowStatus(true);
            
            // Update UI temperature immediately
            setTemp(pendingTemp);
            
            // Update RV state
            rvStateManager.updateClimateState({ 
              temperature: pendingTemp,
              lastUpdated: new Date().toISOString()
            });
            
            // Clear the pending change since we're applying it now
            await AsyncStorage.removeItem('pendingTempChange');
            
            setTimeout(() => setShowStatus(false), 3000);
          } else if (!isRecent) {
            // Clear old pending changes
            await AsyncStorage.removeItem('pendingTempChange');
          }
        }
      } catch (error) {
        console.error('Error checking pending temperature changes:', error);
      }
    };
    
    // Run on mount and when climate control mode changes
    checkPendingChanges();
  }, [isCoolToggled, isToekickToggled, isFurnaceToggled, isLoading]);

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
              {/* Add dismiss button for errors */}
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
          
          {/* Status message - Added from AirCon */}
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
              {/* Divider */}
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
  subTitle={'Degrees'}
  subTitleStyle={{
    color: isDarkMode ? 'white' : 'black',
    paddingBottom: 15,
    fontSize: 20, // Smaller subtitle
  }}
  unitStyle={{
    color: isDarkMode ? 'white' : 'black',
    paddingTop: 5,
  }}
  valueStyle={{
    color: isDarkMode ? 'white' : 'black',
    paddingTop: 5,
    fontSize: 48, // Smaller value number
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
  {/* Left column: Feature buttons with modern styling */}
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
        {/* High Speed Button */}
        <FanSpeedButton 
          speed="High" 
          onPress={() => handleFanSpeedPress("High")} 
          isLoading={isLoading}
          isActive={speed === "High"}
        />
        
        {/* Med Speed Button */}
        <FanSpeedButton 
          speed="Med" 
          onPress={() => handleFanSpeedPress("Med")} 
          isLoading={isLoading}
          isActive={speed === "Med"}
        />
        
        {/* Low Speed Button */}
        <FanSpeedButton 
          speed="Low" 
          onPress={() => handleFanSpeedPress("Low")} 
          isLoading={isLoading}
          isActive={speed === "Low"}
        />
        
        {/* Auto Speed Button */}
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
  return null; // Return null if not tablet
}

const getImageForLabel = (label) => {
  const images = {
    "Cool": require("../assets/snowflake.png"),
    "Toe Kick": require("../assets/toekick.png"),
    "Furnace": require("../assets/furnace.png"),
  };
  return images[label] || require("../assets/questionmark.png");
};

// Update the FanSpeedButton component to handle active state:
const FanSpeedButton = ({ speed, onPress, isLoading, isActive }) => {
  const getBackgroundColor = () => {
    return isActive 
      ? '#4CAF50'    // green when active
      : '#242124';   // same gray when inactive
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
  // Modern button styles matching MainScreen
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
  // Styles for the toggle buttons
  toggleButtonsContainer: {
    flexDirection: 'column',
    justifyContent: 'space-between',
    width: 80,
  },
  toggleButton: {
    padding: 8,
    backgroundColor: '#333',
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 2,
    width: 80,
  },
  activeToggleButton: {
    backgroundColor: '#FF8200',
  },
  toggleButtonText: {
    color: 'white',
    fontSize: 14,
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
  top: 20, // adjust Y-position
  left: 400, // adjust X-position
  zIndex: 1000,
  alignItems: 'center',
},

  // Added status container style from AirCon
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
  // New styles for weather error indicator
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
  // Retry button styles
  retryButton: {
    backgroundColor: "#FFB267",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 5,
    marginTop: 10,
    alignSelf: "center",
  },
  retryButtonText: {
    color: "white",
    fontWeight: "bold",
  },
  fanSpeedContainer: {
    width: 80,
    height: 195, // Height limit for the container
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
    // no backgroundColor here — it's set dynamically
  },
  autoSpeedButton: {
    marginTop: 5,
    marginBottom: 5,
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
    backgroundColor: '#FFBA00',   // gold for Day/Night
  },
  toggleActiveDehumid: {
    backgroundColor: '#00B9E8',   // cyan for Dehumidify
  },
  toggleInactive: {
    backgroundColor: '#333',      // dark gray when off
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

  toggleTextActive: {
    fontWeight: '600',
  },
  
});

export default ClimateControlScreenTablet;