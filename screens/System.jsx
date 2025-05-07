import React, { useState, useEffect } from "react";
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
} from "react-native";

import Map from "../components/Map";
import useScreenSize from "../helper/useScreenSize.jsx";
import VictronEnergyPanel from "../components/VictronEnergyPanel";
import EnergyFlowDiagram from "../components/EnergyFlowDiagram";
import { VictronEnergyService } from "../API/VictronEnergyService";
import moment from "moment";

import BatteryCard from "../components/BatteryCard.jsx";
import { HorizontalLine, VerticalLine, ConnectionDot } from '../components/Lines.js';



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
      <SafeAreaView style={styles.tabletContainer}>
        {/* ————————————— HEADER ————————————— */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerDay}>{DayOfTheWeek}</Text>
            <Text style={styles.headerDate}>{currentDate}</Text>
          </View>
          <Image
            source={require("../assets/images/icon.png")}
            style={styles.logo}
          />
        </View>

        {/* ————————————— DIAGRAM CONTAINER ————————————— */}
        <View style={styles.diagramContainer}>
          {/* ————————————— TOP ROW OF CARDS ————————————— */}
          <View style={styles.panelRow}>
            <View style={styles.redCard}>
              <View style={styles.redCardHeader}>
                <Text style={styles.redCardHeaderText}>Grid Power</Text>
              </View>
              <Text style={styles.cardValue}>--</Text>
            </View>

            <View style={styles.blueCard}>
            <View style={styles.blueCardHeader}>
                <Text style={styles.blueCardHeaderText}>Inverting</Text>
              </View>
              <Text style={styles.cardValue}>
                {victronData
                  ? `${victronData.dcSystem.power.toFixed(0)}W`
                  : "--"}
              </Text>
              <Image
                source={require("../assets/wifi.png")}
                style={styles.victronLogo}
              />
            </View>

            <View style={styles.greenCard}>
              <View style={styles.greenCardHeader}>
                <Text style={styles.greenCardHeaderText}>AC Loads</Text>
              </View>
              <Text style={styles.cardValue}>
                {victronData ? `${victronData.acLoads.power}W` : "--"}
              </Text>
              <Text style={styles.cardSubtitle}>
                {victronData ? victronData.acLoads.lines.join(" + ") : ""}
              </Text>
            </View>
          </View>

          {/* ————————————— BOTTOM ROW OF CARDS ————————————— */}
          <View style={styles.panelRow}>
          <BatteryCard>
  {victronData ? (
    <>
      <Text style={styles.cardValue}>
        {`${victronData.battery.soc.toFixed(0)}%`}
      </Text>
      <Text style={styles.cardSubtitle}>
        {`${victronData.battery.power}W`}
      </Text>
    </>
  ) : (
    <Text style={styles.cardValue}>--</Text>
  )}
</BatteryCard>

            <View style={styles.darkerGreenCard}>
              <Text style={styles.cardTitle}>DC Power</Text>
              <Text style={styles.cardValue}>
                {victronData
                  ? `${victronData.dcSystem.power}W`
                  : "--"}
              </Text>
            </View>

            <View style={styles.orangeCard}>
            <View style={styles.orangeCardHeader}>
                <Text style={styles.orangeCardHeaderText}>PV Charger</Text>
              </View>
              
              <Text style={styles.cardValue}>
                {victronData
                  ? `${victronData.pvCharger.power.toFixed(0)}W`
                  : "0W"}
              </Text>
            </View>
          </View>

          {/* ————————————— CONNECTION LINES ————————————— */}
          
          {/* */}
          {/* Red to Blue (Left to Center in top row) */}
          <ConnectionDot top={88} left = {260}></ConnectionDot>
          <ConnectionDot top={88} left = {395}></ConnectionDot>
          <HorizontalLine top={86} left = {260} width={200}></HorizontalLine>
          


          {/* Blue to Green (Center to Right in top row) */}
         


          {/* Vertical line from Blue box down */}
         

          {/* Left bottom box to center vertical line */}
     


          {/* Right bottom box to center vertical line */}
         

        </View>
      </SafeAreaView>
    );
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
  
  tabletContainer: {
    flex: 1,
    backgroundColor: "#000",
    padding: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  headerDay: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "600",
  },
  headerDate: {
    color: "#fff",
    fontSize: 16,
  },
  logo: {
    width: 70,
    height: 45,
    backgroundColor: "#fff",
    borderRadius: 8,
  },
  diagramContainer: {
    flex: 1,
    position: 'relative',
  },
  panelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
    zIndex: 1,
  },

  
  
  // Card header styles
  redCardHeader: {
    backgroundColor: '#FE6F5E',
    width: '100%',
    paddingVertical: 8,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    alignItems: 'center',
    position: 'absolute',
    top: 10,
    
  },

  blueCardHeader: {
    backgroundColor: '#B9D9EB',
    width: '100%',
    paddingVertical: 8,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    alignItems: 'center',
    position: 'absolute',
    top: 10,

  },

  greenCardHeader: {
    backgroundColor: '#50C878',
    width: '100%',
    paddingVertical: 8,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    alignItems: 'center',
    position: 'absolute',
    top: 10,

  },

  orangeCardHeader: {
    backgroundColor: '#E86100',
    width: '100%',
    paddingVertical: 8,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    alignItems: 'center',
    position: 'absolute',
    top: 10,

  },
  redCardHeaderText: {
    color: '#FFB3B3',
    fontSize: 18,
    fontWeight: '700',
  },
  greenCardHeaderText: {
    color: '#A0FF9F',
    fontSize: 18,
    fontWeight: '700',
  },
  blueCardHeaderText: {
    color: '#0047AB',
    fontSize: 18,
    fontWeight: '700',
  },
  orangeCardHeaderText: {
    color: '#F7E7CE',
    fontSize: 18,
    fontWeight: '700',
  },
 
  // Top row cards
  redCard: {
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 8,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
    justifyContent: "center",
    alignItems: "center",
    width: 250,
    height: 180,
    backgroundColor: "#D32F2F",
    position: "relative",
    paddingTop: 40, // Add padding at the top to accommodate the header
  },
  
  blueCard: {
    
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 8,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
    justifyContent: "center",
    alignItems: "center",
    width: 180,
    height: 140,
    backgroundColor: "#1976D2",
    // Add any blue card specific styling here
  },
  
  greenCard: {
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 8,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
    justifyContent: "center",
    alignItems: "center",
    width: 250,
    height: 180,
    backgroundColor: "#388E3C",
    position: "relative",
    paddingTop: 40, // Add padding at the top to accommodate the header
  },
  
  // Bottom row cards
  darkGreenCard: {
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 8,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
    justifyContent: "center",
    alignItems: "center",
    width: 250,
    height: 150,
    backgroundColor: "#2E7D32",
  },
  
  darkerGreenCard: {
    marginTop: 70,
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 8,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
    justifyContent: "center",
    alignItems: "center",
    right:35,
    width: 220,
    height: 110,
    backgroundColor: "#1B5E20",
    // Add any darker green card specific styling here
  },
  
  orangeCard: {
    
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 8,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
    justifyContent: "center",
    alignItems: "center",
    width: 180,
    height: 140,
    backgroundColor: "#F57C00",
    // Add any orange card specific styling here
  },
  cardTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
  },
  cardValue: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "700",
  },
  cardSubtitle: {
    color: "#fff",
    fontSize: 12,
    marginTop: 4,
  },
  victronLogo: {
    width: 80,
    height: 15,
    marginTop: 8,
    tintColor: '#fff',
  },
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