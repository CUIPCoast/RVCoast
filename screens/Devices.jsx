import React, { useState, useEffect } from "react";
import { StyleSheet, View, Text, Pressable, TouchableOpacity, Image, ScrollView, Modal, Button, ActivityIndicator } from "react-native";
import EnhancedMainLight from "../components/EnhancedMainLight.jsx";
import LatchLight from "../components/LatchLight";
import useScreenSize from "../helper/useScreenSize.jsx";
import AwningControlModal from "../components/AwningControlModal";
import HeaterControlModal from "../components/HeaterControlModal";
import { LightService, FanService } from "../API/RVControlServices"; // Add FanService import
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

// Light IDs to display names mapping
const lightDisplayNames = {
  'kitchen_lights': 'Kitchen Light',
  'bath_light': 'Bathroom Light',
  'bed_ovhd_light': 'Bed Light',
  'vibe_light': 'Accent Light',
  'vanity_light': 'Vanity Light',
  'awning_lights': 'Awning Lights',
  'shower_lights': 'Shower Light',
  'under_cab_lights': 'Cabinet Light',
  'hitch_lights': 'Hitch Light',
  'porch_lights': 'Porch Light', 
  'left_reading_lights': 'Left Reading Light',
  'right_reading_lights': 'Right Reading Light',
  'dinette_lights': 'Dining Light',
  'strip_lights': 'Strip Light',
  'wardrobe_lights': 'Wardrobe Light'
};

// Light groups by category
const lightGroups = {
  main: [
    'kitchen_lights',
    'dinette_lights',
    'under_cab_lights',
    'wardrobe_lights'
  ],
  bedroom: [
    'bed_ovhd_light',
    'left_reading_lights',
    'right_reading_lights',
    'vibe_light',
    'bath_light'
  ],
  bathroom: [
    'bath_light',
    'vanity_light',
    'shower_lights',
    'bed_ovhd_light'
  ]
};

