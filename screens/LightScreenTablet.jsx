import React from "react";
import { View, Text, Image } from "react-native";
import { Col, Row, Grid } from "react-native-easy-grid";
import moment from 'moment'; 
const LightScreenTablet = () => {

    var now = moment().format();
      var currentDate = moment().format("MMMM Do, YYYY");
      var DayOfTheWeek = moment().format("dddd");
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
      <Row size={70}>
        <Col size={30}>
          <Row
            className="bg-brown rounded-xl my-3"
            style={{
              flexDirection: "column",
              alignItems: "flex-start",
              padding: 10,
            }}
          >
            <Text className="text-white">Light Details</Text>
            <Image
              source={require("../assets/lamplight.png")}
              style={{
                width: 45,
                height: 45,
                resizeMode: "contain",
                marginTop: 10,
                marginLeft: 10,
              }}
            />
          </Row>
        </Col>
      </Row>
    </Grid>
  );
};

export default LightScreenTablet;