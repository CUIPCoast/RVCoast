import React, { useState } from 'react';
import { StyleSheet, View, Text, Image, TouchableOpacity } from "react-native";

import { Border, Color, Gap, FontSize, FontFamily, isDarkMode } from "../GlobalStyles";
import useScreenSize from "../helper/useScreenSize.jsx";
import { Col, Row, Grid } from "react-native-easy-grid";

import { RadialSlider } from 'react-native-radial-slider';
import moment from 'moment';
import { RVControlService } from '../API/rvAPI'; // Import the RV Control API service

const ClimateControlScreenTablet = () => {
  const [activeButtons, setActiveButtons] = useState([]); // State for active buttons
  const [speed, setSpeed] = useState(0);
  const [isOn, setIsOn] = useState(false);
  const [isNightToggled, setIsNightToggled] = useState(false);
  const [isDehumidToggled, setIsDehumidToggled] = useState(false);
  const [isCoolToggled, setIsCoolToggled] = useState(false);
  const [isToekickToggled, setIsToekickToggled] = useState(false);
  const [isFurnaceToggled, setIsFurnaceToggled] = useState(false);
  
  var now = moment().format();
  var currentDate = moment().format("MMMM Do, YYYY");
  var DayOfTheWeek = moment().format("dddd");

  // Preload images
  const moonImage = require("../assets/moon.png");
  const sunImage = require("../assets/sun.png");
  const features = ["Cool", "Toe Kick", "Furnace"];

  const isTablet = useScreenSize(); // Check if the screen is large enough to be considered a tablet

  // Function to send multiple CAN commands at once
  const sendCommands = async (commands) => {
    try {
      for (const command of commands) {
        await RVControlService.executeRawCommand(command);
      }
      console.log('Commands executed successfully');
    } catch (error) {
      console.error('Error executing commands:', error);
    }
  };

  // Night Setting Toggle
  const handleNightPress = async () => {
    setIsNightToggled(!isNightToggled);
    
    // Night setting commands from paste.txt
    const nightCommands = [
      '19FEF99F#01C1FFFFFFFFFFFF',
      '19FED99F#FF96AB0F0B00D1FF',
      '19FFE298#010100BA24BA2400'
    ];
    
    await sendCommands(nightCommands);
  };

  // Dehumid Setting Toggle
  const handleDehumidPress = async () => {
    setIsDehumidToggled(!isDehumidToggled);
    
    // Dehumid setting commands from paste.txt
    const dehumidCommands = [
      '19FEF99F#01C1FFFFFFFFFFFF',
      '19FED99F#FF96AB0F0A00D1FF',
      '19FFE298#010164A924A92400'
    ];
    
    await sendCommands(dehumidCommands);
  };

  // Handle feature button press (Cool, Toe Kick, Furnace)
  const handleButtonPress = async (label) => {
    // Check if the button is already active
    const isActive = activeButtons.includes(label);
    
    // Update active buttons state
    setActiveButtons((prev) =>
      isActive
        ? prev.filter((item) => item !== label) // Remove if already active
        : [...prev, label] // Add if not active
    );

    // Execute corresponding commands based on the button label
    switch (label) {
      case "Cool":
        setIsCoolToggled(!isCoolToggled);
        // Cool setting commands from paste.txt
        const coolCommands = [
          '19FEF99F#01C1FFFFFFFFFFFF',
          '19FED99F#FF96AB0F0100D1FF'
        ];
        await sendCommands(coolCommands);
        break;
        
      case "Toe Kick":
        setIsToekickToggled(!isToekickToggled);
        // Toe Kick commands from paste.txt
        const toeKickCommands = [
          '19FEF99F#01C2FFFFFFFFFFFF',
          '19FED99F#FF96AA0F0000D1FF',
          '19FFE298#100264A924A92400'
        ];
        await sendCommands(toeKickCommands);
        break;
        
      case "Furnace":
        setIsFurnaceToggled(!isFurnaceToggled);
        // Furnace commands from paste.txt
        const furnaceCommands = [
          '19FEF99F#01C0FFFFFFFFFFFF',
          '19FED99F#FF96AA0F0000D1FF',
          '19FFE298#0502008E24C42400'
        ];
        await sendCommands(furnaceCommands);
        break;
        
      default:
        console.log("Unknown feature:", label);
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

                        {/* Toggle Button */}
                        <ToggleButton />
                      </View>
                    ))}
                  </View>
                </Col>
                {/* Buttons next to Auxiliary Box */}
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

// Helper component for toggle button functionality
const ToggleButton = () => {
  const [state, setState] = React.useState("Low");

  const toggleState = () => {
    const nextState = {
      Low: "Med",
      Med: "High",
      High: "Low",
    };
    setState(nextState[state]);
  };

  return (
    <TouchableOpacity
      onPress={toggleState}
      style={[styles.button, styles[state.toLowerCase()]]}
      activeOpacity={0.7}
    >
      <Text style={styles.buttonText}>{state}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  button: {
    padding: 10,
    backgroundColor: "#333",
    borderRadius: 5,
    alignItems: "center",
    justifyContent: "center",
    width: 80,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
  },
  low: {
    backgroundColor: "#848482",
  },
  med: {
    backgroundColor: "#242124",
  },
  high: {
    backgroundColor: "#100C08",
  },
});

export default ClimateControlScreenTablet;