import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, Image, TouchableOpacity } from "react-native";
import GroupComponent from "../components/GroupComponent";
import { Border, Color, Gap, FontSize, FontFamily, isDarkMode } from "../GlobalStyles";
import useScreenSize from "../helper/useScreenSize.jsx";
import { Col, Row, Grid } from "react-native-easy-grid";
import ToggleSwitch from "../components/ToggleSwitch.jsx";
import moment from 'moment';
import { FanService } from '../API/RVControlServices';

const Vents = () => {
    // State for tracking fan status
    const [bathroomFanOn, setBathroomFanOn] = useState(false);
    const [bayVentFanOn, setBayVentFanOn] = useState(false);
    
    // Current date and time
    var now = moment().format();
    var currentDate = moment().format("MMMM Do, YYYY");
    var DayOfTheWeek = moment().format("dddd");
  
    const isTablet = useScreenSize(); // Check if the screen is large enough to be considered a tablet
    
    // Fan toggle handlers
    const toggleBathroomFan = async () => {
        try {
            const result = await FanService.toggleBathroomFan();
            if (result.success) {
                setBathroomFanOn(!bathroomFanOn);
                console.log('Bathroom fan toggled successfully');
            } else {
                console.error('Failed to toggle bathroom fan');
            }
        } catch (error) {
            console.error('Error toggling bathroom fan:', error);
        }
    };
    
    const toggleBayVentFan = async () => {
        try {
            const result = await FanService.toggleBayVentFan();
            if (result.success) {
                setBayVentFanOn(!bayVentFanOn);
                console.log('Bay vent fan toggled successfully');
            } else {
                console.error('Failed to toggle bay vent fan');
            }
        } catch (error) {
            console.error('Error toggling bay vent fan:', error);
        }
    };
    
    var logo = <Image
      className="h-20 w-20 mx-12 mb-4"
      source={require("../assets/SettingGearTablet.png")}
    />;
    
    // If the screen is a tablet, render the tablet layout
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
          </Row>
          
          {/* Fan controls section */}
          <Row size={70} className="justify-center items-center">
            <Col className="items-center">
              <Text className="text-3xl text-white mb-8">Fan Controls</Text>
              
              <Row className="justify-center items-center mb-10" style={{ width: '60%',height: '20%', paddingHorizontal: 40 }}>
  <Col style={{ marginHorizontal: 10 }}>
    <TouchableOpacity 
      style={[styles.fanButton, bathroomFanOn && styles.fanButtonActive]} 
      onPress={toggleBathroomFan}
    >
      <Text style={styles.fanButtonText}>Bathroom Fan</Text>
      <Text style={styles.fanStatusText}>{bathroomFanOn ? 'ON' : 'OFF'}</Text>
    </TouchableOpacity>
  </Col>

  <Col style={{ marginHorizontal: 10 }}>
    <TouchableOpacity 
      style={[styles.fanButton, bayVentFanOn && styles.fanButtonActive]} 
      onPress={toggleBayVentFan}
    >
      <Text style={styles.fanButtonText}>Bay Vent Fan</Text>
      <Text style={styles.fanStatusText}>{bayVentFanOn ? 'ON' : 'OFF'}</Text>
    </TouchableOpacity>
  </Col>
</Row>

            </Col>
          </Row>
        </Grid>
      );
    }
  
    // For non-tablet devices
    return (
      <View style={styles.mobileContainer}>
        <Text style={styles.headerText}>Fan Controls</Text>
        
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={[styles.fanButton, bathroomFanOn && styles.fanButtonActive]} 
            onPress={toggleBathroomFan}
          >
            <Text style={styles.fanButtonText}>Bathroom Fan</Text>
            <Text style={styles.fanStatusText}>{bathroomFanOn ? 'ON' : 'OFF'}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.fanButton, bayVentFanOn && styles.fanButtonActive]} 
            onPress={toggleBayVentFan}
          >
            <Text style={styles.fanButtonText}>Bay Vent Fan</Text>
            <Text style={styles.fanStatusText}>{bayVentFanOn ? 'ON' : 'OFF'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
};
  
const styles = StyleSheet.create({
    mobileContainer: {
        flex: 1,
        backgroundColor: 'black',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
      },
      headerText: {
        fontSize: 24,
        color: 'white',
        marginBottom: 20,
      },
      buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
        paddingHorizontal: 20,
      },
      fanButton: {
        flex: 1,
        height: 20,  // Reduced height
        borderRadius: 12,
        backgroundColor: '#444',
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: 8,  // Smaller margin
        paddingVertical: 10,  // Reduced padding
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,  // Lighter shadow
        shadowRadius: 3,
        elevation: 3,  // Lower elevation
      },
      fanButtonActive: {
        backgroundColor: '#1E90FF',
      },
      fanButtonText: {
        color: 'white',
        fontSize: 16,  // Smaller font size
        fontWeight: '600',
        textAlign: 'center',
        marginBottom: 4,
      },
      fanStatusText: {
        color: 'white',
        fontSize: 12,  // Smaller status text
        fontWeight: '500',
      },
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