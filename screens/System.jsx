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


import BatteryCard from "../components/BatteryCard.jsx";
import { HorizontalLine, VerticalLine, ConnectionDot } from '../components/Lines.js';
import PVChargerCard from "../components/PVChargerCard.jsx";
import GlowingCard from '../components/GlowingCards.jsx';


const System = () => {

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

  // Create a formatted display for grid power
  const formatGridPower = () => {
    if (!victronData || !victronData.grid) {
      return "--";
    }
    
    // If grid is not connected, show as disconnected
    if (!victronData.grid.isConnected) {
      return "Shore Disconnected";
    }
    
    // Build a string with total power and individual line info if available
    let displayText = `${victronData.grid.power}W`;
    
    // Add line info if we have multiple lines or specific line data
    const l1 = victronData.grid.l1Power;
    const l2 = victronData.grid.l2Power;
    
    if (l1 !== 0 || l2 !== 0) {
      displayText += `\nL1: ${l1}W`;
      displayText += ` \nL2: ${l2}W`;
      
    }
    
    return displayText;
  };

  // Tablet view with integrated Victron data
  if (isTablet) {
    return (
      <SafeAreaView style={styles.tabletContainer}>
        {/* ————————————— HEADER ————————————— */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerDay}>Victron System</Text>
            <Text style={styles.headerDate}>Overview</Text>
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
            <GlowingCard glowColor="#D32F2F" style={styles.cardWrapper}>
              <View style={styles.redCard}>
                <View style={styles.redCardHeader}>
                  <Text style={styles.redCardHeaderText}>Grid Power</Text>
                </View>
                <Text style={styles.cardValue}>
                  {formatGridPower()}
                </Text>
              </View>
            </GlowingCard>
            
            <GlowingCard glowColor="#6CB4EE" style={styles.cardWrapper}>
              <Image
                source={require('../assets/victron.png')}
                style={styles.blueCard}
                resizeMode="cover"
              />
            </GlowingCard>
            
            <GlowingCard glowColor="#228B22" style={styles.cardWrapper}>
              <View style={styles.greenCard}>
                <View style={styles.greenCardHeader}>
                  <Text style={styles.greenCardHeaderText}>AC Loads</Text>
                </View>
                <Text style={styles.cardValue}>
                  {victronData ? `${victronData.acLoads.power}W` : "--"}
                </Text>
                <Text style={styles.cardSubtitle}>
                  L1 + L2
                </Text>
              </View>
            </GlowingCard>
          </View>

          {/* ————————————— BOTTOM ROW OF CARDS ————————————— */}
          <View style={styles.panelRow}>
            <BatteryCard>
              {victronData ? (
                <>
                  <Text style={styles.cardValue}>
                    {`${(victronData.battery.soc * 100).toFixed(0)}%`}
                  </Text>
                  <Text style={styles.cardSubtitle}>
                    {`${victronData.battery.power}W`}
                  </Text>
                </>
              ) : (
                <Text style={styles.cardValue}>--</Text>
              )}
            </BatteryCard>
            
            <GlowingCard glowColor="#228B22" style={styles.cardWrapper}>
              <View style={styles.darkerGreenCard}>
                <View style={styles.darkerGreenCardHeader}>
                  <Text style={styles.greenCardHeaderText}>DC Power</Text>
                </View>
                <Text style={[styles.cardValue, { top: 20 }]}>
  {victronData ? `${victronData.dcSystem.power}W` : "--"}
</Text>
              </View>
            </GlowingCard>
            
            <GlowingCard glowColor="#FFBF00" style={styles.cardWrapper}>
              <PVChargerCard
                power={
                  victronData
                    ? `${victronData.pvCharger.power.toFixed(0)}W`
                    : '0W'
                }
                imageSource={require('../assets/smartsolar.png')}   
                cardOffset={{ top: 10, left: 0 }}     // tweak these anytime
                imageOffset={{ top: 60, left: -74 }}   //   ″      ″
              />
            </GlowingCard>
          </View>

          {/* ————————————— CONNECTION LINES ————————————— */}
          
          {/* Red to Blue (Left to Center in top row) */}
          <ConnectionDot top={87} left={270}></ConnectionDot>
          <ConnectionDot top={88} left={402}></ConnectionDot>
          <HorizontalLine top={86} left={245} width={160}></HorizontalLine>
          
          {/* Blue to Green (Center to Right in top row) */}
          <ConnectionDot top={87} left={570}></ConnectionDot>
          <ConnectionDot top={165} left={486}></ConnectionDot>
          <ConnectionDot top={88} left={702}></ConnectionDot>
          <HorizontalLine top={86} left={560} width={200}></HorizontalLine>

          {/* Vertical line from Blue box down */}
          <VerticalLine top={140} left={485} height={130}></VerticalLine>
          <ConnectionDot top={272} left={255}></ConnectionDot>
          
          <ConnectionDot top={272} left={312}></ConnectionDot>
          <VerticalLine top={269} left={311} height={78}></VerticalLine>
          <HorizontalLine top={345} left={312} width={65}></HorizontalLine>

          <ConnectionDot top={346} left={312}></ConnectionDot>

          <HorizontalLine top={271} left={260} width={55}></HorizontalLine>
          <ConnectionDot top={346} left={365}></ConnectionDot>

          <HorizontalLine top={271} left={315} width={170}></HorizontalLine>
          <ConnectionDot top={273} left={486}></ConnectionDot>

          <HorizontalLine top={271} left={490} width={155}></HorizontalLine>
          <ConnectionDot top={273} left={646}></ConnectionDot>

          <VerticalLine top={269} left={645} height={78}></VerticalLine>
          <ConnectionDot top={346} left={647}></ConnectionDot>

          <HorizontalLine top={345} left={650} width={85}></HorizontalLine>
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
                <Text style={styles.energyValue}>
                  {(victronData.battery.soc * 100)}%
                </Text>
                <Text style={styles.energyLabel}>Battery</Text>
                <Text style={styles.energyDetail}>
                  {victronData.battery.spc}V • {` ${victronData.battery.current} A`}
                </Text>
              </View>
              
              <View style={styles.energyItem}>
                <Text style={styles.energyValue}>{victronData.acLoads.power}W</Text>
                <Text style={styles.energyLabel}>Power Usage</Text>
              </View>
              
              <View style={styles.energyItem}>
                <Text style={styles.energyValue}>{victronData.pvCharger.power}W</Text>
                <Text style={styles.energyLabel}>Solar Input</Text>
              </View>
              
              {/* Added Grid Power to mobile view */}
              <View style={styles.energyItem}>
                <Text style={styles.energyValue}>
                  {victronData.grid && victronData.grid.isConnected ? 
                    `${victronData.grid.power}W` : 
                    "Off"}
                </Text>
                <Text style={styles.energyLabel}>Shore Power</Text>
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
    bottom: 15,
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

  darkerGreenCardHeader: {
    backgroundColor: '#004225',
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
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },
  greenCardHeaderText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },
  darkerGreenCardHeaderText: {
    color: '#F',
    fontSize: 18,
    fontWeight: '700',
  },
  
  // Top row cards
  redCard: {
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 8,
    justifyContent: "center",
    alignItems: "center",
    width: 250,
    height: 180,
    backgroundColor: "#D32F2F",
    position: "relative",
    paddingTop: 40,
  
    // Glow
    shadowColor: "#FF6B6B",         // Soft red glow
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.8,
    shadowRadius: 15,
    elevation: 10, // Android
  },
  
  blueCard: {
    borderRadius: 12,
    marginHorizontal: 8,
    width: 160,    // was 180
    height: 160,   // was 140
    backgroundColor: "#1976D2",
    shadowColor: "#6CB4EE",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 15,
    elevation: 10,
    overflow: "hidden",
  },
  
  greenCard: {
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 8,
    justifyContent: "center",
    alignItems: "center",
    width: 250,
    height: 180,
    backgroundColor: "#388E3C",
    position: "relative",
    paddingTop: 40,
  
    // Glow
    shadowColor: "#A0FF9F",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 15,
    elevation: 10,
  },
  
  darkerGreenCard: {
    marginTop: 95,
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 8,
    justifyContent: "center",
    alignItems: "center",
    right: 35,
    width: 220,
    height: 110,
    backgroundColor: "#1B5E20",
  
    // Glow
    shadowColor: "#66FF99",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 15,
    elevation: 10,
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
    textAlign: "center",
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
    flexWrap: 'wrap',
  },
  energyItem: {
    alignItems: 'center',
    paddingHorizontal: 5,
    marginBottom: 12,
    width: '48%', // Allow for 2 items in a row on smaller screens
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