import React, { useState, useEffect } from "react";
import { View, Text, Image, Switch, ScrollView, Pressable, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Col, Row, Grid } from "react-native-easy-grid";import System from './System';
import moment from 'moment';
import WaterTanks from "../components/WaterTanks.jsx"; // Enhanced version
import TemperatureDisplay from "../components/TemperatureDisplay"; // New component
import useTemperature from "../hooks/useTemperature"; // New hook
import {BatteryCard, SmallBatteryCard} from "../components/BatteryCard.jsx";
import AwningControlModal from "../components/AwningControlModal";
import AirCon from "./AirCon.jsx";

import { WaterService } from '../API/RVControlServices.js';
import { useAuth } from '../components/AuthContext';
import { useScreenSize } from '../helper';
import RVConnectionModal from '../components/RVConnectionModal';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { VictronEnergyService } from "../API/VictronEnergyService";

const MainScreen = () => {
    const { user } = useAuth();
    const isTablet = useScreenSize();
    const [showRVModal, setShowRVModal] = useState(false);
    
    var currentDate = moment().format("MMMM Do, YYYY");
    var DayOfTheWeek = moment().format("dddd");
    
    const [isModalVisible, setModalVisible] = useState(false);
    const [isOn, setIsOn] = useState(false);
    const [isOnGray, setIsOnGray] = useState(false);
     const [victronData, setVictronData] = useState(null);
    
    const [isWaterHeaterOn, setWaterHeaterOn] = useState(false);
    const [isWaterPumpOn, setWaterPumpOn] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState(null);
    const [showErrors, setShowErrors] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [batteryLevel, setBatteryLevel] = useState(12.5);

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

    // Handle water pump toggle
    const handleWaterPumpToggle = async () => {
        if (!checkRVConnection()) return;
        
        setIsLoading(true);
        try {
            const result = await WaterService.toggleWaterPump();
            if (result.success) {
                setWaterPumpOn(!isWaterPumpOn);
                setErrorMessage(null);
            } else {
                // Only show non-connection errors
                if (!result.error.includes('connection') && !result.error.includes('network')) {
                    setErrorMessage(`Failed to toggle water pump: ${result.error}`);
                }
                console.log('Water pump toggle failed (likely not connected to RV):', result.error);
            }
        } catch (error) {
            // Only show errors that aren't connection-related
            if (!error.message.includes('connection') && !error.message.includes('network') && !error.message.includes('timeout')) {
                setErrorMessage(`Error: ${error.message}`);
            }
            console.log('Water pump error (likely not connected to RV):', error.message);
        } finally {
            setIsLoading(false);
        }
    };
    
    // Handle water heater toggle - enhanced with state sync
    const handleWaterHeaterToggle = async () => {
        if (!checkRVConnection()) return;
        
        setIsLoading(true);
        try {
            const result = await WaterService.toggleWaterHeater();
            if (result.success) {
                const newState = !isWaterHeaterOn;
                setWaterHeaterOn(newState);
                setIsOn(newState); // Sync with fresh water tank heater state
                setErrorMessage(null);
                console.log(`MainScreen: Water heater toggled to ${newState ? 'ON' : 'OFF'}`);
            } else {
                // Only show non-connection errors
                if (!result.error.includes('connection') && !result.error.includes('network')) {
                    setErrorMessage(`Failed to toggle water heater: ${result.error}`);
                }
                console.log('Water heater toggle failed (likely not connected to RV):', result.error);
            }
        } catch (error) {
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
                                <Text className="text-3xl text-white">{DayOfTheWeek}</Text>
                                <Text className="text-lg text-white">{currentDate}</Text>
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
                    
                    size={30}>
                        <View className="bg-brown rounded-xl m-3 mb-10 top-15">
                            {/* User Info Display */}
                        
                            
                            <View style={styles.userInfo}>
                                <View style={styles.centeredContent}>
                                    <View style={styles.connectionStatus}>
                                        <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                                        <Text style={styles.connectionText}>
                                            RV System Connected
                                        </Text>
                                    </View>
                                    
                                    {/* Weather Information */}
                                    <View style={styles.weatherSection}>
                                        <View style={styles.weatherHeader}>
                                            <Ionicons name="partly-sunny" size={18} color="#FFB267" />
                                            <Text style={styles.weatherTitle}>Current Weather</Text>
                                        </View>
                                        <View style={styles.weatherContent}>
                                            <View style={styles.weatherRow}>
                                                <Ionicons name="thermometer" size={14} color="#4FC3F7" />
                                                <Text style={styles.weatherText}>72°F</Text>
                                            </View>
                                            <View style={styles.weatherRow}>
                                                <Ionicons name="water" size={14} color="#29B6F6" />
                                                <Text style={styles.weatherText}>65% Humidity</Text>
                                            </View>
                                            <View style={styles.weatherRow}>
                                                <Ionicons name="speedometer" size={14} color="#A5A5A5" />
                                                <Text style={styles.weatherText}>1013 hPa</Text>
                                            </View>
                                            <View style={styles.weatherRow}>
                                                <Ionicons name="leaf" size={14} color="#10B981" />
                                                <Text style={styles.weatherText}>5 mph SW</Text>
                                            </View>
                                        </View>
                                    </View>
                                    
                                    {user && (
                                        <Text style={styles.welcomeText}>
                                            Remote user: {user.firstName || user.username}
                                        </Text>
                                    )}
                                </View>
                            </View>
                      
                            
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
                    
                    }}
                >

                <View className="flex-row justify-between items-start w-full mt-[-5] pb-2">
                <View>
                    <Text className="text-white mb-1">Heaters</Text>
                    
                    <View className="mt-5 space-y-2 mb-5">
                    
                  {/* Water Heater Button - Modern styling from first code */}
                  <TouchableOpacity
                    onPress={handleWaterHeaterToggle}
                    disabled={isLoading}
                    activeOpacity={0.8}
                    style={[
                      styles.modernButton,
                      { marginBottom: 16 },
                      isLoading && styles.buttonDisabled
                    ]}
                  >
                    <LinearGradient
                      colors={isWaterHeaterOn 
                        ? ["#FF6B6B", "#FF8E53", "#FF6B35"] 
                        : ["#2C2C34", "#3A3A42", "#2C2C34"]
                      }
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.modernGradientButton}
                    >
                      <View style={styles.buttonContent}>
                        <View style={[
                          styles.iconContainer,
                          { backgroundColor: isWaterHeaterOn ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)' }
                        ]}>
                          <Ionicons
                            name={isWaterHeaterOn ? "flame" : "flame-outline"}
                            size={20}
                            color={isWaterHeaterOn ? "#FFF" : "#B0B0B0"}
                          />
                        </View>
                        <View style={styles.textContainer}>
                          <Text style={[
                            styles.buttonTitle,
                            { color: isWaterHeaterOn ? "#FFF" : "#E0E0E0" }
                          ]}>
                            Water Heater
                          </Text>
                          <Text style={[
                            styles.buttonSubtitle,
                            { color: isWaterHeaterOn ? "rgba(255,255,255,0.8)" : "#888" }
                          ]}>
                            {isWaterHeaterOn ? "Heating" : "Off"}
                          </Text>
                        </View>
                        <View style={[
                          styles.statusIndicator,
                          { backgroundColor: isWaterHeaterOn ? "#4CAF50" : "#666" }
                        ]} />
                      </View>
                    </LinearGradient>
                  </TouchableOpacity>

                  {/* Water Pump Button - Modern styling from first code */}
                  <TouchableOpacity
                    onPress={handleWaterPumpToggle}
                    disabled={isLoading}
                    activeOpacity={0.8}
                    style={[
                      styles.modernButton,
                      isLoading && styles.buttonDisabled
                    ]}
                  >
                    <LinearGradient
                      colors={isWaterPumpOn 
                        ? ["#4FC3F7", "#29B6F6", "#0288D1"] 
                        : ["#2C2C34", "#3A3A42", "#2C2C34"]
                      }
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.modernGradientButton}
                    >
                      <View style={styles.buttonContent}>
                        <View style={[
                          styles.iconContainer,
                          { backgroundColor: isWaterPumpOn ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)' }
                        ]}>
                          <Ionicons
                            name={isWaterPumpOn ? "water" : "water-outline"}
                            size={20}
                            color={isWaterPumpOn ? "#FFF" : "#B0B0B0"}
                          />
                        </View>
                        <View style={styles.textContainer}>
                          <Text style={[
                            styles.buttonTitle,
                            { color: isWaterPumpOn ? "#FFF" : "#E0E0E0" }
                          ]}>
                            Water Pump
                          </Text>
                          <Text style={[
                            styles.buttonSubtitle,
                            { color: isWaterPumpOn ? "rgba(255,255,255,0.8)" : "#888" }
                          ]}>
                            {isWaterPumpOn ? "Running" : "Off"}
                          </Text>
                        </View>
                        <View style={[
                          styles.statusIndicator,
                          { backgroundColor: isWaterPumpOn ? "#4CAF50" : "#666" }
                        ]} />
                      </View>
                    </LinearGradient>
                  </TouchableOpacity>
                    </View>
                </View>

                {/* Enhanced TankHeaterControls with real-time CAN data - Reorganized Layout */}
                <View style={styles.tanksSection}>
                  <Text style={styles.tanksSectionTitle}>Tank Levels</Text>
                  <View style={styles.tanksContainer}>
                    <WaterTanks
                        name="Fresh"
                        tankType="fresh"
                        isOn={isOn}
                        setIsOn={setIsOn}
                        trackColor={{ minimum: "lightblue", maximum: "white" }}
                    />
                    
                    <WaterTanks
                        name="Gray"
                        tankType="gray"
                        isOn={isOnGray}
                        setIsOn={setIsOnGray}
                        trackColor={{ minimum: "gray", maximum: "white" }}
                    />
                  </View>
                </View>
                </View>

                {/* System Status Indicator - NEW */}
                <View style={styles.systemStatus}>
                  <View style={styles.statusRow}>
                    <Text style={styles.statusLabel}>CAN Bus:</Text>
                    <Text style={[styles.statusValue, { 
                      color: tempConnected ? '#10B981' : '#EF4444' 
                    }]}>
                      {tempConnected ? '● Connected' : '○ Disconnected'}
                    </Text>
                  </View>
                  <View style={styles.statusRow}>
                    <Text style={styles.statusLabel}>Temperature:</Text>
                    <Text style={styles.statusValue}>
                      {temperature.value ? `${temperature.value.toFixed(1)}${temperature.unit}` : '--°F'}
                    </Text>
                  </View>
                  <View style={styles.statusRow}>
                    <Text style={styles.statusLabel}>Last Update:</Text>
                    <Text style={styles.statusValue}>
                      {new Date().toLocaleTimeString()}
                    </Text>
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
                            
                        }}
                    >
                        
