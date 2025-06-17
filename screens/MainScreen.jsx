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

const MainScreen = () => {
    
    var currentDate = moment().format("MMMM Do, YYYY");
    var DayOfTheWeek = moment().format("dddd");
    
    const [isModalVisible, setModalVisible] = useState(false);
    const [isOn, setIsOn] = useState(false);
    const [isOnGray, setIsOnGray] = useState(false);

    const [isFreshHeaterOn, setFreshHeaterOn] = useState(false);
    const [isGreyHeaterOn, setGreyHeaterOn] = useState(false);
    const [isWaterHeaterOn, setWaterHeaterOn] = useState(false);
    const [isWaterPumpOn, setWaterPumpOn] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState(null);
  
    // Clear error message after 5 seconds
    useEffect(() => {
        if (errorMessage) {
            const timer = setTimeout(() => {
                setErrorMessage(null);
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [errorMessage]);

    // Handle water pump toggle
    const handleWaterPumpToggle = async () => {
        setIsLoading(true);
        try {
            const result = await WaterService.toggleWaterPump();
            if (result.success) {
                setWaterPumpOn(!isWaterPumpOn);
                setErrorMessage(null);
            } else {
                setErrorMessage(`Failed to toggle water pump: ${result.error}`);
            }
        } catch (error) {
            setErrorMessage(`Error: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };
    
    // Handle water heater toggle
    const handleWaterHeaterToggle = async () => {
        setIsLoading(true);
        try {
            const result = await WaterService.toggleWaterHeater();
            if (result.success) {
                setWaterHeaterOn(!isWaterHeaterOn);
                setErrorMessage(null);
            } else {
                setErrorMessage(`Failed to toggle water heater: ${result.error}`);
            }
        } catch (error) {
            setErrorMessage(`Error: ${error.message}`);
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
                            paddingBottom: -10,
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
                       
                    </Row>
                    <Row className="bg-brown rounded-xl m-3 mb-10 top-15" 
                    style = {{
                        shadowColor: "#FFFFFF",
                        
                        shadowOpacity: 0.5,
                        shadowRadius: 2,
                        elevation: 6,
                    }}
                    size={85}>
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
                        
                        shadowOpacity: 0.5,
                        shadowRadius: 2,
                        elevation: 6,
                    }}
                >

                <View className="flex-row justify-between items-start w-full mt-[-5] pb-2">
                <View>
                    <Text className="text-white mb-1">Heaters</Text>
                    
                    <View className="mt-5 space-y-2 mb-5">
                    
                  {/* Water Heater Button */}
      <TouchableOpacity
        onPress={handleWaterHeaterToggle}
        disabled={isLoading}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={
            isWaterHeaterOn
              ? ['#00C6FB', '#005BEA']
              : ['#1A1A1D', '#1A1A1D']
          }
          style={styles.waterbutton}
        >
          <Ionicons
            name={isWaterHeaterOn ? 'water' : 'water-outline'}
            size={32}
            color="#FFF"
            style={styles.icon}
          />
          <Text style={styles.label}>Water Heater</Text>
        </LinearGradient>
      </TouchableOpacity>

      {/* Water Pump Button */}
      <TouchableOpacity
        onPress={handleWaterPumpToggle}
        disabled={isLoading}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={
            isWaterPumpOn
              ? ['#00C6FB', '#005BEA']
              : ['#1A1A1D', '#1A1A1D']
          }
          style={styles.waterbutton}
        >
          <Ionicons
            // you can swap this for a “pump” icon if you find one
            name={isWaterPumpOn ? 'pie-chart' : 'pie-chart-outline'}
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
                            width: 260,
                            height: 280,
                            position: "relative",
                            shadowColor: "#FFF",
                            
                            shadowOpacity: 1,
                            shadowRadius: 2,
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
                             width: 260,
                            height: 280,
                            position: "relative",
                            shadowColor: "#FFF",
                            
                            shadowOpacity: 1,
                            shadowRadius: 2,
                            elevation: 3,
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
                                    width: 180,
                                    height: 180,
                                    resizeMode: "contain",
                                }}
                            />
                        </Pressable>
                        <AwningControlModal isVisible={isModalVisible} onClose={() => setModalVisible(false)} />
                    </Row>
                </Col>
                </Row>


                </Col>

                <Col className="bg-brown p-2 rounded-xl m-3 mb-13" size={16} style={{
                    shadowColor: "#FFF",
                    
                    shadowOpacity: 1,
                    
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
        shadowRadius: 2,
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
        padding: 10,
        margin: 10,
        borderRadius: 5,
        borderWidth: 1,
        borderColor: "red",
        zIndex: 1000,
    },
    errorText: {
        color: "white",
        textAlign: "center",
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