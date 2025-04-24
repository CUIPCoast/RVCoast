import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, Image, TouchableOpacity, ActivityIndicator } from "react-native";
import { Border, Color, Gap, FontSize, FontFamily, isDarkMode } from "../GlobalStyles";
import useScreenSize from "../helper/useScreenSize.jsx";
import { Col, Row, Grid } from "react-native-easy-grid";
import moment from 'moment';
import { FanService } from '../API/RVControlServices';
import { Feather as Icon } from '@expo/vector-icons';

const Vents = () => {
    // State for tracking fan status
    const [isBathroomFanOn, setBathroomFanOn] = useState(false);
    const [isBayVentFanOn, setBayVentFanOn] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    
    // State for status messages
    const [statusMessage, setStatusMessage] = useState('');
    const [showStatus, setShowStatus] = useState(false);
    
    // Current date and time
    var now = moment().format();
    var currentDate = moment().format("MMMM Do, YYYY");
    var DayOfTheWeek = moment().format("dddd");
  
    const isTablet = useScreenSize(); // Check if the screen is large enough to be considered a tablet
    
    // Fan toggle handlers - updated to match Devices.jsx implementation
    const toggleBathroomFan = async () => {
        try {
            setIsLoading(true);
            
            const result = await FanService.toggleBathroomFan();
            
            if (result.success) {
                setBathroomFanOn(!isBathroomFanOn);
                
                // Show status message
                setStatusMessage(`Bathroom fan ${!isBathroomFanOn ? 'turned on' : 'turned off'}`);
                setShowStatus(true);
                setTimeout(() => setShowStatus(false), 3000);
            } else {
                console.error('Failed to toggle bathroom fan:', result.error);
                
                // Show error message
                setStatusMessage('Failed to toggle bathroom fan');
                setShowStatus(true);
                setTimeout(() => setShowStatus(false), 3000);
            }
        } catch (error) {
            console.error('Error toggling bathroom fan:', error);
            
            // Show error message
            setStatusMessage(`Error: ${error.message}`);
            setShowStatus(true);
            setTimeout(() => setShowStatus(false), 3000);
        } finally {
            setIsLoading(false);
        }
    };
    
    const toggleBayVentFan = async () => {
        try {
            setIsLoading(true);
            
            const result = await FanService.toggleBayVentFan();
            
            if (result.success) {
                setBayVentFanOn(!isBayVentFanOn);
                
                // Show status message
                setStatusMessage(`Bay vent fan ${!isBayVentFanOn ? 'turned on' : 'turned off'}`);
                setShowStatus(true);
                setTimeout(() => setShowStatus(false), 3000);
            } else {
                console.error('Failed to toggle bay vent fan:', result.error);
                
                // Show error message
                setStatusMessage('Failed to toggle bay vent fan');
                setShowStatus(true);
                setTimeout(() => setShowStatus(false), 3000);
            }
        } catch (error) {
            console.error('Error toggling bay vent fan:', error);
            
            // Show error message
            setStatusMessage(`Error: ${error.message}`);
            setShowStatus(true);
            setTimeout(() => setShowStatus(false), 3000);
        } finally {
            setIsLoading(false);
        }
    };
    
    // Load saved fan states on component mount
    useEffect(() => {
        const loadSavedFanStates = async () => {
            try {
                // You can add AsyncStorage implementation here to load saved states
                // similar to what's done in other components
            } catch (error) {
                console.error('Error loading saved fan states:', error);
            }
        };
        
        loadSavedFanStates();
    }, []);
    
    // If the screen is a tablet, render the tablet layout
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
                
                {/* Status message */}
                {showStatus && (
                    <View style={styles.statusContainer}>
                        <Text style={styles.statusText}>{statusMessage}</Text>
                    </View>
                )}
                
                {/* Fan controls section */}
                <Row size={70} className="justify-center items-center">
                    <Col className="items-center">
                        <Text className="text-3xl text-white mb-8">Fan Controls</Text>
                        
                        {/* Modern Fan Controls - Using same design as in Devices.jsx */}
                        <View style={styles.fanControlsContainer}>
                            {/* Bay Vent Fan Button */}
                            <TouchableOpacity
                                style={[
                                    styles.modernFanButton,
                                    isBayVentFanOn ? styles.fanButtonActive : styles.fanButtonInactive,
                                    isLoading && styles.disabledButton
                                ]}
                                onPress={toggleBayVentFan}
                                disabled={isLoading}
                            >
                                <View style={styles.fanIconContainer}>
                                    <View style={[styles.fanIconCircle, isBayVentFanOn ? styles.iconCircleActive : styles.iconCircleInactive]}>
                                        <Icon name="sun" size={24} color={isBayVentFanOn ? "#FFF" : "#888"} />
                                    </View>
                                </View>
                                <Text style={styles.fanButtonLabel}>Bay Vent</Text>
                                <View style={[styles.statusIndicator, isBayVentFanOn ? styles.statusActive : styles.statusInactive]}>
                                    <Text style={styles.statusText}>{isBayVentFanOn ? "ON" : "OFF"}</Text>
                                </View>
                            </TouchableOpacity>
                            
                            {/* Bathroom Fan Button */}
                            <TouchableOpacity
                                style={[
                                    styles.modernFanButton,
                                    isBathroomFanOn ? styles.fanButtonActive : styles.fanButtonInactive,
                                    isLoading && styles.disabledButton
                                ]}
                                onPress={toggleBathroomFan}
                                disabled={isLoading}
                            >
                                <View style={styles.fanIconContainer}>
                                    <View style={[styles.fanIconCircle, isBathroomFanOn ? styles.iconCircleActive : styles.iconCircleInactive]}>
                                        <Icon name="wind" size={24} color={isBathroomFanOn ? "#FFF" : "#888"} />
                                    </View>
                                </View>
                                <Text style={styles.fanButtonLabel}>Bath Fan</Text>
                                <View style={[styles.statusIndicator, isBathroomFanOn ? styles.statusActive : styles.statusInactive]}>
                                    <Text style={styles.statusText}>{isBathroomFanOn ? "ON" : "OFF"}</Text>
                                </View>
                            </TouchableOpacity>
                        </View>
                    </Col>
                </Row>
            </Grid>
        );
    }
  
    // For non-tablet devices
    return (
        <View style={styles.mobileContainer}>
            <Text style={styles.headerText}>Fan Controls</Text>
            
            {/* Status message */}
            {showStatus && (
                <View style={styles.mobileStatusContainer}>
                    <Text style={styles.statusText}>{statusMessage}</Text>
                </View>
            )}
            
            {/* Modern Fan Controls - Using same design as in Devices.jsx */}
            <View style={styles.fanControlsContainer}>
                {/* Bay Vent Fan Button */}
                <TouchableOpacity
                    style={[
                        styles.modernFanButton,
                        isBayVentFanOn ? styles.fanButtonActive : styles.fanButtonInactive,
                        isLoading && styles.disabledButton
                    ]}
                    onPress={toggleBayVentFan}
                    disabled={isLoading}
                >
                    <View style={styles.fanIconContainer}>
                        <View style={[styles.fanIconCircle, isBayVentFanOn ? styles.iconCircleActive : styles.iconCircleInactive]}>
                            <Icon name="sun" size={24} color={isBayVentFanOn ? "#FFF" : "#888"} />
                        </View>
                    </View>
                    <Text style={styles.fanButtonLabel}>Bay Vent</Text>
                    <View style={[styles.statusIndicator, isBayVentFanOn ? styles.statusActive : styles.statusInactive]}>
                        <Text style={styles.statusText}>{isBayVentFanOn ? "ON" : "OFF"}</Text>
                    </View>
                </TouchableOpacity>
                
                {/* Bathroom Fan Button */}
                <TouchableOpacity
                    style={[
                        styles.modernFanButton,
                        isBathroomFanOn ? styles.fanButtonActive : styles.fanButtonInactive,
                        isLoading && styles.disabledButton
                    ]}
                    onPress={toggleBathroomFan}
                    disabled={isLoading}
                >
                    <View style={styles.fanIconContainer}>
                        <View style={[styles.fanIconCircle, isBathroomFanOn ? styles.iconCircleActive : styles.iconCircleInactive]}>
                            <Icon name="wind" size={24} color={isBathroomFanOn ? "#FFF" : "#888"} />
                        </View>
                    </View>
                    <Text style={styles.fanButtonLabel}>Bath Fan</Text>
                    <View style={[styles.statusIndicator, isBathroomFanOn ? styles.statusActive : styles.statusInactive]}>
                        <Text style={styles.statusText}>{isBathroomFanOn ? "ON" : "OFF"}</Text>
                    </View>
                </TouchableOpacity>
            </View>
            
            {/* Loading indicator */}
            {isLoading && (
                <ActivityIndicator 
                    size="large" 
                    color="#FF8200" 
                    style={styles.loadingIndicator} 
                />
            )}
        </View>
    );
};
  
