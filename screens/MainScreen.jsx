import React, { useState } from "react";
import { View, Text, Image, Switch, ScrollView, Pressable, TouchableOpacity } from 'react-native';
import { Col, Row, Grid } from "react-native-easy-grid";
import System from './System';
import moment from 'moment'; 
import Settings from './Settings';
import ModalComponent from '../components/ModalComponent';

import TankHeaterControl from "../components/TankHeaterControl";
import { useNavigation } from "@react-navigation/native";
import AwningControlModal from "../components/AwningControlModal";
import AirCon from "./AirCon.jsx";
import Home from "./Home";



const MainScreen = () => {
    var now = moment().format();
    var currentDate = moment().format("MMMM Do, YYYY");
    var DayOfTheWeek = moment().format("dddd");
    const navigation = useNavigation(); // Access navigation
    const [isModalVisible, setModalVisible] = useState(false);
    const [isOn, setIsOn] = useState(false);
    const [isOnGray, setIsOnGray] = useState(false);


    const [sliderValues, setSliderValues] = useState({
        BedOverHead: 50,
        OverHeadVanityLight: 30,
        AccentLight: 60,
    });
    
// Function to handle slider changes
  const handleSliderChange = (sliderName, value) => {
    setSliderValues((prevValues) => ({
      ...prevValues,
      [sliderName]: value,
    }));
  };
  const handleButtonClick = (buttonName) => {
    console.log(`${buttonName} clicked`);
    // Add your navigation or functionality here
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
                <Row className="bg-brown rounded-xl m-3 mb-10" size={75}>
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
  }}
>
<View className="flex-row justify-between items-start w-full mt-[-10]">
  <View>
    <Text className="text-white mb-1">Heaters</Text>
    {/* Buttons below Heaters */}
    
    <View className="space-y-2 mb-4">
      {/* Button 1 */}
      <TouchableOpacity
        className="flex-row items-center bg-gray-700 rounded-md p-2"
        style={{ backgroundColor: "#1A1A1D" }}
        onPress={() => handleButtonClick("Fresh Heater")}
      >
        <Image
          source={require("../assets/icons8-water-heater-64.png")} // Replace with your image path
          className="h-7 w-7 mr-1"
          style={{ resizeMode: "contain" }}
        />
        <Text className="text-white text-sm">Fresh Heater</Text>
      </TouchableOpacity>

      {/* Button 2 */}
      <TouchableOpacity
        className="flex-row items-center bg-gray-700 rounded-md p-2"
        style={{ backgroundColor: "#1A1A1D" }}
        onPress={() => handleButtonClick("Grey Heater")}
      >
        <Image
          source={require("../assets/icons8-water-heater-64.png")} // Replace with your image path
          className="h-7 w-7 mr-1"
          style={{ resizeMode: "contain" }}
        />
        <Text className="text-white text-sm">Grey Heater</Text>
      </TouchableOpacity>

      {/* Button 3 */}
      <TouchableOpacity
        className="flex-row items-center bg-gray-700 rounded-md p-2"
        style={{ backgroundColor: "#1A1A1D" }}
        onPress={() => handleButtonClick("Water Heater")}
      >
        <Image
          source={require("../assets/icons8-water-heater-64 (1).png")} // Replace with your image path
          className="h-7 w-7 mr-1"
          style={{ resizeMode: "contain" }}
        />
        <Text className="text-white text-sm">Water Heater</Text>
      </TouchableOpacity>

      {/* Button 4 */}
      <TouchableOpacity
        className="flex-row items-center bg-gray-700 rounded-md p-2"
        style={{ backgroundColor: "#1A1A1D" }}
        onPress={() => handleButtonClick("Water Pump")}
      >
        <Image
          source={require("../assets/icons8-water-pump-64.png")} // Replace with your image path
          className="h-7 w-7 mr-1"
          style={{ resizeMode: "contain" }}
        />
        <Text className="text-white text-sm">Water Pump</Text>
      </TouchableOpacity>
    </View>

    
    
  </View>

  {/* TankHeaterControls stay in the same place */}
  <View className="flex-row space-x-4">
    <TankHeaterControl
      name="Fresh Water"
      percentage={80}
      isOn={isOn}
      setIsOn={setIsOn}
      trackColor={{ minimum: "lightblue", maximum: "white" }}
    />
    <TankHeaterControl
      name="Gray Water"
      percentage={40}
      isOn={isOnGray}
      setIsOn={setIsOnGray}
      trackColor={{ minimum: "gray", maximum: "white" }}
    />
  </View>
</View>


</Row>

                
                <Row className="rounded-xl mt15" style={{ justifyContent: "center", alignItems: "center" }}>
                <Col className="pb-10 mt10  "size={60} style={{ justifyContent: "center", alignItems: "center" }}>
                
                <Row className="bg-brown rounded-xl ml-2  pb-10 ">
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

            <Col className="bg-brown p-2 rounded-xl m-3 mb-10" size={15} >
                <Text className="text-white">Air Conditioning</Text>
                <AirCon  />
            </Col>
        </Row>
        
    </Grid>
  );
};

export default MainScreen;

