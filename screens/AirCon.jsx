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
import useScreenSize from "../helper/useScreenSize.jsx";

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
      }
    });
    
    return unsubscribe;
  }, [temp]);

  // Handle cooling toggle with state management
  const handleCoolingToggle = async () => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    const newCoolingState = !climate.coolingOn;
    
    try {
      // Update RV state first for immediate UI feedback
      rvStateManager.updateClimateState({ 
        coolingOn: newCoolingState,
        lastUpdated: new Date().toISOString()
      });
      
      // Execute API command
      if (newCoolingState) {
        await ClimateService.toggleCooling(); // Turn cooling on
      } else {
        await ClimateService.turnOffCooling(); // Turn cooling off
      }
      
      console.log(`Cooling ${newCoolingState ? 'turned on' : 'turned off'}`);
      
      // Update AsyncStorage for backwards compatibility
      await AsyncStorage.setItem('coolingState', JSON.stringify(newCoolingState));
      
      // Show success status
      setStatusMessage(`Cooling ${newCoolingState ? 'turned on' : 'turned off'}`);
      setShowStatus(true);
      setTimeout(() => setShowStatus(false), 3000);
      
    } catch (error) {
      console.error('Error toggling cooling:', error);
      
      // Revert state on error
      rvStateManager.updateClimateState({ 
        coolingOn: !newCoolingState,
        lastUpdated: new Date().toISOString()
      });
      
      // Show error message
      setStatusMessage('Failed to toggle cooling');
      setShowStatus(true);
      setTimeout(() => setShowStatus(false), 3000);
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Handle toe kick toggle with state management
  const handleToeKickToggle = async () => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    const newToeKickState = !climate.toeKickOn;
    
    try {
      // Update RV state first for immediate UI feedback
      rvStateManager.updateClimateState({ 
        toeKickOn: newToeKickState,
        lastUpdated: new Date().toISOString()
      });
      
      // Execute API command
      if (newToeKickState) {
        await ClimateService.toggleToeKick(); // Turn toe kick on
      } else {
        await ClimateService.turnOffToeKick(); // Turn toe kick off
      }
      
      console.log(`Toe Kick ${newToeKickState ? 'turned on' : 'turned off'}`);
      
      // Update AsyncStorage for backwards compatibility
      await AsyncStorage.setItem('toeKickState', JSON.stringify(newToeKickState));
      
      // Show success status
      setStatusMessage(`Toe Kick ${newToeKickState ? 'turned on' : 'turned off'}`);
      setShowStatus(true);
      setTimeout(() => setShowStatus(false), 3000);
      
    } catch (error) {
      console.error('Error toggling toe kick:', error);
      
      // Revert state on error
      rvStateManager.updateClimateState({ 
        toeKickOn: !newToeKickState,
        lastUpdated: new Date().toISOString()
      });
      
      // Show error message
      setStatusMessage('Failed to toggle toe kick');
      setShowStatus(true);
      setTimeout(() => setShowStatus(false), 3000);
    } finally {
      setIsProcessing(false);
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
      if (temp === lastTemp || (!climate.coolingOn && !climate.toeKickOn)) return;
      if (isProcessing) return;
      
      setIsProcessing(true);
      
      try {
        // Determine if we need to increase or decrease temperature
        if (temp > lastTemp) {
          // Send temperature increase command based on the difference
          const steps = temp - lastTemp;
          for (let i = 0; i < steps; i++) {
            await ClimateService.increaseTemperature();
            // Short delay to avoid overwhelming the CAN bus
            await new Promise(resolve => setTimeout(resolve, 100));
          }
          console.log(`Temperature increased to ${temp}°F`);
        } else {
          // Send temperature decrease command based on the difference
          const steps = lastTemp - temp;
          for (let i = 0; i < steps; i++) {
            await ClimateService.decreaseTemperature();
            // Short delay to avoid overwhelming the CAN bus
            await new Promise(resolve => setTimeout(resolve, 100));
          }
          console.log(`Temperature decreased to ${temp}°F`);
        }
        
        setLastTemp(temp);
        
        // Update AsyncStorage for backwards compatibility
        await AsyncStorage.setItem('temperature', temp.toString());
        
        // Update RV state with confirmed temperature
        rvStateManager.updateClimateState({ 
          temperature: temp,
          lastUpdated: new Date().toISOString()
        });
        
        // Show success status
        setStatusMessage(`Temperature set to ${temp}°F`);
        setShowStatus(true);
        setTimeout(() => setShowStatus(false), 2000);
        
      } catch (error) {
        console.error('Failed to change temperature:', error);
        
        // Revert to last successful temperature
        setTemp(lastTemp);
        rvStateManager.updateClimateState({ 
          temperature: lastTemp,
          lastUpdated: new Date().toISOString()
        });
        
        // Show error message
        setStatusMessage('Failed to change temperature');
        setShowStatus(true);
        setTimeout(() => setShowStatus(false), 3000);
      } finally {
        setIsProcessing(false);
      }
    };
    
    // Debounce the temperature change to avoid too many API calls
    const timeoutId = setTimeout(sendTempChange, 800);
    return () => clearTimeout(timeoutId);
  }, [temp, lastTemp, climate.coolingOn, climate.toeKickOn, isProcessing]);

  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };
  
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
            subTitleStyle={{ color: isDarkMode ? 'white' : 'black', paddingBottom: 25 }}
            unitStyle={{ color: isDarkMode ? 'white' : 'black', paddingTop: 5 }}
            valueStyle={{ color: isDarkMode ? 'white' : 'black', paddingTop: 5}}
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
              onPress={handleCoolingToggle}
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
              onPress={handleToeKickToggle}
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
          onChange={handleTempChange}
          subTitle={'Degrees'}
          subTitleStyle={{ color: isDarkMode ? 'white' : 'black'}}
          unitStyle={{ color: isDarkMode ? 'white' : 'black' }}
          valueStyle={{ color: isDarkMode ? 'white' : 'black' }}
          style={{ backgroundColor: isDarkMode ? Color.colorGray_200 : Color.colorWhitesmoke_100,
            opacity: 0.85}}
          leftIconStyle={{ backgroundColor: 'white', borderRadius: 10, marginRight: 10, height: 40, width: 50, paddingLeft: 4 }}
          rightIconStyle={{ backgroundColor: 'white', borderRadius: 10, marginLeft: 10, height: 40, width: 50, paddingLeft: 5 }}
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
            onPress={handleCoolingToggle}
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
            onPress={handleToeKickToggle}
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
    marginTop: 50,
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
    fontSize: 16,
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
    fontSize: 16,
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