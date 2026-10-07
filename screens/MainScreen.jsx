import React, { useState, useEffect } from "react";
import { View, Text, Image, Switch, ScrollView, Pressable, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Col, Row, Grid } from "react-native-easy-grid";import System from './System';
import moment from 'moment';
import WaterTanks from "../components/WaterTanks.jsx"; // Enhanced version
import TemperatureDisplay from "../components/TemperatureDisplay"; // New component
import useTemperature from "../hooks/useTemperature"; // New hook
import TabletBatteryWidget from "../components/TabletBatteryWidget.jsx";
import ToggleTile from "../components/ToggleTile";
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import AwningControlModal from "../components/AwningControlModal";
import AirCon from "./AirCon.jsx";
import { FontFamily } from "../GlobalStyles";
import { WaterService } from '../API/RVControlServices.js';
import { useAuth } from '../components/AuthContext';
import { useScreenSize } from '../helper';
import RVConnectionModal from '../components/RVConnectionModal';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { VictronEnergyService } from "../API/VictronEnergyService";
import { useRVWater } from '../API/RVStateManager/RVStateHooks';
import rvStateManager from '../API/RVStateManager/RVStateManager';


const MainScreen = () => {
    const { user } = useAuth();
    const isTablet = useScreenSize();
    const [showRVModal, setShowRVModal] = useState(false);

    // Use RV state management for water systems
    const { water } = useRVWater();

    var currentDate = moment().format("MMMM Do, YYYY");
    var DayOfTheWeek = moment().format("dddd");

    const [isModalVisible, setModalVisible] = useState(false);
    const [isOn, setIsOn] = useState(false);
    const [isOnGray, setIsOnGray] = useState(false);
    const [victronData, setVictronData] = useState(null);

    // Remove local state - now using RV state manager
    // const [isWaterHeaterOn, setWaterHeaterOn] = useState(false);
    // const [isWaterPumpOn, setWaterPumpOn] = useState(false);

    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState(null);
    const [showErrors, setShowErrors] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [batteryLevel, setBatteryLevel] = useState(12.5);
    const [energyError, setEnergyError] = useState(null);

    // Add temperature monitoring
    const { 
        temperature, 
        isConnected: tempConnected, 
        error: tempError,
        refresh: refreshTemp 
    } = useTemperature({ autoStart: true });
  
    // Clear error message after 5 seconds
    useEffect(() => {
        if (errorMessage) {
            const timer = setTimeout(() => {
                setErrorMessage(null);
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [errorMessage]);

    // Check RV connection before allowing control
    const checkRVConnection = () => {
        // Tablet has direct access to RV (hardwired connection)
        if (isTablet) {
            return true;
        }
        
        // Mobile requires user to be connected to RV remotely
        if (!user?.rvConnection) {
            Alert.alert(
                'RV Not Connected',
                'Please connect to your RV first to control devices remotely.',
                [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Connect Now', onPress: () => setShowRVModal(true) }
                ]
            );
            return false;
        }
        return true;
    };

    // Handle water pump toggle with RV state management
    const handleWaterPumpToggle = async () => {
        if (!checkRVConnection()) return;

        setIsLoading(true);
        const newState = !water.pumpOn;

        try {
            // Update RV state immediately for responsive UI
            rvStateManager.updateWaterState({
                pumpOn: newState,
                heaterOn: water.heaterOn,
                lastUpdated: new Date().toISOString()
            });

            const result = await WaterService.toggleWaterPump();
            if (result.success) {
                setErrorMessage(null);
                console.log(`MainScreen: Water pump toggled to ${newState ? 'ON' : 'OFF'}`);
            } else {
                // Revert on failure
                rvStateManager.updateWaterState({
                    pumpOn: !newState,
                    heaterOn: water.heaterOn,
                    lastUpdated: new Date().toISOString()
                });

                // Only show non-connection errors
                if (!result.error.includes('connection') && !result.error.includes('network')) {
                    setErrorMessage(`Failed to toggle water pump: ${result.error}`);
                }
                console.log('Water pump toggle failed (likely not connected to RV):', result.error);
            }
        } catch (error) {
            // Revert on error
            rvStateManager.updateWaterState({
                pumpOn: !newState,
                heaterOn: water.heaterOn,
                lastUpdated: new Date().toISOString()
            });

            // Only show errors that aren't connection-related
            if (!error.message.includes('connection') && !error.message.includes('network') && !error.message.includes('timeout')) {
                setErrorMessage(`Error: ${error.message}`);
            }
            console.log('Water pump error (likely not connected to RV):', error.message);
        } finally {
            setIsLoading(false);
        }
    };
    
    // Handle water heater toggle with RV state management
    const handleWaterHeaterToggle = async () => {
        if (!checkRVConnection()) return;

        setIsLoading(true);
        const newState = !water.heaterOn;

        try {
            // Update RV state immediately for responsive UI
            rvStateManager.updateWaterState({
                heaterOn: newState,
                pumpOn: water.pumpOn,
                lastUpdated: new Date().toISOString()
            });

            setIsOn(newState); // Sync with fresh water tank heater state

            const result = await WaterService.toggleWaterHeater();
            if (result.success) {
                setErrorMessage(null);
                console.log(`MainScreen: Water heater toggled to ${newState ? 'ON' : 'OFF'}`);
            } else {
                // Revert on failure
                rvStateManager.updateWaterState({
                    heaterOn: !newState,
                    pumpOn: water.pumpOn,
                    lastUpdated: new Date().toISOString()
                });
                setIsOn(!newState);

                // Only show non-connection errors
                if (!result.error.includes('connection') && !result.error.includes('network')) {
                    setErrorMessage(`Failed to toggle water heater: ${result.error}`);
                }
                console.log('Water heater toggle failed (likely not connected to RV):', result.error);
            }
        } catch (error) {
            // Revert on error
            rvStateManager.updateWaterState({
                heaterOn: !newState,
                pumpOn: water.pumpOn,
                lastUpdated: new Date().toISOString()
            });
            setIsOn(!newState);

            // Only show errors that aren't connection-related
            if (!error.message.includes('connection') && !error.message.includes('network') && !error.message.includes('timeout')) {
                setErrorMessage(`Error: ${error.message}`);
            }
            console.log('Water heater error (likely not connected to RV):', error.message);
        } finally {
            setIsLoading(false);
        }
    };

    // Handle temperature display press
    const handleTemperaturePress = (tempData) => {
        console.log('MainScreen: Current temperature:', tempData);
        // You could open a climate control modal here
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

    // Helper function to format power values specifically
  const formatPower = (value) => {
    if (value === null || value === undefined) return '--';
    const num = parseFloat(value);
    if (isNaN(num)) return '--';
    return `${num.toFixed(2)}W`;
  };

  // Get battery state of charge as percentage
  const getBatterySOC = () => {
  if (!victronData || !victronData.battery) return 0;
  
  
  const socDecimal = victronData.battery.soc;
  const socPercentage = socDecimal * 100;
  
  return Math.round(socPercentage);
};
  // Get battery power with proper sign
  const getBatteryPower = () => {
    if (!victronData || !victronData.battery) return 0;
    return parseFloat(victronData.battery.power).toFixed(2);
  };
    
    return (
        <Grid className="bg-black">
            <Row size={10}>
                <Row className="bg-black" size={9}>
                    <Col className="m-1 ml-3">
                        <View style={styles.headerRow}>
                            <View>
                                <Text className="text-3xl text-white" style={{fontFamily: FontFamily.latoBold}}>{DayOfTheWeek}</Text>
                                <Text className="text-lg text-white" style={{fontFamily: FontFamily.latoBold}}>{currentDate}</Text>
                            </View>
                    
                            {/* Error Toggle Button */}
                            <TouchableOpacity 
                                style={styles.errorToggleButton}
                                onPress={() => setShowErrors(!showErrors)}
                            >
                                <Ionicons 
                                    name={showErrors ? "notifications" : "notifications-off"} 
                                    size={20} 
                                    color={showErrors ? "#4FC3F7" : "#666"} 
                                />
                            </TouchableOpacity>
                        </View>
                        
                    </Col>
                </Row>
                <Row className="bg-black" size={1}>
                    <View className="pt-3 pl-3">
                        <Image
                            source={require("../assets/trailer.png")}
                            style={{
                                width: 90,
                                height: 55,
                                right: 0,
                                paddingTop: 0,
                                backgroundColor: "black"
                            }}
                        />
                    </View>
                </Row>
            </Row>

            {/* Non-intrusive Error Messages - Fixed Position Overlays */}
            {errorMessage && showErrors && (
                <View style={styles.errorToast}>
                    <TouchableOpacity 
                        style={styles.errorContent}
                        onPress={() => setErrorMessage(null)}
                    >
                        <Ionicons name="warning" size={16} color="#FF6B6B" />
                        <Text style={styles.errorToastText} numberOfLines={2}>
                            {errorMessage}
                        </Text>
                        <TouchableOpacity onPress={() => setErrorMessage(null)}>
                            <Ionicons name="close" size={16} color="#FF6B6B" />
                        </TouchableOpacity>
                    </TouchableOpacity>
                </View>
            )}

            {/* Temperature Error - Less intrusive */}
            {tempError && showErrors && (
                <View style={styles.warningToast}>
                    <TouchableOpacity 
                        style={styles.warningContent}
                        onPress={() => setShowErrors(false)}
                    >
                        <Ionicons name="thermometer" size={16} color="#FF9800" />
                        <Text style={styles.warningToastText} numberOfLines={1}>
                            Temp sensor offline
                        </Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Loading indicator - Non-blocking */}
            {isLoading && (
                <View style={styles.loadingToast}>
                    <View style={styles.loadingContent}>
                        <ActivityIndicator size="small" color="#4FC3F7" />
                        <Text style={styles.loadingToastText}>Processing...</Text>
                    </View>
                </View>
            )}

            <Row size={80}>
                <Col size={15} className="">
                    <Row className=" rounded-xl mr-3 ml-3 mt-1 top-5" size={28}>
                        {/* Temperature Display - NEW */}
                        <View style={styles.temperatureContainer}>
                            <TemperatureDisplay 
                                onTemperaturePress={handleTemperaturePress}
                                showSetpoints={false}
                                style={styles.temperatureDisplay}
                            />
                        </View>
                    </Row>
                    <Row className="bg-brown rounded-xl m-3 mb-10 top-15" 
                    style={{  shadowColor: "#FFFFFF",
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.5,
                        shadowRadius: 6,
                        elevation: 6,}}
                    size={30}>
                        <View style={styles.statusCard}>
                            <View style={styles.connectionStatus}>
                                <Ionicons name="checkmark-circle" size={16} color="#4ADE80" />
                                <Text style={styles.connectionText}>RV System Connected</Text>
                            </View>

                            {/* Weather Information */}
                            <View style={styles.weatherSection}>
                                <View style={styles.weatherHeader}>
                                    <Ionicons name="partly-sunny" size={18} color="#FFB267" />
                                    <Text style={styles.weatherTitle}>Current Weather</Text>
                                </View>
                                <View style={styles.weatherContent}>
                                    {[
                                        { icon: 'thermometer', label: 'Temp', value: '72°F' },
                                        { icon: 'water', label: 'Humidity', value: '65%' },
                                        { icon: 'speedometer', label: 'Pressure', value: '1013 hPa' },
                                        { icon: 'leaf', label: 'Wind', value: '5 mph SW' },
                                    ].map((row) => (
                                        <View key={row.label} style={styles.weatherRow}>
                                            <Ionicons name={row.icon} size={14} color="#FFB267" />
                                            <Text style={styles.weatherLabel}>{row.label}</Text>
                                            <Text style={styles.weatherText}>{row.value}</Text>
                                        </View>
                                    ))}
                                </View>
                            </View>

                            {user && (
                                <Text style={styles.welcomeText} numberOfLines={1}>
                                    Remote user: {user.firstName || user.username}
                                </Text>
                            )}
                        </View>

                    </Row>
                </Col>

                <Col size={30} className="">
                <Row
                    className="bg-brown rounded-xl my-3 mb-10"
                    style={{
                        flexDirection: "column",
                        alignItems: "flex-start",
                        padding: 15,
                        marginBottom: 20,
                        position: "relative",
                        shadowColor: "#FFFFFF",
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.5,
                        shadowRadius: 6,
                        elevation: 6,
                    
                    }}
                >

                <View style={styles.waterCard}>
                  {/* Left: header, heater/pump toggles, CAN status */}
                  <View style={styles.waterLeft}>
                    <View>
                      <Text style={styles.waterTitle}>Water</Text>
                      <Text style={styles.waterSubtitle}>Heater, pump & tanks</Text>
                    </View>

                    <View style={styles.waterToggles}>
                      <ToggleTile
                        size="row"
                        label="Water Heater"
                        icon="water-boiler"
                        isOn={water.heaterOn}
                        onPress={handleWaterHeaterToggle}
                        disabled={isLoading}
                        onText="Heating"
                        offText="Off"
                      />
                      <ToggleTile
                        size="row"
                        label="Water Pump"
                        icon="water-pump"
                        isOn={water.pumpOn}
                        onPress={handleWaterPumpToggle}
                        disabled={isLoading}
                        onText="Running"
                        offText="Off"
                      />
                    </View>

                    <View style={styles.canStatus}>
                      <View style={[styles.canDot, { backgroundColor: tempConnected ? '#4ADE80' : '#FF6B6B' }]} />
                      <Text style={styles.canText}>
                        CAN bus {tempConnected ? 'connected' : 'offline'}
                      </Text>
                    </View>
                  </View>

                  {/* Right: tank levels */}
                  <View style={styles.tanksContainer}>
                    <WaterTanks name="Fresh" tankType="fresh" />
                    <WaterTanks name="Gray" tankType="gray" />
                  </View>
                </View>


                </Row>
                            
                <Row className="rounded-x2 mt20" style={{ 
                  justifyContent: "center", 
                  alignItems: "center",  
                  
                  }}>
                    
                <Col className="pb-5 mt15" size={60} style={{ justifyContent: "center", alignItems: "center" }}>
                    <Row
                        className="bg-brown rounded-xl ml-2 mt8"
                        style={{
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            padding: 10,
                            overflow: "visible",
                            width: 270,
                            height: 270,
                            position: "relative",
                             shadowColor: "#FFFFFF",
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.5,
                        shadowRadius: 6,
                        elevation: 6,
                            
                        }}
                    >
                        
                        <TabletBatteryWidget
                            soc={victronData?.battery ? victronData.battery.soc : null}
                            power={victronData?.battery?.power}
                            voltage={victronData?.battery?.voltage ? `${parseFloat(victronData.battery.voltage).toFixed(1)} V` : null}
                        />

                        
                    </Row>
                </Col>

                <Col className="pb-5 mt15" size={60} style={{ justifyContent: "center", alignItems: "center" }}>
                    <Row
                        className="bg-brown rounded-xl ml-2 mt8"
                        style={{
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            padding: 10,
                            overflow: "visible",
                            width: 270,
                            height: 270,
                            position: "relative",
                             shadowColor: "#FFFFFF",
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.5,
                        shadowRadius: 3,
                        elevation: 6,
                            
                        }}
                    >
                        <Text
                            className="text-white"
                            style={{
                                position: "absolute",
                                top: 10,
                                left: 10,
                                zIndex: 1,
                                fontFamily: FontFamily.latoBold,
                            }}
                        >
                            Awning
                        </Text>
                        <Pressable
                            onPress={() => setModalVisible(true)}
                            style={({ pressed }) => [styles.awningTile, pressed && { opacity: 0.8 }]}
                            accessibilityRole="button"
                            accessibilityLabel="Open awning controls"
                        >
                            <View style={styles.awningIconCircle}>
                                <MaterialCommunityIcons name="awning-outline" size={64} color="#FFB267" />
                            </View>
                            <Text style={styles.awningTileText}>Tap to control</Text>
                        </Pressable>
                        <AwningControlModal isVisible={isModalVisible} onClose={() => setModalVisible(false)} />
                    </Row>
                </Col>
                </Row>

                </Col>

                <Col className="bg-brown p-2 rounded-xl m-3 mb-10" size={15} style={{ shadowColor: "#FFFFFF",
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.5,
                        shadowRadius: 6,
                        elevation: 6,}} >
                    <Text className="text-white" style={{fontFamily: FontFamily.latoBold}}>Air Conditioning</Text>
                    <AirCon />
                </Col>
            </Row>
            
            {/* RV Connection Modal */}
            <RVConnectionModal 
                visible={showRVModal} 
                onClose={() => setShowRVModal(false)} 
            />
        </Grid>
    );
};

const styles = {
    // Modern button styles from first code
    modernButton: {
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
        marginVertical: 40,
    },
    modernGradientButton: {
        borderRadius: 16,
        padding: 2,
    },
    buttonContent: {
        
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.1)',
        borderRadius: 14,
        paddingVertical: 8,
        paddingHorizontal: 12,
        minWidth: 210,
        position: 'relative',
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    textContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    buttonTitle: {
        fontSize: 14,
        fontFamily: FontFamily.latoRegular,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    buttonSubtitle: {
        fontSize: 11,
        fontFamily: FontFamily.latoRegular,
        fontWeight: '500',
        marginTop: 2,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    statusIndicator: {
        width: 8,
        height: 8,
        borderRadius: 4,
        position: 'absolute',
        top: 12,
        right: 12,
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    
    // New temperature display styles
    temperatureContainer: {
        flex: 1,
        padding: 8,
        top:35,
    },
    temperatureDisplay: {
        // Matches the other bg-brown home cards
        height: 180,
        shadowColor: "#FFFFFF",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 6,
        elevation: 6,
    },
    
    // New system status styles
    systemStatus: {
        marginTop: 20,
        right: 254,
        bottom: 20,
        padding: 8,
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#FFFFFF20',
        
    },
    statusRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginVertical: 2,
    },
    statusLabel: {
        color: '#CCCCCC',
        fontSize: 12,
        fontFamily: FontFamily.latoRegular,
        fontWeight: '500',
    },
    statusValue: {
        color: '#FFFFFF',
        fontSize: 12,
        fontFamily: FontFamily.latoRegular,
        fontWeight: '600',
    },
    
    // Toast-style error messages (non-intrusive)
    errorToast: {
        position: 'absolute',
        top: 80,
        left: 15,
        right: 15,
        zIndex: 1000,
        elevation: 1000,
    },
    errorContent: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 107, 107, 0.95)',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 5,
    },
    errorToastText: {
        color: 'white',
        fontSize: 12,
        fontFamily: FontFamily.latoRegular,
        fontWeight: '500',
        flex: 1,
        marginHorizontal: 8,
    },
    warningToast: {
        position: 'absolute',
        top: 180,
        right: 75,
        zIndex: 999,
        elevation: 999,
    },
    warningContent: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 152, 0, 0.9)',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 4,
    },
    warningToastText: {
        color: 'white',
        fontSize: 11,
        fontFamily: FontFamily.latoRegular,
        fontWeight: '500',
        marginLeft: 4,
    },
    loadingToast: {
        position: 'absolute',
        bottom: 100,
        alignSelf: 'center',
        zIndex: 998,
        elevation: 998,
    },
    loadingContent: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 5,
    },
    loadingToastText: {
        color: 'white',
        fontSize: 12,
        fontFamily: FontFamily.latoRegular,
        fontWeight: '500',
        marginLeft: 8,
    },
    
    // Header styles
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        width: '100%',
    },
    errorToggleButton: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        padding: 8,
        borderRadius: 20,
        marginTop: 5,
    },
    
    // User info styles
    // RV status + weather card (fills its grid cell)
    statusCard: {
        flex: 1,
        alignSelf: 'stretch',
        padding: 14,
        justifyContent: 'space-between',
    },
    welcomeText: {
        color: '#9E9696',
        fontSize: 12,
        fontFamily: FontFamily.latoRegular,
        marginTop: 10,
    },
    connectionStatus: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(74, 222, 128, 0.12)',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 12,
        alignSelf: 'flex-start',
    },
    connectionText: {
        color: '#4ADE80',
        fontSize: 13,
        fontFamily: FontFamily.latoBold,
        marginLeft: 6,
    },
    connectButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 152, 0, 0.1)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        alignSelf: 'flex-start',
    },
    connectText: {
        color: '#FF9800',
        fontSize: 12,
        fontFamily: FontFamily.latoRegular,
        fontWeight: '600',
        marginLeft: 4,
    },
    
    // Weather section styles
    weatherSection: {
        flex: 1,
        marginTop: 12,
        backgroundColor: '#1B1B1B',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.06)',
        padding: 12,
    },
    weatherHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    weatherTitle: {
        color: '#FFFFFF',
        fontSize: 15,
        fontFamily: FontFamily.latoBold,
        marginLeft: 8,
    },
    weatherContent: {
        flex: 1,
        justifyContent: 'space-evenly',
    },
    weatherRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    weatherLabel: {
        flex: 1,
        color: '#9E9696',
        fontSize: 13,
        fontFamily: FontFamily.latoRegular,
        marginLeft: 8,
    },
    weatherText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontFamily: FontFamily.latoBold,
    },
    
    // Tank section styles
    tanksSection: {
        alignItems: 'center',
        paddingHorizontal: 4,
        marginTop: 35,
    },
    tanksSectionTitle: {
        color: 'white',
        fontSize: 14,
        fontFamily: FontFamily.latoRegular,
        fontWeight: '600',
        marginBottom: 8,
        textAlign: 'center',
    },
    tanksContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },

    // Water card (heater, pump, tanks)
    waterCard: {
        flex: 1,
        width: '100%',
        flexDirection: 'row',
        alignItems: 'stretch',
    },
    waterLeft: {
        flex: 1,
        minWidth: 200,
        marginRight: 12,
        justifyContent: 'space-between',
    },
    waterTitle: {
        color: '#FFFFFF',
        fontSize: 18,
        fontFamily: FontFamily.latoBold,
    },
    waterSubtitle: {
        color: '#9E9696',
        fontSize: 13,
        fontFamily: FontFamily.latoRegular,
        marginTop: 2,
    },
    waterToggles: {
        gap: 10,
        marginVertical: 14,
    },
    canStatus: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    canDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 8,
    },
    canText: {
        color: '#9E9696',
        fontSize: 12,
        fontFamily: FontFamily.latoRegular,
    },

    // Awning launcher tile
    awningTile: {
        alignItems: 'center',
        justifyContent: 'center',
        width: 220,
        height: 220,
    },
    awningIconCircle: {
        width: 132,
        height: 132,
        borderRadius: 66,
        backgroundColor: '#1B1B1B',
        borderWidth: 1,
        borderColor: 'rgba(255, 178, 103, 0.35)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    awningTileText: {
        color: '#9E9696',
        fontSize: 14,
        fontFamily: FontFamily.latoRegular,
        marginTop: 14,
    },
};

export default MainScreen;