// screens/LightScreenTablet.jsx - Updated with removed scenes and separate master control
import React, { useState, useEffect } from "react";
import { View, Text, Image, ScrollView, Alert, ActivityIndicator, TouchableOpacity } from "react-native";
import { Col, Row, Grid } from "react-native-easy-grid";
import moment from "moment";
import SimpleHoldToDimLight from "../components/SimpleHoldToDimLight.jsx";
import { LightControlService } from "../Service/LightControlService.js";
import { CANBusMonitor } from "../Service/CANBusMonitor.js";
import { LightingScenes } from "../API/rvAPI.js";
import rvStateManager from "../API/RVStateManager/RVStateManager";
import { handleAllLightsOn, handleAllLightsOff, getLightDisplayName, getLightGroups, showStatusMessage } from "../helper";

const ImprovedLightScreenTablet = () => {
  // Current date/time
  const currentDate = moment().format("MMMM Do, YYYY");
  const dayOfTheWeek = moment().format("dddd");

  // State for loading and operations
  const [isLoading, setIsLoading] = useState(false);
  const [activeDimmingLights, setActiveDimmingLights] = useState(new Set());
  
  // State for master light switch - independent from individual lights
  const [masterLightOn, setMasterLightOn] = useState(false);
  
  // Status messages
  const [statusMessage, setStatusMessage] = useState('');
  const [showStatus, setShowStatus] = useState(false);
  
  // Get all available lights
  const allLights = LightControlService.getAllLights();
  
  // Check if dimming is supported
  const supportsDimming = LightControlService.supportsDimming();
  
  // Individual light states from RV State Manager
  const [lightStates, setLightStates] = useState({});
  const [lightBrightness, setLightBrightness] = useState({});

  // Subscribe to RV State Manager for light states (but don't affect master)
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
        
        // Master state is now independent - don't update based on individual lights
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


  // Turn all lights on
  const handleAllLightsOnPress = async () => {
    const success = await handleAllLightsOn(
      allLights,
      setIsLoading,
      (message) => showStatusMessage(message, setStatusMessage, setShowStatus)
    );
    if (success) {
      setMasterLightOn(true);
    }
  };
  
  // Turn all lights off
  const handleAllLightsOffPress = async () => {
    const success = await handleAllLightsOff(
      allLights,
      activeDimmingLights,
      setActiveDimmingLights,
      setIsLoading,
      (message) => showStatusMessage(message, setStatusMessage, setShowStatus)
    );
    if (success) {
      setMasterLightOn(false);
    }
  };

  // Group lights by category
  const lightGroups = getLightGroups();


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
            
            {/* Master ON/OFF buttons with even spacing */}
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {isLoading ? (
                <ActivityIndicator size="small" color="#FFB267" />
              ) : (
                <>
                  {/* ON Button */}
                  <TouchableOpacity
                    style={{
                      backgroundColor: masterLightOn ? '#FFB267' : '#444',
                      paddingHorizontal: 20,
                      paddingVertical: 10,
                      borderTopLeftRadius: 20,
                      borderBottomLeftRadius: 20,
                      marginRight: 1,
                    }}
                    onPress={handleAllLightsOnPress}
                    disabled={isLoading}
                  >
                    <Text style={{ 
                      color: masterLightOn ? '#000' : '#FFF',
                      fontWeight: 'bold'
                    }}>ON</Text>
                  </TouchableOpacity>
                  
                  {/* OFF Button */}
                  <TouchableOpacity
                    style={{
                      backgroundColor: !masterLightOn ? '#FFB267' : '#444',
                      paddingHorizontal: 20,
                      paddingVertical: 10,
                      borderTopRightRadius: 20,
                      borderBottomRightRadius: 20,
                    }}
                    onPress={handleAllLightsOffPress}
                    disabled={isLoading}
                  >
                    <Text style={{ 
                      color: !masterLightOn ? '#000' : '#FFF',
                      fontWeight: 'bold'
                    }}>OFF</Text>
                  </TouchableOpacity>
                </>
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