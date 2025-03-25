import React, { useState, useEffect } from "react";
import { View, Text, Image, Switch, ScrollView, Pressable, TouchableOpacity } from 'react-native';
import { Col, Row, Grid } from "react-native-easy-grid";
import System from './System';
import moment from 'moment';
import Settings from './Settings';
import ModalComponent from '../components/ModalComponent';
import { Platform } from 'react-native';
import TankHeaterControl from "../components/TankHeaterControl";
import { useNavigation } from "@react-navigation/native";
import AwningControlModal from "../components/AwningControlModal";
import AirCon from "./AirCon.jsx";
import Home from "./Home";
import { RVControlService } from "../API/rvAPI";

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
  
    // Handle water pump toggle
    const handleWaterPumpToggle = async () => {
        try {
            // Using raw command as per the provided CAN bus logs
            await RVControlService.executeRawCommand('19FEDB9F#2CFFC805FF00FFFF');
            setWaterPumpOn(!isWaterPumpOn);
        } catch (error) {
            console.error('Failed to toggle water pump:', error);
            // Optionally add error handling/display here
        }
    };
    
    // Handle water heater toggle
    const handleWaterHeaterToggle = async () => {
        try {
            // Using raw command as per the provided CAN bus logs
            await RVControlService.executeRawCommand('19FEDB9F#2BFFC805FF00FFFF');
            setWaterHeaterOn(!isWaterHeaterOn);
        } catch (error) {
            console.error('Failed to toggle water heater:', error);
            // Optionally add error handling/display here
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
            <Row size={80}>
                <Col size={15} className="">
                    <Row className=" rounded-xl mr-3 ml-3 mt-3" size={25}>
                        <Home />
                    </Row>
                    <Row className="bg-brown rounded-xl m-3 mb-10" 
                    style = {{
                        shadowColor: "#FFFFFF",
                        shadowOffset: { width: 100, height: 120, },
                        shadowOpacity: 0.5,
                        shadowRadius: 6,
                        elevation: 6,
                    }}
                    size={75}>
                        <System />
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
                    {/* Water Heater Button - Updated with direct handler */}
                    <TouchableOpacity
                        onPress={handleWaterHeaterToggle}
                        style={{
                        backgroundColor: isWaterHeaterOn ? "#4CAF05" : "#1A1A1D",
                        flexDirection: "row",
                        alignItems: "center",
                        padding: 10,
                        borderRadius: 5,
                        }}
                    >
                        <Image
                        source={require("../assets/icons8-water-heater-64.png")}
                        style={{ width: 55, height: 55, marginRight: 10 }}
                        />
                        <Text style={{ color: "white" }}>Water Heater</Text>
                    </TouchableOpacity>

                    {/* Water Pump Button - Updated with direct handler */}
                    <TouchableOpacity
                        onPress={handleWaterPumpToggle}
                        style={{
                        backgroundColor: isWaterPumpOn ? "#4CAF05" : "#1A1A1D",
                        flexDirection: "row",
                        alignItems: "center",
                        padding: 10,
                        borderRadius: 5,
                        }}
                    >
                        <Image
                        source={require("../assets/icons8-water-pump-64.png")}
                        style={{ width: 55, height: 55, marginRight: 10 }}
                        />
                        <Text style={{ color: "white" }}>Water Pump</Text>
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

                            
                <Row className="rounded-xl mt15" style={{ 
                  justifyContent: "center", 
                  alignItems: "center",  
                  
                  }}>
                <Col className="pb-10 mt10  "size={60} style={{ justifyContent: "center", alignItems: "center" }}>
                
                <Row className="bg-brown rounded-xl ml-2  pb-10 "
                style={{
                  shadowColor: "#FFF",
                  shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: 1,
                  shadowRadius: 4,
                  elevation: 6,
                }}>
                <ModalComponent nameComponent={"Devices"} />
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

export default MainScreen;