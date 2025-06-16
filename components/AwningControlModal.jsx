import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, Modal, TouchableOpacity, Animated, Easing } from 'react-native';
import { Color } from '../GlobalStyles';
import { AwningService } from '../API/RVControlServices';
import { createAwningCANListener } from '../Service/AwningCANListener';

/**
 * Enhanced Awning Control Modal with fluid command switching and CAN bus status detection
 * 
 * @param {Object} props Component props
 * @param {boolean} props.isVisible Controls whether the modal is visible
 * @param {Function} props.onClose Callback when modal is closed
 */
const AwningControlModal = ({ isVisible, onClose }) => {
  // Core state
  const [statusMessage, setStatusMessage] = useState('Awning Ready');
  const [showStatus, setShowStatus] = useState(true);
  const [demoMode, setDemoMode] = useState(true);
  
  // Awning state - tracks actual awning status
  const [awningState, setAwningState] = useState({
    isExtending: false,
    isRetracting: false,
    isStopped: true,
    position: 0, // 0 = fully retracted, 1 = fully extended
    lastCommand: null,
    lastCommandTime: null
  });

  // Animation refs
  const awningExtension = useRef(new Animated.Value(0)).current;
  const fabricWave = useRef(new Animated.Value(0)).current;
  const motorVibration = useRef(new Animated.Value(0)).current;
  const shadowOpacity = useRef(new Animated.Value(0)).current;
  const supportPosts = useRef(new Animated.Value(0)).current;
  
  // Animation references for cleanup
  const fabricWaveAnimation = useRef(null);
  const motorVibrationAnimation = useRef(null);
  const currentMainAnimation = useRef(null);
  
  // CAN bus listener for real-time status updates
  const canBusListener = useRef(null);
  
  // Status update timeout ref
  const statusTimeout = useRef(null);

  /**
   * Initialize CAN bus listener for real-time awning status detection
   */
  useEffect(() => {
    if (!demoMode && isVisible) {
      try {
        canBusListener.current = createAwningCANListener();
        
        // Listen for awning-specific events - but give priority to user commands
        canBusListener.current.on('awningStateChange', (state) => {
          // Only apply CAN state if it doesn't conflict with recent user commands
          const timeSinceLastCommand = awningState.lastCommandTime ? 
            Date.now() - awningState.lastCommandTime : Infinity;
          
          // If less than 1 second since user command, ignore CAN updates to prevent conflicts
          if (timeSinceLastCommand > 1000) {
            handleAwningStateChange(state);
          } else {
            console.log('Ignoring CAN state change due to recent user command');
          }
        });
        
        canBusListener.current.on('motorStateChange', handleMotorStateChange);
        canBusListener.current.on('positionUpdate', handlePositionUpdate);
        canBusListener.current.on('limitReached', handleLimitReached);
        canBusListener.current.on('commandExecuted', handleCommandExecuted);
        
        canBusListener.current.on('connected', () => {
          console.log('Awning CAN bus connected');
          updateStatus('CAN Bus Connected', 3000);
        });
        
        canBusListener.current.on('error', (error) => {
          console.warn('Awning CAN bus error:', error);
          updateStatus('CAN Bus Error - Using Local State', 3000);
        });
        
        canBusListener.current.start();
      } catch (error) {
        console.warn('Failed to initialize awning CAN bus listener:', error);
        updateStatus('CAN Bus Unavailable - Using Local State', 3000);
      }
    }
    
    return () => {
      if (canBusListener.current) {
        canBusListener.current.stop();
        canBusListener.current = null;
      }
    };
  }, [demoMode, isVisible]);

  /**
   * Handle awning state changes from CAN bus
   */
  const handleAwningStateChange = (state) => {
    console.log('CAN: Awning state change detected:', state);
    
    // Update local state based on CAN feedback
    setAwningState(prev => ({
      ...prev,
      isExtending: state.isExtending,
      isRetracting: state.isRetracting,
      isStopped: state.isStopped,
      position: state.position / 100, // Convert percentage to 0-1 range
      lastCommand: state.lastCommand || prev.lastCommand,
      lastCommandTime: state.timestamp
    }));
    
    // Update animations based on real state - but don't override user commands
    if (state.isExtending && !awningState.isExtending) {
      updateStatus('CAN: Extending detected', 0);
      animateExtend();
    } else if (state.isRetracting && !awningState.isRetracting) {
      updateStatus('CAN: Retracting detected', 0);
      animateRetract();
    } else if (state.isStopped && (awningState.isExtending || awningState.isRetracting)) {
      updateStatus('CAN: Motors stopped', 3000);
      stopAnimation();
    }
  };

  /**
   * Handle individual motor state changes
   */
  const handleMotorStateChange = (motorEvent) => {
    console.log('CAN: Motor state change:', motorEvent);
    
    const message = `${motorEvent.motorType} motor ${motorEvent.isRunning ? 'started' : 'stopped'}`;
    updateStatus(`CAN: ${message}`, 2000);
  };

  /**
   * Handle position updates from CAN bus
   */
  const handlePositionUpdate = (positionEvent) => {
    console.log('CAN: Position update:', positionEvent);
    
    // Update position in awning state
    setAwningState(prev => ({
      ...prev,
      position: positionEvent.position / 100
    }));
    
    // Update animation position to match real position
    const targetValue = positionEvent.position / 100;
    awningExtension.setValue(targetValue);
    shadowOpacity.setValue(targetValue);
    supportPosts.setValue(targetValue);
  };

  /**
   * Handle limit reached events
   */
  const handleLimitReached = (limitEvent) => {
    console.log('CAN: Limit reached:', limitEvent);
    
    const limitMessage = limitEvent.limitType === 'extended' ? 
      'Awning fully extended' : 'Awning fully retracted';
    
    updateStatus(`CAN: ${limitMessage}`, 5000);
    
    // Update state to stopped
    setAwningState(prev => ({
      ...prev,
      isExtending: false,
      isRetracting: false,
      isStopped: true,
      position: limitEvent.limitType === 'extended' ? 1 : 0
    }));
    
    // Stop animations
    stopAnimation();
    
    // Set final animation position
    const finalPosition = limitEvent.limitType === 'extended' ? 1 : 0;
    awningExtension.setValue(finalPosition);
    shadowOpacity.setValue(finalPosition);
    supportPosts.setValue(finalPosition);
  };

  /**
   * Handle command execution confirmations
   */
  const handleCommandExecuted = (commandEvent) => {
    console.log('CAN: Command executed confirmation:', commandEvent);
    updateStatus(`CAN: ${commandEvent.command} executed`, 2000);
  };

  /**
   * Update status message with optional timeout
   */
  const updateStatus = (message, timeout = 0) => {
    setStatusMessage(message);
    setShowStatus(true);
    
    if (statusTimeout.current) {
      clearTimeout(statusTimeout.current);
    }
    
    if (timeout > 0) {
      statusTimeout.current = setTimeout(() => {
        setShowStatus(false);
      }, timeout);
    }
  };

  /**
   * Fluid command execution - no loading states, immediate response
   */
  const executeFluidCommand = async (command) => {
    console.log(`Executing fluid command: ${command}`);
    
    // Clear any pending demo completions that might interfere
    if (statusTimeout.current) {
      clearTimeout(statusTimeout.current);
    }
    
    // Update state immediately for responsive UI - this is the authoritative state
    const newState = {
      isExtending: command === 'extend',
      isRetracting: command === 'retract', 
      isStopped: command === 'stop',
      lastCommand: command,
      lastCommandTime: Date.now()
    };
    
    // Force state update immediately - don't let CAN bus override user commands
    setAwningState(prev => {
      console.log(`State transition: ${JSON.stringify(prev)} -> ${JSON.stringify({...prev, ...newState})}`);
      return { ...prev, ...newState };
    });
    
    // Update status and animations immediately
    if (command === 'extend') {
      updateStatus('Extending awning...', 0);
      animateExtend();
    } else if (command === 'retract') {
      updateStatus('Retracting awning...', 0);
      animateRetract();
    } else if (command === 'stop') {
      updateStatus('Stopping awning...', 2000);
      stopAnimation();
    }
    
    // Execute actual command in background (non-blocking)
    if (!demoMode) {
      executeRVCCommandBackground(command);
    } else {
      // Demo mode - simulate completion after delay
      simulateDemoCompletion(command);
    }
  };

  /**
   * Background command execution for live mode
   */
  const executeRVCCommandBackground = async (command) => {
    try {
      let result;
      
      if (command === 'extend') {
        result = await AwningService.extendAwning();
      } else if (command === 'retract') {
        result = await AwningService.retractAwning();
      } else if (command === 'stop') {
        // Import RVControlService dynamically to avoid import issues
        const { RVControlService } = await import('../API/rvAPI');
        
        // Use the exact raw CAN command that works from your testing
        console.log('🛑 Executing raw stop command: 19FEDB9F#0BFFC8010100FFFF');
        result = await RVControlService.executeRawCommand('19FEDB9F#0BFFC8010100FFFF');
        if (result) {
          console.log('✅ Stop command executed successfully');
          updateStatus('Awning stopped', 2000);
          result = { success: true }; // Normalize the response
        }
      }
      
      if (!result.success) {
        console.error(`Command ${command} failed:`, result.error || 'Unknown error');
        updateStatus(`Command failed: ${result.error || 'Unknown error'}`, 5000);
        // Revert state on failure
        setAwningState(prev => ({
          ...prev,
          isExtending: false,
          isRetracting: false,
          isStopped: true
        }));
        stopAnimation();
      }
    } catch (error) {
      console.error(`Error executing command ${command}:`, error);
      updateStatus(`Error: ${error.message}`, 5000);
      // Revert state on error
      setAwningState(prev => ({
        ...prev,
        isExtending: false,
        isRetracting: false,
        isStopped: true
      }));
      stopAnimation();
    }
  };

  /**
   * Simulate demo completion with realistic timing
   */
  const simulateDemoCompletion = (command) => {
    if (command === 'stop') {
      // Stop completes immediately
      const stopTimeout = setTimeout(() => {
        setAwningState(current => {
          // Only update if we're still in a stopped state (haven't been overridden)
          if (current.isStopped && current.lastCommand === 'stop') {
            updateStatus('Awning stopped', 3000);
            return current; // Keep current state
          }
          return current;
        });
      }, 200);
      
      // Store timeout for cleanup
      statusTimeout.current = stopTimeout;
    } else {
      // Extend/retract take time, but can be interrupted
      const duration = command === 'extend' ? 8000 : 6000;
      
      const completionTimeout = setTimeout(() => {
        // Only complete if still in the same state (not interrupted)
        setAwningState(current => {
          console.log(`Demo completion check for ${command}:`, current);
          
          if (current.lastCommand === command && current.lastCommandTime) {
            const timeSinceCommand = Date.now() - current.lastCommandTime;
            if (timeSinceCommand >= duration - 1000) { // Allow some tolerance
              
              // Check if we're still in the right state
              const stillInCorrectState = (command === 'extend' && current.isExtending) || 
                                        (command === 'retract' && current.isRetracting);
              
              if (stillInCorrectState) {
                const completedState = {
                  ...current,
                  isExtending: false,
                  isRetracting: false,
                  isStopped: true,
                  position: command === 'extend' ? 1 : 0
                };
                
                updateStatus(
                  command === 'extend' ? 'Awning fully extended' : 'Awning fully retracted',
                  3000
                );
                
                console.log(`Demo completion: ${command} finished`, completedState);
                return completedState;
              }
            }
          }
          return current;
        });
      }, duration);
      
      // Store timeout for cleanup
      statusTimeout.current = completionTimeout;
    }
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
  
  // Enhanced extension animation with seamless transitions
  const animateExtend = () => {
    console.log('Starting extend animation from current position');
    
    // Stop any existing animations first
    if (currentMainAnimation.current) {
      currentMainAnimation.current.stop();
    }
    
    // Stop fabric wave and motor vibration
    if (fabricWaveAnimation.current) {
      fabricWaveAnimation.current.stop();
    }
    if (motorVibrationAnimation.current) {
      motorVibrationAnimation.current.stop();
    }
    
    // Start motor vibration
    const motorAnim = createMotorVibrationAnimation();
    motorAnim.start();
    
    // Calculate remaining animation time based on current position
    const currentValue = awningExtension._value || 0;
    const remainingDistance = 1 - currentValue;
    const baseDuration = 4000;
    const animationDuration = baseDuration * remainingDistance;
    
    // Main extension animation
    const mainAnim = Animated.parallel([
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
    ]);
    
    currentMainAnimation.current = mainAnim;
    
    mainAnim.start(({ finished }) => {
      if (finished) {
        // Stop motor vibration
        if (motorVibrationAnimation.current) {
          motorVibrationAnimation.current.stop();
        }
        motorVibration.setValue(0);
        
        // Start gentle fabric wave when fully extended
        if (awningState.isExtending) {
          createFabricWaveAnimation().start();
        }
        
        // Update position state
        setAwningState(prev => ({ ...prev, position: 1 }));
      }
    });
  };
  
  // Enhanced retraction animation with seamless transitions
  const animateRetract = () => {
    console.log('Starting retract animation from current position');
    
    // Stop any existing animations first
    if (currentMainAnimation.current) {
      currentMainAnimation.current.stop();
    }
    
    // Stop fabric wave
    if (fabricWaveAnimation.current) {
      fabricWaveAnimation.current.stop();
    }
    fabricWave.setValue(0);
    
    // Stop existing motor vibration
    if (motorVibrationAnimation.current) {
      motorVibrationAnimation.current.stop();
    }
    
    // Start motor vibration
    const motorAnim = createMotorVibrationAnimation();
    motorAnim.start();
    
    // Calculate remaining animation time based on current position
    const currentValue = awningExtension._value || 0;
    const remainingDistance = currentValue;
    const baseDuration = 3500;
    const animationDuration = baseDuration * remainingDistance;
    
    // Main retraction animation
    const mainAnim = Animated.parallel([
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
    ]);
    
    currentMainAnimation.current = mainAnim;
    
    mainAnim.start(({ finished }) => {
      if (finished) {
        // Stop motor vibration
        if (motorVibrationAnimation.current) {
          motorVibrationAnimation.current.stop();
        }
        motorVibration.setValue(0);
        
        // Update position state
        setAwningState(prev => ({ ...prev, position: 0 }));
      }
    });
  };
  
  // Stop animation at current position (instant response)
  const stopAnimation = () => {
    console.log('Stopping animations at current position');
    
    // Stop all animations immediately
    if (currentMainAnimation.current) {
      currentMainAnimation.current.stop();
    }
    
    awningExtension.stopAnimation();
    shadowOpacity.stopAnimation();
    supportPosts.stopAnimation();
    
    if (fabricWaveAnimation.current) {
      fabricWaveAnimation.current.stop();
    }
    if (motorVibrationAnimation.current) {
      motorVibrationAnimation.current.stop();
    }
    
    // Reset vibrations
    motorVibration.setValue(0);
    fabricWave.setValue(0);
  };

  // Reset when modal closes
  useEffect(() => {
    if (!isVisible) {
      // Stop all animations
      stopAnimation();
      
      // Reset all states
      setAwningState({
        isExtending: false,
        isRetracting: false,
        isStopped: true,
        position: 0,
        lastCommand: null,
        lastCommandTime: null
      });
      
      setShowStatus(false);
      
      // Clear status timeout
      if (statusTimeout.current) {
        clearTimeout(statusTimeout.current);
      }
      
      // Reset all animated values to initial state
      awningExtension.setValue(0);
      fabricWave.setValue(0);
      motorVibration.setValue(0);
      shadowOpacity.setValue(0);
      supportPosts.setValue(0);
    }
  }, [isVisible]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (statusTimeout.current) {
        clearTimeout(statusTimeout.current);
      }
    };
  }, []);

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
                {awningState.isExtending ? 'Extending...' : 
                 awningState.isRetracting ? 'Retracting...' : 
                 'Ready'}
              </Text>
              
              {/* Progress Bar */}
              {(awningState.isExtending || awningState.isRetracting) && (
                <View style={styles.progressContainer}>
                  <Animated.View 
                    style={[
                      styles.progressBar,
                      { 
                        width: awningExtension.interpolate({
                          inputRange: [0, 1],
                          outputRange: awningState.isRetracting ? [200, 0] : [0, 200]
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

          {/* Control Buttons - No loading states, instant response */}
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[
                styles.actionButton,
                awningState.isExtending && styles.activeButton
              ]}
              onPress={() => executeFluidCommand('extend')}
            >
              <Text style={styles.buttonText}>Extend</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.stopButton,
                awningState.isStopped && styles.activeButton
              ]}
              onPress={() => executeFluidCommand('stop')}
            >
              <Text style={styles.buttonText}>Stop</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionButton,
                awningState.isRetracting && styles.activeButton
              ]}
              onPress={() => executeFluidCommand('retract')}
            >
              <Text style={styles.buttonText}>Retract</Text>
            </TouchableOpacity>
          </View>

          {/* Status Message */}
          {showStatus && (
            <View style={styles.statusContainer}>
              <Text style={styles.statusText}>{statusMessage}</Text>
              {!demoMode && (
                <Text style={styles.statusSubText}>
                  CAN Bus: {canBusListener.current ? 'Monitoring' : 'Offline'}
                </Text>
              )}
            </View>
          )}

          {/* Close Button */}
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={onClose}
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
    // Remove any disabled styling - buttons are always responsive
  },
  activeButton: {
    backgroundColor: '#FFB267',
    borderColor: '#FF8200',
    transform: [{ scale: 1.02 }], // Subtle scale for active state
  },
  stopButton: {
    backgroundColor: '#FF6B6B',
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
  statusContainer: {
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 15,
    minHeight: 40,
    justifyContent: 'center',
  },
  statusText: {
    color: Color.white0,
    fontWeight: 'bold',
    fontSize: 14,
    textAlign: 'center',
  },
  statusSubText: {
    color: '#FFB267',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 2,
    fontStyle: 'italic',
  },
});

export default AwningControlModal;