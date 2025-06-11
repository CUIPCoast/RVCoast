import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, Modal, TouchableOpacity, ActivityIndicator, Animated, Easing } from 'react-native';
import { Color } from '../GlobalStyles';
import { AwningService } from '../API/RVControlServices';

/**
 * Enhanced Awning Control Modal with RVC-compliant deselection behavior
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
  const [demoMode, setDemoMode] = useState(true);
  const [animationInProgress, setAnimationInProgress] = useState(false);
  
  // Animation refs
  const awningExtension = useRef(new Animated.Value(0)).current;
  const fabricWave = useRef(new Animated.Value(0)).current;
  const motorVibration = useRef(new Animated.Value(0)).current;
  const shadowOpacity = useRef(new Animated.Value(0)).current;
  const supportPosts = useRef(new Animated.Value(0)).current;
  
  // Animation references for cleanup
  const fabricWaveAnimation = useRef(null);
  const motorVibrationAnimation = useRef(null);
  
  // Track current awning position for smoother transitions
  const [currentPosition, setCurrentPosition] = useState(0); // 0 = retracted, 1 = extended

  /**
   * RVC-compliant command execution with proper deselection
   * This mirrors the actual CAN traffic pattern observed
   */
  const executeRVCCommand = async (newCommand) => {
    console.log(`RVC Command: ${newCommand}`);
    
    try {
      if (newCommand === 'extend') {
        // If currently retracting, stop retract motor first (Instance 10)
        if (isRetracting) {
          console.log('Stopping retract motor (Instance 10) before extending');
          await AwningService.stopAwning(); // This should send stop to instance 10
          setIsRetracting(false);
        }
        
        // Now start extend motor (Instance 9)
        console.log('Starting extend motor (Instance 9)');
        const result = await AwningService.extendAwning();
        
        if (result.success) {
          setIsExtending(true);
          return { success: true, message: 'Awning extending...' };
        }
        
      } else if (newCommand === 'retract') {
        // If currently extending, stop extend motor first (Instance 9)  
        if (isExtending) {
          console.log('Stopping extend motor (Instance 9) before retracting');
          await AwningService.stopAwning(); // This should send stop to instance 9
          setIsExtending(false);
        }
        
        // Now start retract motor (Instance 10)
        console.log('Starting retract motor (Instance 10)');
        const result = await AwningService.retractAwning();
        
        if (result.success) {
          setIsRetracting(true);
          return { success: true, message: 'Awning retracting...' };
        }
        
      } else if (newCommand === 'stop') {
        // Stop both motors (Instances 9 and 10)
        console.log('Stopping both motors (Instances 9 & 10)');
        const result = await AwningService.stopAwning();
        
        if (result.success) {
          setIsExtending(false);
          setIsRetracting(false);
          return { success: true, message: 'Awning stopped' };
        }
      }
      
      return { success: false, message: 'Command failed' };
      
    } catch (error) {
      console.error(`RVC Command error (${newCommand}):`, error);
      return { success: false, message: `Error: ${error.message}` };
    }
  };

  /**
   * Demo functions with RVC-compliant behavior simulation
   */
  const handleDemoCommand = (command) => {
    console.log(`Demo Command: ${command}`);
    
    if (command === 'extend') {
      // Simulate RVC deselection behavior
      if (isRetracting) {
        console.log('Demo: Stopping retract before extending');
        setIsRetracting(false);
        stopAnimation();
        
        // Small delay to simulate the stop->start sequence
        setTimeout(() => {
          setIsExtending(true);
          animateExtend();
        }, 200);
      } else {
        setIsExtending(true);
        animateExtend();
      }
      
      setStatusMessage('Demo: Awning extending...');
      setShowStatus(true);
      setTimeout(() => setShowStatus(false), 5000);
      
    } else if (command === 'retract') {
      // Simulate RVC deselection behavior
      if (isExtending) {
        console.log('Demo: Stopping extend before retracting');
        setIsExtending(false);
        stopAnimation();
        
        // Small delay to simulate the stop->start sequence
        setTimeout(() => {
          setIsRetracting(true);
          animateRetract();
        }, 200);
      } else {
        setIsRetracting(true);
        animateRetract();
      }
      
      setStatusMessage('Demo: Awning retracting...');
      setShowStatus(true);
      setTimeout(() => setShowStatus(false), 4500);
      
    } else if (command === 'stop') {
      setIsExtending(false);
      setIsRetracting(false);
      stopAnimation();
      
      setStatusMessage('Demo: Awning stopped');
      setShowStatus(true);
      setTimeout(() => setShowStatus(false), 3000);
    }
  };

  /**
   * Live API functions with RVC-compliant behavior
   */
  const handleExtend = async () => {
    setIsLoading(true);
    setStatusMessage('Processing extend command...');
    setShowStatus(true);
    
    const result = await executeRVCCommand('extend');
    
    if (result.success) {
      animateExtend();
      setStatusMessage(result.message);
    } else {
      setStatusMessage(`Extend failed: ${result.message}`);
    }
    
    setTimeout(() => {
      setShowStatus(false);
      setIsLoading(false);
    }, 5000);
  };

  const handleRetract = async () => {
    setIsLoading(true);
    setStatusMessage('Processing retract command...');
    setShowStatus(true);
    
    const result = await executeRVCCommand('retract');
    
    if (result.success) {
      animateRetract();
      setStatusMessage(result.message);
    } else {
      setStatusMessage(`Retract failed: ${result.message}`);
    }
    
    setTimeout(() => {
      setShowStatus(false);
      setIsLoading(false);
    }, 4500);
  };

  const handleStop = async () => {
    setIsLoading(true);
    setStatusMessage('Processing stop command...');
    setShowStatus(true);
    
    const result = await executeRVCCommand('stop');
    
    if (result.success) {
      stopAnimation();
      setStatusMessage(result.message);
    } else {
      setStatusMessage(`Stop failed: ${result.message}`);
    }
    
    setTimeout(() => {
      setShowStatus(false);
      setIsLoading(false);
    }, 3000);
  };

  // Create continuous fabric wave animation
  const createFabricWaveAnimation = () => {
    const animation = Animated.loop(
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
    
    fabricWaveAnimation.current = animation;
    return animation;
  };
  
  // Create motor vibration animation
  const createMotorVibrationAnimation = () => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(motorVibration, {
          toValue: 3,
          duration: 80,
          easing: Easing.linear,
          useNativeDriver: false,
        }),
        Animated.timing(motorVibration, {
          toValue: -3,
          duration: 80,
          easing: Easing.linear,
          useNativeDriver: false,
        }),
        Animated.timing(motorVibration, {
          toValue: 0,
          duration: 40,
          easing: Easing.linear,
          useNativeDriver: false,
        }),
      ])
    );
    
    motorVibrationAnimation.current = animation;
    return animation;
  };
  
  // Enhanced extension animation that can resume from current position
  const animateExtend = () => {
    console.log('Starting extend animation from current position');
    setAnimationInProgress(true);
    
    // Start motor vibration
    const motorAnim = createMotorVibrationAnimation();
    motorAnim.start();
    
    // Calculate remaining animation time based on current position
    const currentValue = awningExtension._value || 0;
    const remainingDistance = 1 - currentValue;
    const animationDuration = 4000 * remainingDistance;
    
    // Main extension animation
    Animated.parallel([
      // Main awning extension
      Animated.timing(awningExtension, {
        toValue: 1,
        duration: animationDuration,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }),
      // Shadow grows
      Animated.timing(shadowOpacity, {
        toValue: 1,
        duration: animationDuration,
        easing: Easing.out(Easing.ease),
        useNativeDriver: false,
      }),
      // Support posts extend
      Animated.timing(supportPosts, {
        toValue: 1,
        duration: animationDuration * 0.875,
        delay: animationDuration * 0.125,
        easing: Easing.out(Easing.back(1.2)),
        useNativeDriver: false,
      }),
    ]).start(({ finished }) => {
      console.log('Extend animation finished:', finished);
      if (finished) {
        setCurrentPosition(1);
        // Stop motor vibration
        if (motorVibrationAnimation.current) {
          motorVibrationAnimation.current.stop();
        }
        motorVibration.setValue(0);
        setAnimationInProgress(false);
        
        // Start gentle fabric wave when fully extended
        if (isExtending) {
          createFabricWaveAnimation().start();
        }
      }
    });
  };
  
  // Enhanced retraction animation that can resume from current position
  const animateRetract = () => {
    console.log('Starting retract animation from current position');
    setAnimationInProgress(true);
    
    // Stop fabric wave
    if (fabricWaveAnimation.current) {
      fabricWaveAnimation.current.stop();
    }
    fabricWave.setValue(0);
    
    // Start motor vibration
    const motorAnim = createMotorVibrationAnimation();
    motorAnim.start();
    
    // Calculate remaining animation time based on current position
    const currentValue = awningExtension._value || 0;
    const remainingDistance = currentValue;
    const animationDuration = 3500 * remainingDistance;
    
    // Main retraction animation
    Animated.parallel([
      // Main awning retraction
      Animated.timing(awningExtension, {
        toValue: 0,
        duration: animationDuration,
        easing: Easing.in(Easing.quad),
        useNativeDriver: false,
      }),
      // Shadow fades
      Animated.timing(shadowOpacity, {
        toValue: 0,
        duration: animationDuration,
        easing: Easing.in(Easing.ease),
        useNativeDriver: false,
      }),
      // Support posts retract
      Animated.timing(supportPosts, {
        toValue: 0,
        duration: animationDuration * 0.571,
        easing: Easing.in(Easing.back(1.5)),
        useNativeDriver: false,
      }),
    ]).start(({ finished }) => {
      console.log('Retract animation finished:', finished);
      if (finished) {
        setCurrentPosition(0);
        // Stop motor vibration
        if (motorVibrationAnimation.current) {
          motorVibrationAnimation.current.stop();
        }
        motorVibration.setValue(0);
        setAnimationInProgress(false);
      }
    });
  };
  
  // Stop animation at current position
  const stopAnimation = () => {
    console.log('Stopping animations at current position');
    
    // Store current position before stopping
    const currentValue = awningExtension._value || 0;
    setCurrentPosition(currentValue);
    
    awningExtension.stopAnimation();
    if (fabricWaveAnimation.current) {
      fabricWaveAnimation.current.stop();
    }
    if (motorVibrationAnimation.current) {
      motorVibrationAnimation.current.stop();
    }
    shadowOpacity.stopAnimation();
    supportPosts.stopAnimation();
    
    // Reset vibrations
    motorVibration.setValue(0);
    fabricWave.setValue(0);
    
    setAnimationInProgress(false);
  };

  // Reset animations when modal visibility changes
  useEffect(() => {
    if (!isVisible) {
      // Stop all animations
      stopAnimation();
      
      // Reset all states
      setIsExtending(false);
      setIsRetracting(false);
      setShowStatus(false);
      setAnimationInProgress(false);
      setCurrentPosition(0);
      
      // Reset all animated values to initial state
      awningExtension.setValue(0);
      fabricWave.setValue(0);
      motorVibration.setValue(0);
      shadowOpacity.setValue(0);
      supportPosts.setValue(0);
    }
  }, [isVisible]);

  return (
    <Modal
      visible={isVisible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Awning Control</Text>

          {/* Awning Animation */}
          <View style={styles.animationContainer}>
            {/* Ground */}
            <View style={styles.ground} />
            
            {/* Shadow on ground */}
            <Animated.View 
              style={[
                styles.groundShadow,
                {
                  opacity: shadowOpacity,
                  transform: [{
                    scaleX: awningExtension.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.3, 2.0]
                    })
                  }]
                }
              ]} 
            />

            {/* RV with motor vibration */}
            <Animated.View 
              style={[
                styles.rv,
                {
                  transform: [{
                    translateX: motorVibration
                  }]
                }
              ]}
            >
              <View style={styles.rvWindow} />
              <View style={styles.rvVent} />
              
              {/* Motor housing */}
              <View style={styles.motorHousing} />
            </Animated.View>
            
            {/* Awning Mount */}
            <View style={styles.awningMount} />
            
            {/* Main Awning Fabric */}
            <Animated.View 
              style={[
                styles.awningFabric, 
                { 
                  width: awningExtension.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 270]
                  }),
                  height: awningExtension.interpolate({
                    inputRange: [0, 1],
                    outputRange: [8, 15]
                  }),
                  transform: [
                    {
                      translateY: fabricWave.interpolate({
                        inputRange: [-1, 0, 1],
                        outputRange: [-2, 0, 6]
                      })
                    },
                    { rotate: '3deg' }
                  ]
                }
              ]}
            />

            {/* Awning Support Arm */}
            <Animated.View 
              style={[
                styles.awningArm, 
                { 
                  width: awningExtension.interpolate({
                    inputRange: [0, 1],
                    outputRange: [8, 70]
                  }),
                  transform: [
                    { 
                      rotateZ: awningExtension.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0deg', '-15deg']
                      })
                    }
                  ]
                }
              ]} 
            />
            
            {/* Status Indicator */}
            <View style={styles.statusIndicator}>
              <Text style={styles.animationStatus}>
                {isExtending ? 'Extending...' : isRetracting ? 'Retracting...' : animationInProgress ? 'Stopping...' : 'Ready'}
              </Text>
              
              {/* Progress Bar */}
              {(isExtending || isRetracting) && (
                <View style={styles.progressContainer}>
                  <Animated.View 
                    style={[
                      styles.progressBar,
                      { 
                        width: awningExtension.interpolate({
                          inputRange: [0, 1],
                          outputRange: isRetracting ? [200, 0] : [0, 200]
                        })
                      }
                    ]} 
                  />
                </View>
              )}
            </View>
          </View>

          {/* Demo Mode Toggle */}
          <TouchableOpacity 
            style={[styles.demoToggle, demoMode && styles.demoToggleActive]}
            onPress={() => setDemoMode(!demoMode)}
          >
            <Text style={styles.demoToggleText}>
              {demoMode ? 'Demo Mode ON' : 'Live RVC Mode'}
            </Text>
          </TouchableOpacity>

          {/* Control Buttons */}
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[
                styles.actionButton,
                isExtending && styles.activeButton,
                (isLoading && !demoMode) && styles.disabledButton
              ]}
              onPress={demoMode ? () => handleDemoCommand('extend') : handleExtend}
              disabled={isLoading && !demoMode}
            >
              <Text style={styles.buttonText}>Extend</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.stopButton,
                (isLoading && !demoMode) && styles.disabledButton
              ]}
              onPress={demoMode ? () => handleDemoCommand('stop') : handleStop}
              disabled={isLoading && !demoMode}
            >
              <Text style={styles.buttonText}>Stop</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionButton,
                isRetracting && styles.activeButton,
                (isLoading && !demoMode) && styles.disabledButton
              ]}
              onPress={demoMode ? () => handleDemoCommand('retract') : handleRetract}
              disabled={isLoading && !demoMode}
            >
              <Text style={styles.buttonText}>Retract</Text>
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
            <Text style={styles.closeButtonText}>Close</Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '90%',
    maxWidth: 500,
    backgroundColor: Color.colorGray_200,
    borderRadius: 20,
    padding: 25,
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Color.white0,
    marginBottom: 20,
  },
  
  // Demo toggle
  demoToggle: {
    backgroundColor: '#4A90E2',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#357ABD',
  },
  demoToggleActive: {
    backgroundColor: '#2ECC71',
    borderColor: '#27AE60',
  },
  demoToggleText: {
    color: Color.white0,
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  
  // Animation container
  animationContainer: {
    width: '100%',
    height: 200,
    marginBottom: 25,
    position: 'relative',
    backgroundColor: '#F0F8FF',
    borderRadius: 15,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#4682B4',
  },
  
  // Ground
  ground: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
    backgroundColor: '#242124',
  },
  
  // Shadow
  groundShadow: {
    position: 'absolute',
    bottom: 55,
    left: 80,
    width: 60,
    height: 8,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 10,
  },
  
  // RV
  rv: {
    width: 80,
    height: 120,
    backgroundColor: '#1B1B1B',
    borderRadius: 8,
    position: 'absolute',
    left: 20,
    bottom: 60,
    borderWidth: 2,
    borderColor: '#A9A9A9',
  },
  rvWindow: {
    width: 30,
    height: 25,
    backgroundColor: '#ADD8E6',
    borderRadius: 4,
    position: 'absolute',
    top: 15,
    right: 10,
    borderWidth: 1,
    borderColor: '#4682B4',
  },
  rvVent: {
    width: 35,
    height: 5,
    backgroundColor: '#696969',
    borderRadius: 3,
    position: 'absolute',
    top: 5,
    right: 8,
  },
  motorHousing: {
    width: 12,
    height: 8,
    backgroundColor: '#2F2F2F',
    borderRadius: 2,
    position: 'absolute',
    top: 50,
    right: -6,
    borderWidth: 1,
    borderColor: '#000',
  },
  
  // Awning mount
  awningMount: {
    width: 8,
    height: 8,
    backgroundColor: '#2F2F2F',
    borderRadius: 4,
    position: 'absolute',
    left: 100,
    top: 110,
    borderWidth: 1,
    borderColor: '#000',
  },
  
  // Awning fabric
  awningFabric: {
    backgroundColor: '#111111',
    position: 'absolute',
    left: 100,
    bottom: 160,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: '#353839',
  },
  
  // Awning arm
  awningArm: {
    height: 4,
    backgroundColor: '#A9A9A9',
    position: 'absolute',
    left: 100,
    bottom: 158,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: '#808080',
    transformOrigin: 'left center',
  },
  
  // Status indicator
  statusIndicator: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 10,
    alignItems: 'center',
  },
  animationStatus: {
    fontSize: 12,
    color: '#2F2F2F',
    fontWeight: 'bold',
    textAlign: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  progressContainer: {
    width: 200,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.4)',
    borderRadius: 2,
    marginTop: 5,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#FF8200',
    borderRadius: 2,
  },
  
  // Buttons
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 20,
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
  },
  stopButton: {
    backgroundColor: '#FF6B6B',
  },
  disabledButton: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Color.colorGray_200,
  },
  closeButton: {
    backgroundColor: '#2F2F2F',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 10,
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
    marginVertical: 15,
  },
  statusContainer: {
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 15,
  },
  statusText: {
    color: Color.white0,
    fontWeight: 'bold',
    fontSize: 14,
    textAlign: 'center',
  }
});

export default AwningControlModal;