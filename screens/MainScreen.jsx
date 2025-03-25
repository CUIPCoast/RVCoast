import React, { useState } from "react";
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
  
    
    

   // Button toggle handler
   const handleToggle = (toggleFunction, currentValue) => {
    toggleFunction(!currentValue);
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
                    {/* <Text className="text-white">1a</Text> */}
                    <Home />
                </Row>
                <Row className="bg-brown rounded-xl m-3 mb-10" 
                style = {{
                  shadowColor: "#FFFFFF", // Shadow color for iOS
    shadowOffset: { width: 100, height: 120, }, // Shadow offset for iOS
    shadowOpacity: 0.5, // Shadow opacity for iOS
    shadowRadius: 6, // Shadow blur radius for iOS
    elevation: 6, // Shadow for Android
                }}
                size={75}>
                    <System />
                </Row>
            </Col>

            <Col size={30} className="">
            <Row
  className="bg-brown rounded-xl my-3 mb-10"
  style={{
    flexDirection: "column", // Stacks children vertically
    alignItems: "flex-start", // Aligns content to the left by default
    padding: 15, // Adds padding around the content
    marginBottom: 20,
    position: "relative", // Allows absolutely positioned children
    shadowColor: "#FFFFFF", // Shadow color for iOS
    shadowOffset: { width: 100, height: 120, }, // Shadow offset for iOS
    shadowOpacity: 0.5, // Shadow opacity for iOS
    shadowRadius: 6, // Shadow blur radius for iOS
    elevation: 6, // Shadow for Android
  }}
>

<View className="flex-row justify-between items-start w-full mt-[-5] pb-2">
  <View>
    <Text className="text-white mb-1">Heaters</Text>
    {/* Buttons below Heaters */}
    
    <View className="mt-5 space-y-2 mb-5">
  {/* Water Heater Button */}
  <TouchableOpacity
    onPress={() => handleToggle(setWaterHeaterOn, isWaterHeaterOn)}
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

  {/* Water Pump Button */}
  <TouchableOpacity
    onPress={() => handleToggle(setWaterPumpOn, isWaterPumpOn)}
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
                  shadowColor: "#FFF", // Shadow color (black by default, adjust as needed)
                  shadowOffset: { width: 0, height: 6 }, // Shadow offset
                  shadowOpacity: 1, // Shadow transparency
                  shadowRadius: 4, // Shadow blur radius
                  elevation: 6, // Shadow elevation (required for Android)
                }}>
    <ModalComponent nameComponent={"Devices"} />
</Row>

</Col>

    <Col className="pb-5 mt15" size={60} style={{ justifyContent: "center", alignItems: "center" }}>
        <Row
            className="bg-brown rounded-xl ml-2 mt8"
            style={{
                flexDirection: "column",
                alignItems: "center", // Centers items horizontally
                justifyContent: "center", // Centers items vertically
                padding: 10,
                overflow: "visible",
                width: 220, // Adjusted width for the container
                height: 180,
                position: "relative",
                shadowColor: "#FFF", // Shadow color (black by default, adjust as needed)
                shadowOffset: { width: 0, height: 6 }, // Shadow offset
                shadowOpacity: 1, // Shadow transparency
                shadowRadius: 4, // Shadow blur radius
                elevation: 6, // Shadow elevation (required for Android)
            }}
        >
            <Text
                className="text-white"
                style={{
                    position: "absolute", // Position the text at the top-left
                    top: 10, // Adjust spacing from the top
                    left: 10, // Adjust spacing from the left
                    zIndex: 1, // Ensure it stays on top of other elements
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

            <Col className="bg-brown p-2 rounded-xl m-3 mb-10" size={15} style ={{

shadowColor: "#FFF", // Shadow color (black by default, adjust as needed)
shadowOffset: { width: 0, height: 12 }, // Shadow offset
shadowOpacity: 1, // Shadow transparency
shadowRadius: 6, // Shadow blur radius
elevation: 6, // Shadow elevation (required for Android)
            }} >
                <Text className="text-white">Air Conditioning</Text>
                <AirCon  />
            </Col>
        </Row>
        
    </Grid>
  );
};

export default MainScreen;

