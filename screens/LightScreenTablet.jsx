import React, { useState, useEffect } from "react";
import { View, Text, Image, ScrollView, Alert, ActivityIndicator, TouchableOpacity } from "react-native";
import { Col, Row, Grid } from "react-native-easy-grid";
import moment from "moment";
import EnhancedMainLight from "../components/EnhancedMainLight.jsx";
import { LightControlService } from "../Service/LightControlService.js";
import { CANBusMonitor } from "../Service/CANBusMonitor.js";
import rvStateManager from "../API/RVStateManager/RVStateManager"; // Add this import

const ImprovedLightScreenTablet = () => {
  // Current date/time
  const currentDate = moment().format("MMMM Do, YYYY");
  const dayOfTheWeek = moment().format("dddd");

  // State for loading indicator
  const [isLoading, setIsLoading] = useState(false);
  
  // State for master light switch - now derived from RV State Manager
  const [masterLightOn, setMasterLightOn] = useState(false);
  
  // Add state for status messages
  const [statusMessage, setStatusMessage] = useState('');
  const [showStatus, setShowStatus] = useState(false);
  
  // Get all available lights
  const allLights = LightControlService.getAllLights();
  
  // Check if dimming is supported
  const supportsDimming = LightControlService.supportsDimming();
  
  // Remove local light state management - use RV State Manager instead
  const [lightStates, setLightStates] = useState({});

  // Subscribe to RV State Manager for individual light states only
  useEffect(() => {
    const unsubscribe = rvStateManager.subscribe(({ category, state }) => {
      if (category === 'lights') {
        // Update local light states for UI consistency (but NOT master control)
        const currentLights = state.lights || {};
        const newLightStates = {};
        Object.entries(currentLights).forEach(([lightId, lightState]) => {
          newLightStates[lightId] = lightState.isOn;
        });
        setLightStates(newLightStates);
        
        console.log('Individual light states updated');
      }
    });

    // Initialize individual light states on component mount (but NOT master state)
    const currentLights = rvStateManager.getCategoryState('lights');
    const initialLightStates = {};
    Object.entries(currentLights).forEach(([lightId, lightState]) => {
      initialLightStates[lightId] = lightState ? lightState.isOn : false;
    });
    setLightStates(initialLightStates);

    return unsubscribe;
  }, []);

  // Subscribe to CAN bus updates (keep existing functionality)
  useEffect(() => {
    const subscription = CANBusMonitor.subscribeToDimmingUpdates((updates) => {
      Object.entries(updates).forEach(([lightId, brightness]) => {
        const isOn = brightness > 0;
        const brightnessPercent = brightness > 0 ? brightness * 2 : 0;
        
        // Update RV State Manager
        rvStateManager.updateLightState(lightId, isOn, brightnessPercent);
      });
    });
    
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Turn all lights on - Only changes master state when explicitly called
  const handleAllLightsOn = async () => {
    try {
      setIsLoading(true);
      
      const result = await LightControlService.allLightsOn();
      console.log('allLightsOn result:', JSON.stringify(result));
      
      if (result.success) {
        // Update RV State Manager for all lights
        allLights.forEach(lightId => {
          rvStateManager.updateLightState(lightId, true, 100); // Turn on at 100%
        });
        
        // Only update master state when using master control
        setMasterLightOn(true);
        
        // Show success message
        setStatusMessage('All lights turned ON');
        setShowStatus(true);
        setTimeout(() => setShowStatus(false), 3000);
      } else {
        setStatusMessage('Failed to turn all lights ON');
        setShowStatus(true);
        setTimeout(() => setShowStatus(false), 3000);
      }
    } catch (error) {
      setStatusMessage(`Error: ${error.message}`);
      setShowStatus(true);
      setTimeout(() => setShowStatus(false), 3000);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Turn all lights off - Only changes master state when explicitly called
  const handleAllLightsOff = async () => {
    try {
      setIsLoading(true);
      
      const result = await LightControlService.allLightsOff();
      console.log('allLightsOff result:', JSON.stringify(result));
      
      if (result.success) {
        // Update RV State Manager for all lights
        allLights.forEach(lightId => {
          rvStateManager.updateLightState(lightId, false, 0);
        });
        
        // Only update master state when using master control
        setMasterLightOn(false);
        
        setStatusMessage('All lights turned OFF');
        setShowStatus(true);
        setTimeout(() => setShowStatus(false), 3000);
      } else {
        setStatusMessage('Failed to turn all lights OFF');
        setShowStatus(true);
        setTimeout(() => setShowStatus(false), 3000);
      }
    } catch (error) {
      setStatusMessage(`Error: ${error.message}`);
      setShowStatus(true);
      setTimeout(() => setShowStatus(false), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  // Updated preset handlers to work with RV State Manager
  const handleMoodLighting = async () => {
    try {
      setIsLoading(true);
      
      const moodSettings = {
        'vibe_light': 30,
        'strip_lights': 20,
        'under_cab_lights': 15,
        'dinette_lights': 25
      };
      
      // Turn off all lights first in RV State Manager
      allLights.forEach(lightId => {
        rvStateManager.updateLightState(lightId, false, 0);
      });
      
      await LightControlService.allLightsOff();
      
      // Apply mood lighting settings
      for (const [lightId, brightness] of Object.entries(moodSettings)) {
        await LightControlService.setBrightness(lightId, brightness);
        // Update RV State Manager
        rvStateManager.updateLightState(lightId, true, brightness * 2);
      }
      
      setStatusMessage('Mood lighting activated');
      setShowStatus(true);
      setTimeout(() => setShowStatus(false), 3000);
      
    } catch (error) {
      setStatusMessage(`Error setting mood lighting: ${error.message}`);
      setShowStatus(true);
      setTimeout(() => setShowStatus(false), 3000);
      console.error('Failed to set mood lighting:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEveningLighting = async () => {
    try {
      setIsLoading(true);
      
      const eveningSettings = {
        'kitchen_lights': 35,
        'dinette_lights': 30,
        'bath_light': 25,
        'vibe_light': 20,
        'left_reading_lights': 40,
        'right_reading_lights': 40
      };
      
      // Turn off all lights first in RV State Manager
      allLights.forEach(lightId => {
        rvStateManager.updateLightState(lightId, false, 0);
      });
      
      await LightControlService.allLightsOff();
      
      // Apply evening lighting settings
      for (const [lightId, brightness] of Object.entries(eveningSettings)) {
        await LightControlService.setBrightness(lightId, brightness);
        // Update RV State Manager
        rvStateManager.updateLightState(lightId, true, brightness * 2);
      }
      
      setStatusMessage('Evening lighting activated');
      setShowStatus(true);
      setTimeout(() => setShowStatus(false), 3000);
      
    } catch (error) {
      setStatusMessage(`Error setting evening lighting: ${error.message}`);
      setShowStatus(true);
      setTimeout(() => setShowStatus(false), 3000);
      console.error('Failed to set evening lighting:', error);
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
      
      {/* Status message overlay */}
      {showStatus && (
        <View style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: [{ translateX: -150 }, { translateY: -25 }],
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          padding: 15,
          borderRadius: 10,
          zIndex: 1000,
          width: 300,
          alignItems: 'center'
        }}>
          <Text style={{ color: 'white', fontSize: 16 }}>{statusMessage}</Text>
        </View>
      )}
      
      {/* Master Light Control Row */}
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
              
              {/* Master ON/OFF buttons */}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 10 }}>
                {isLoading ? (
                  <ActivityIndicator size="small" color="#FFB267" />
                ) : (
                  <>
                    {/* ON Button */}
                    <TouchableOpacity
                      style={{
                        backgroundColor: masterLightOn ? '#FFB267' : '#444',
                        paddingHorizontal: 15,
                        paddingVertical: 8,
                        borderTopLeftRadius: 20,
                        borderBottomLeftRadius: 20,
                        marginRight: 1,
                      }}
                      onPress={handleAllLightsOn}
                      disabled={isLoading}
                    >
                      <Text style={{ color: masterLightOn ? '#000' : '#FFF' }}>ON</Text>
                    </TouchableOpacity>
                    
                    {/* OFF Button */}
                    <TouchableOpacity
                      style={{
                        backgroundColor: !masterLightOn ? '#FFB267' : '#444',
                        paddingHorizontal: 15,
                        paddingVertical: 8,
                        borderTopRightRadius: 20,
                        borderBottomRightRadius: 20,
                      }}
                      onPress={handleAllLightsOff}
                      disabled={isLoading}
                    >
                      <Text style={{ color: !masterLightOn ? '#000' : '#FFF' }}>OFF</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
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
              shadowColor: "#FFF",
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 1,
              shadowRadius: 4,
              elevation: 6,
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
                  value={100} // Always default to 100% when on
                  isOn={lightStates[lightId] || false}
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
              shadowColor: "#FFF",
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 1,
              shadowRadius: 4,
              elevation: 6,
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
                  value={100} // Always default to 100% when on
                  isOn={lightStates[lightId] || false}
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
              shadowColor: "#FFF",
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 1,
              shadowRadius: 4,
              elevation: 6,
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
                  value={100} // Always default to 100% when on
                  isOn={lightStates[lightId] || false}
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

export default ImprovedLightScreenTablet;