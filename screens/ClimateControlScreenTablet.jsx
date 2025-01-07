import React, { useState } from 'react';
import { StyleSheet, View, Text, Image } from "react-native";

import { Border, Color, Gap, FontSize, FontFamily , isDarkMode} from "../GlobalStyles";
import useScreenSize from "../helper/useScreenSize.jsx";
import { Col, Row, Grid } from "react-native-easy-grid";
import ToggleSwitch from "../components/ToggleSwitch.jsx";
import { RadialSlider } from 'react-native-radial-slider';
import moment from 'moment'; 

const ClimateControl = () => {

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
  }}
>
  <Col
    style={{
      width: "30%", // Adjust the width to fit nicely
      height: 400,
      backgroundColor: "#1B1B1B",
      borderRadius: 10,
      justifyContent: "flex-start", // Align content to the top
      padding: 20,
      margin: 10, // Add margin between the columns
    }}
  >
    <Text
      style={{
        color: "white",
        fontSize: 16,
        position: "absolute", // Ensure it's in the top-left corner
        top: 10,
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
        marginTop: 40, // Add spacing below the text
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

<Image
          source={require("../assets/truma-logo-333-100.png")} // Replace with your image path
          className="h-30 w-30 mr-1"
          style={{ resizeMode: "contain" }}
        />


  
</View>



    
       


      </Grid>);
  }
}

const styles = StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      top: 15,
    },
  });
  

export default ClimateControl;