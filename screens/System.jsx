import React, { useState, useEffect } from "react";
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
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

const { width: screenWidth } = Dimensions.get('window');

const System = () => {
  const isTablet = useScreenSize();
  const [victronData, setVictronData] = useState(null);
  const [energyError, setEnergyError] = useState(null);
  const [showDetailedView, setShowDetailedView] = useState(false);
  const [batteryLevel, setBatteryLevel] = useState(12.5);
  const [refreshing, setRefreshing] = useState(false);

  // Helper function to format numbers to 2 decimal places
  const formatNumber = (value, unit = '') => {
    if (value === null || value === undefined || value === '--') return '--';
    const num = parseFloat(value);
    if (isNaN(num)) return '--';
    return `${num.toFixed(2)}${unit}`;
  };

  // Helper function to format power values specifically
  const formatPower = (value) => {
    if (value === null || value === undefined) return '--';
    const num = parseFloat(value);
    if (isNaN(num)) return '--';
    return `${num.toFixed(2)}W`;
  };

  // Fetch Victron data when component mounts
  useEffect(() => {
    const fetchVictronData = async () => {
      try {
        setRefreshing(true);
        const data = await VictronEnergyService.getAllData();
        setVictronData(data);
        setEnergyError(null);
        
        // Update battery level if available
        if (data && data.battery && data.battery.voltage) {
          setBatteryLevel(data.battery.voltage);
        }
      } catch (error) {
        console.error("Failed to load Victron data:", error);
        setEnergyError("Could not connect to the Victron system");
      } finally {
        setRefreshing(false);
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
    let displayText = formatPower(victronData.grid.power);
    
    // Add line info if we have multiple lines or specific line data
    const l1 = victronData.grid.l1Power;
    const l2 = victronData.grid.l2Power;
    
    if (l1 !== 0 || l2 !== 0) {
      displayText += `\nL1: ${formatPower(l1)} L2: ${formatPower(l2)}`;
    }
    
    return displayText;
  };

  // Get battery state of charge as percentage
  const getBatterySOC = () => {
  if (!victronData || !victronData.battery) return 0;
  
  // The SOC comes as a decimal (0.57 = 57%), so multiply by 100
  const socDecimal = victronData.battery.soc;
  const socPercentage = socDecimal * 100;
  
  return Math.round(socPercentage);
};
  // Get battery power with proper sign
  const getBatteryPower = () => {
    if (!victronData || !victronData.battery) return 0;
    return parseFloat(victronData.battery.power).toFixed(2);
  };

  // Get battery voltage
  const getBatteryVoltage = () => {
    if (!victronData || !victronData.battery) return '0.00';
    return parseFloat(victronData.battery.voltage || 0).toFixed(2);
  };

  // Get battery current
  const getBatteryCurrent = () => {
    if (!victronData || !victronData.battery) return '0.00';
    return parseFloat(victronData.battery.current || 0).toFixed(2);
  };

  // Get system status indicator
  const getSystemStatus = () => {
    if (!victronData) return { status: 'Unknown', color: '#666' };
    
    if (victronData.apiStatus === 'simulation') {
      return { status: 'Simulation', color: '#FF9800' };
    }
    
    if (victronData.grid && victronData.grid.isConnected) {
      return { status: 'Shore Power', color: '#4CAF50' };
    }
    
    if (victronData.pvCharger && victronData.pvCharger.power > 0) {
      return { status: 'Solar Charging', color: '#FFD700' };
    }
    
    return { status: 'Battery Power', color: '#2196F3' };
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
                  {victronData ? formatPower(victronData.acLoads.power) : "--"}
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
                    {`${getBatterySOC()}%`}
                  </Text>
                  <Text style={styles.cardSubtitle}>
                    {formatPower(getBatteryPower())}
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
                  {victronData ? formatPower(victronData.dcSystem.power) : "--"}
                </Text>
              </View>
            </GlowingCard>
            
            <GlowingCard glowColor="#FFBF00" style={styles.cardWrapper}>
              <PVChargerCard
                power={
                  victronData
                    ? formatPower(victronData.pvCharger.power)
                    : '0.00W'
                }
                imageSource={require('../assets/smartsolar.png')}   
                cardOffset={{ top: 10, left: 0 }}     // tweak these anytime
                imageOffset={{ top: 60, left: -74 }}   //   ″      ″
              />
            </GlowingCard>
          </View>

          {/* ————————————— CONNECTION LINES ————————————— */}
          
          {/* Red to Blue (Left to Center in top row) */}
          <ConnectionDot top={87} left={330}></ConnectionDot>
          <ConnectionDot top={88} left={490}></ConnectionDot>
          <HorizontalLine top={86} left={245} width={250}></HorizontalLine>
          
          {/* Blue to Green (Center to Right in top row) */}
          <ConnectionDot top={88} left={670}></ConnectionDot>
          <ConnectionDot top={88} left={832}></ConnectionDot>
          <HorizontalLine top={86} left={560} width={450}></HorizontalLine>

          {/* Bottom of Bulk Victron Image */}
          <ConnectionDot top={210} left={576}></ConnectionDot>

          {/* Vertical line from Blue box down */}
          <VerticalLine top={215} left={575} height={220}></VerticalLine>

          {/* Dot in Middle */}
          <ConnectionDot top={432} left={576}></ConnectionDot>
          <HorizontalLine top={431} left={389} width={180}></HorizontalLine>

          {/* Battery Lines */}
          
          <ConnectionDot top={432} left={384}></ConnectionDot>
          
          <ConnectionDot top={432} left={310}></ConnectionDot>
          
          <HorizontalLine top={431} left={314} width={65}></HorizontalLine>

          {/* DC Lines */}

          <VerticalLine top={438} left={383} height={120}></VerticalLine>

          <ConnectionDot top={557} left={384}></ConnectionDot>

          <HorizontalLine top={556} left={384} width={75}></HorizontalLine>
          
          <ConnectionDot top={557} left={464}></ConnectionDot>

          {/* PV Charger Lines */}

          <HorizontalLine top={431} left={578} width={165}></HorizontalLine>

          <ConnectionDot top={433} left={744}></ConnectionDot>

          <VerticalLine top={438} left={743} height={70}></VerticalLine>

          <ConnectionDot top={513} left={744}></ConnectionDot>

          <HorizontalLine top={512} left={738} width={75}></HorizontalLine>

          <ConnectionDot top={513} left={815}></ConnectionDot>

        </View>
      </SafeAreaView>
    );
  }
  
  // Enhanced Mobile view with Victron data integration
  return (
    <SafeAreaView style={styles.mobileContainer}>
      <ScrollView 
        overScrollMode="never"
        contentContainerStyle={styles.mobileContent}
        showsVerticalScrollIndicator={false}
        decelerationRate={0.8}
      >
        {/* ————————————— MOBILE HEADER ————————————— */}
        <View style={styles.mobileHeader}>
          <View style={styles.headerLeft}>
            <Text style={styles.mobileHeaderTitle}>RV Energy System</Text>
            <View style={styles.statusRow}>
              <View style={[styles.statusDot, { backgroundColor: getSystemStatus().color }]} />
              <Text style={styles.statusText}>{getSystemStatus().status}</Text>
              {refreshing && <Text style={styles.refreshText}>Updating...</Text>}
            </View>
          </View>
          <Image
            source={require("../assets/images/icon.png")}
            style={styles.mobileLogo}
          />
        </View>

        {/* ————————————— MAIN ENERGY CARDS ————————————— */}
        <View style={styles.energyCardsContainer}>
          {/* Top Row - Battery and Solar (Same Size) */}
          <View style={styles.topRowCards}>
            <GlowingCard glowColor="#FF8C00" style={styles.quarterCardWrapper}>
              <View style={styles.mobileBatteryCard}>
                <View style={styles.batteryHeader}>
                  <Text style={styles.batteryHeaderText}>Battery System</Text>
                </View>
                <View style={styles.batteryMainContent}>
                  <Text style={styles.batterySOC}>{getBatterySOC()}%</Text>
                  <Text style={styles.batterySOCLabel}>SOC</Text>
                  <Text style={styles.batteryStatValue}>
                    {formatPower(getBatteryPower())}
                  </Text>
                  <Text style={styles.batteryStatLabel}>
                    {parseFloat(getBatteryPower()) > 0 ? 'Charging' : 'Discharging'}
                  </Text>
                </View>
              </View>
            </GlowingCard>

            <GlowingCard glowColor="#FFBF00" style={styles.quarterCardWrapper}>
              <View style={styles.solarCard}>
                <View style={styles.cardHeaderMobile}>
                  <Text style={styles.cardHeaderTextMobile}>Solar</Text>
                </View>
                <Text style={styles.cardValueMobile}>
                  {victronData ? formatPower(victronData.pvCharger.power) : '--'}
                </Text>
                <Text style={styles.cardSubtitleMobile}>
                  {victronData ? `${formatNumber(victronData.pvCharger.dailyYield, 'kWh')} today` : '--'}
                </Text>
              </View>
            </GlowingCard>
          </View>

          {/* Bottom Row - Shore Power and AC Loads (Same Size) - Updated with Black/Orange Theme */}
          <View style={styles.bottomRowCards}>
            <GlowingCard glowColor="#FF8C00" style={styles.quarterCardWrapper}>
              <View style={styles.gridCard}>
                <View style={styles.cardHeaderMobile}>
                  <Text style={styles.cardHeaderTextMobile}>Shore Power</Text>
                </View>
                <Text style={styles.cardValueMobile}>
                  {victronData && victronData.grid && victronData.grid.isConnected ? 
                    formatPower(victronData.grid.power) : 'Disconnected'}
                </Text>
                {victronData && victronData.grid && victronData.grid.isConnected && (
                  <Text style={styles.cardSubtitleMobile}>
                    {formatNumber(victronData.grid.voltage, 'V')} • {formatNumber(victronData.grid.frequency, 'Hz')}
                  </Text>
                )}
              </View>
            </GlowingCard>

            <GlowingCard glowColor="#FF8C00" style={styles.quarterCardWrapper}>
              <View style={styles.acLoadsCard}>
                <View style={styles.cardHeaderMobile}>
                  <Text style={styles.cardHeaderTextMobile}>AC Loads</Text>
                </View>
                <Text style={styles.cardValueMobile}>
                  {victronData ? formatPower(victronData.acLoads.power) : '--'}
                </Text>
                <Text style={styles.cardSubtitleMobile}>
                  Appliances & Outlets
                </Text>
              </View>
            </GlowingCard>
          </View>
        </View>

        {/* ————————————— DC SYSTEM CARD - Updated with Black/Orange Theme ————————————— */}
        <GlowingCard glowColor="#FF8C00" style={styles.dcSystemCardWrapper}>
          <View style={styles.dcSystemCard}>
            <View style={styles.cardHeaderMobile}>
              <Text style={styles.cardHeaderTextMobile}>DC System</Text>
            </View>
            <Text style={styles.cardValueMobile}>
              {victronData ? formatPower(victronData.dcSystem.power) : '--'}
            </Text>
            <Text style={styles.cardSubtitleMobile}>
              Lights & 12V Devices
            </Text>
          </View>
        </GlowingCard>

        {/* ————————————— SYSTEM OVERVIEW - Updated with Black/Orange Theme ————————————— */}
        <GlowingCard glowColor="#FF8C00" style={styles.overviewCardWrapper}>
          <View style={styles.systemOverviewCard}>
            <Text style={styles.overviewTitle}>System Overview</Text>
            <View style={styles.overviewContent}>
              <View style={styles.overviewRow}>
                <Text style={styles.overviewLabel}>AC Input:</Text>
                <Text style={styles.overviewValue}>
                  {victronData?.systemOverview?.acInput || 'Unknown'}
                </Text>
              </View>
              <View style={styles.overviewRow}>
                <Text style={styles.overviewLabel}>System State:</Text>
                <Text style={styles.overviewValue}>
                  {victronData?.systemOverview?.state || 'Unknown'}
                </Text>
              </View>
              <View style={styles.overviewRow}>
                <Text style={styles.overviewLabel}>AC Mode:</Text>
                <Text style={styles.overviewValue}>
                  {victronData?.systemOverview?.mode || 'Unknown'}
                </Text>
              </View>
              <View style={styles.overviewRow}>
                <Text style={styles.overviewLabel}>Data Source:</Text>
                <Text style={[styles.overviewValue, { 
                  color: victronData?.apiStatus === 'connected' ? '#4CAF50' : '#FF8C00' 
                }]}>
                  {victronData?.apiStatus === 'connected' ? 'Live Data' : 
                   victronData?.apiStatus === 'simulation' ? 'Simulation' : 'Cached'}
                </Text>
              </View>
            </View>
          </View>
        </GlowingCard>

        {/* ————————————— DETAILED VIEW TOGGLE ————————————— */}
        <TouchableOpacity 
          style={styles.detailToggleButton} 
          onPress={toggleEnergyView}
        >
          <Text style={styles.detailToggleText}>
            {showDetailedView ? 'Hide Details' : 'View Detailed Analysis'}
          </Text>
        </TouchableOpacity>

        {/* ————————————— DETAILED VIEW ————————————— */}
        {showDetailedView && (
          <>
            <VictronEnergyPanel 
              onError={handleEnergyError} 
              refreshInterval={10000} 
            />
            <EnergyFlowDiagram energyData={victronData} />
          </>
        )}

        {/* ————————————— MAP SECTION ————————————— */}
        <View style={styles.mapSection}>
          <Text style={styles.mapTitle}>Live Location</Text>
          <View style={styles.mapContainer}>
            <Map />
          </View>
        </View>

        {/* ————————————— ERROR STATE ————————————— */}
        {energyError && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{energyError}</Text>
            <TouchableOpacity 
              style={styles.retryButton}
              onPress={() => window.location.reload()}
            >
              <Text style={styles.retryText}>Retry Connection</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  // Tablet styles (unchanged)
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
    color: '#FFF',
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
    width: 310,
    height: 240,
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
    width: 180,    // was 180
    height: 200,   // was 140
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
    width: 310,
    height: 240,
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
    marginTop: 155,
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 8,
    justifyContent: "center",
    alignItems: "center",
    right: 27,
    top:60,
    width: 220,
    height: 130,
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

  // Enhanced Mobile Styles
  mobileContainer: {
    flex: 1,
    backgroundColor: "#211D1D", // Match your brown theme
  },
  mobileContent: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    paddingBottom: 40,
  },
  mobileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  headerLeft: {
    flex: 1,
  },
  mobileHeaderTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    color: '#CCCCCC',
    fontSize: 14,
    fontWeight: '500',
  },
  refreshText: {
    color: '#FFB267',
    fontSize: 12,
    marginLeft: 8,
    fontStyle: 'italic',
  },
  mobileLogo: {
    width: 50,
    height: 32,
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
  },

  // Energy Cards Container
  energyCardsContainer: {
    marginBottom: 20,
  },

  // Updated Mobile Card Layout - All Same Size
  topRowCards: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  bottomRowCards: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  quarterCardWrapper: {
    flex: 1,
    marginHorizontal: 6,
  },

  // Battery Card (Black and Orange Theme)
  mobileBatteryCard: {
    backgroundColor: '#1A1A1A', // Black background
    borderRadius: 12,
    padding: 16,
    minHeight: 120,
    borderWidth: 2,
    borderColor: '#FF8C00', // Orange border
  },
  batteryHeader: {
    marginBottom: 8,
  },
  batteryHeaderText: {
    color: '#FF8C00', // Orange text
    fontSize: 14,
    fontWeight: '600',
  },
  batteryMainContent: {
    alignItems: 'center',
  },
  batterySOC: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 26,
  },
  batterySOCLabel: {
    color: '#FF8C00', // Orange
    fontSize: 10,
    fontWeight: '500',
    marginBottom: 4,
  },
  batteryStatValue: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  batteryStatLabel: {
    color: '#CCCCCC',
    fontSize: 9,
    fontWeight: '400',
    marginTop: 2,
    textAlign: 'center',
  },

  // Updated Cards with Black/Orange Theme
  solarCard: {
    backgroundColor: '#FF8F00',
    borderRadius: 12,
    padding: 16,
    minHeight: 120,
    justifyContent: 'center',
  },
  gridCard: {
    backgroundColor: '#1A1A1A', // Black background
    borderRadius: 12,
    padding: 16,
    minHeight: 120,
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FF8C00', // Orange border
  },
  acLoadsCard: {
    backgroundColor: '#1A1A1A', // Black background
    borderRadius: 12,
    padding: 16,
    minHeight: 120,
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FF8C00', // Orange border
  },

  // DC System Card (Full Width) - Updated with Black/Orange Theme
  dcSystemCardWrapper: {
    marginBottom: 20,
  },
  dcSystemCard: {
    backgroundColor: '#1A1A1A', // Black background
    borderRadius: 12,
    padding: 16,
    minHeight: 100,
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FF8C00', // Orange border
  },

  // Mobile Card Common Styles - Updated for Orange Text
  cardHeaderMobile: {
    marginBottom: 8,
  },
  cardHeaderTextMobile: {
    color: '#FF8C00', // Orange text for headers
    fontSize: 14,
    fontWeight: '600',
    opacity: 0.9,
  },
  cardValueMobile: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  cardSubtitleMobile: {
    color: '#CCCCCC', // Light gray for subtitles
    fontSize: 10,
    fontWeight: '400',
    opacity: 0.8,
  },

  // System Overview Card - Updated with Black/Orange Theme
  overviewCardWrapper: {
    marginBottom: 20,
  },
  systemOverviewCard: {
    backgroundColor: '#1A1A1A', // Black background
    borderRadius: 12,
    padding: 20,
    borderWidth: 2,
    borderColor: '#FF8C00', // Orange border
  },
  overviewTitle: {
    color: '#FF8C00', // Orange title
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  overviewContent: {
    gap: 12,
  },
  overviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  overviewLabel: {
    color: '#CCCCCC', // Light gray for labels
    fontSize: 14,
    fontWeight: '500',
  },
  overviewValue: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },

  // Detail Toggle Button
  detailToggleButton: {
    backgroundColor: '#FFB267',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  detailToggleText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },

  // Map Section
  mapSection: {
    marginBottom: 20,
  },
  mapTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  mapContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    height: 200,
  },

  // Error State
  errorContainer: {
    backgroundColor: '#F44336',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    alignItems: 'center',
  },
  errorText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 12,
  },
  retryButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  retryText: {
    color: '#F44336',
    fontSize: 14,
    fontWeight: '600',
  },

  // Legacy styles for backward compatibility
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
  }
});

export default System;