const Devices = () => {
  const [isOn, setIsOn] = useState(false);
  const isTablet = useScreenSize();
  const [selectedTab, setSelectedTab] = useState(TABS.MAIN);
  const [isModalVisible, setModalVisible] = useState(false);
  const [isHeaterModalVisible, setHeaterModalVisible] = useState(false);
  const [isScheduleModalVisible, setScheduleModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Fan and water control states
  const [isBathroomFanOn, setBathroomFanOn] = useState(false);
  const [isBayVentFanOn, setBayVentFanOn] = useState(false);
  const [IsWaterHeater, setWaterHeaterOn] = useState(false); 
  const [IsWaterPump, setWaterPumpOn] = useState(false); 
  
  // State for API operation status
  const [statusMessage, setStatusMessage] = useState('');
  const [showStatus, setShowStatus] = useState(false);

  // State for light toggling
  const [lightStates, setLightStates] = useState({});
  
  // State for slider values
  const [sliderValues, setSliderValues] = useState({});
  
  // State for master light switch
  const [masterLightOn, setMasterLightOn] = useState(false);

  // Initialize light states and slider values
  useEffect(() => {
    const initialLightStates = {};
    const initialSliderValues = {};
    
    // Combine all light groups to get all lights
    const allLights = [
      ...lightGroups.main,
      ...lightGroups.bedroom,
      ...lightGroups.bathroom
    ];
    
    // Remove duplicates
    const uniqueLights = [...new Set(allLights)];
    
    uniqueLights.forEach(lightId => {
      initialLightStates[lightId] = false;
      initialSliderValues[lightId] = 50; // Default to middle value
    });
    
    setLightStates(initialLightStates);
    setSliderValues(initialSliderValues);
  }, []);

  // Handle bathroom fan toggle with API integration
  const toggleBathroomFan = async () => {
    try {
      setIsLoading(true);
      
      const result = await FanService.toggleBathroomFan();
      
      if (result.success) {
        setBathroomFanOn(!isBathroomFanOn);
        
        // Show status message
        setStatusMessage(`Bathroom fan ${!isBathroomFanOn ? 'turned on' : 'turned off'}`);
        setShowStatus(true);
        setTimeout(() => setShowStatus(false), 3000);
      } else {
        console.error('Failed to toggle bathroom fan:', result.error);
        
        // Show error message
        setStatusMessage('Failed to toggle bathroom fan');
        setShowStatus(true);
        setTimeout(() => setShowStatus(false), 3000);
      }
    } catch (error) {
      console.error('Error toggling bathroom fan:', error);
      
      // Show error message
      setStatusMessage(`Error: ${error.message}`);
      setShowStatus(true);
      setTimeout(() => setShowStatus(false), 3000);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle bay vent fan toggle with API integration
  const toggleBayVentFan = async () => {
    try {
      setIsLoading(true);
      
      const result = await FanService.toggleBayVentFan();
      
      if (result.success) {
        setBayVentFanOn(!isBayVentFanOn);
        
        // Show status message
        setStatusMessage(`Bay vent fan ${!isBayVentFanOn ? 'turned on' : 'turned off'}`);
        setShowStatus(true);
        setTimeout(() => setShowStatus(false), 3000);
      } else {
        console.error('Failed to toggle bay vent fan:', result.error);
        
        // Show error message
        setStatusMessage('Failed to toggle bay vent fan');
        setShowStatus(true);
        setTimeout(() => setShowStatus(false), 3000);
      }
    } catch (error) {
      console.error('Error toggling bay vent fan:', error);
      
      // Show error message
      setStatusMessage(`Error: ${error.message}`);
      setShowStatus(true);
      setTimeout(() => setShowStatus(false), 3000);
    } finally {
      setIsLoading(false);
    }
  };
  
  const toggleWaterHeater = () => {
    setWaterHeaterOn((prevStatus) => !prevStatus);
  };
  
  const toggleWaterPump = () => {
    setWaterPumpOn((prevStatus) => !prevStatus);
  };

  // Handler for slider value changes
  const handleSliderChange = (lightId, value) => {
    setSliderValues(prev => ({
      ...prev,
      [lightId]: value
    }));
  };
  
  // Handler for light toggle
  const handleLightToggle = (lightId, isOn) => {
    setLightStates(prev => ({
      ...prev,
      [lightId]: isOn
    }));
    
    // Update master light state based on all lights
    const updatedStates = { ...lightStates, [lightId]: isOn };
    const anyLightOn = Object.values(updatedStates).some(state => state);
    setMasterLightOn(anyLightOn);
  };

  // Master light toggle handler
  const handleMasterLightToggle = async (isOn) => {
    try {
      setIsLoading(true);
      
      if (isOn) {
        const result = await LightService.allLightsOn();
        if (result.success) {
          // Update all light states to on and set brightness to 50
          const newLightStates = {};
          const newSliderValues = {};
          
          Object.keys(lightStates).forEach(lightId => {
            newLightStates[lightId] = true;
            newSliderValues[lightId] = 50;
          });
          
          setLightStates(newLightStates);
          setSliderValues(newSliderValues);
          setMasterLightOn(true);
        }
      } else {
        const result = await LightService.allLightsOff();
        if (result.success) {
          // Update all light states to off and set brightness to 0
          const newLightStates = {};
          const newSliderValues = {};
          
          Object.keys(lightStates).forEach(lightId => {
            newLightStates[lightId] = false;
            newSliderValues[lightId] = 0;
          });
          
          setLightStates(newLightStates);
          setSliderValues(newSliderValues);
          setMasterLightOn(false);
        }
      }
    } catch (error) {
      console.error('Failed to control master lights:', error);
    } finally {
      setIsLoading(false);
    }
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
          
          {/* Master Light Toggle */}
          <View style={styles.masterLightContainer}>
            <View style={styles.masterLightContent}>
              <View style={styles.masterLightLeft}>
                <Image
                  source={require("../assets/lamplight.png")}
                  style={styles.masterLightIcon}
                />
                <Text style={styles.masterLightText}>Light Master</Text>
              </View>
              
              <View style={styles.masterLightRight}>
                {isLoading ? (
                  <ActivityIndicator size="small" color="#FFB267" />
                ) : (
                  <ToggleSwitch isOn={masterLightOn} setIsOn={handleMasterLightToggle} />
                )}
              </View>
            </View>
          </View>
          
          <View style={styles.divider} />
          
          <View>
            {lightGroups.main.map((lightId) => (
              <EnhancedMainLight
                key={lightId}
                name={lightDisplayNames[lightId] || lightId}
                lightId={lightId}
                min={0}
                max={100}
                value={sliderValues[lightId] || 0}
                isOn={lightStates[lightId] || false}
                onToggle={(isOn) => handleLightToggle(lightId, isOn)}
                onValueChange={(value) => handleSliderChange(lightId, value)}
                supportsDimming={true}
              />
            ))}
          </View>
        </>
      );
    } else if (selectedTab === TABS.BEDROOM) {
      return (
        <>
          <View style={styles.masterLightContainer}>
            <View style={styles.masterLightContent}>
              <View style={styles.masterLightLeft}>
                <Image
                  source={require("../assets/lamplight.png")}
                  style={styles.masterLightIcon}
                />
                <Text style={styles.masterLightText}>Light Master</Text>
              </View>
              
              <View style={styles.masterLightRight}>
                {isLoading ? (
                  <ActivityIndicator size="small" color="#FFB267" />
                ) : (
                  <ToggleSwitch isOn={masterLightOn} setIsOn={handleMasterLightToggle} />
                )}
              </View>
            </View>
          </View>
          
          <View style={styles.divider} />
          
          <ScrollView>
            <View>
              {lightGroups.bedroom.map((lightId) => (
                <EnhancedMainLight
                  key={lightId}
                  name={lightDisplayNames[lightId] || lightId}
                  lightId={lightId}
                  min={0}
                  max={100}
                  value={sliderValues[lightId] || 0}
                  isOn={lightStates[lightId] || false}
                  onToggle={(isOn) => handleLightToggle(lightId, isOn)}
                  onValueChange={(value) => handleSliderChange(lightId, value)}
                  supportsDimming={true}
                />
              ))}
            </View>
          </ScrollView>
        </>
      );
    } else if (selectedTab === TABS.BATHROOM) {
      return (
        <View className="">
          <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}>
            <TouchableOpacity
              style={[
                styles.fanButtonContainer,
                isBayVentFanOn ? styles.fanButtonOn : styles.fanButtonOff,
                { marginRight: 20 },
                isLoading && styles.disabledButton
              ]}
              onPress={toggleBayVentFan}
              disabled={isLoading}
            >
              <Text className="text-white mb-1 text-center">Bay Vent</Text>
              <Image
                source={require("../assets/waterpump (2).png")}
                style={{ width: 50, height: 50 }}
              />
              <Text className="text-white mt-1 text-center">
                {isBayVentFanOn ? "On" : "Off"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.fanButtonContainer,
                isBathroomFanOn ? styles.fanButtonOn : styles.fanButtonOff,
                isLoading && styles.disabledButton
              ]}
              onPress={toggleBathroomFan}
              disabled={isLoading}
            >
              <Text className="text-white mb-1 text-center">Bath Fan</Text>
              <Image
                source={require("../assets/waterheater.png")}
                style={{ width: 50, height: 50 }}
              />
              <Text className="text-white mt-1 text-center">
                {isBathroomFanOn ? "On" : "Off"}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.masterLightContainer}>
            <View style={styles.masterLightContent}>
              <View style={styles.masterLightLeft}>
                <Image
                  source={require("../assets/lamplight.png")}
                  style={styles.masterLightIcon}
                />
                <Text style={styles.masterLightText}>Light Master</Text>
              </View>
              
              <View style={styles.masterLightRight}>
                {isLoading ? (
                  <ActivityIndicator size="small" color="#FFB267" />
                ) : (
                  <ToggleSwitch isOn={masterLightOn} setIsOn={handleMasterLightToggle} />
                )}
              </View>
            </View>
          </View>

          <View style={styles.divider} />

          {lightGroups.bathroom.map((lightId) => (
            <EnhancedMainLight
              key={lightId}
              name={lightDisplayNames[lightId] || lightId}
              lightId={lightId}
              min={0}
              max={100}
              value={sliderValues[lightId] || 0}
              isOn={lightStates[lightId] || false}
              onToggle={(isOn) => handleLightToggle(lightId, isOn)}
              onValueChange={(value) => handleSliderChange(lightId, value)}
              supportsDimming={true}
            />
          ))}
          <View className="h-6 pb-7"></View>
        </View>
      );
    }
  };

  var logo = <Image
    className="h-20 w-20 mb-4 mx-14"
    source={require("../assets/WifiTablet.png")}
  />;

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

        {/* Awning Control Modal */}
        <AwningControlModal isVisible={isModalVisible} onClose={() => setModalVisible(false)} />
        
        {/* Heater Control Modal */}
        <HeaterControlModal isVisible={isHeaterModalVisible} onClose={() => setHeaterModalVisible(false)} />
        
        {/* Status message */}
        {showStatus && (
          <View style={styles.statusContainer}>
            <Text style={styles.statusText}>{statusMessage}</Text>
          </View>
        )}
      </ScrollView>
      
      <View style={styles.buttonContainer} className="bg-brown py-5">
        <TouchableOpacity style={styles.orangeButton}>
          <Text style={styles.orangeButtonText}>Add Device</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  masterLightContainer: {
    marginTop: 10,
    marginHorizontal: 20,
    backgroundColor: '#1B1B1B',
    borderRadius: 10,
    padding: 15,
  },
  masterLightContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  masterLightLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  masterLightIcon: {
    width: 30,
    height: 30,
    marginRight: 10,
  },
  masterLightText: {
    color: 'white',
    fontSize: 16,
  },
  masterLightRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  divider: {
    height: 3,
    backgroundColor: '#696969',
    marginVertical: 16,
    marginHorizontal: 17
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    paddingHorizontal: 20,
  },
  whiteButton: {
    backgroundColor: 'white',
    paddingVertical: 20,
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
    paddingVertical: 20,
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
    marginTop: 10,
    flex: 1,
    paddingHorizontal: 20,
  },
  porchLightContainer: {
    marginTop: 20,
    padding: 20,
    backgroundColor: '#1B1B1B',
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.85,
    shadowRadius: 5.84,
    elevation: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  iconTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  text: {
    color: '#FFF',
    marginLeft: 10,
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
    top: 30,
    left: 19
  },
  wifisolar: {
    fontSize: FontSize.textXSM_size,
    color: Color.white0,
    top: 30,
    right: 30
  },
  hiDrax: {
    color: Color.white0,
    lineHeight: 24,
    fontSize: FontSize.size_mid,
    marginLeft: 18,
    marginTop: 10,
    top: 30,
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
    borderBottomColor: Color.white0,
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
  FanControls: {
    marginRight: 20,
    marginBottom: 10,
    color: Color.white0,
    fontSize: FontSize.textXSM_size,
    fontFamily: FontFamily.manropeMedium,
    fontWeight: "500",
    textAlign: "center",
  },
  fanButtonContainer: {
    width: 100,
    height: 120,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  fanButtonOn: {
    backgroundColor: "#4CAF50",
    borderWidth: 2,
    borderColor: "#388E3C",
  },
  fanButtonOff: {
    backgroundColor: "#FF6B6B",
    borderWidth: 2,
    borderColor: "#D32F2F",
  },
  disabledButton: {
    opacity: 0.7,
  },
  waterPumpOn: {
    backgroundColor: "#4CAF50",
    borderWidth: 2,
    borderColor: "#388E3C",
  },
  waterPumpOff: {
    backgroundColor: "#FF6B6B",
    borderWidth: 2,
    borderColor: "#D32F2F",
  },
  waterHeaterOn: {
    backgroundColor: "#4CAF50",
    borderWidth: 2,
    borderColor: "#388E3C",
  },
  waterHeaterOff: {
    backgroundColor: "#FF6B6B",
    borderWidth: 2,
    borderColor: "#D32F2F",
  },
  fanControlsText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  statusContainer: {
    position: 'absolute',
    bottom: 120,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 5,
    alignSelf: 'center',
    marginHorizontal: 40,
    zIndex: 1000,
  },
  statusText: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default Devices;