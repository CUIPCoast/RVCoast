import React, { useState, useEffect } from "react";
import { View, Text, Image, ScrollView, Alert, ActivityIndicator, TouchableOpacity } from "react-native";
import { Col, Row, Grid } from "react-native-easy-grid";
import moment from "moment";
import ToggleSwitch from "../components/ToggleSwitch.jsx";
import EnhancedMainLight from "../components/EnhancedMainLight.jsx";
import { LightControlService } from "../Service/LightControlService.js";
import { CANBusMonitor } from "../Service/CANBusMonitor.js";

const LightScreenTablet = () => {
  // Current date/time
  const currentDate = moment().format("MMMM Do, YYYY");
  const dayOfTheWeek = moment().format("dddd");

  // State for loading indicator
  const [isLoading, setIsLoading] = useState(false);
  
  // State for master light switch
  const [masterLightOn, setMasterLightOn] = useState(false);
  
  // Get all available lights
  const allLights = LightControlService.getAllLights();
  
  // Check if dimming is supported
  const supportsDimming = LightControlService.supportsDimming();
  
  // State to track if light is on/off
  const [lightStates, setLightStates] = useState({});
  
  // State for slider values (brightness levels)
  const [sliderValues, setSliderValues] = useState({});
  
  // Initialize light states and slider values
  useEffect(() => {
    const initialLightStates = {};
    const initialSliderValues = {};
    
    allLights.forEach(lightId => {
      initialLightStates[lightId] = false;
      initialSliderValues[lightId] = 50; // Default to middle value
    });
    
    setLightStates(initialLightStates);
    setSliderValues(initialSliderValues);
    
    // Subscribe to CAN bus dimming updates
    const subscription = CANBusMonitor.subscribeToDimmingUpdates((updates) => {
      // Updates object will contain lightId: brightness pairs
      
      // Update light states based on brightness values
      const newLightStates = { ...lightStates };
      const newSliderValues = { ...sliderValues };
      
      // Process each update
      Object.entries(updates).forEach(([lightId, brightness]) => {
        // Light is on if brightness > 0
        newLightStates[lightId] = brightness > 0;
        
        // Update slider value (scale 0-50 to 0-100 for UI)
        newSliderValues[lightId] = brightness > 0 ? brightness * 2 : 0;
      });
      
      // Update state
      setLightStates(newLightStates);
      setSliderValues(newSliderValues);
      
      // Check if any light is on to update master switch
      const anyLightOn = Object.values(newLightStates).some(state => state);
      setMasterLightOn(anyLightOn);
    });
    
    // Clean up subscription when component unmounts
    return () => {
      subscription.unsubscribe();
    };
  }, []);

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
        const result = await LightControlService.allLightsOn();
        if (result.success) {
          // Update all light states to on and set brightness to 50
          const newLightStates = {};
          const newSliderValues = {};
          
          allLights.forEach(lightId => {
            newLightStates[lightId] = true;
            newSliderValues[lightId] = 50;
          });
          
          setLightStates(newLightStates);
          setSliderValues(newSliderValues);
          setMasterLightOn(true);
        } else {
          Alert.alert("Error", "Failed to turn all lights on");
        }
      } else {
        const result = await LightControlService.allLightsOff();
        if (result.success) {
          // Update all light states to off and set brightness to 0
          const newLightStates = {};
          const newSliderValues = {};
          
          allLights.forEach(lightId => {
            newLightStates[lightId] = false;
            newSliderValues[lightId] = 0;
          });
          
          setLightStates(newLightStates);
          setSliderValues(newSliderValues);
          setMasterLightOn(false);
        } else {
          Alert.alert("Error", "Failed to turn all lights off");
        }
      }
    } catch (error) {
      Alert.alert("Error", `Failed to control master lights: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Preset handler for mood lighting
  const handleMoodLighting = async () => {
    try {
      setIsLoading(true);
      
      // Set dimmer values for mood lighting
      const moodSettings = {
        'vibe_light': 30,
        'strip_lights': 20,
        'under_cab_lights': 15,
        'dinette_lights': 25
      };
      
      // Turn off all other lights first
      await LightControlService.allLightsOff();
      
      // Update local state to reflect all lights off
      const newLightStates = {};
      const newSliderValues = {};
      
      allLights.forEach(lightId => {
        newLightStates[lightId] = false;
        newSliderValues[lightId] = 0;
      });
      
      // Apply mood lighting settings
      for (const [lightId, brightness] of Object.entries(moodSettings)) {
        // Remember dimming on Firefly is limited to 1-50%
        await LightControlService.setBrightness(lightId, brightness);
        
        // Update local state
        newLightStates[lightId] = true;
        newSliderValues[lightId] = brightness * 2; // Convert from 0-50 scale to 0-100 scale
      }
      
      // Update state
      setLightStates(newLightStates);
      setSliderValues(newSliderValues);
      setMasterLightOn(true);
      
    } catch (error) {
      Alert.alert("Error", `Failed to set mood lighting: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Preset handler for evening lighting
  const handleEveningLighting = async () => {
    try {
      setIsLoading(true);
      
      // Set dimmer values for evening lighting
      const eveningSettings = {
        'kitchen_lights': 35,
        'dinette_lights': 30,
        'bath_light': 25,
        'vibe_light': 20,
        'left_reading_lights': 40,
        'right_reading_lights': 40
      };
      
      // Turn off all other lights first
      await LightControlService.allLightsOff();
      
      // Update local state to reflect all lights off
      const newLightStates = {};
      const newSliderValues = {};
      
      allLights.forEach(lightId => {
        newLightStates[lightId] = false;
        newSliderValues[lightId] = 0;
      });
      
      // Apply evening lighting settings
      for (const [lightId, brightness] of Object.entries(eveningSettings)) {
        // Remember dimming on Firefly is limited to 1-50%
        await LightControlService.setBrightness(lightId, brightness);
        
        // Update local state
        newLightStates[lightId] = true;
        newSliderValues[lightId] = brightness * 2; // Convert from 0-50 scale to 0-100 scale
      }
      
      // Update state
      setLightStates(newLightStates);
      setSliderValues(newSliderValues);
      setMasterLightOn(true);
      
    } catch (error) {
      Alert.alert("Error", `Failed to set evening lighting: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Group lights by category
  const lightGroups = {
    kitchen: [
      'kitchen_lights',
      'dinette_lights',
      'under_cab_lights',
      'strip_lights',
      'awning_lights',
      'porch_lights',
      'hitch_lights'
    ],
    bedroom: [
      'bed_ovhd_light',
      'left_reading_lights',
      'right_reading_lights',
      'vibe_light'
    ],
    bathroom: [
      'bath_light',
      'vanity_light',
      'shower_lights'
    ]
  };

  // Helper to convert API light IDs to user-friendly names
  const getLightDisplayName = (lightId) => {
    const nameMap = {
      'kitchen_lights': 'Kitchen Lights',
      'bath_light': 'Bathroom Light',
      'bed_ovhd_light': 'Bedroom Overhead Light',
      'vibe_light': 'Vibe Light',
      'vanity_light': 'Vanity Light',
      'awning_lights': 'Awning Lights',
      'shower_lights': 'Shower Lights',
      'under_cab_lights': 'Under Cabinet Lights',
      'hitch_lights': 'Hitch Lights',
      'porch_lights': 'Porch Lights', 
      'left_reading_lights': 'Left Reading Light',
      'right_reading_lights': 'Right Reading Light',
      'dinette_lights': 'Dinette Lights',
      'strip_lights': 'Strip Lights'
    };
    
    return nameMap[lightId] || lightId;
  };

  return (
    <Grid className="bg-black">
      {/* Header row */}
      <Row size={10}>
        <Row className="bg-black" size={9}>
          <Col className="m-1 ml-3">
            <Text className="text-3xl text-white">{dayOfTheWeek}</Text>
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
                backgroundColor: "white",
              }}
            />
          </View>
        </Row>
      </Row>
      
      {/* Master Light Switch Row */}
      <Row size={5} style={{ justifyContent: "center", alignItems: "center" }}>
        <Col
          style={{
            width: "40%",
            height: 60,
            backgroundColor: "#1B1B1B",
            borderRadius: 10,
            justifyContent: "center",
            padding: 20,
            bottom: 220,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              width: "100%",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <Image
                source={require("../assets/lamplight.png")}
                style={{
                  width: 40,
                  height: 40,
                  resizeMode: "contain",
                  marginRight: 10,
                }}
              />
              <Text className="text-white">Light Master</Text>
            </View>
            
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {/* Mood Lighting Button */}
              <TouchableOpacity
                style={{
                  backgroundColor: '#222',
                  paddingHorizontal: 15,
                  paddingVertical: 8,
                  borderRadius: 20,
                  marginRight: 15,
                }}
                onPress={handleMoodLighting}
                disabled={isLoading}
              >
                <Text style={{ color: '#FFB267' }}>Mood</Text>
              </TouchableOpacity>
              
              {/* Evening Lighting Button */}
              <TouchableOpacity
                style={{
                  backgroundColor: '#222',
                  paddingHorizontal: 15,
                  paddingVertical: 8,
                  borderRadius: 20,
                  marginRight: 15,
                }}
                onPress={handleEveningLighting}
                disabled={isLoading}
              >
                <Text style={{ color: '#FFB267' }}>Evening</Text>
              </TouchableOpacity>
              
              {isLoading ? (
                <ActivityIndicator size="small" color="#FFB267" />
              ) : (
                <ToggleSwitch isOn={masterLightOn} setIsOn={handleMasterLightToggle} />
              )}
            </View>
          </View>
        </Col>
      </Row>

      {/* Main Content Row */}
      <Row
        size={5}
        style={{
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            width: "45%",
          }}
        >
          {/* Kitchen & Living Area Lights */}
          <Col
            style={{
              width: "63%",
              height: 310,
              backgroundColor: "#1B1B1B",
              borderRadius: 10,
              justifyContent: "flex-start",
              padding: 20,
              marginLeft: -260,
              marginRight: 30,
              bottom: 140,
            }}
          >
            <Text
              style={{
                color: "white",
                fontSize: 16,
                position: "absolute",
                top: 10,
                left: 10,
              }}
            >
              Kitchen & Living Area
            </Text>
            {/* Divider */}
            <View
              style={{
                height: 1,
                backgroundColor: "white",
                width: "100%",
                marginTop: 40,
                marginLeft: 20,
                position: "absolute",
              }}
            />

            <ScrollView style={{ marginTop: 35 }}>
              {lightGroups.kitchen.map((lightId) => (
                <EnhancedMainLight
                  key={lightId}
                  name={getLightDisplayName(lightId)}
                  lightId={lightId}
                  min={0}
                  max={100}
                  value={sliderValues[lightId] || 0}
                  isOn={lightStates[lightId] || false}
                  onToggle={(isOn) => handleLightToggle(lightId, isOn)}
                  onValueChange={(value) => handleSliderChange(lightId, value)}
                  supportsDimming={supportsDimming}
                />
              ))}
            </ScrollView>
          </Col>

          {/* Bedroom Lights */}
          <Col
            style={{
              width: "70%",
              height: 310,
              backgroundColor: "#1B1B1B",
              borderRadius: 10,
              justifyContent: "flex-start",
              padding: 20,
              marginRight: 30,
              bottom: 140,
            }}
          >
            <Text
              style={{
                color: "white",
                fontSize: 16,
                position: "absolute",
                top: 10,
                left: 10,
              }}
            >
              Bedroom
            </Text>
            {/* Divider */}
            <View
              style={{
                height: 1,
                backgroundColor: "white",
                width: "100%",
                marginTop: 40,
                marginLeft: 20,
                position: "absolute",
              }}
            />

            <ScrollView style={{ marginTop: 35 }}>
              {lightGroups.bedroom.map((lightId) => (
                <EnhancedMainLight
                  key={lightId}
                  name={getLightDisplayName(lightId)}
                  lightId={lightId}
                  min={0}
                  max={100}
                  value={sliderValues[lightId] || 0}
                  isOn={lightStates[lightId] || false}
                  onToggle={(isOn) => handleLightToggle(lightId, isOn)}
                  onValueChange={(value) => handleSliderChange(lightId, value)}
                  supportsDimming={supportsDimming}
                />
              ))}
            </ScrollView>
          </Col>

          {/* Bathroom Lights */}
          <Col
            style={{
              width: "70%",
              height: 310,
              backgroundColor: "#1B1B1B",
              borderRadius: 10,
              justifyContent: "flex-start",
              padding: 20,
              bottom: 140,
            }}
          >
            <Text
              style={{
                color: "white",
                fontSize: 16,
                position: "absolute",
                top: 10,
                left: 10,
              }}
            >
              Bathroom
            </Text>

            {/* Divider */}
            <View
              style={{
                height: 1,
                backgroundColor: "white",
                width: "100%",
                marginTop: 40,
                marginLeft: 20,
                position: "absolute",
              }}
            />

            <ScrollView style={{ marginTop: 35 }}>
              {lightGroups.bathroom.map((lightId) => (
                <EnhancedMainLight
                  key={lightId}
                  name={getLightDisplayName(lightId)}
                  lightId={lightId}
                  min={0}
                  max={100}
                  value={sliderValues[lightId] || 0}
                  isOn={lightStates[lightId] || false}
                  onToggle={(isOn) => handleLightToggle(lightId, isOn)}
                  onValueChange={(value) => handleSliderChange(lightId, value)}
                  supportsDimming={supportsDimming}
                />
              ))}
            </ScrollView>
          </Col>
        </View>
      </Row>
    </Grid>
  );
};

export default LightScreenTablet;