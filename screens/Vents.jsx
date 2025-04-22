import React, { useState } from 'react';
import { StyleSheet, View, Text, Image } from "react-native";
import GroupComponent from "../components/GroupComponent";
import { Border, Color, Gap, FontSize, FontFamily , isDarkMode} from "../GlobalStyles";
import useScreenSize from "../helper/useScreenSize.jsx";
import { Col, Row, Grid } from "react-native-easy-grid";
import ToggleSwitch from "../components/ToggleSwitch.jsx";
import moment from 'moment'; 

const Vents = () => {
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
      //<LightControl />;
        
        
      return  <Grid className="bg-black">
           <Row size={10}>
                            <Row className="bg-black" size={9}>
                                <Col className="m-1 ml-3">
                                    <Text className="text-3xl text-white">{DayOfTheWeek}</Text>
                                    <Text className="text-lg text-white">{currentDate}</Text>
                                </Col>
                            </Row>
                            
                </Row>
  
                    
                
  
  
        </Grid>
        
        
    }
  
    return (
      <View></View>
    );
  };
  
  
  const styles = StyleSheet.create({
    settingsLayout: {
      width: "100%",
      overflow: "hidden",
    },
    statusbarLayout: {
      width: 390,
      left: 0,
    },
    tabBarFlexBox: {
      flexDirection: "row",
      position: "absolute",
    },
    statusbarPosition: {
      top: 0,
      position: "absolute",
    },
    iconPosition: {
      display: "none",
      position: "absolute",
    },
    homeIndicator: {
      marginLeft: -67,
      bottom: 8,
      left: "50%",
      borderRadius: Border.br_81xl,
      backgroundColor: Color.colorWhitesmoke_100,
      width: 134,
      height: 5,
      position: "absolute",
    },
    homeindicator: {
      top: 814,
      height: 30,
      position: "absolute",
    },
    homeIcon: {
      height: 24,
      width: 24,
      overflow: "hidden",
    },
    tabBar: {
      top: 782,
      left: 37,
      gap: Gap.gap_md,
    },
    settings1: {
      fontSize: FontSize.size_13xl,
      fontWeight: "500",
      fontFamily: FontFamily.manropeMedium,
      color: isDarkMode ? Color.colorWhitesmoke_100 : Color.colorGray_200,
      backgroundColor: isDarkMode ? Color.colorGray_200 : Color.colorWhitesmoke_100,
  
      textAlign: "left",
    },
    settingsWrapper: {
      top: 60,
      left: 20,
      alignItems: "center",
    },
    notchIcon: {
      top: -2,
      right: 86,
      bottom: 16,
      left: 85,
      maxWidth: "100%",
      maxHeight: "100%",
      overflow: "hidden",
    },
    batteryIcon: {
      right: 0,
      height: 11,
      width: 24,
    },
    wifiIcon: {
      width: 15,
      height: 11,
    },
    mobileSignalIcon: {
      width: 17,
      height: 11,
    },
    recordingIndicatorIcon: {
      top: -9,
      right: 56,
      width: 6,
      height: 6,
    },
    rightSide: {
      top: 17,
      right: 15,
      width: 67,
      height: 11,
      position: "absolute",
    },
    leftSideIcon: {
      top: 12,
      left: 21,
      width: 54,
      height: 21,
      position: "absolute",
    },
    iphoneXOrNewer: {
      height: "100%",
      top: "0%",
      right: "0%",
      bottom: "0%",
      left: "0%",
      position: "absolute",
      overflow: "hidden",
    },
    statusbar: {
      height: 44,
      width: 390,
      left: 0,
    },
    settings: {
      
      backgroundColor: isDarkMode ? Color.colorGray_200 : Color.colorWhitesmoke_100,
      flex: 1,
      height: 844,
      overflow: "hidden",
    },
  });
  
  



export default Vents;

