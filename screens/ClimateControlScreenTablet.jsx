import React, { useState } from 'react';
import { StyleSheet, View, Text, Image, TouchableOpacity } from "react-native";

import { Border, Color, Gap, FontSize, FontFamily, isDarkMode } from "../GlobalStyles";
import useScreenSize from "../helper/useScreenSize.jsx";
import { Col, Row, Grid } from "react-native-easy-grid";

import { RadialSlider } from 'react-native-radial-slider';
import moment from 'moment';
import { ClimateService } from '../API/RVControlServices.js';

const ClimateControlScreenTablet = () => {
  const [activeButtons, setActiveButtons] = useState([]); // State for active buttons
  const [speed, setSpeed] = useState(0);
  const [isOn, setIsOn] = useState(false);
  const [isNightToggled, setIsNightToggled] = useState(false);
  const [isDehumidToggled, setIsDehumidToggled] = useState(false);
  const [isCoolToggled, setIsCoolToggled] = useState(false);
  const [isToekickToggled, setIsToekickToggled] = useState(false);
  const [isFurnaceToggled, setIsFurnaceToggled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  
  var now = moment().format();
  var currentDate = moment().format("MMMM Do, YYYY");
  var DayOfTheWeek = moment().format("dddd");

  // Preload images
  const moonImage = require("../assets/moon.png");
  const sunImage = require("../assets/sun.png");
  const features = ["Cool", "Toe Kick", "Furnace"];

  const isTablet = useScreenSize(); // Check if the screen is large enough to be considered a tablet

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
                variant={"radial-circle-slider"}
                value={speed}
                unit={"º"}
                unitStyle={{
                  color: "#FFFFFF",
                  fontSize: 24,
                }}
                subTitle={"Degrees"}
                min={62}
                max={78}
                thumbColor={"#FFFFFF"}
                thumbBorderColor={"#848482"}
                sliderTrackColor={"#E5E5E5"}
                linearGradient={[
                  { offset: "0%", color: "#ffaca6" },
                  { offset: "100%", color: "#FF8200" },
                ]}
                onChange={setSpeed}
                subTitleStyle={{
                  color: "#FFFFFF",
                  fontSize: 24,
                  fontWeight: "bold",
                }}
                valueStyle={{
                  color: "#FFFFFF",
                  fontSize: 38,
                  fontWeight: "bold",
                }}
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
                    {features.map((label, index) => (
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
                          onPress={() => handleButtonPress(label)}
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            backgroundColor: activeButtons.includes(label) ? "#444" : "#1B1B1B",
                            borderRadius: 5,
                            paddingVertical: 10,
                            paddingHorizontal: 15,
                            width: 220,
                          }}
                        >
                          <Image
                            source={getImageForLabel(label)}
                            style={{ width: 30, height: 30, marginRight: 5 }}
                          />
                          <Text
                            style={{
                              color: "white",
                              fontSize: 16,
                            }}
                          >
                            {label}
                          </Text>
                        </TouchableOpacity>

                        {/* Fixed: Using the ToggleButtons component with only necessary buttons */}
                        {/*Fix this*/}
                        {/* <ToggleButtons/> */}
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

// Fixed ToggleButtons component - removed the two unnecessary buttons 
const ToggleButtons = () => {
  const [activeButton, setActiveButton] = React.useState(null);
  
  // Fixed: Only four buttons total, no extra buttons
  const buttons = ["High", "Med", "Low", "Auto"];
  
  const handleButtonPress = (buttonName) => {
    if (activeButton === buttonName) {
      // If already active, deactivate it
      setActiveButton(null);
    } else {
      // Otherwise, make this button active
      setActiveButton(buttonName);
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