const styles = StyleSheet.create({
    mobileContainer: {
        flex: 1,
        backgroundColor: 'black',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    headerText: {
        fontSize: 24,
        color: 'white',
        marginBottom: 30,
    },
    
    // Modern Fan Controls - Matching Devices.jsx
    fanControlsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginVertical: 20,
        paddingHorizontal: 10,
    },
    modernFanButton: {
        width: 140,
        height: 140,
        borderRadius: 16,
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 15,
        marginHorizontal: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 6,
        borderWidth: 1,
    },
    fanButtonActive: {
        backgroundColor: '#27303F',
        borderColor: '#4F7BFA',
    },
    fanButtonInactive: {
        backgroundColor: '#1E242E',
        borderColor: '#323845',
    },
    fanIconContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    fanIconCircle: {
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconCircleActive: {
        backgroundColor: '#4F7BFA',
    },
    iconCircleInactive: {
        backgroundColor: '#2D333F',
        borderWidth: 1,
        borderColor: '#3D4452',
    },
    fanButtonLabel: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 8,
    },
    statusIndicator: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
        minWidth: 46,
        alignItems: 'center',
    },
    statusActive: {
        backgroundColor: '#4F7BFA',
    },
    statusInactive: {
        backgroundColor: '#323845',
    },
    statusText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '700',
    },
    disabledButton: {
        opacity: 0.6,
    },
    loadingIndicator: {
        marginVertical: 20,
    },
    
    // Status message styles
    statusContainer: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: [{ translateX: -150 }, { translateY: -25 }],
        backgroundColor: 'rgba(0,0,0,0.7)',
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 5,
        zIndex: 1000,
        width: 300,
        alignItems: 'center'
    },
    mobileStatusContainer: {
        position: 'absolute',
        bottom: 50,
        backgroundColor: 'rgba(0,0,0,0.7)',
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 5,
        alignSelf: 'center',
    },
});

export default Vents;