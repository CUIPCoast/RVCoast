import React, { useState, useEffect } from "react";
import { StyleSheet, View, Text, TouchableOpacity, Switch, Keyboard, TouchableWithoutFeedback } from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Color,
  Border,
  FontFamily,
  FontSize,
  Gap,
  Padding,
  isDarkMode
} from "../GlobalStyles";
import { RadialSlider } from 'react-native-radial-slider';
import { useScreenSize, handleCoolingToggle, handleToeKickToggle, handleTemperatureChange, dismissKeyboard } from "../helper";

// Import RV State Management hooks
import { useRVClimate } from "../API/RVStateManager/RVStateHooks";
import rvStateManager from "../API/RVStateManager/RVStateManager";

// Import the API services
import { RVControlService, RVControls } from "../API/rvAPI";
import { ClimateService } from "../API/RVControlServices";

const AirCon = ({ onClose }) => {
  const isTablet = useScreenSize();
  
  // Use RV state management hook for climate data
  const { climate, setTemperature, toggleCooling, toggleHeating } = useRVClimate();
  
  // Local state for UI interactions and status
  const [temp, setTemp] = useState(72);
  const [lastTemp, setLastTemp] = useState(72);
  const [statusMessage, setStatusMessage] = useState('');
  const [showStatus, setShowStatus] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Initialize state from RV state manager
  useEffect(() => {
    const initializeState = async () => {
      try {
        // Get current climate state from RV state manager
        const currentClimateState = rvStateManager.getCategoryState('climate');
        
        // Set temperature from state or AsyncStorage
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
      } catch (error) {
        console.error('Error initializing AirCon state:', error);
        // Set default values on error
        setTemp(72);
        setLastTemp(72);
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
        
        // Update cooling and toe kick states if they changed externally
        if (newState.climate.coolingOn !== undefined && newState.climate.coolingOn !== climate.coolingOn) {
          setStatusMessage(`Cooling ${newState.climate.coolingOn ? 'turned on' : 'turned off'} remotely`);
          setShowStatus(true);
          setTimeout(() => setShowStatus(false), 3000);
        }
        
        if (newState.climate.toeKickOn !== undefined && newState.climate.toeKickOn !== climate.toeKickOn) {
          setStatusMessage(`Toe Kick ${newState.climate.toeKickOn ? 'turned on' : 'turned off'} remotely`);
          setShowStatus(true);
          setTimeout(() => setShowStatus(false), 3000);
        }
      }
    });
    
    return unsubscribe;
  }, [temp, climate.coolingOn, climate.toeKickOn]);

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

  // Handle temperature change with debounce and state management
  const handleTempChange = (newTemp) => {
    setTemp(newTemp);
    
    // Update RV state immediately for UI responsiveness
    rvStateManager.updateClimateState({ 
      temperature: newTemp,
      lastUpdated: new Date().toISOString()
    });
  };
  
  // Send temperature changes to API when temp changes
  useEffect(() => {
    const sendTempChange = async () => {
      try {
        await handleTemperatureChange(
          temp,
          lastTemp,
          climate.coolingOn || climate.toeKickOn,
          setIsProcessing,
          (message) => {
            setStatusMessage(message);
            setShowStatus(true);
            setTimeout(() => setShowStatus(false), message.includes('Failed') ? 3000 : 2000);
          }
        );
        setLastTemp(temp);
      } catch (error) {
        // Revert to last successful temperature
        setTemp(lastTemp);
      }
    };
    
    // Debounce the temperature change to avoid too many API calls
    const timeoutId = setTimeout(sendTempChange, 800);
    return () => clearTimeout(timeoutId);
  }, [temp, lastTemp, climate.coolingOn, climate.toeKickOn, isProcessing]);

  
  // Tablet view
  if (isTablet) {
    return (
      <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
        <View style={tabletStyles.container}>
          <RadialSlider
            value={temp}
            min={60}
            max={85}
            thumbColor={"#FFFFFF"}
            thumbBorderColor={"#848482"}
            sliderTrackColor={"#E5E5E5"}
            linearGradient={[ { offset: '0%', color:'#ffaca6' }, { offset: '100%', color: '#FF8200' }]}
            onChange={handleTempChange}
            subTitle={'Degrees'}
            subTitleStyle={{ color: isDarkMode ? 'white' : 'black', paddingBottom: 25, fontSize: 20 }}
            unitStyle={{ color: isDarkMode ? 'white' : 'black', paddingTop: 5, fontSize: 20 }}
            valueStyle={{ color: isDarkMode ? 'white' : 'black', paddingTop: 5, fontSize: 28 }}
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
            value={temp}
            min={60}
            max={85}
            thumbColor={"#FFFFFF"}
            thumbBorderColor={"#848482"}
            sliderTrackColor={"#E5E5E5"}
            linearGradient={[ { offset: '0%', color:'#ffaca6' }, { offset: '100%', color: '#FF8200' }]}
            onChange={handleTempChange}
            subTitle={'Degrees'}
            subTitleStyle={{ color: isDarkMode ? 'white' : 'black', paddingBottom: 25, fontSize: 10 }}
            unitStyle={{ color: isDarkMode ? 'white' : 'black', paddingTop: 5, fontSize: 10 }}
            valueStyle={{ color: isDarkMode ? 'white' : 'black', paddingTop: 5, fontSize: 14 }}
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
        {/* Cooling and Toe Kick Switch Buttons */}
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
            <Text style={styles.buttonText}>Cooling</Text>
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
            <Text style={styles.buttonText}>Toe Kick</Text>
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
    paddingHorizontal: 20,
    paddingVertical: 10,
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
    marginTop: 50,
    backgroundColor: isDarkMode ? Color.colorGray_200 : Color.colorWhitesmoke_100,
  },
  closeButton: {
    position: 'absolute',
    top: 3,
    right: 10,
    padding: 10,
    zIndex: 1,
    borderRadius: 20,
    opacity: 0.5,
    height: 50,
    alignItems: 'center',
  },
  closeText: {
    color: '#FFB267',
    fontSize: 20,
    marginTop: -4,
    fontWeight: "bold",
  },
  label: {
    color:  isDarkMode ? Color.white0 : Color.colorDarkslategray_200,
    fontSize: 20,
    fontWeight: 'bold',
    backgroundColor: isDarkMode ? Color.colorGray_200 : Color.colorWhitesmoke_100,
    margin: 10,
  },
  buttonsContainer: {
    flexDirection: 'row',
    marginTop: 20,
  },
  button: {
    paddingHorizontal: 20,
    paddingVertical: 10,
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
    bottom: 50,
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

export default AirCon;