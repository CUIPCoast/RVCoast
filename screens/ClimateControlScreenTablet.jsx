import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, Image, TouchableOpacity, TouchableWithoutFeedback, Keyboard } from "react-native";

import { Border, Color, Gap, FontSize, FontFamily, isDarkMode } from "../GlobalStyles";
import useScreenSize from "../helper/useScreenSize.jsx";
import { Col, Row, Grid } from "react-native-easy-grid";

import { RadialSlider } from 'react-native-radial-slider';
import moment from 'moment';
import { ClimateService } from '../API/RVControlServices.js';
import { RVControlService } from "../API/rvAPI";
import AsyncStorage from '@react-native-async-storage/async-storage';

const ClimateControlScreenTablet = () => {
  const [activeButtons, setActiveButtons] = useState([]); // State for active buttons
  const [speed, setSpeed] = useState(0);
  const [isNightToggled, setIsNightToggled] = useState(false);
  const [isDehumidToggled, setIsDehumidToggled] = useState(false);
  const [isCoolToggled, setIsCoolToggled] = useState(false);
  const [isToekickToggled, setIsToekickToggled] = useState(false);
  const [isFurnaceToggled, setIsFurnaceToggled] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  
  // Status message for user feedback - added from AirCon
  const [statusMessage, setStatusMessage] = useState('');
  const [showStatus, setShowStatus] = useState(false);
  
  // Weather data state and error handling
  const [weatherData, setWeatherData] = useState(null);
  const [weatherError, setWeatherError] = useState(false);

  // Temperature state with loading from AsyncStorage
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

  // Load saved temperature from AsyncStorage
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
  
  // Save temperature changes to AsyncStorage
  useEffect(() => {
    if (temp !== null) {
      AsyncStorage.setItem('temperature', temp.toString());
    }
  }, [temp]);

  // Handle temperature change from RadialSlider
  const handleTempChange = (newTemp) => {
    setTemp(newTemp);
  };
  
  // Add a new useEffect for handling weather data
  useEffect(() => {
    const fetchWeatherData = async () => {
      try {
        // Reset weather error state
        setWeatherError(false);
        
        // Check if any network connectivity is available
        // This is just a simple check - you might need to use a more robust method like NetInfo
        const checkNetworkBeforeRequest = async () => {
          return new Promise((resolve) => {
            // Use a timeout to simulate network check
            setTimeout(() => resolve(true), 100);
          });
        };
        
        const isNetworkAvailable = await checkNetworkBeforeRequest();
        if (!isNetworkAvailable) {
          throw new Error('No network connection available');
        }
        
        // Add a timeout to the API call to avoid hanging if network is unstable
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Request timeout')), 10000);
        });
        
        // This should be replaced with your actual weather API call
        // For example: const weatherResponse = await ClimateService.getWeatherData();
        const weatherResponse = await Promise.race([
          // Your actual weather API call would go here
          // For now, using a placeholder promise that resolves successfully
          new Promise(resolve => setTimeout(() => resolve({ success: true, data: { temp: 75 } }), 500)),
          timeoutPromise
        ]);
        
        if (weatherResponse && weatherResponse.success) {
          setWeatherData(weatherResponse.data);
        } else {
          throw new Error('Failed to fetch weather data');
        }
      } catch (error) {
        console.error('Error fetching weather data:', error);
        setWeatherError(true);
        
        // Only show network error message if it's actually a network error
        if (error.message.includes('Network') || error.name === 'AxiosError') {
          setErrorMessage('Unable to connect to weather service. Using saved temperature settings.');
          
          // Show status message for network error
          setStatusMessage('Network error: Using offline mode');
          setShowStatus(true);
          setTimeout(() => setShowStatus(false), 3000);
        }
      }
    };
    
    // Call the function to fetch weather data
    fetchWeatherData();
    
    // Set up a timer to retry fetching every 5 minutes if there was an error
    let retryTimer;
    if (weatherError) {
      retryTimer = setTimeout(fetchWeatherData, 300000); // 5 minutes
    }
    
    return () => {
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [weatherError]);

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
        // Clear any error messages
        setErrorMessage(null);
      } catch (error) {
        console.error('Failed to change temperature:', error);
        // Revert to last successful temperature
        setTemp(lastTemp);
        
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

  // Night Setting Toggle - Using service
  const handleNightPress = async () => {
    setIsLoading(true);
    try {
      const result = await ClimateService.setNightMode();
      if (result.success) {
        setIsNightToggled(!isNightToggled);
        
        // Add status message - from AirCon
        setStatusMessage(`Night mode ${!isNightToggled ? 'enabled' : 'disabled'}`);
        setShowStatus(true);
        setTimeout(() => setShowStatus(false), 3000);
        
        setErrorMessage(null);
      } else {
        setErrorMessage(`Failed to set night mode: ${result.error}`);
        
        // Add status message - from AirCon
        setStatusMessage('Failed to toggle night mode');
        setShowStatus(true);
        setTimeout(() => setShowStatus(false), 3000);
      }
    } catch (error) {
      setErrorMessage(`Error: ${error.message}`);
      
      // Add status message - from AirCon
      setStatusMessage('Failed to toggle night mode');
      setShowStatus(true);
      setTimeout(() => setShowStatus(false), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  // Dehumid Setting Toggle - Using service
  const handleDehumidPress = async () => {
    setIsLoading(true);
    try {
      const result = await ClimateService.setDehumidifyMode();
      if (result.success) {
        setIsDehumidToggled(!isDehumidToggled);
        
        // Add status message - from AirCon
        setStatusMessage(`Dehumidify mode ${!isDehumidToggled ? 'enabled' : 'disabled'}`);
        setShowStatus(true);
        setTimeout(() => setShowStatus(false), 3000);
        
        setErrorMessage(null);
      } else {
        setErrorMessage(`Failed to set dehumidify mode: ${result.error}`);
        
        // Add status message - from AirCon
        setStatusMessage('Failed to toggle dehumidify mode');
        setShowStatus(true);
        setTimeout(() => setShowStatus(false), 3000);
      }
    } catch (error) {
      setErrorMessage(`Error: ${error.message}`);
      
      // Add status message - from AirCon
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
      
      // Execute corresponding service methods based on the button label
      switch (label) {
        case "Cool":
          result = await ClimateService.toggleCooling();
          if (result.success) {
            setIsCoolToggled(!isCoolToggled);
            
            // Update AsyncStorage to match AirCon implementation
            await AsyncStorage.setItem('coolingState', JSON.stringify(!isCoolToggled));
            
            // Add status message - from AirCon
            setStatusMessage(`Cooling ${!isCoolToggled ? 'turned on' : 'turned off'}`);
            setShowStatus(true);
            setTimeout(() => setShowStatus(false), 3000);
          }
          break;
          
        case "Toe Kick":
          result = await ClimateService.toggleToeKick();
          if (result.success) {
            setIsToekickToggled(!isToekickToggled);
            
            // Update AsyncStorage to match AirCon implementation
            await AsyncStorage.setItem('toeKickState', JSON.stringify(!isToekickToggled));
            
            // Add status message - from AirCon
            setStatusMessage(`Toe Kick ${!isToekickToggled ? 'turned on' : 'turned off'}`);
            setShowStatus(true);
            setTimeout(() => setShowStatus(false), 3000);
          }
          break;
          
        case "Furnace":
          result = await ClimateService.toggleFurnace();
          if (result.success) {
            setIsFurnaceToggled(!isFurnaceToggled);
            
            // Add status message - from AirCon
            setStatusMessage(`Furnace ${!isFurnaceToggled ? 'turned on' : 'turned off'}`);
            setShowStatus(true);
            setTimeout(() => setShowStatus(false), 3000);
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
        
        // Add status message - from AirCon
        setStatusMessage(`Failed to toggle ${label}`);
        setShowStatus(true);
        setTimeout(() => setShowStatus(false), 3000);
      }
    } catch (error) {
      setErrorMessage(`Unexpected error: ${error.message}`);
      
      // Add status message - from AirCon
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
    try {
      let result;
      
      switch (speed) {
        case "Low":
          result = await ClimateService.setLowFanSpeed();
          // Show a warning message for low speed since it's not implemented yet
          if (result.message) {
            console.warn(result.message);
          }
          break;
        case "Med":
          result = await ClimateService.setMediumFanSpeed();
          break;
        case "High":
          result = await ClimateService.setHighFanSpeed();
          break;
        default:
          setErrorMessage(`Unknown fan speed: ${speed}`);
          setIsLoading(false);
          return;
      }
      
      if (result && result.success) {
        setErrorMessage(null);
        
        // Add status message - from AirCon
        setStatusMessage(`Fan speed set to ${speed}`);
        setShowStatus(true);
        setTimeout(() => setShowStatus(false), 3000);
      } else if (result) {
        setErrorMessage(`Error setting fan speed: ${result.error}`);
        
        // Add status message - from AirCon
        setStatusMessage(`Failed to set fan speed to ${speed}`);
        setShowStatus(true);
        setTimeout(() => setShowStatus(false), 3000);
      }
    } catch (error) {
      setErrorMessage(`Unexpected error: ${error.message}`);
      
      // Add status message - from AirCon
      setStatusMessage(`Failed to set fan speed to ${speed}`);
      setShowStatus(true);
      setTimeout(() => setShowStatus(false), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  // Load saved states on component mount - taken from AirCon implementation
  useEffect(() => {
    const loadSavedStates = async () => {
      try {
        // Load cooling state
        const savedCoolingState = await AsyncStorage.getItem('coolingState');
        if (savedCoolingState !== null) {
          const coolingState = JSON.parse(savedCoolingState);
          setIsCoolToggled(coolingState);
          
          // Update active buttons if needed
          if (coolingState && !activeButtons.includes("Cool")) {
            setActiveButtons(prev => [...prev, "Cool"]);
          }
        }
        
        // Load toe kick state
        const savedToeKickState = await AsyncStorage.getItem('toeKickState');
        if (savedToeKickState !== null) {
          const toeKickState = JSON.parse(savedToeKickState);
          setIsToekickToggled(toeKickState);
          
          // Update active buttons if needed
          if (toeKickState && !activeButtons.includes("Toe Kick")) {
            setActiveButtons(prev => [...prev, "Toe Kick"]);
          }
        }
        
        // Load night mode and dehumidify states if they exist
        const savedNightMode = await AsyncStorage.getItem('nightMode');
        if (savedNightMode !== null) {
          setIsNightToggled(JSON.parse(savedNightMode));
        }
        
        const savedDehumidMode = await AsyncStorage.getItem('dehumidMode');
        if (savedDehumidMode !== null) {
          setIsDehumidToggled(JSON.parse(savedDehumidMode));
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

  // Function to check if network is available - can be called before API requests
  const isNetworkAvailable = async () => {
    // This is a simplified check - in a real app, you would use NetInfo or similar
    return new Promise((resolve) => {
      // Simple check - if we can get a response in reasonable time
      const fetchTimeout = setTimeout(() => resolve(false), 3000);
      
      fetch('https://www.google.com', { method: 'HEAD', mode: 'no-cors' })
        .then(() => {
          clearTimeout(fetchTimeout);
          resolve(true);
        })
        .catch(() => {
          clearTimeout(fetchTimeout);
          resolve(false);
        });
    });
  };

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
                    width: 70,
                    height: 45,
                    right: 0,
                    paddingTop: 10,
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
                height: 380,
                backgroundColor: "#1B1B1B",
                borderRadius: 10,
                justifyContent: "flex-start",
                padding: 20,
                margin: 50,
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
                  style={{ resizeMode: "contain", marginBottom: 20 }}
                />

                <View style={{ flexDirection: "row", alignItems: "flex-start", marginTop: 10 }}>
                  {/* Auxiliary Box */}
                  <Col
                    style={{
                      width: 380,
                      height: 270,
                      backgroundColor: "#1B1B1B",
                      borderRadius: 10,
                      justifyContent: "flex-start",
                      padding: 20,
                      margin: 25,
                      right: 80,
                      bottom: 10,
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
                    {/* Fixed: Stack the buttons vertically */}
                    <View style={{ flex: 1, justifyContent: "flex-start", alignItems: "flex-start" }}>
                      {features.map((feature, index) => (
                        <View
                          key={index}
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "space-between",
                            marginVertical: 10,
                            width: "100%",
                          }}
                        >
                          {/* Feature Button */}
                          <TouchableOpacity
                            onPress={() => handleButtonPress(feature.label)}
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              backgroundColor: activeButtons.includes(feature.label) ? "#444" : "#1B1B1B",
                              borderRadius: 5,
                              paddingVertical: 10,
                              paddingHorizontal: 15,
                              width: 220,
                            }}
                          >
                            <Image
                              source={getImageForLabel(feature.label)}
                              style={{ width: 30, height: 30, marginRight: 5 }}
                            />
                            <Text
                              style={{
                                color: "white",
                                fontSize: 16,
                              }}
                            >
                              {feature.label}
                            </Text>
                          </TouchableOpacity>

                          {/* Fan Speed Button for this row */}
                          <FanSpeedButton 
                            speed={feature.fanSpeed} 
                            onPress={() => handleFanSpeedPress(feature.fanSpeed)} 
                            isLoading={isLoading}
                          />

                        </View>
                      ))}
                    </View>
                  </Col>
                  {/* Night/Dehumid Buttons */}
                  <View
                  style={{
                    flex: 1,
                    justifyContent: "space-evenly",
                    alignItems: "center",
                    right: -10,
                    top: 100,
                  }}
                >
                  <TouchableOpacity
                    style={{
                      backgroundColor: isNightToggled ? "#301934" : "#FFBA00",
                      paddingVertical: 15,
                      paddingHorizontal: 20,
                      borderRadius: 5,
                      marginBottom: 10,
                      width: 150,
                      alignItems: "center",
                      flexDirection: "row",
                      justifyContent: "center",
                    }}
                    onPress={handleNightPress}
                    disabled={isLoading}
                  >
                    <Image
                      source={isNightToggled ? moonImage : sunImage}
                      style={{ width: 30, height: 30, marginRight: 10 }}
                    />
                    <Text style={{ color: "white", fontSize: 16 }}> {isNightToggled ? "Night" : "Daytime"}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{
                      backgroundColor: isDehumidToggled ? "#003262" : "#00B9E8",
                      paddingVertical: 15,
                      paddingHorizontal: 20,
                      borderRadius: 5,
                      width: 150,
                      alignItems: "center",
                      flexDirection: "row",
                      justifyContent: "center",
                    }}
                    onPress={handleDehumidPress}
                    disabled={isLoading}
                  >
                    <Image
                      source={require("../assets/drop.png")}
                      style={{ width: 30, height: 30, marginRight: 10 }}
                    />
                    <Text style={{ color: "white", fontSize: 16 }}>Dehumid</Text>
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

// Individual fan speed button component
const FanSpeedButton = ({ speed, onPress, isLoading }) => {
  // Set background color based on fan speed
  const getBackgroundColor = () => {
    switch (speed) {
      case "High":
        return "#100C08"; // Dark for High
      case "Med":
        return "#242124"; // Medium for Med
      case "Low":
        return "#848482"; // Light for Low
      default:
        return "#333";
    }
  };
  
  // FIX: Removed the extra view and wrapped everything in a single TouchableOpacity
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isLoading}
      style={{
        padding: 10,
        borderRadius: 5,
        alignItems: "center",
        justifyContent: "center",
        width: 80,
        backgroundColor: getBackgroundColor(),
      }}
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
  // Added status container style from AirCon
  statusContainer: {
    position: "absolute",
    bottom: 100,
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
  }
});

export default ClimateControlScreenTablet;