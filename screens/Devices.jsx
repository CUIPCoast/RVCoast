import React, { useState } from "react";
import { StyleSheet, View, Text, Pressable, TouchableOpacity, Image, ScrollView, Modal, Button } from "react-native";
import MainLight from "../components/MainLight";
import EnhancedMainLight from "../components/EnhancedMainLight.jsx";
import LatchLight from "../components/LatchLight";
import useScreenSize from "../helper/useScreenSize.jsx";
import AwningControlModal from "../components/AwningControlModal";
import HeaterControlModal from "../components/HeaterControlModal";

import ToggleSwitch from "../components/ToggleSwitch.jsx";

import {
  Padding,
  Border,
  Color,
  FontFamily,
  FontSize,
} from "../GlobalStyles";


const TABS = {
  MAIN: "Main",
  BEDROOM: "Bedroom",
  BATHROOM: "Bathroom",
};

const Devices = () => {
  const [isOn, setIsOn] = useState(false);
  const isTablet = useScreenSize();
  const [selectedTab, setSelectedTab] = useState(TABS.MAIN);
  const [isModalVisible, setModalVisible] = useState(false);
  const [isHeaterModalVisible, setHeaterModalVisible] = useState(false);
  const [isScheduleModalVisible, setScheduleModalVisible] = useState(false); // New state for Schedule Lights modal
  

  const [isFanOn, setFanOn] = useState(false); // New state for fan on/off status
  const [IsWaterHeater, setWaterHeaterOn] = useState(false); 
  const [IsWaterPump, setWaterPumpOn] = useState(false); 


  const toggleFan = () => {
    setFanOn((prevStatus) => !prevStatus);
  };
  const toggleWaterHeater = () => {
    setWaterHeaterOn((prevStatus) => !prevStatus);
  };
  const toggleWaterPump = () => {
    setWaterPumpOn((prevStatus) => !prevStatus);
  };

  const [sliderValues, setSliderValues] = useState({
    BedOverHead: 50,
    LeftReadingLight: 30,
    RightReadingLight: 70,
    OverHeadBathLight: 45,
    OverHeadVanityLight: 30,
    AccentLight: 60,
    PorchLight:30,
    HitchLight: 50,
    ShowerLight: 70,
    BathOverHead:40,
    // Add more sliders here as needed
  });

  // Handler for changing slider values
  const handleSliderChange = (sliderName, value) => {
    setSliderValues((prevValues) => ({
      ...prevValues,
      [sliderName]: value,
    }));
  };
  const renderTabContent = () => {

    if (selectedTab === TABS.MAIN) {
      return (
        <>
          <View className="flex-row items-center justify-between mx-16 h-28">
            <View className="items-center bg-brown-300 ">
              <Pressable onPress={() => setModalVisible(true)}>
                <Image
                  source={require("../assets/abpost61724photoroom-3.png")}
                  className="h-20 w-24 mb-1"
                />
              </Pressable>
              <Text className="text-white text-base">
                Awning Controls
              </Text>
            </View>
          
            <View className="items-center">
              <Pressable onPress={() => setHeaterModalVisible(true)}>
                <Image
                  source={require("../assets/image-21.png")}
                  contentFit="cover"
                />
              </Pressable>
              <Text className="text-white text-base">
                Toe Kick Heater
              </Text>

            </View>
          </View>
          
          
          {/* Container for Porch Light slider positioned below the images */}
          <View style={styles.screenContainer}>
          <LatchLight name="Master Light" />

          <View style={{ height: 3, backgroundColor: '#696969', marginVertical: 16, marginHorizontal: 17 }} />
  
</View>
          <View>
            <MainLight
              name="Kitchen Light"
              min={0}
              max={100}
              value={sliderValues.LeftReadingLight}
              onValueChange={(value) => handleSliderChange('KitchenLight', value)}
            />
            <MainLight
              name="Dining Light"
              min={0}
              max={100}
              value={sliderValues.LeftReadingLight}
              onValueChange={(value) => handleSliderChange('DiningLight', value)}
            />
            <MainLight
              name="Cabinet Light"
              min={0}
              max={100}
              value={sliderValues.CabinetLight}
              onValueChange={(value) => handleSliderChange('CabinetLight', value)}
            />
            <MainLight
              name="Wardrobe Light"
              min={0}
              max={100}
              value={sliderValues.WardrobeLight}
              onValueChange={(value) => handleSliderChange('WardrobeLight', value)}
            />
          </View>
        </>
      );
    } else if (selectedTab === TABS.BEDROOM) {
      return (

        <><View>





        </View>
        <ScrollView>
            <View>

              <MainLight
                name="Bed Light"
                min={0}
                max={100}
                value={sliderValues.BedOverHead}
                onValueChange={(value) => handleSliderChange('BedOverHead', value)} />
              <MainLight
                name="Left Reading Light"
                min={0}
                max={100}
                value={sliderValues.LeftReadingLight}
                onValueChange={(value) => handleSliderChange('LeftReadingLight', value)} />
              <MainLight
                name="Right Reading Light"
                min={0}
                max={100}
                value={sliderValues.RightReadingLight}
                onValueChange={(value) => handleSliderChange('RightReadingLight', value)} />
              <MainLight
                name="Bath Light"
                min={0}
                max={100}
                value={sliderValues.OverHeadBathLight}
                onValueChange={(value) => handleSliderChange('BathLight', value)} />
              <MainLight
                name="Vanity Light"
                min={0}
                max={100}
                value={sliderValues.OverHeadVanityLight}
                onValueChange={(value) => handleSliderChange('OverHeadVanityLight', value)} />
              <MainLight
                name="Shower Light"
                min={0}
                max={100}
                value={sliderValues.ShowerLight}
                onValueChange={(value) => handleSliderChange('ShowerLight', value)} />
              <MainLight
                name="Accent Light"
                min={0}
                max={100}
                value={sliderValues.AccentLight}
                onValueChange={(value) => handleSliderChange('AccentLight', value)} />
              {/*
    <View className="px-3">
      <LatchLight name="Porch Light" />
      <LatchLight name="Hitch Light" />
    </View>
    */}


            </View>

          </ScrollView></>

      );
    } else if (selectedTab === TABS.BATHROOM) {
      return (
        <View className="">
          <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}>
  <TouchableOpacity
    style={[
      styles.fanButtonContainer,
      IsWaterPump ? styles.waterPumpOff : styles.waterPumpOn,
      { marginRight: 20 } // spacing between buttons
    ]}
    onPress={toggleWaterPump}
  >
    <Text className="text-white mb-1 text-center">Bay Vent</Text>
    <Image
      source={require("../assets/waterpump (2).png")}
      style={{ width: 50, height: 50 }}
    />
    <Text className="text-white mt-1 text-center">
      {IsWaterPump ? "Off" : "On"}
    </Text>
  </TouchableOpacity>

  <TouchableOpacity
    style={[
      styles.fanButtonContainer,
      IsWaterHeater ? styles.waterHeaterOff : styles.waterHeaterOn,
    ]}
    onPress={toggleWaterHeater}
  >
    <Text className="text-white mb-1 text-center">Bath Fan</Text>
    <Image
      source={require("../assets/waterheater.png")}
      style={{ width: 50, height: 50 }}
    />
    <Text className="text-white mt-1 text-center">
      {IsWaterHeater ? "Off" : "On"}
    </Text>
  </TouchableOpacity>
</View>


           {/* Divider */}
      <View style={{ height: 3, backgroundColor: '#696969', marginVertical: 16, marginHorizontal: 17 }} />

          <MainLight
            name="Bath Over Head Light"
            min={0}
            max={100}
            value={sliderValues.BathOverHead}
            onValueChange={(value) => handleSliderChange('BathOverHead', value)}
          />
          <MainLight
            name="Shower Light"
            min={0}
            max={100}
            value={sliderValues.ShowerLight}
            onValueChange={(value) => handleSliderChange('ShowerLight', value)}
          />
          <MainLight
            name="Accent Light"
            min={0}
            max={100}
            value={sliderValues.AccentLight}
            onValueChange={(value) => handleSliderChange('AccentLight', value)}
          />
          <MainLight
            name="Vanity Light"
            min={0}
            max={100}
            value={sliderValues.VanityLight}
            onValueChange={(value) => handleSliderChange('VanityLight', value)}
          />
          <MainLight
            name="Bed Over Head Light"
            min={0}
            max={100}
            value={sliderValues.BedOverHead}
            onValueChange={(value) => handleSliderChange('BedOverHead', value)}
          />
          <View className="h-6 pb-7"></View>
        </View>

      );
    }
  };

  var logo = <Image
    className="h-20 w-20 mb-4 mx-14"
    source={require("../assets/WifiTablet.png")}
  />;

  // If the screen is a tablet, render nothing (null) to hide the tab navigator
  //if (isTablet) {
   // return (
    ///  <View className="">
       // <View className="flex-row mt-4 p-2 justify-between "> 
          //<Text className="text-white pt-2">Wifi</Text>
         // <View className="pt-2">
           //<ToggleSwitch isOn={isOn} setIsOn={setIsOn} />

         // </View>
       // </View>

       // <View>{logo}</View>
    
     // {/* {renderTabContent()} */}

        //{/* <Text className="text-white">Toggle is {isOn ? "ON" : "OFF"}</Text> */}
      //</View>);
  //}

  return (
    <View>
    <ScrollView 
      overScrollMode="never"
      contentContainerStyle={{ paddingBottom:120 }} 
      decelerationRate={0.9}
      className="bg-brown"
    >
      <View style={styles.headerContainer}>
        <Text style={styles.devices1}>Devices</Text>
        {/* <Text style={styles.wifisolar}>Wifi:Solar</Text> */}
      </View>
      <Text style={styles.hiDrax}>Hi, Drax</Text>
      <View>

        <View style={styles.tabContainer}>
          {Object.values(TABS).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tabButton, selectedTab === tab && styles.activeTabButton]}
              onPress={() => setSelectedTab(tab)}
            >
              <Text style={[styles.tabText, selectedTab === tab && styles.activeTabText]}>{tab}</Text>
            </TouchableOpacity>
          ))}
        </View>

          {renderTabContent()}
        </View>

      <View>

      </View>


      {/* Awning Control Modal */}
      <AwningControlModal isVisible={isModalVisible} onClose={() => setModalVisible(false)} />
        {/* Heater Control Modal */}
      <HeaterControlModal isVisible={isHeaterModalVisible} onClose={() => setHeaterModalVisible(false)} />

          {/* Schedule Lights Modal */}
      {/* <ScheduleLightsModal isVisible={isScheduleModalVisible} onClose={() => setScheduleModalVisible(false)} /> */}
      
    </ScrollView>
    <View style={styles.buttonContainer} className="bg-brown py-5">
        {/* <TouchableOpacity style={styles.whiteButton} onPress={() => setScheduleModalVisible(true)}>
          <Text style={styles.whiteButtonText}>Schedule Lights</Text>
        </TouchableOpacity> */}
        <TouchableOpacity style={styles.orangeButton}>
          <Text style={styles.orangeButtonText}>Add Device</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({

  buttonContainer: {
    position: 'absolute',
    bottom: 0, // Adjust to control the vertical spacing from the bottom
    width: '100%',
    paddingHorizontal: 20,
  },
  whiteButton: {
    backgroundColor: 'white',
    paddingVertical: 20, // Increased padding to make the button taller
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10,
    width: '100%',
  },
  whiteButtonText: {
    color: 'black',
    fontSize: 16,
    fontWeight: '600',
  },
  orangeButton: {
    backgroundColor: '#FFB267',
    paddingVertical: 20, // Increased padding to make the button taller
    borderRadius: 12,
    alignItems: 'center',
    width: '100%',
  },
  orangeButtonText: {
    color: 'black',
    fontSize: 16,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    width: "80%",
    padding: 20,
    backgroundColor: "white",
    borderRadius: 10,
    alignItems: "center",
  },
  modalText: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },

  screenContainer: {
    marginTop:10,
    flex: 1,
    paddingHorizontal: 20, // Padding on left and right
    
  },
  porchLightContainer: {
    marginTop: 20,
    padding: 20,
    backgroundColor: '#1B1B1B', // Rounded rectangle color
    borderRadius: 15,          // Rounded corners
    shadowColor: '#000',       // Shadow color
    shadowOffset: { width: 0, height: 2 }, // Shadow position
    shadowOpacity: 0.85,       // Shadow opacity
    shadowRadius: 5.84,        // Shadow blur radius
    elevation: 8,              // Shadow for Android
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between', // Spread items to corners
    marginBottom: 15, // Space between rows
  },
  iconTextContainer: {
    flexDirection: 'row', // Align icon and text horizontally
    alignItems: 'center',
  },
  text: {
    color: '#FFF', // White text color
    marginLeft: 10, // Space between icon and text
    fontSize: 16,
  },
  ellipseIcon: {
    left: 30,
    width: 22,
    height: 22,
  },
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Padding.p_5xs,
    paddingTop: Padding.p_3xs,
    marginTop: 20,
  },
  devices1: {
    fontSize: FontSize.size_13xl,
    color: Color.colorWhitesmoke_100,
    fontFamily: FontFamily.manropeMedium,
    fontWeight: "500",
    textAlign: "left",
    top:30,
    left: 19
  },
  wifisolar: {
    fontSize: FontSize.textXSM_size,
    color: Color.white0,
    top:30,
    right:30
  },
  hiDrax: {
    color: Color.white0,
    lineHeight: 24,
    fontSize: FontSize.size_mid,
    marginLeft: 18,
    marginTop: 10,
    top:30,
    left: 10
  },
  tabContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: Padding.p_5xs,
    backgroundColor: Color.colorGray_200,
    marginBottom: 20,
    marginTop: 30,
  },
  tabButton: {
    paddingVertical: Padding.p_5xs,
  },
  activeTabButton: {
    borderBottomWidth: 2,
    borderBottomColor: Color.white0, // Underline for active tab
  },
  tabText: {
    color: Color.white0,
    fontSize: FontSize.textLMedium_size,
    fontFamily: FontFamily.manropeMedium,
    textAlign: "center",
  },
  activeTabText: {
    color: Color.white0,
  },
  tabContentText: {
    fontSize: FontSize.size_mid,
    color: Color.white0,
    textAlign: "center",
    marginTop: 20,
  },
  // controlsTypo: {
  //   position: "absolute",
  //   color: Color.white0,
  //   fontSize: 15,
  //   fontFamily: FontFamily.manropeMedium,
  //   fontWeight: "500",
  //   textAlign: "center",
  // },
  FanControls: {
    marginRight: 20, // Align text with image
    marginBottom: 10, // Adds space between text and image
    color: Color.white0,
    fontSize: FontSize.textXSM_size,
    fontFamily: FontFamily.manropeMedium,
    fontWeight: "500",
    textAlign: "center",
  },

   fanButtonContainer: {
    width: 100, // Set width to make it square
    height: 120, // Set height to make it square
    justifyContent: "center", // Center content vertically
    alignItems: "center", // Center content horizontally
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: "#000", // Shadow for depth
    shadowOffset: { width: 0, height: 2 }, // Shadow position
    shadowOpacity: 0.3, // Shadow transparency
    shadowRadius: 4, // Shadow blur
    elevation: 5, // Shadow for Android
  },
  fanOn: {
    backgroundColor: "#4CAF50", // Green when on
    borderWidth: 2,
    borderColor: "#388E3C", // Darker green border
  },
  fanOff: {
    backgroundColor: "#FF6B6B", // Red when off
    borderWidth: 2,
    borderColor: "#D32F2F", // Darker red border
  },
  waterPumpOn: {
    backgroundColor: "#4CAF50", // Green when on
    borderWidth: 2,
    borderColor: "#388E3C", // Darker green border
  },
  waterPumpOff: {
    backgroundColor: "#FF6B6B", // Red when off
    borderWidth: 2,
    borderColor: "#D32F2F", // Darker red border
  },
  waterHeaterOn: {
    backgroundColor: "#4CAF50", // Green when on
    borderWidth: 2,
    borderColor: "#388E3C", // Darker green border
  },
  waterHeaterOff: {
    backgroundColor: "#FF6B6B", // Red when off
    borderWidth: 2,
    borderColor: "#D32F2F", // Darker red border
  },
  fanControlsText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 10,
  },
  // awningControls: {
  //   top: 215,
  //   left: 65,
  //   position: "absolute",
  //   color: Color.white0,
  //   fontSize: FontSize.textXSM_size,
  //   fontFamily: FontFamily.manropeMedium,
  //   fontWeight: "500",
  //   textAlign: "center",
  // },
  heaterControls: {
    top: 215,
    left: 223,
  },
  devicesChild: {
    top: 230,
    left: 60,
    position: "absolute",
  },
  devicesItem: {
    top: 230,
    left: 220,
    position: "absolute",
  },
  // image21Icon: {
  //   top: 30,
  //   left: 230,
  //   width: 72,
  //   height: 86,
  //   position: "absolute",
  // },

  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  // abpost61724Photoroom3Icon: {
  //   top: 35, // Adjust this value to control the vertical space between text and image
  //   left: 75, // Match the 'left' value with awningControls for alignment
  //   width: 68,
  //   height: 59,
  //   position: "absolute",
  // },
 
});

export default Devices;
