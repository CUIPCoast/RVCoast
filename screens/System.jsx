// System.jsx
import React, { useState, useEffect, useRef, useMemo } from "react"; // ✨ CHANGED: added useRef, useMemo
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
import SystemCharts from "../components/SystemCharts.jsx";

import Map from "../components/Map";
import useScreenSize from "../helper/useScreenSize.jsx";
import VictronEnergyPanel from "../components/VictronEnergyPanel";
import EnergyFlowDiagram from "../components/EnergyFlowDiagram";
import { VictronEnergyService } from "../API/VictronEnergyService";
import BatteryCard from "../components/BatteryCard.jsx";
import { HorizontalLine, VerticalLine, ConnectionDot } from '../components/Lines.js';
import PVChargerCard from "../components/PVChargerCard.jsx";
import GlowingCard from '../components/GlowingCards.jsx';
import { FontFamily } from "../GlobalStyles";

const { width: screenWidth } = Dimensions.get('window');

const System = () => {
  const isTablet = useScreenSize();
  const [victronData, setVictronData] = useState(null);
  const [energyError, setEnergyError] = useState(null);
  const [batteryLevel, setBatteryLevel] = useState(12.5);
  const [refreshing, setRefreshing] = useState(false);

  // ✨ NEW: tab state & refs
  const [tabIndex, setTabIndex] = useState(0);
  const pagerRef = useRef(null);

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

  useEffect(() => {
    const fetchVictronData = async () => {
      try {
        setRefreshing(true);
        const data = await VictronEnergyService.getAllData();
        setVictronData(data);
        setEnergyError(null);
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
    const intervalId = setInterval(fetchVictronData, 10000);
    return () => clearInterval(intervalId);
  }, []);
  
  const handleEnergyError = (error) => setEnergyError(error);

  const formatGridPower = () => {
    if (!victronData || !victronData.grid) return "--";
    if (!victronData.grid.isConnected) return "Shore Disconnected";
    let displayText = formatPower(victronData.grid.power);
    const l1 = victronData.grid.l1Power;
    const l2 = victronData.grid.l2Power;
    if (l1 !== 0 || l2 !== 0) {
      displayText += `\nL1: ${formatPower(l1)} L2: ${formatPower(l2)}`;
    }
    return displayText;
  };

  const getBatterySOC = () => {
    if (!victronData || !victronData.battery) return 0;
    const socDecimal = victronData.battery.soc;
    return Math.round(socDecimal * 100);
  };
  const getBatteryPower = () => {
    if (!victronData || !victronData.battery) return 0;
    return parseFloat(victronData.battery.power).toFixed(2);
  };
  const getBatteryVoltage = () => {
    if (!victronData || !victronData.battery) return '0.00';
    return parseFloat(victronData.battery.voltage || 0).toFixed(2);
  };
  const getBatteryCurrent = () => {
    if (!victronData || !victronData.battery) return '0.00';
    return parseFloat(victronData.battery.current || 0).toFixed(2);
  };
  const getSystemStatus = () => {
    if (!victronData) return { status: 'Unknown', color: '#666' };
    if (victronData.apiStatus === 'simulation') return { status: 'Simulation', color: '#FF9800' };
    if (victronData.grid && victronData.grid.isConnected) return { status: 'Shore Power', color: '#4CAF50' };
    if (victronData.pvCharger && victronData.pvCharger.power > 0) return { status: 'Solar Charging', color: '#FFD700' };
    return { status: 'Battery Power', color: '#2196F3' };
  };

  // ✨ NEW: tab helpers
  const tabs = [
    { key: 'overview', title: 'Overview' },
    { key: 'charts', title: 'Charts (Placeholder)' },
    { key: 'settings', title: 'Settings (Placeholder)' },
  ];

  const onTabPress = (index) => {
    setTabIndex(index);
    if (pagerRef.current) {
      pagerRef.current.scrollTo({ x: screenWidth * index, y: 0, animated: true });
    }
  };

  const onHorizontalScroll = (e) => {
    const x = e.nativeEvent.contentOffset.x;
    const newIndex = Math.round(x / screenWidth);
    if (newIndex !== tabIndex) setTabIndex(newIndex);
  };

  // ✨ Static image sources - defined once, never changes
  const victronImageSource = require('../assets/victron.png');
  const smartSolarImageSource = require('../assets/smartsolar.png');

  // ✨ NEW: Overview page extracted so it's tidy inside the pager
  const OverviewPage = () => (
    <SafeAreaView style={[styles.tabletContainer, { width: screenWidth }]}>
       <View style={styles.header}>
          <View>
            <Text style={styles.headerDay}>Victron System</Text>
            
          </View>
          <Image
            source={require("../assets/trailer.png")}
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

          <View collapsable={false} key="victron-container">
            <GlowingCard glowColor="#6CB4EE" >
              <Image
                source={victronImageSource}
                style={styles.blueCard}
                resizeMode="cover"
                fadeDuration={0}
                defaultSource={victronImageSource}
              />
            </GlowingCard>
          </View>

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

          <View collapsable={false} key="pvcharger-container">
            <GlowingCard glowColor="#FFBF00" style={styles.cardWrapper}>
              <PVChargerCard
                power={victronData ? formatPower(victronData.pvCharger.power) : '0.00W'}
                imageSource={smartSolarImageSource}
                cardOffset={{ top: 110, left: -100 }}
                imageOffset={{ top: 160, left: -174 }}
              />
            </GlowingCard>
          </View>
        </View>

        {/* ————————————— CONNECTION LINES ————————————— */}
        <ConnectionDot top={87} left={330} />
        <ConnectionDot top={88} left={490} />
        <HorizontalLine top={86} left={245} width={250} />
        <ConnectionDot top={88} left={670} />
        <ConnectionDot top={88} left={832} />
        <HorizontalLine top={86} left={560} width={450} />
        <ConnectionDot top={210} left={576} />
        <VerticalLine top={215} left={575} height={220} />
        <ConnectionDot top={432} left={576} />
        <HorizontalLine top={431} left={389} width={180} />
        <ConnectionDot top={432} left={384} />
        <ConnectionDot top={432} left={310} />
        <HorizontalLine top={431} left={314} width={65} />
        <VerticalLine top={438} left={383} height={120} />
        <ConnectionDot top={557} left={384} />
        <HorizontalLine top={556} left={384} width={75} />
        <ConnectionDot top={557} left={464} />
        <HorizontalLine top={431} left={578} width={165} />
        <ConnectionDot top={433} left={744} />
        <VerticalLine top={438} left={743} height={70} />
        <ConnectionDot top={513} left={744} />
        <HorizontalLine top={512} left={738} width={75} />
        <ConnectionDot top={513} left={815} />
      </View>
    </SafeAreaView>
  );



  // —————————————————— TABLET VIEW WITH SWIPEABLE TABS ——————————————————
 if (isTablet) {
  return (
    <View style={styles.tabletRoot}>
      {/* Pager wrapper so we can absolutely-position dots on top */}
      <View style={styles.pagerWrapper}>
        <ScrollView
          ref={pagerRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onHorizontalScroll}
          scrollEventThrottle={16}
        >
          <OverviewPage />
          <SystemCharts />
         
          
        </ScrollView>

        {/* ——— Bottom dots ——— */}
        <View style={styles.pagerDotsContainer}>
          {[0, 1].map((i) => (
            <TouchableOpacity
              key={i}
              onPress={() => onTabPress(i)}
              style={[styles.pagerDot, tabIndex === i && styles.pagerDotActive]}
              accessibilityRole="button"
              accessibilityLabel={`Go to page ${i + 1}`}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

  // —————————————————— MOBILE VIEW ——————————————————
  return (
    <SafeAreaView style={styles.mobileContainer}>
      <ScrollView 
        overScrollMode="never"
        contentContainerStyle={styles.mobileContent}
        showsVerticalScrollIndicator={false}
        decelerationRate={0.8}
      >
        <View style={styles.mobileHeader}>
          <View style={styles.headerLeft}>
            <Text style={styles.mobileHeaderTitle}>RV Energy System</Text>
            <View style={styles.statusRow}>
              <View style={[styles.statusDot, { backgroundColor: getSystemStatus().color }]} />
              <Text style={styles.statusText}>{getSystemStatus().status}</Text>
              {refreshing && <Text style={styles.refreshText}>Updating...</Text>}
            </View>
          </View>
         
        </View>

        <VictronEnergyPanel 
          onError={handleEnergyError} 
          refreshInterval={10000} 
        />
        <EnergyFlowDiagram energyData={victronData} />

        <View style={styles.mapSection}>
          <Text style={styles.mapTitle}>Live Location</Text>
          <View style={styles.mapContainer}>
            <Map />
          </View>
        </View>

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
  // ✨ NEW: tablet root & tab bar styles
  tabletRoot: {
    flex: 1,
    backgroundColor: "#000",
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 4,
    backgroundColor: '#000',
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  tabBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 8,
    borderRadius: 10,
  },
  tabBtnActive: {
    backgroundColor: '#121212',
  },
  tabLabel: {
    color: '#AAA',
    fontSize: 16,
    fontFamily: FontFamily.latoRegular,
    fontWeight: '600',
  },
  tabLabelActive: {
    color: '#FFF',
  },
  activeUnderline: {
    marginTop: 6,
    height: 2,
    backgroundColor: '#FF8C00',
    borderRadius: 2,
  },

  // Tablet styles (existing)
  tabletContainer: {
    flex: 1,
    backgroundColor: "#000",
    padding: 16,
    top:20,
    right:10,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
    paddingHorizontal: 20,
  },
  headerDay: {
    color: "#fff",
    fontSize: 28,
    fontFamily: FontFamily.latoRegular,
    fontWeight: "600",
  },
  headerDate: {
    color: "#fff",
    fontSize: 16,
  },
  logo: {
    width: 70,
    height: 45,
    backgroundColor: "black",
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
    fontFamily: FontFamily.latoRegular,
    fontWeight: '700',
  },
  greenCardHeaderText: {
    color: '#FFF',
    fontSize: 18,
    fontFamily: FontFamily.latoRegular,
    fontWeight: '700',
  },
  darkerGreenCardHeaderText: {
    color: '#FFF',
    fontSize: 18,
    fontFamily: FontFamily.latoRegular,
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
    shadowColor: "#FF6B6B",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.8,
    shadowRadius: 15,
    elevation: 10,
  },
  blueCard: {
    borderRadius: 12,
    marginHorizontal: 12,
    width: 180,
    height: 200,
    right:12,
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
    shadowColor: "#A0FF9F",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 15,
    elevation: 10,
    right:20,
  },
  darkerGreenCard: {
    marginTop: 155,
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 8,
    justifyContent: "center",
    alignItems: "center",
    right: 27,
    top: 60,
    width: 220,
    height: 130,
    backgroundColor: "#1B5E20",
    shadowColor: "#66FF99",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 15,
    elevation: 10,
  },
  cardTitle: {
    color: "#fff",
    fontSize: 18,
    fontFamily: FontFamily.latoRegular,
    fontWeight: "600",
    marginBottom: 8,
  },
  cardValue: {
    color: "#fff",
    fontSize: 24,
    fontFamily: FontFamily.latoRegular,
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

  // ——— Mobile styles - Modernized ———
  mobileContainer: {
    flex: 1,
    backgroundColor: "#211D1D",
  },
  mobileContent: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    paddingBottom: 48,
  },
  mobileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 28,
    paddingHorizontal: 4,
  },
  headerLeft: { flex: 1 },
  mobileHeaderTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    fontFamily: FontFamily.latoBold,
    fontWeight: '700',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  statusDot: { width: 10, height: 10, borderRadius: 5, marginRight: 10, shadowColor: '#4CAF50', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 4, elevation: 4 },
  statusText: { color: '#DDDDDD', fontSize: 15, fontWeight: '600', fontFamily: FontFamily.latoRegular, letterSpacing: 0.2 },
  refreshText: { color: '#FFB267', fontSize: 13, marginLeft: 10, fontStyle: 'italic', fontWeight: '500' },
  mobileLogo: { width: 52, height: 34, backgroundColor: '#FFFFFF', borderRadius: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 3 },

  // Map, errors - Modernized
  mapSection: { marginBottom: 24, marginTop: 8 },
  mapTitle: { color: '#FFFFFF', fontSize: 20, fontFamily: FontFamily.latoBold, fontWeight: '700', marginBottom: 16, letterSpacing: 0.3 },
  mapContainer: { borderRadius: 16, overflow: 'hidden', height: 220, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 6 },
  errorContainer: { backgroundColor: '#F44336', borderRadius: 16, padding: 20, marginBottom: 24, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.2)', shadowColor: '#F44336', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  errorText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600', textAlign: 'center', marginBottom: 14, fontFamily: FontFamily.latoRegular, letterSpacing: 0.2 },
  retryButton: { backgroundColor: '#FFFFFF', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4, elevation: 3 },
  retryText: { color: '#F44336', fontSize: 15, fontWeight: '700', fontFamily: FontFamily.latoBold, letterSpacing: 0.3 },

  // Simple/legacy blocks (unchanged but kept for compatibility)
  simplePanelContainer: { backgroundColor: '#211D1D', borderRadius: 15, padding: 16, marginBottom: 20 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 18, fontWeight: 'bold', color: 'white' },
  viewDetailText: { fontSize: 12, color: '#FFB267' },
  simpleEnergyData: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap' },
  energyItem: { alignItems: 'center', paddingHorizontal: 5, marginBottom: 12, width: '48%' },
  energyValue: { fontSize: 24, fontWeight: 'bold', color: 'white' },
  energyLabel: { fontSize: 12, color: '#999', marginTop: 4 },
  energyDetail: { fontSize: 10, color: '#999', marginTop: 2 },
  loadingContainer: { padding: 20, alignItems: 'center' },
  loadingText: { color: '#999' },
  tanksContainer: { backgroundColor: '#211D1D', borderRadius: 15, padding: 16, marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: 'white', marginBottom: 12 },

  // ✨ NEW: placeholder text styles
  placeholderTitle: {
    color: '#FFF',
    fontSize: 24,
    fontFamily: FontFamily.latoRegular,
    fontWeight: '700',
    marginBottom: 8,
  },
  placeholderText: {
    color: '#AAA',
    fontSize: 14,
  },
  // Container that lets dots float above the pager
pagerWrapper: {
  flex: 1,
  position: 'relative',
},

// Dots row at the bottom
pagerDotsContainer: {
  position: 'absolute',
  bottom: 12,
  left: 0,
  right: 0,
  flexDirection: 'row',
  justifyContent: 'center',
  alignItems: 'center',
  gap: 10,
},

pagerDot: {
  width: 10,
  height: 10,
  borderRadius: 5,
  backgroundColor: '#3A3A3A',
},

pagerDotActive: {
  backgroundColor: '#FF8C00',
},
});

export default System;

