import React, { useState, useEffect } from "react";
import { ScrollView, View, Text, Image, StyleSheet, TouchableOpacity } from "react-native";

import Map from "../components/Map";
import useScreenSize from "../helper/useScreenSize.jsx";

import { Col, Row, Grid } from "react-native-easy-grid";
import VictronEnergyPanel from "../components/VictronEnergyPanel";
import EnergyFlowDiagram from "../components/EnergyFlowDiagram";
import { VictronEnergyService } from "../API/VictronEnergyService";
import moment from 'moment';

const System = () => {

   var currentDate = moment().format("MMMM Do, YYYY");
  var DayOfTheWeek = moment().format("dddd");
  const [isOn, setIsOn] = useState(false);
  
  const isTablet = useScreenSize();
  const [victronData, setVictronData] = useState(null);
  const [energyError, setEnergyError] = useState(null);
  const [showDetailedView, setShowDetailedView] = useState(false);
  const [batteryLevel, setBatteryLevel] = useState(12.5);

  // Fetch Victron data when component mounts
  useEffect(() => {
    const fetchVictronData = async () => {
      try {
        const data = await VictronEnergyService.getAllData();
        setVictronData(data);
        
        // Update battery level if available
        if (data && data.battery && data.battery.voltage) {
          setBatteryLevel(data.battery.voltage);
        }
      } catch (error) {
        console.error("Failed to load Victron data:", error);
        setEnergyError("Could not connect to the Victron system");
      }
    };

    fetchVictronData();
    
    // Set up refresh interval
    const intervalId = setInterval(fetchVictronData, 10000); // Refresh every 10 seconds
    
    // Clean up on unmount
    return () => clearInterval(intervalId);
  }, []);
  
  // Handle Victron panel error
  const handleEnergyError = (error) => {
    setEnergyError(error);
  };
  
  // Toggle between simple and detailed energy views
  const toggleEnergyView = () => {
    setShowDetailedView(!showDetailedView);
  };

  // Tablet view with integrated Victron data
  if (isTablet) {
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

                  
              


      </Grid>
      
    )
    
  }
  
  // Mobile view
  return (
    <ScrollView 
      overScrollMode="never"
      contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 20 }} 
      decelerationRate={0.8}
      className="bg-brown"
    >
      <Text className="text-white text-3xl font-semibold mb-4">RV Health</Text>
      
      {/* Victron Energy Panel */}
      {/* Show either detailed or simple energy panel based on user preference */}
      {showDetailedView ? (
        <>
          <VictronEnergyPanel 
            onError={handleEnergyError} 
            refreshInterval={10000} 
          />
          <EnergyFlowDiagram energyData={victronData} />
        </>
      ) : (
        <View style={styles.simplePanelContainer}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>Energy Status</Text>
            <TouchableOpacity onPress={toggleEnergyView}>
              <Text style={styles.viewDetailText}>View Details</Text>
            </TouchableOpacity>
          </View>
          
          {victronData ? (
            <View style={styles.simpleEnergyData}>
              <View style={styles.energyItem}>
                <Text style={styles.energyValue}>{victronData.battery.soc.toFixed(1)}%</Text>
                <Text style={styles.energyLabel}>Battery</Text>
                <Text style={styles.energyDetail}>
                {victronData.battery.voltage.toFixed(1)}V • {victronData.battery.state.toFixed(1)}

                </Text>
              </View>
              
              <View style={styles.energyItem}>
                <Text style={styles.energyValue}>{victronData.acLoads.power}W</Text>
                <Text style={styles.energyLabel}>Power Usage</Text>
              </View>
              
              <View style={styles.energyItem}>
                <Text style={styles.energyValue}>{victronData.pvCharger.power.toFixed(1)}W</Text>
                <Text style={styles.energyLabel}>Solar Input</Text>
              </View>
            </View>
          ) : (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>
                {energyError ? energyError : "Loading energy data..."}
              </Text>
            </View>
          )}
        </View>
      )}
      
      <View className="mb-6">
        <Text className="text-white text-lg font-semibold mb-2">Live Location</Text>
        <Map />
      </View>
      
     
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  simplePanelContainer: {
    backgroundColor: '#211D1D',
    borderRadius: 15,
    padding: 16,
    marginBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  viewDetailText: {
    fontSize: 12,
    color: '#FFB267',
  },
  simpleEnergyData: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  energyItem: {
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  energyValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  energyLabel: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  energyDetail: {
    fontSize: 10,
    color: '#999',
    marginTop: 2,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    color: '#999',
  },
  tanksContainer: {
    backgroundColor: '#211D1D',
    borderRadius: 15,
    padding: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 12,
  },
});

export default System;