import React, { useState, useEffect } from "react";
import { View, Text, Image, Switch, ScrollView, Pressable, TouchableOpacity } from 'react-native';
import { Col, Row, Grid } from "react-native-easy-grid";
import System from './System';
import moment from 'moment';
import Settings from './Settings';
import ModalComponent from '../components/ModalComponent';
import Map from "../components/Map";
import TankHeaterControl from "../components/TankHeaterControl";

import AwningControlModal from "../components/AwningControlModal";
import AirCon from "./AirCon.jsx";
import Home from "./Home";
import { WaterService } from '../API/RVControlServices.js';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';

// Import RV State Management hooks
import { useRVWater } from "../API/RVStateManager/RVStateHooks";
import rvStateManager from "../API/RVStateManager/RVStateManager";

const MainScreen = () => {
    
    var currentDate = moment().format("MMMM Do, YYYY");
    var DayOfTheWeek = moment().format("dddd");
    
    const [isModalVisible, setModalVisible] = useState(false);
    const [isOn, setIsOn] = useState(false);
    const [isOnGray, setIsOnGray] = useState(false);

    // Use RV State Management hook for water systems
    const { water, toggleWaterPump, toggleWaterHeater } = useRVWater();

    // Tank heater states (these could be moved to RV state manager too if needed)
    const [isFreshHeaterOn, setFreshHeaterOn] = useState(false);
    const [isGreyHeaterOn, setGreyHeaterOn] = useState(false);
    
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState(null);
    const [statusMessage, setStatusMessage] = useState('');
    const [showStatus, setShowStatus] = useState(false);

    // Subscribe to external state changes from RV state manager
    useEffect(() => {
        const unsubscribe = rvStateManager.subscribeToExternalChanges((newState) => {
            if (newState.water) {
                // Show notifications when water systems are changed remotely
                if (newState.water.pumpOn !== undefined) {
                    setStatusMessage(`Water pump ${newState.water.pumpOn ? 'turned on' : 'turned off'} remotely`);
                    setShowStatus(true);
                    setTimeout(() => setShowStatus(false), 3000);
                }
                
                if (newState.water.heaterOn !== undefined) {
                    setStatusMessage(`Water heater ${newState.water.heaterOn ? 'turned on' : 'turned off'} remotely`);
                    setShowStatus(true);
                    setTimeout(() => setShowStatus(false), 3000);
                }
            }
        });
        
        return unsubscribe;
    }, []);
  
    // Clear error message after 5 seconds
    useEffect(() => {
        if (errorMessage) {
            const timer = setTimeout(() => {
                setErrorMessage(null);
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [errorMessage]);

    // Handle water pump toggle with RV state management
    const handleWaterPumpToggle = async () => {
        setIsLoading(true);
        const newState = !water.pumpOn;
        
        try {
            // Update RV state first for immediate UI feedback
            rvStateManager.updateWaterState({ 
                pumpOn: newState,
                lastUpdated: new Date().toISOString()
            });
            
            const result = await WaterService.toggleWaterPump();
            if (result.success) {
                // Show success status
                setStatusMessage(`Water pump ${newState ? 'turned on' : 'turned off'}`);
                setShowStatus(true);
                setTimeout(() => setShowStatus(false), 3000);
                
                setErrorMessage(null);
            } else {
                // Revert state on error
                rvStateManager.updateWaterState({ 
                    pumpOn: !newState,
                    lastUpdated: new Date().toISOString()
                });
                
                setErrorMessage(`Failed to toggle water pump: ${result.error}`);
                setStatusMessage('Failed to toggle water pump');
                setShowStatus(true);
                setTimeout(() => setShowStatus(false), 3000);
            }
        } catch (error) {
            // Revert state on error
            rvStateManager.updateWaterState({ 
                pumpOn: !newState,
                lastUpdated: new Date().toISOString()
            });
            
            setErrorMessage(`Error: ${error.message}`);
            setStatusMessage(`Error: ${error.message}`);
            setShowStatus(true);
            setTimeout(() => setShowStatus(false), 3000);
        } finally {
            setIsLoading(false);
        }
    };
    
    // Handle water heater toggle with RV state management
    const handleWaterHeaterToggle = async () => {
        setIsLoading(true);
        const newState = !water.heaterOn;
        
        try {
            // Update RV state first for immediate UI feedback
            rvStateManager.updateWaterState({ 
                heaterOn: newState,
                lastUpdated: new Date().toISOString()
            });
            
            const result = await WaterService.toggleWaterHeater();
            if (result.success) {
                // Show success status
                setStatusMessage(`Water heater ${newState ? 'turned on' : 'turned off'}`);
                setShowStatus(true);
                setTimeout(() => setShowStatus(false), 3000);
                
                setErrorMessage(null);
            } else {
                // Revert state on error
                rvStateManager.updateWaterState({ 
                    heaterOn: !newState,
                    lastUpdated: new Date().toISOString()
                });
                
                setErrorMessage(`Failed to toggle water heater: ${result.error}`);
                setStatusMessage('Failed to toggle water heater');
                setShowStatus(true);
                setTimeout(() => setShowStatus(false), 3000);
            }
        } catch (error) {
            // Revert state on error
            rvStateManager.updateWaterState({ 
                heaterOn: !newState,
                lastUpdated: new Date().toISOString()
            });
            
            setErrorMessage(`Error: ${error.message}`);
            setStatusMessage(`Error: ${error.message}`);
            setShowStatus(true);
            setTimeout(() => setShowStatus(false), 3000);
        } finally {
            setIsLoading(false);
        }
    };
    
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

            {/* Error message display */}
            {errorMessage && (
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{errorMessage}</Text>
                    <TouchableOpacity 
                        style={styles.dismissButton}
                        onPress={() => setErrorMessage(null)}
                    >
                        <Text style={styles.dismissButtonText}>Dismiss</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Status message */}
            {showStatus && (
                <View style={styles.statusContainer}>
                    <Text style={styles.statusText}>{statusMessage}</Text>
                </View>
            )}

            {/* Loading indicator */}
            {isLoading && (
                <View style={styles.loadingOverlay}>
                    <Text style={styles.loadingText}>Processing command...</Text>
                </View>
            )}

            <Row size={80}>
                <Col size={15} className="">
                    <Row className=" rounded-xl mr-3 ml-3 mt-1 top-5" size={28}>
                        <Home />
                    </Row>
                    <Row className="bg-brown rounded-xl m-3 mb-10 top-15" 
                    style = {{
                        shadowColor: "#FFFFFF",
                        shadowOffset: { width: 100, height: 120, },
                        shadowOpacity: 0.5,
                        shadowRadius: 6,
                        elevation: 6,
                    }}
                    size={75}>
                        <View className="mb-6">
        <Text className="text-white text-lg font-semibold mb-2 top-2 left-3">Live Location</Text>
        <Map />
      </View>
                    </Row>
                </Col>

                <Col size={30} className="">
                <Row
                    className="bg-brown rounded-xl my-3 mb-10"
                    style={{
                        flexDirection: "column",
                        alignItems: "flex-start",
                        padding: 15,
                        marginBottom: 20,
                        position: "relative",
                        shadowColor: "#FFFFFF",
                        shadowOffset: { width: 100, height: 120, },
                        shadowOpacity: 0.5,
                        shadowRadius: 6,
                        elevation: 6,
                    }}
                >

                <View className="flex-row justify-between items-start w-full mt-[-5] pb-2">
                <View>
                    <Text className="text-white mb-1">Heaters</Text>
                    
                    <View className="mt-5 space-y-2 mb-5">
                    
                  {/* Water Heater Button with RV State Management */}
      <TouchableOpacity
        onPress={handleWaterHeaterToggle}
        disabled={isLoading}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={
            water.heaterOn
              ? ['#00C6FB', '#005BEA']
              : ['#1A1A1D', '#1A1A1D']
          }
          style={styles.waterbutton}
        >
          <Ionicons
            name={water.heaterOn ? 'water' : 'water-outline'}
            size={32}
            color="#FFF"
            style={styles.icon}
          />
          <Text style={styles.label}>Water Heater</Text>
        </LinearGradient>
      </TouchableOpacity>

      {/* Water Pump Button with RV State Management */}
      <TouchableOpacity
        onPress={handleWaterPumpToggle}
        disabled={isLoading}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={
            water.pumpOn
              ? ['#00C6FB', '#005BEA']
              : ['#1A1A1D', '#1A1A1D']
          }
          style={styles.waterbutton}
        >
          <Ionicons
            // you can swap this for a "pump" icon if you find one
            name={water.pumpOn ? 'pie-chart' : 'pie-chart-outline'}
            size={32}
            color="#FFF"
            style={styles.icon}
          />
          <Text style={styles.label}>Water Pump</Text>
        </LinearGradient>
      </TouchableOpacity>
                    </View>
                </View>

                {/* TankHeaterControls stay in the same place */}
                <View className="flex-row justify-between w-60 px-4">
                <TankHeaterControl
                    name="Fresh Water"
                    initialPercentage={80}
                    isOn={isOn}
                    setIsOn={setIsOn}
                    trackColor={{ minimum: "lightblue", maximum: "white" }}
                />
                
                <TankHeaterControl
                    name="Gray Water"
                    initialPercentage={40}
                    isOn={isOnGray}
                    setIsOn={setIsOnGray}
                    trackColor={{ minimum: "gray", maximum: "white" }}
                />
                </View>
                </View>


                </Row>

                            
                <Row className="rounded-x2 mt20" style={{ 
                  justifyContent: "center", 
                  alignItems: "center",  
                  
                  }}>
                    
                <Col className="pb-5 mt15" size={60} style={{ justifyContent: "center", alignItems: "center" }}>
                    <Row
                        className="bg-brown rounded-xl ml-2 mt8"
                        style={{
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            padding: 10,
                            overflow: "visible",
                            width: 220,
                            height: 180,
                            position: "relative",
                            shadowColor: "#FFF",
                            shadowOffset: { width: 0, height: 6 },
                            shadowOpacity: 1,
                            shadowRadius: 4,
                            elevation: 6,
                        }}
                    >
                        <Text
                            className="text-white"
                            style={{
                                position: "absolute",
                                top: 10,
                                left: 10,
                                zIndex: 1,
                            }}
                        >
                            Wifi
                        </Text>
                        <Pressable onPress={() => setModalVisible(true)}>
                        <ModalComponent nameComponent="Wifi" />

                        </Pressable>
                        
                    </Row>
                </Col>

                <Col className="pb-5 mt15" size={60} style={{ justifyContent: "center", alignItems: "center" }}>
                    <Row
                        className="bg-brown rounded-xl ml-2 mt8"
                        style={{
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            padding: 10,
                            overflow: "visible",
                            width: 220,
                            height: 180,
                            position: "relative",
                            shadowColor: "#FFF",
                            shadowOffset: { width: 0, height: 6 },
                            shadowOpacity: 1,
                            shadowRadius: 4,
                            elevation: 6,
                        }}
                    >
                        <Text
                            className="text-white"
                            style={{
                                position: "absolute",
                                top: 10,
                                left: 10,
                                zIndex: 1,
                            }}
                        >
                            Awning
                        </Text>
                        <Pressable onPress={() => setModalVisible(true)}>
                            <Image
                                source={require("../assets/abpost61724photoroom-3.png")}
                                style={{
                                    width: 120,
                                    height: 120,
                                    resizeMode: "contain",
                                }}
                            />
                        </Pressable>
                        <AwningControlModal isVisible={isModalVisible} onClose={() => setModalVisible(false)} />
                    </Row>
                </Col>
                </Row>


                </Col>

                <Col className="bg-brown p-2 rounded-xl m-3 mb-10" size={15} style={{
                    shadowColor: "#FFF",
                    shadowOffset: { width: 0, height: 12 },
                    shadowOpacity: 1,
                    shadowRadius: 6,
                    elevation: 6,
                }} >
                    <Text className="text-white">Air Conditioning</Text>
                    <AirCon />
                </Col>
            </Row>
            
        </Grid>
    );
};

const styles = {
    waterbutton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 5,
        marginVertical: 8,
      },
      icon: {
        marginRight: 12,
      },
      label: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '600',
      },
    errorContainer: {
        backgroundColor: "rgba(255, 0, 0, 0.1)",
        padding: 15,
        margin: 10,
        borderRadius: 5,
        borderWidth: 1,
        borderColor: "red",
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        zIndex: 1000,
    },
    errorText: {
        color: "white",
        textAlign: "left",
        flex: 1,
    },
    dismissButton: {
        backgroundColor: "rgba(255, 255, 255, 0.2)",
        padding: 5,
        borderRadius: 3,
        marginLeft: 10,
    },
    dismissButtonText: {
        color: "white",
        fontSize: 12,
    },
    statusContainer: {
        position: "absolute",
        bottom: 80,
        backgroundColor: "rgba(0,0,0,0.7)",
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 5,
        alignSelf: "center",
        zIndex: 1000,
    },
    statusText: {
        color: "white",
        fontWeight: "bold",
    },
    loadingOverlay: {
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: [{ translateX: -100 }, { translateY: -25 }],
        backgroundColor: "rgba(0, 0, 0, 0.7)",
        padding: 20,
        borderRadius: 10,
        zIndex: 1000,
    },
    loadingText: {
        color: "white",
        fontSize: 16,
    }
};

export default MainScreen;