import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, Modal, TouchableOpacity, ActivityIndicator, Animated, Easing } from 'react-native';
import { Color } from '../GlobalStyles';
import { AwningService } from '../API/RVControlServices';

/**
 * Modal for controlling the RV's awning with enhanced animations
 * 
 * @param {Object} props Component props
 * @param {boolean} props.isVisible Controls whether the modal is visible
 * @param {Function} props.onClose Callback when modal is closed
 */
const AwningControlModal = ({ isVisible, onClose }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [showStatus, setShowStatus] = useState(false);
  const [isExtending, setIsExtending] = useState(false);
  const [isRetracting, setIsRetracting] = useState(false);
  const [demoMode, setDemoMode] = useState(false); // Add demo mode for testing
  
  // Enhanced animation refs
  const awningExtension = useRef(new Animated.Value(0)).current; // 0 = retracted, 1 = extended
  const fabricWave = useRef(new Animated.Value(0)).current; // For fabric wave effect
  const motorVibration = useRef(new Animated.Value(0)).current; // For motor vibration
  const shadowOpacity = useRef(new Animated.Value(0)).current; // For shadow effect
  const fabricTension = useRef(new Animated.Value(0)).current; // For fabric tension effect
  const supportPosts = useRef(new Animated.Value(0)).current; // For support posts
  const [animationInProgress, setAnimationInProgress] = useState(false);
  
  // Create continuous fabric wave animation
  const createFabricWaveAnimation = () => {
    return Animated.loop(
      Animated.sequence([
        Animated.timing(fabricWave, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
        Animated.timing(fabricWave, {
          toValue: -1,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
        Animated.timing(fabricWave, {
          toValue: 0,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
      ])
    );
  };
  
  // Create motor vibration animation
  const createMotorVibrationAnimation = () => {
    return Animated.loop(
      Animated.sequence([
        Animated.timing(motorVibration, {
          toValue: 1,
          duration: 150,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(motorVibration, {
          toValue: -1,
          duration: 150,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(motorVibration, {
          toValue: 0,
          duration: 100,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ])
    );
  };
  
  // Start awning extension animation with enhanced effects
  const animateExtend = () => {
    setAnimationInProgress(true);
    
    // Start motor vibration
    const motorAnimation = createMotorVibrationAnimation();
    motorAnimation.start();
    
    // Main extension animation with realistic easing
    Animated.parallel([
      // Main awning extension
      Animated.timing(awningExtension, {
        toValue: 1,
        duration: 4000,
        easing: Easing.bezier(0.25, 0.46, 0.45, 0.94), // Realistic motor curve
        useNativeDriver: false,
      }),
      // Shadow grows as awning extends
      Animated.timing(shadowOpacity, {
        toValue: 0.6,
        duration: 4000,
        easing: Easing.out(Easing.ease),
        useNativeDriver: false,
      }),
      // Support posts extend
      Animated.timing(supportPosts, {
        toValue: 1,
        duration: 3500,
        delay: 500,
        easing: Easing.out(Easing.back(1.2)),
        useNativeDriver: false,
      }),
      // Fabric tension builds up
      Animated.sequence([
        Animated.delay(1000),
        Animated.timing(fabricTension, {
          toValue: 1,
          duration: 2000,
          easing: Easing.out(Easing.ease),
          useNativeDriver: false,
        }),
      ]),
    ]).start(({ finished }) => {
      if (finished) {
        motorAnimation.stop();
        motorVibration.setValue(0);
        setAnimationInProgress(false);
        
        // Start gentle fabric wave when fully extended
        if (isExtending) {
          createFabricWaveAnimation().start();
        }
      }
    });
  };
  
  // Start awning retraction animation with enhanced effects
  const animateRetract = () => {
    setAnimationInProgress(true);
    
    // Stop fabric wave
    fabricWave.stopAnimation();
    fabricWave.setValue(0);
    
    // Start motor vibration
    const motorAnimation = createMotorVibrationAnimation();
    motorAnimation.start();
    
    // Main retraction animation
    Animated.parallel([
      // Main awning retraction
      Animated.timing(awningExtension, {
        toValue: 0,
        duration: 3500,
        easing: Easing.bezier(0.55, 0.06, 0.68, 0.19), // Faster retraction
        useNativeDriver: false,
      }),
      // Shadow fades
      Animated.timing(shadowOpacity, {
        toValue: 0,
        duration: 3500,
        easing: Easing.in(Easing.ease),
        useNativeDriver: false,
      }),
      // Support posts retract first
      Animated.timing(supportPosts, {
        toValue: 0,
        duration: 2000,
        easing: Easing.in(Easing.back(1.5)),
        useNativeDriver: false,
      }),
      // Fabric tension releases
      Animated.timing(fabricTension, {
        toValue: 0,
        duration: 1500,
        easing: Easing.in(Easing.ease),
        useNativeDriver: false,
      }),
    ]).start(({ finished }) => {
      if (finished) {
        motorAnimation.stop();
        motorVibration.setValue(0);
        setAnimationInProgress(false);
      }
    });
  };
  
  // Stop animation at current position
  const stopAnimation = () => {
    awningExtension.stopAnimation();
    fabricWave.stopAnimation();
    motorVibration.stopAnimation();
    shadowOpacity.stopAnimation();
    fabricTension.stopAnimation();
    supportPosts.stopAnimation();
    
    // Reset motor vibration
    motorVibration.setValue(0);
    fabricWave.setValue(0);
    
    setAnimationInProgress(false);
  };

  // Demo animation functions (bypass API for testing)
  const handleDemoExtend = () => {
    setIsExtending(true);
    setIsRetracting(false);
    animateExtend();
    setStatusMessage('🎬 Demo: Awning extending...');
    setShowStatus(true);
    setTimeout(() => setShowStatus(false), 5000);
  };

  const handleDemoRetract = () => {
    setIsRetracting(true);
    setIsExtending(false);
    animateRetract();
    setStatusMessage('🎬 Demo: Awning retracting...');
    setShowStatus(true);
    setTimeout(() => setShowStatus(false), 4500);
  };

  const handleDemoStop = () => {
    stopAnimation();
    setIsExtending(false);
    setIsRetracting(false);
    setStatusMessage('🎬 Demo: Awning stopped');
    setShowStatus(true);
    setTimeout(() => setShowStatus(false), 3000);
  };

  // Handle extending the awning
  const handleExtend = async () => {
    setIsLoading(true);
    setIsExtending(true);
    setIsRetracting(false);
    
    // Start the enhanced extension animation immediately
    animateExtend();
    setStatusMessage('Awning extending...');
    setShowStatus(true);
    
    try {
      const result = await AwningService.extendAwning();
      
      if (result.success) {
        setStatusMessage('Awning extended successfully!');
      } else {
        setStatusMessage('API failed, but animation completed');
      }
    } catch (error) {
      console.error('Error extending awning:', error);
      setStatusMessage('API error, but animation completed');
    }
    
    // Keep status visible longer and clear loading after animation
    setTimeout(() => {
      setShowStatus(false);
      setIsLoading(false);
    }, 5000);
  };

  // Handle retracting the awning
  const handleRetract = async () => {
    setIsLoading(true);
    setIsRetracting(true);
    setIsExtending(false);
    
    // Start the enhanced retraction animation immediately
    animateRetract();
    setStatusMessage('Awning retracting...');
    setShowStatus(true);
    
    try {
      const result = await AwningService.retractAwning();
      
      if (result.success) {
        setStatusMessage('Awning retracted successfully!');
      } else {
        setStatusMessage('API failed, but animation completed');
      }
    } catch (error) {
      console.error('Error retracting awning:', error);
      setStatusMessage('API error, but animation completed');
    }
    
    // Keep status visible longer and clear loading after animation
    setTimeout(() => {
      setShowStatus(false);
      setIsLoading(false);
    }, 4500);
  };

  // Handle stopping the awning
  const handleStop = async () => {
    setIsLoading(true);
    
    // Stop all animations immediately
    stopAnimation();
    setStatusMessage('Awning stopped');
    setShowStatus(true);
    
    try {
      const result = await AwningService.stopAwning();
      
      if (result.success) {
        setStatusMessage('Awning stopped successfully');
        setIsExtending(false);
        setIsRetracting(false);
      } else {
        setStatusMessage('API failed, but awning stopped');
        setIsExtending(false);
        setIsRetracting(false);
      }
    } catch (error) {
      console.error('Error stopping awning:', error);
      setStatusMessage('API error, but awning stopped');
      setIsExtending(false);
      setIsRetracting(false);
    }
    
    setTimeout(() => {
      setShowStatus(false);
      setIsLoading(false);
    }, 3000);
  };

  // Reset state when modal closes
  useEffect(() => {
    if (!isVisible) {
      setIsExtending(false);
      setIsRetracting(false);
      setShowStatus(false);
      stopAnimation();
      // Reset all animations to initial position
      awningExtension.setValue(0);
      fabricWave.setValue(0);
      motorVibration.setValue(0);
      shadowOpacity.setValue(0);
      fabricTension.setValue(0);
      supportPosts.setValue(0);
    }
  }, [isVisible]);

  // Enhanced Awning Animation Component
  const AwningAnimation = () => {
    // Main awning interpolations
    const awningWidth = awningExtension.interpolate({
      inputRange: [0, 1],
      outputRange: ['8%', '78%']
    });
    
    const awningAngle = awningExtension.interpolate({
      inputRange: [0, 1],
      outputRange: ['0deg', '-20deg']
    });
    
    const awningTranslateX = awningExtension.interpolate({
      inputRange: [0, 1],
      outputRange: [0, -25]
    });
    
    const awningTranslateY = awningExtension.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 15]
    });
    
    const awningOpacity = awningExtension.interpolate({
      inputRange: [0, 0.1],
      outputRange: [0, 1],
      extrapolate: 'clamp'
    });

    // Fabric wave effect
    const fabricWaveOffset = fabricWave.interpolate({
      inputRange: [-1, 0, 1],
      outputRange: [-3, 0, 3]
    });

    // Motor vibration effect
    const motorShake = motorVibration.interpolate({
      inputRange: [-1, 0, 1],
      outputRange: [-1, 0, 1]
    });

    // Shadow effect
    const shadowScale = shadowOpacity.interpolate({
      inputRange: [0, 1],
      outputRange: [0.5, 1.2]
    });

    // Support posts animation
    const postHeight = supportPosts.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 45]
    });

    const postOpacity = supportPosts.interpolate({
      inputRange: [0, 0.3, 1],
      outputRange: [0, 0.7, 1]
    });

    // Fabric tension effect
    const fabricSag = fabricTension.interpolate({
      inputRange: [0, 1],
      outputRange: [8, 2]
    });

    return (
      <View style={styles.animationContainer}>
        {/* Background scenery */}
        <View style={styles.ground} />
        <View style={styles.sky} />
        
        {/* Shadow on ground */}
        <Animated.View 
          style={[
            styles.groundShadow,
            {
              opacity: shadowOpacity,
              transform: [{ scaleX: shadowScale }]
            }
          ]} 
        />

        {/* RV Side View with motor vibration */}
        <Animated.View 
          style={[
            styles.rv,
            {
              transform: [{ translateX: motorShake }]
            }
          ]}
        >
          <View style={styles.rvWindow} />
          <View style={styles.rvDoor} />
          <View style={styles.rvVent} />
          
          {/* Motor housing */}
          <Animated.View 
            style={[
              styles.motorHousing,
              {
                transform: [{ translateX: motorShake }]
              }
            ]} 
          />
        </Animated.View>
        
        {/* Awning Mount Point */}
        <View style={styles.awningMount} />
        
        {/* Support Posts */}
        <Animated.View 
          style={[
            styles.supportPostLeft,
            {
              height: postHeight,
              opacity: postOpacity,
            }
          ]} 
        />
        <Animated.View 
          style={[
            styles.supportPostRight,
            {
              height: postHeight,
              opacity: postOpacity,
            }
          ]} 
        />
        
        {/* Main Awning Arm */}
        <Animated.View 
          style={[
            styles.awningArm, 
            { 
              transform: [
                { translateX: awningTranslateX },
                { translateY: awningTranslateY },
                { rotateZ: awningAngle },
              ],
              opacity: awningOpacity
            }
          ]} 
        />
        
        {/* Secondary Support Arms */}
        <Animated.View 
          style={[
            styles.supportArm1, 
            { 
              transform: [
                { translateX: awningTranslateX * 0.7 },
                { translateY: awningTranslateY * 0.7 },
                { rotateZ: awningAngle },
              ],
              opacity: awningOpacity
            }
          ]} 
        />
        <Animated.View 
          style={[
            styles.supportArm2, 
            { 
              transform: [
                { translateX: awningTranslateX * 0.4 },
                { translateY: awningTranslateY * 0.4 },
                { rotateZ: awningAngle },
              ],
              opacity: awningOpacity
            }
          ]} 
        />
        
        {/* Main Awning Fabric with wave effect */}
        <Animated.View 
          style={[
            styles.awningFabric, 
            { 
              width: awningWidth,
              borderBottomRightRadius: fabricSag,
              transform: [
                { translateX: awningTranslateX },
                { translateY: Animated.add(awningTranslateY, fabricWaveOffset) },
                { rotateZ: awningAngle },
              ],
              opacity: awningOpacity
            }
          ]} 
        />
        
        {/* Fabric Edge Trim */}
        <Animated.View 
          style={[
            styles.awningTrim, 
            { 
              width: awningWidth,
              transform: [
                { translateX: awningTranslateX },
                { translateY: Animated.add(Animated.add(awningTranslateY, fabricWaveOffset), 5) },
                { rotateZ: awningAngle },
              ],
              opacity: awningOpacity
            }
          ]} 
        />
        
        {/* Awning End Cap */}
        <Animated.View 
          style={[
            styles.awningEndCap,
            {
              transform: [
                { translateX: Animated.add(awningTranslateX, -20) },
                { translateY: Animated.add(awningTranslateY, fabricWaveOffset) },
                { rotateZ: awningAngle },
              ],
              opacity: awningOpacity
            }
          ]}
        />
        
        {/* Wind Effect Particles (visual feedback) */}
        {(isExtending || isRetracting) && (
          <View style={styles.windParticles}>
            <View style={[styles.windParticle, { left: '20%', animationDelay: '0s' }]} />
            <View style={[styles.windParticle, { left: '40%', animationDelay: '0.5s' }]} />
            <View style={[styles.windParticle, { left: '60%', animationDelay: '1s' }]} />
          </View>
        )}
        
        {/* Animation Status with enhanced styling */}
        <View style={styles.statusIndicator}>
          <Text style={styles.animationStatus}>
            {isExtending ? '⚡ Extending Awning...' : isRetracting ? '🔄 Retracting Awning...' : animationInProgress ? '⏸️ Stopping...' : '✅ Ready'}
          </Text>
          
          {/* Progress indicator */}
          {(isExtending || isRetracting) && (
            <View style={styles.progressContainer}>
              <Animated.View 
                style={[
                  styles.progressBar,
                  { 
                    width: awningExtension.interpolate({
                      inputRange: [0, 1],
                      outputRange: isRetracting ? ['100%', '0%'] : ['0%', '100%']
                    })
                  }
                ]} 
              />
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <Modal
      visible={isVisible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>🏕️ Awning Control</Text>

          {/* Enhanced Awning Animation */}
          <AwningAnimation />

          {/* Demo Mode Toggle */}
          <TouchableOpacity 
            style={styles.demoToggle}
            onPress={() => setDemoMode(!demoMode)}
          >
            <Text style={styles.demoToggleText}>
              {demoMode ? '🎬 Demo Mode ON' : '📡 Live Mode'}
            </Text>
          </TouchableOpacity>

          {/* Control Buttons */}
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[
                styles.actionButton,
                isExtending ? styles.activeButton : null,
                isLoading && !demoMode ? styles.disabledButton : null
              ]}
              onPress={demoMode ? handleDemoExtend : handleExtend}
              disabled={isLoading && !demoMode}
            >
              <Text style={styles.buttonText}> Extend</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.stopButton,
                isLoading && !demoMode ? styles.disabledButton : null
              ]}
              onPress={demoMode ? handleDemoStop : handleStop}
              disabled={isLoading && !demoMode}
            >
              <Text style={styles.buttonText}> Stop</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionButton,
                isRetracting ? styles.activeButton : null,
                isLoading && !demoMode ? styles.disabledButton : null
              ]}
              onPress={demoMode ? handleDemoRetract : handleRetract}
              disabled={isLoading && !demoMode}
            >
              <Text style={styles.buttonText}> Retract</Text>
            </TouchableOpacity>
          </View>

          {/* Loading Indicator */}
          {isLoading && !demoMode && (
            <ActivityIndicator 
              size="large" 
              color="#FF8200" 
              style={styles.loadingIndicator} 
            />
          )}

          {/* Status Message */}
          {showStatus && (
            <View style={styles.statusContainer}>
              <Text style={styles.statusText}>{statusMessage}</Text>
            </View>
          )}

          {/* Close Button */}
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={onClose}
            disabled={isLoading}
          >
            <Text style={styles.closeButtonText}>✕ Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  modalContent: {
    width: '90%',
    maxWidth: 500,
    backgroundColor: Color.colorGray_200,
    borderRadius: 20,
    padding: 25,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Color.white0,
    marginBottom: 20,
  },
  
  // Demo mode toggle
  demoToggle: {
    backgroundColor: '#4A90E2',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#357ABD',
  },
  demoToggleText: {
    color: Color.white0,
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  
  // Enhanced animation styles
  animationContainer: {
    width: '100%',
    height: 200,
    marginBottom: 25,
    position: 'relative',
    backgroundColor: '#87CEEB', // Sky blue background
    borderRadius: 15,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#4682B4',
  },
  
  // Background elements
  sky: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '60%',
    backgroundColor: 'linear-gradient(to bottom, #87CEEB, #E0F6FF)',
  },
  ground: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '40%',
    backgroundColor: '#90EE90',
  },
  groundShadow: {
    position: 'absolute',
    bottom: 0,
    left: '25%',
    width: '60%',
    height: 8,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 20,
  },
  
  // Enhanced RV styling
  rv: {
    width: 90,
    height: 130,
    backgroundColor: '#696969',
    borderRadius: 8,
    position: 'absolute',
    left: '20%',
    bottom: 30,
    borderWidth: 1,
    borderColor: '#555',
  },
  rvWindow: {
    width: 35,
    height: 28,
    backgroundColor: '#B0E0E6',
    borderRadius: 4,
    position: 'absolute',
    top: 20,
    right: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  rvDoor: {
    width: 22,
    height: 45,
    backgroundColor: '#444',
    borderRadius: 3,
    position: 'absolute',
    bottom: 0,
    left: 18,
    borderWidth: 1,
    borderColor: '#222',
  },
  rvVent: {
    width: 40,
    height: 6,
    backgroundColor: '#555',
    borderRadius: 3,
    position: 'absolute',
    top: 8,
    right: 10,
  },
  motorHousing: {
    width: 15,
    height: 8,
    backgroundColor: '#333',
    borderRadius: 2,
    position: 'absolute',
    top: 55,
    right: -8,
  },
  
  // Awning mount and structure
  awningMount: {
    width: 8,
    height: 8,
    backgroundColor: '#222',
    borderRadius: 4,
    position: 'absolute',
    left: '28%',
    top: 75,
    borderWidth: 1,
    borderColor: '#000',
  },
  
  // Support posts
  supportPostLeft: {
    width: 4,
    backgroundColor: '#888',
    position: 'absolute',
    left: '35%',
    bottom: 30,
    borderRadius: 2,
  },
  supportPostRight: {
    width: 4,
    backgroundColor: '#888',
    position: 'absolute',
    right: '25%',
    bottom: 30,
    borderRadius: 2,
  },
  
  // Awning arms with enhanced styling
  awningArm: {
    width: 4,
    height: 65,
    backgroundColor: '#777',
    position: 'absolute',
    left: '28%',
    top: 75,
    transformOrigin: 'top left',
    borderRadius: 2,
    borderWidth: 1,
    borderColor: '#555',
  },
  supportArm1: {
    width: 3,
    height: 45,
    backgroundColor: '#888',
    position: 'absolute',
    left: '28%',
    top: 75,
    transformOrigin: 'top left',
    borderRadius: 2,
  },
  supportArm2: {
    width: 2,
    height: 30,
    backgroundColor: '#999',
    position: 'absolute',
    left: '28%',
    top: 75,
    transformOrigin: 'top left',
    borderRadius: 1,
  },
  
  // Enhanced fabric styling
  awningFabric: {
    height: 8,
    backgroundColor: '#FF8200',
    position: 'absolute',
    left: '28%',
    top: 75,
    transformOrigin: 'top left',
    borderWidth: 1,
    borderColor: '#E67300',
    // Fabric pattern simulation
    backgroundImage: 'linear-gradient(90deg, #FF8200 0%, #FFB267 50%, #FF8200 100%)',
  },
  awningTrim: {
    height: 3,
    backgroundColor: '#E67300',
    position: 'absolute',
    left: '28%',
    top: 75,
    transformOrigin: 'top left',
    borderRadius: 2,
  },
  awningEndCap: {
    width: 6,
    height: 12,
    backgroundColor: '#666',
    position: 'absolute',
    left: '28%',
    top: 75,
    transformOrigin: 'top left',
    borderRadius: 3,
  },
  
  // Wind effect particles
  windParticles: {
    position: 'absolute',
    top: '30%',
    left: 0,
    right: 0,
    height: 20,
  },
  windParticle: {
    position: 'absolute',
    width: 3,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: 2,
    // CSS animation would be handled differently in React Native
  },
  
  // Enhanced status indicator
  statusIndicator: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 10,
    alignItems: 'center',
  },
  animationStatus: {
    fontSize: 14,
    color: '#333',
    fontWeight: 'bold',
    textAlign: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  progressContainer: {
    width: '80%',
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
    marginTop: 5,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#FF8200',
    borderRadius: 2,
  },
  
  // Control button styles (enhanced)
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 30,
  },
  actionButton: {
    flex: 1,
    backgroundColor: Color.white0,
    paddingVertical: 15,
    borderRadius: 12,
    marginHorizontal: 5,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  activeButton: {
    backgroundColor: '#FFB267',
    borderColor: '#FF8200',
    transform: [{ scale: 1.05 }],
  },
  stopButton: {
    backgroundColor: '#FF6B6B',
    borderColor: '#E55555',
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Color.colorGray_200,
  },
  closeButton: {
    backgroundColor: '#333',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 10,
    marginTop: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  closeButtonText: {
    color: Color.white0,
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingIndicator: {
    marginVertical: 20,
  },
  statusContainer: {
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 20,
  },
  statusText: {
    color: Color.white0,
    fontWeight: 'bold',
    fontSize: 16,
  }
});

export default AwningControlModal;