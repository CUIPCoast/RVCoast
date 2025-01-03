import React, { useState } from 'react';
import { StyleSheet, View, Text, Image } from "react-native";
import GroupComponent from "../components/GroupComponent";
import { Border, Color, Gap, FontSize, FontFamily , isDarkMode} from "../GlobalStyles";
import useScreenSize from "../helper/useScreenSize.jsx";
import { Col, Row, Grid } from "react-native-easy-grid";
import ToggleSwitch from "../components/ToggleSwitch.jsx";
import moment from 'moment'; 

const ClimateControl = () => {

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

                  
       


      </Grid>);
  }
}

export default ClimateControl;