import React, { useState } from 'react';
import { StyleSheet, View, Text, Image, TouchableOpacity } from "react-native";

import { Border, Color, Gap, FontSize, FontFamily , isDarkMode} from "../GlobalStyles";
import useScreenSize from "../helper/useScreenSize.jsx";
import { Col, Row, Grid } from "react-native-easy-grid";
import ToggleSwitch from "../components/ToggleSwitch.jsx";
import { RadialSlider } from 'react-native-radial-slider';
import moment from 'moment'; 




const ClimateControl = () => {

  const [activeButtons, setActiveButtons] = useState([]); // State for active buttons

  const handleButtonPress = (label) => {
    setActiveButtons((prev) =>
      prev.includes(label)
        ? prev.filter((item) => item !== label) // Remove if already active
        : [...prev, label] // Add if not active
    );
  };

  const features = ["Cool", "Toe Kick", "Furnace"];

  const [speed, setSpeed] = useState(0);
  const [isOn, setIsOn] = useState(false);
  var now = moment().format();
  var currentDate = moment().format("MMMM Do, YYYY");
  var DayOfTheWeek = moment().format("dddd");

  const isTablet = useScreenSize(); // Check if the screen is large enough to be considered a tablet
  var logo = <Image
    className="h-20 w-20 mx-12 mb-4"
    source={require("../assets/SettingGearTablet.png")}
    />;

    
    const [activeButton, setActiveButton] = useState(null);
    const [isNightToggled, setIsNightToggled] = useState(false);
    const [isDehumidToggled, setIsDehumidToggled] = useState(false);

    const handleNightPress = () => {
      setIsNightToggled(!isNightToggled); // Toggle Night button state
    };
  
    const handleDehumidPress = () => {
      setIsDehumidToggled(!isDehumidToggled); // Toggle Dehumid button state
    };
  // If the screen is a tablet, render nothing (null) to hide the tab navigator
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
                          <Row
                              className="bg-black"
                              size={1}
                          >
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
    flexDirection: "row", // Align children side by side
    justifyContent: "center", // Center the boxes in the row
    alignItems: "center", // Align items vertically (optional)
    marginHorizontal: 20, // Adjust as needed for screen padding
    flexWrap: "wrap", // Allow wrapping if needed for smaller screens
    right:40,
    
  }}
>
  <Col
    style={{
      width: "30%", // Adjust the width to fit nicely
      height: 380,
      backgroundColor: "#1B1B1B",
      borderRadius: 10,
      justifyContent: "flex-start", // Align content to the top
      padding: 20,
      margin: 50, // Add margin between the columns
      

      
    }}
  >
    <Text
      style={{
        color: "white",
        fontSize: 16,
        position: "absolute", // Ensure it's in the top-left corner
        top: 20,
        left: 10,
      }}
    >
      Main (Front)
    </Text>
    {/* Divider */}
    <View
      style={{
        height: 1, // Divider height
        backgroundColor: "white", // Divider color
        width: "100%", // Full width of the container
        marginTop: 50, // Add spacing below the text
      }}
    />
    <View style={styles.container}>
      <RadialSlider
        variant={"radial-circle-slider"}
        value={speed}
        unit={"º"}
        unitStyle={{
          color: "#FFFFFF", // Set your desired color here
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
          color: "#FFFFFF", // Set your desired color here
          fontSize: 24, // Optional: Adjust font size
          fontWeight: "bold", // Optional: Adjust font weight
        }}
        valueStyle={{
          color: "#FFFFFF", // Set your desired color here
          fontSize: 38, // Optional: Adjust font size
          fontWeight: "bold", // Optional: Adjust font weight
        }}
      />
    </View>
  </Col>
  <View
  style={{
    flexDirection: "row", // Align Main (Front) and Truma logo + Auxiliary side by side
    justifyContent: "center", // Center the boxes in the row
    alignItems: "flex-start", // Align items at the top
    marginHorizontal: 20, // Adjust as needed for screen padding
    flexWrap: "wrap", // Allow wrapping if needed for smaller screens
  }}
>
  

  {/* Truma Logo and Auxiliary Box */}
  <View style={{ width: "50%", height: "100px", alignItems: "center" }}>
    <Image
      source={require("../assets/truma-logo-333-100.png")} // Replace with your image path
      className="h-30 w-30 left-3"
      style={{ resizeMode: "contain", marginBottom: 20 }}
    />

    <View style={{ flexDirection: "row", alignItems: "flex-start", marginTop: 10 }}>
     {/* Auxiliary Box */}
<Col
  style={{
    width: 380, // Adjust width to allow space for buttons
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
            width: "100%", // Adjust the width as needed
          }}
        >
          {/* Feature Button */}
          <TouchableOpacity
            onPress={() => handleButtonPress(label)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: activeButtons.includes(label) ? "#444" : "#1B1B1B",
              borderRadius: 5, // Reduced border radius for a compact look
              paddingVertical: 10, // Smaller padding for vertical space
              paddingHorizontal: 15, // Smaller padding for horizontal space
              width: 220,
            }}
          >
            <Image
              source={getImageForLabel(label)}
              style={{ width: 30, height: 30, marginRight: 5 }} // Smaller image with reduced margin
            />
            <Text
              style={{
                color: activeButtons.includes(label) ? "#FFB267" : "white", // Highlight active button text
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
          backgroundColor: isNightToggled ? "#301934" : "#9966CC", // Toggle between two colors
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
          source={require("../assets/moon.png")}
          style={{ width: 30, height: 30, marginRight: 10 }}
        />
        <Text style={{ color: "white", fontSize: 16 }}>Night</Text>
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



    
       


      </Grid>);
  }
}

const getImageForLabel = (label) => {
  const images = {
    "Cool": require("../assets/snowflake.png"), // Example for Cool
    "Toe Kick": require("../assets/toekick.png"), // Example for Toe Kick
    "Furnace": require("../assets/furnace.png"), // Example for Furnace
  };
  return images[label] || require("../assets/questionmark.png"); // Fallback to a default image
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
    <Text
      onPress={toggleState}
      style={{
        color: "white",
        fontSize: 16,
        padding: 10,
        backgroundColor: "#333",
        borderRadius: 5,
        textAlign: "center",
        width: 80,
      }}
    >
      {state}
    </Text>
  );
};

const styles = StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      top: 15,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginVertical: 10,
      width: "100%",
    },
    image: {
      width: 30,
      height: 30,
      marginRight: 10,
    },
    buttonText: {
      color: "white",
      fontSize: 16,
      marginRight: 120,
    },
    activeButtonText: {
      color: "#FFB267", // Highlight color for active button
    },
  });
  

export default ClimateControl;