<SmallBatteryCard  x={7} y={-15} scale={1.25} percentageStyle={{
    left: -23,     // Move percentage text left/right
    top: -20,       // Move percentage text up/down
    fontSize: 20, // Custom font size
  }}
  subtitleStyle={{
    left: -24,      // Move subtitle left/right
    top: -17,      // Move subtitle up/down
    fontSize: 10, // Custom font size
    marginTop: 2, // Spacing from percentage
  }}>
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
</SmallBatteryCard>

                        
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
                            
                        }}
                    >
                        <Text
                            className="text-white"
                            style={{
                                position: "absolute",
                                top: 10,
                                left: 10,
                                zIndex: 1,
                            }}
                        >
                            Awning
                        </Text>
                        <Pressable onPress={() => setModalVisible(true)}>
                            <Image
                                source={require("../assets/abpost61724photoroom-3.png")}
                                style={{
                                    width: 180,
                                    height: 180,
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
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    buttonSubtitle: {
        fontSize: 11,
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
        backgroundColor: 'rgb(40, 41, 43)', // Brown with transparency
        height:180,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#FFFFFF20',
        shadowColor: "#FFFFFF",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 4,
    },
    
    // New system status styles
    systemStatus: {
        marginTop: 8,
        right: 250,
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
        fontWeight: '500',
    },
    statusValue: {
        color: '#FFFFFF',
        fontSize: 12,
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
        fontWeight: '500',
        flex: 1,
        marginHorizontal: 8,
    },
    warningToast: {
        position: 'absolute',
        top: 80,
        right: 15,
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
    userInfo: {
        marginTop: 35,

        left:18,
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        
    },
    centeredContent: {
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        top: 40,
    },
    welcomeText: {
        color: '#E0E0E0',
        fontSize: 14,
        fontWeight: '500',
        marginBottom: 4,
    },
    connectionStatus: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(76, 175, 80, 0.1)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        alignSelf: 'flex-start',
    },
    connectionText: {
        color: '#4CAF50',
        fontSize: 12,
        fontWeight: '600',
        marginLeft: 4,
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
        fontWeight: '600',
        marginLeft: 4,
    },
    
    // Weather section styles
    weatherSection: {
        marginTop: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 8,
        padding: 10,
    },
    weatherHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    weatherTitle: {
        color: '#FFB267',
        fontSize: 14,
        fontWeight: '600',
        marginLeft: 6,
    },
    weatherContent: {
        gap: 4,
    },
    weatherRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 1,
    },
    weatherText: {
        color: '#E0E0E0',
        fontSize: 12,
        fontWeight: '500',
        marginLeft: 6,
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
        fontWeight: '600',
        marginBottom: 8,
        textAlign: 'center',
    },
    tanksContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
        flexWrap: 'wrap',
        maxWidth: '100%',
    },
};

export default MainScreen;