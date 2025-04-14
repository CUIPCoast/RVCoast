import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, Image, TouchableOpacity } from "react-native";

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
  
  // Handle temperature API changes with debounce
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
          
          // Show success message
          setErrorMessage(null);
        } else {
          // Send temperature decrease command based on the difference
          const steps = lastTemp - temp;
          for (let i = 0; i < steps; i++) {
            await RVControlService.executeCommand('temp_decrease');
            // Short delay to avoid overwhelming the CAN bus
            await new Promise(resolve => setTimeout(resolve, 100));
          }
          console.log(`Temperature decreased to ${temp}°F`);
          
          // Show success message
          setErrorMessage(null);
        }
        
        setLastTemp(temp);
      } catch (error) {
        console.error('Failed to change temperature:', error);
        // Revert to last successful temperature
        setTemp(lastTemp);
        
        // Show error message
        setErrorMessage(`Failed to change temperature: ${error.message}`);
      } finally {
        setIsLoading(false);
      }
    };
    
    // Debounce the temperature change to avoid too many API calls
    const timeoutId = setTimeout(sendTempChange, 800);
    return () => clearTimeout(timeoutId);
  }, [temp, lastTemp, isCoolToggled, isToekickToggled, isFurnaceToggled]);

  // Night Setting Toggle - Using service
  const handleNightPress = async () => {
    setIsLoading(true);
    try {
      const result = await ClimateService.setNightMode();
      if (result.success) {
        setIsNightToggled(!isNightToggled);
        setErrorMessage(null);
      } else {
        setErrorMessage(`Failed to set night mode: ${result.error}`);
      }
    } catch (error) {
      setErrorMessage(`Error: ${error.message}`);
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
        setErrorMessage(null);
      } else {
        setErrorMessage(`Failed to set dehumidify mode: ${result.error}`);
      }
    } catch (error) {
      setErrorMessage(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle feature button press (Cool, Toe Kick, Furnace) - Using service
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
          }
          break;
          
        case "Toe Kick":
          result = await ClimateService.toggleToeKick();
          if (result.success) {
            setIsToekickToggled(!isToekickToggled);
          }
          break;
          
        case "Furnace":
          result = await ClimateService.toggleFurnace();
          if (result.success) {
            setIsFurnaceToggled(!isFurnaceToggled);
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
      }
    } catch (error) {
      setErrorMessage(`Unexpected error: ${error.message}`);
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
      } else if (result) {
        setErrorMessage(`Error setting fan speed: ${result.error}`);
      }
    } catch (error) {
      setErrorMessage(`Unexpected error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // If the screen is a tablet, render the climate control interface
  if (isTablet) {
    return (
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

        {/* Error message display */}
        {errorMessage && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        )}

        {/* Loading indicator */}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Processing command...</Text>
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
  
  return (

    <View style={styles.toggleButtonsContainer}>
      {buttons.map((buttonName) => (
        <TouchableOpacity
          key={buttonName}
          onPress={() => handleButtonPress(buttonName)}
          style={[
            styles.toggleButton,
            activeButton === buttonName ? styles.activeToggleButton : null
          ]}
          activeOpacity={0.7}
        >
          <Text style={styles.toggleButtonText}>{buttonName}</Text>
        </TouchableOpacity>
      ))}
    </View>

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

  buttonText: {
    color: "white",
    fontSize: 16,

  },
  errorContainer: {
    backgroundColor: "rgba(255, 0, 0, 0.1)",
    padding: 10,
    margin: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "red",
  },
  errorText: {
    color: "white",
    textAlign: "center",
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
  }
});

export default ClimateControlScreenTablet;