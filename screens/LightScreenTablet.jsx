// screens/LightScreenTablet.jsx - Updated to use HoldToDimLight component
import React, { useState, useEffect } from "react";
import { View, Text, Image, ScrollView, Alert, ActivityIndicator, TouchableOpacity } from "react-native";
import { Col, Row, Grid } from "react-native-easy-grid";
import moment from "moment";
import SimpleHoldToDimLight from "../components/SimpleHoldToDimLight.jsx";
import { LightControlService } from "../Service/LightControlService.js";
import { CANBusMonitor } from "../Service/CANBusMonitor.js";
import { LightingScenes } from "../API/rvAPI.js";
import rvStateManager from "../API/RVStateManager/RVStateManager";

const ImprovedLightScreenTablet = () => {
  // Current date/time
  const currentDate = moment().format("MMMM Do, YYYY");
  const dayOfTheWeek = moment().format("dddd");

  // State for loading and operations
  const [isLoading, setIsLoading] = useState(false);
  const [activeDimmingLights, setActiveDimmingLights] = useState(new Set());
  
  // State for master light switch - now derived from RV State Manager
  const [masterLightOn, setMasterLightOn] = useState(false);
  
  // Status messages
  const [statusMessage, setStatusMessage] = useState('');
  const [showStatus, setShowStatus] = useState(false);
  
  // Scene selection
  const [activeScene, setActiveScene] = useState(null);
  const [isApplyingScene, setIsApplyingScene] = useState(false);
  
  // Get all available lights
  const allLights = LightControlService.getAllLights();
  
  // Check if dimming is supported
  const supportsDimming = LightControlService.supportsDimming();
  
  // Individual light states from RV State Manager
  const [lightStates, setLightStates] = useState({});
  const [lightBrightness, setLightBrightness] = useState({});

  // Subscribe to RV State Manager for light states
  useEffect(() => {
    const unsubscribe = rvStateManager.subscribe(({ category, state }) => {
      if (category === 'lights') {
        const currentLights = state.lights || {};
        const newLightStates = {};
        const newLightBrightness = {};
        
        Object.entries(currentLights).forEach(([lightId, lightState]) => {
          newLightStates[lightId] = lightState.isOn;
          newLightBrightness[lightId] = lightState.brightness || 0;
        });
        
        setLightStates(newLightStates);
        setLightBrightness(newLightBrightness);
        
        // Update master state based on any lights being on
        const anyLightOn = Object.values(newLightStates).some(isOn => isOn);
        setMasterLightOn(anyLightOn);
      }
    });

    // Initialize light states on component mount
    const currentLights = rvStateManager.getCategoryState('lights');
    const initialLightStates = {};
    const initialLightBrightness = {};
    
    Object.entries(currentLights).forEach(([lightId, lightState]) => {
      initialLightStates[lightId] = lightState ? lightState.isOn : false;
      initialLightBrightness[lightId] = lightState ? lightState.brightness || 0 : 0;
    });
    
    setLightStates(initialLightStates);
    setLightBrightness(initialLightBrightness);
    
    // Set initial master state
    const anyLightOn = Object.values(initialLightStates).some(isOn => isOn);
    setMasterLightOn(anyLightOn);

    return unsubscribe;
  }, []);

  // Subscribe to CAN bus updates
  useEffect(() => {
    const subscription = CANBusMonitor.subscribeToDimmingUpdates((updates) => {
      Object.entries(updates).forEach(([lightId, updateData]) => {
        const brightness = updateData.brightness || 0;
        const isOn = updateData.isOn || brightness > 0;
        
        // Update RV State Manager
        rvStateManager.updateLightState(lightId, isOn, brightness);
      });
    });
    
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Show status message helper
  const showStatusMessage = (message, duration = 3000) => {
    setStatusMessage(message);
    setShowStatus(true);
    setTimeout(() => setShowStatus(false), duration);
  };

  // Turn all lights on
  const handleAllLightsOn = async () => {
    try {
      setIsLoading(true);
      
      const result = await LightControlService.allLightsOn();
      
      if (result.success) {
        // Update RV State Manager for all lights
        allLights.forEach(lightId => {
          rvStateManager.updateLightState(lightId, true, 75); // Default to 75% brightness
        });
        
        setMasterLightOn(true);
        showStatusMessage('All lights turned ON');
      } else {
        showStatusMessage('Failed to turn all lights ON');
      }
    } catch (error) {
      showStatusMessage(`Error: ${error.message}`);
      console.error('Error turning all lights on:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Turn all lights off
  const handleAllLightsOff = async () => {
    try {
      setIsLoading(true);
      
      // Cancel any active dimming operations first
      for (const lightId of activeDimmingLights) {
        try {
          await LightControlService.cancelDimming(lightId);
        } catch (cancelError) {
          console.warn(`Could not cancel dimming for ${lightId}:`, cancelError);
        }
      }
      setActiveDimmingLights(new Set());
      
      const result = await LightControlService.allLightsOff();
      
      if (result.success) {
        // Update RV State Manager for all lights
        allLights.forEach(lightId => {
          rvStateManager.updateLightState(lightId, false, 0);
        });
        
        setMasterLightOn(false);
        showStatusMessage('All lights turned OFF');
      } else {
        showStatusMessage('Failed to turn all lights OFF');
      }
    } catch (error) {
      showStatusMessage(`Error: ${error.message}`);
      console.error('Error turning all lights off:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Apply lighting scene
  const handleApplyScene = async (sceneKey) => {
    try {
      setIsApplyingScene(true);
      setActiveScene(sceneKey);
      
      const scene = LightingScenes.scenes[sceneKey];
      if (!scene) {
        throw new Error(`Unknown scene: ${sceneKey}`);
      }
      
      showStatusMessage(`Applying ${scene.name}...`, 5000);
      
      // Turn off all lights first if specified
      if (scene.resetFirst) {
        await handleAllLightsOff();
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // Apply each light setting individually using the light control service
      for (const [lightId, brightness] of Object.entries(scene.lights)) {
        try {
          if (brightness > 0) {
            // Turn on the light first
            await LightControlService.turnOnLight(lightId);
            await new Promise(resolve => setTimeout(resolve, 300));
            
            // Update state manager
            rvStateManager.updateLightState(lightId, true, brightness);
          } else {
            // Turn off the light
            await LightControlService.turnOffLight(lightId);
            await new Promise(resolve => setTimeout(resolve, 200));
            
            // Update state manager
            rvStateManager.updateLightState(lightId, false, 0);
          }
        } catch (lightError) {
          console.error(`Error setting ${lightId} for scene:`, lightError);
        }
      }
      
      showStatusMessage(`${scene.name} applied successfully`);
    } catch (error) {
      showStatusMessage(`Error applying scene: ${error.message}`);
      console.error('Error applying scene:', error);
    } finally {
      setIsApplyingScene(false);
      // Clear active scene after a delay
      setTimeout(() => setActiveScene(null), 2000);
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

  // Scene button component
  const SceneButton = ({ sceneKey, label, color = '#FFB267' }) => (
    <TouchableOpacity
      style={{
        backgroundColor: activeScene === sceneKey ? color : '#333',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 15,
        marginRight: 10,
        opacity: isApplyingScene && activeScene !== sceneKey ? 0.5 : 1
      }}
      onPress={() => handleApplyScene(sceneKey)}
      disabled={isApplyingScene}
    >
      {isApplyingScene && activeScene === sceneKey ? (
        <ActivityIndicator size="small" color="#000" />
      ) : (
        <Text style={{ 
          color: activeScene === sceneKey ? '#000' : '#FFF',
          fontSize: 12,
          fontWeight: 'bold'
        }}>
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );

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
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
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
            width: "50%",
            height: 80,
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
              <Text style={{ 
                color: '#FFB267', 
                fontSize: 12, 
                marginLeft: 10,
                fontStyle: 'italic'
              }}>
                Hold-to-Dim Mode
              </Text>
            </View>
            
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {/* Scene Buttons */}
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={{ maxWidth: 300, marginRight: 15 }}
              >
                <View style={{ flexDirection: 'row' }}>
                  <SceneButton sceneKey="mood" label="Mood" />
                  <SceneButton sceneKey="evening" label="Evening" />
                  <SceneButton sceneKey="reading" label="Reading" />
                  <SceneButton sceneKey="nightLight" label="Night" />
                  <SceneButton sceneKey="cooking" label="Cooking" />
                  <SceneButton sceneKey="movie" label="Movie" />
                </View>
              </ScrollView>
              
              {/* Master ON/OFF buttons */}
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
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
                      disabled={isLoading || isApplyingScene}
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
                      disabled={isLoading || isApplyingScene}
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
                <SimpleHoldToDimLight
                  key={lightId}
                  name={getLightDisplayName(lightId)}
                  lightId={lightId}
                  value={lightBrightness[lightId] || 0}
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
                <SimpleHoldToDimLight
                  key={lightId}
                  name={getLightDisplayName(lightId)}
                  lightId={lightId}
                  value={lightBrightness[lightId] || 0}
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
                <SimpleHoldToDimLight
                  key={lightId}
                  name={getLightDisplayName(lightId)}
                  lightId={lightId}
                  value={lightBrightness[lightId] || 0}
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