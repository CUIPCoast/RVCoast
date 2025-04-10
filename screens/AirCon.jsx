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
// Import the API services
import { RVControlService, RVControls } from "../API/rvAPI";
import { ClimateService } from "../API/RVControlServices";

const AirCon = ({ onClose }) => {
  const isTablet = useScreenSize();
  
  // State for cooling and heating (toe kick) - both can be on at the same time now
  const [coolingOn, setCoolingOn] = useState(false);
  const [toeKickOn, setToeKickOn] = useState(false);
  
  // Temperature state
  const [temp, setTemp] = useState(72);
  const [lastTemp, setLastTemp] = useState(72);
  
  // Status message for user feedback
  const [statusMessage, setStatusMessage] = useState('');
  const [showStatus, setShowStatus] = useState(false);
  
  // Load saved temperature
  useEffect(() => {
    const getTemp = async () => {
      const savedTemp = await AsyncStorage.getItem('temperature');
      if (savedTemp) {
        setTemp(parseInt(savedTemp, 10));
        setLastTemp(parseInt(savedTemp, 10));
      } else {
        setTemp(72);
        setLastTemp(72);
      }
    };
    getTemp();
  }, []);
  
  // Save temperature changes
  useEffect(() => {
    if (temp !== null) {
      AsyncStorage.setItem('temperature', temp.toString());
    }
  }, [temp]);
  
  // Load cooling state
  useEffect(() => {
    const loadCoolingState = async () => {
      const savedCoolingState = await AsyncStorage.getItem('coolingState');
      setCoolingOn(savedCoolingState ? JSON.parse(savedCoolingState) : false);
    };
    loadCoolingState();
  }, []);
  
  // Load toe kick state
  useEffect(() => {
    const loadToeKickState = async () => {
      const savedToeKickState = await AsyncStorage.getItem('toeKickState');
      setToeKickOn(savedToeKickState ? JSON.parse(savedToeKickState) : false);
    };
    loadToeKickState();
  }, []);
  
  // Handle cooling toggle
  const handleCoolingToggle = async () => {
    const newCoolingState = !coolingOn;
    setCoolingOn(newCoolingState);
    await AsyncStorage.setItem('coolingState', JSON.stringify(newCoolingState));
    
    try {
      await ClimateService.toggleCooling();
      console.log(`Cooling ${newCoolingState ? 'turned on' : 'turned off'}`);
      
      // Show status message
      setStatusMessage(`Cooling ${newCoolingState ? 'turned on' : 'turned off'}`);
      setShowStatus(true);
      setTimeout(() => setShowStatus(false), 3000);
    } catch (error) {
      console.error('Error toggling cooling:', error);
      // Revert the UI state if the API call fails
      setCoolingOn(!newCoolingState);
      await AsyncStorage.setItem('coolingState', JSON.stringify(!newCoolingState));
      
      // Show error message
      setStatusMessage('Failed to toggle cooling');
      setShowStatus(true);
      setTimeout(() => setShowStatus(false), 3000);
    }
  };
  
  // Handle toe kick toggle
  const handleToeKickToggle = async () => {
    const newToeKickState = !toeKickOn;
    setToeKickOn(newToeKickState);
    await AsyncStorage.setItem('toeKickState', JSON.stringify(newToeKickState));
    
    try {
      await ClimateService.toggleToeKick();
      console.log(`Toe Kick ${newToeKickState ? 'turned on' : 'turned off'}`);
      
      // Show status message
      setStatusMessage(`Toe Kick ${newToeKickState ? 'turned on' : 'turned off'}`);
      setShowStatus(true);
      setTimeout(() => setShowStatus(false), 3000);
    } catch (error) {
      console.error('Error toggling toe kick:', error);
      // Revert the UI state if the API call fails
      setToeKickOn(!newToeKickState);
      await AsyncStorage.setItem('toeKickState', JSON.stringify(!newToeKickState));
      
      // Show error message
      setStatusMessage('Failed to toggle toe kick');
      setShowStatus(true);
      setTimeout(() => setShowStatus(false), 3000);
    }
  };

  // Handle temperature change with debounce
  const handleTempChange = (newTemp) => {
    setTemp(newTemp);
  };
  
  // Send temperature changes to API when temp changes
  useEffect(() => {
    const sendTempChange = async () => {
      if (temp === lastTemp || (!coolingOn && !toeKickOn)) return;
      
      try {
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
      } catch (error) {
        console.error('Failed to change temperature:', error);
        // Revert to last successful temperature
        setTemp(lastTemp);
        
        // Show error message
        setStatusMessage('Failed to change temperature');
        setShowStatus(true);
        setTimeout(() => setShowStatus(false), 3000);
      }
    };
    
    // Debounce the temperature change to avoid too many API calls
    const timeoutId = setTimeout(sendTempChange, 800);
    return () => clearTimeout(timeoutId);
  }, [temp, lastTemp, coolingOn, toeKickOn]);

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
              style={[tabletStyles.button, coolingOn ? tabletStyles.activeButton : null]}
              onPress={handleCoolingToggle}
            >
              <Text style={tabletStyles.buttonText}>Cooling</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[tabletStyles.button, toeKickOn ? tabletStyles.activeButton : null]}
              onPress={handleToeKickToggle}
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
            style={[styles.button, coolingOn ? styles.activeButton : null]}
            onPress={handleCoolingToggle}
          >
            <Text style={styles.buttonText}>Cooling</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, toeKickOn ? styles.activeButton : null]}
            onPress={handleToeKickToggle}
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
});

export default AirCon;