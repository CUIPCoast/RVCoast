import React from "react";
import { View, Text, Image } from "react-native";
import { Col, Row, Grid } from "react-native-easy-grid";

const LightScreenTablet = () => {
  return (
    <Grid className="bg-black">
      <Row size={10}>
        <Col>
          <Text className="text-2xl text-white">Light Screen</Text>
        </Col>
      </Row>
      <Row size={90}>
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