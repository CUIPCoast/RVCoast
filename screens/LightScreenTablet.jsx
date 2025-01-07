import React, {useState} from "react";
import { View, Text, Image, ScrollView } from "react-native";
import { Col, Row, Grid } from "react-native-easy-grid";
import moment from "moment";
import ToggleSwitch from "../components/ToggleSwitch.jsx";
import MainLight from "../components/MainLight";


const LightScreenTablet = () => {
  const [isOn, setIsOn] = useState(false);
  var now = moment().format();
  var currentDate = moment().format("MMMM Do, YYYY");
  var DayOfTheWeek = moment().format("dddd");

  const [sliderValues, setSliderValues] = useState({
      BedOverHead: 50,
      LeftReadingLight: 30,
      RightReadingLight: 70,
      OverHeadBathLight: 45,
      OverHeadVanityLight: 30,
      AccentLight: 60,
      PorchLight:30,
      HitchLight: 50,
      ShowerLight: 70,
      BathOverHead:40,
      VanityLight:50,
      // Add more sliders here as needed
    });
  
    // Handler for changing slider values
    const handleSliderChange = (sliderName, value) => {
      setSliderValues((prevValues) => ({
        ...prevValues,
        [sliderName]: value,
      }));
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
      
      <Row size={5} style={{ justifyContent: "center", alignItems: "center" }}>
  <Col
    
    style={{
      width: "40%",
      height: 60,
      backgroundColor: "#1B1B1B",
      borderRadius: 10,
      justifyContent: "center",
      padding: 20, // Ensure padding is present for spacing
      bottom: 220,
    }}
  >
    <View
      style={{
        flexDirection: "row",
        alignItems: "center", // Align items vertically
        justifyContent: "space-between", // Space content to position left and right
        width: "100%", // Ensure the row takes full width
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center", // Align image and text vertically
        }}
      >
        <Image
          source={require("../assets/lamplight.png")}
          style={{
            width: 40,
            height: 40,
            
            resizeMode: "contain",
            marginRight: 10, // Add spacing between the image and text
          }}
        />
        <Text className="text-white">Light Master</Text>
      </View>
      <ToggleSwitch isOn={isOn} setIsOn={setIsOn} />
    </View>
  </Col>
</Row>

<Row
  size={5}
  style={{
    justifyContent: "center", // Center items horizontally
    alignItems: "center", // Center items vertically
  }}
>
  <View
    style={{
      flexDirection: "row", // Arrange children in a row
      justifyContent: "space-between", // Add space between columns
      width: "45%", // Adjust width of the parent container to fit three boxes
    }}
  >
    {/* First Box */}
    <Col
      style={{
        width: "63%", // Adjust width to ensure space between the columns
        height: 310,
        backgroundColor: "#1B1B1B",
        borderRadius: 10,
        justifyContent: "flex-start", // Align content to the top
        padding: 20,
        marginLeft: -260, // Add space between this column and the next
        marginRight: 30,
        bottom: 140,
      }}
    >
      <Text
        style={{
          color: "white",
          fontSize: 16,
          
          position: "absolute", // Ensure it's in the top-left corner
          top: 10,
          left: 10,
        }}
      >
        Kitchen
      </Text>
       {/* Divider */}
  <View
    style={{
      height: 1, // Divider height
      backgroundColor: "white", // Divider color
      width: "100%", // Full width of the container
      marginTop: 40, // Add spacing below the text
      marginLeft: 20,
      position: "absolute",
      
    }}
  />

<ScrollView style={{
        marginTop: 35,

      }}>

<MainLight
              name="Kitchen Light"
              min={0}
              max={100}
              value={sliderValues.KitchenLight}
              onValueChange={(value) => handleSliderChange('KitchenLight', value)}
            />
            <MainLight
              name="Dining Light"
              min={0}
              max={100}
              value={sliderValues.DiningLight}
              onValueChange={(value) => handleSliderChange('DiningLight', value)}
            />
            <MainLight
              name="Cabinet Light"
              min={0}
              max={100}
              value={sliderValues.CabinetLight}
              onValueChange={(value) => handleSliderChange('CabinetLight', value)}
            />
            <MainLight
              name="Wardrobe Light"
              min={0}
              max={100}
              value={sliderValues.WardrobeLight}
              onValueChange={(value) => handleSliderChange('WardrobeLight', value)}
            />
        </ScrollView>
  
    </Col>

    {/* Second Box */}
    <Col
      style={{
        width: "70%",
        height: 310,
        backgroundColor: "#1B1B1B",
        borderRadius: 10,
        justifyContent: "flex-start", // Align content to the top
        padding: 20,
        marginRight: 30, // Add space between this column and the next
        bottom: 140,
      }}
    >
      <Text
        style={{
          color: "white",
          fontSize: 16,
          
          position: "absolute", // Ensure it's in the top-left corner
          top: 10,
          left: 10,
        }}
      >
        
        Bedroom
      </Text>
      {/* Divider */}
  <View
    style={{
      height: 1, // Divider height
      backgroundColor: "white", // Divider color
      width: "100%", // Full width of the container
      marginTop: 40, // Add spacing below the text
      marginLeft: 20,
      position: "absolute",
      
    }}
  />

<ScrollView style={{
        marginTop: 35,

      }}>
        <View>
        <MainLight
                name="Bed Light"
                min={0}
                max={100}
                value={sliderValues.BedOverHead}
                onValueChange={(value) => handleSliderChange('BedOverHead', value)} />
              <MainLight
                name="Left Reading Light"
                min={0}
                max={100}
                value={sliderValues.LeftReadingLight}
                onValueChange={(value) => handleSliderChange('LeftReadingLight', value)} />
              <MainLight
                name="Right Reading Light"
                min={0}
                max={100}
                value={sliderValues.RightReadingLight}
                onValueChange={(value) => handleSliderChange('RightReadingLight', value)} />
          
        </View>
      </ScrollView>
    </Col>

    {/* Third Box */}
    <Col
      style={{
        width: "70%",
        height: 310,
        backgroundColor: "#1B1B1B",
        borderRadius: 10,
        justifyContent: "flex-start", // Align content to the top
        padding: 20,
        bottom: 140,
      }}
    >
      <Text
        style={{
          color: "white",
          fontSize: 16,
          
          position: "absolute", // Ensure it's in the top-left corner
          top: 10,
          left: 10,
        }}
      >
        Bathroom
      </Text>

      {/* Divider */}
  <View
    style={{
      height: 1, // Divider height
      backgroundColor: "white", // Divider color
      width: "100%", // Full width of the container
      marginTop: 40, // Add spacing below the text
      marginLeft: 20,
      position: "absolute",
      
    }}
  />

      <ScrollView style={{
        marginTop: 35,

      }}>
        <View>
        <MainLight
            name="Bath Over Head Light"
            min={0}
            max={100}
            value={sliderValues.BathOverHead}
            onValueChange={(value) => handleSliderChange('BathOverHead', value)}
          />
         
          <MainLight
            name="Accent Light"
            min={0}
            max={100}
            value={sliderValues.AccentLight}
            onValueChange={(value) => handleSliderChange('AccentLight', value)}
          />
          <MainLight
            name="Vanity Light"
            min={0}
            max={100}
            value={sliderValues.VanityLight}
            onValueChange={(value) => handleSliderChange('VanityLight', value)}
          />
          
        </View>
      </ScrollView>
      
      
      
    </Col>
  </View>
</Row>







    </Grid>
  );
};

export default LightScreenTablet;
