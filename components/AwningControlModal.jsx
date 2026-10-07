import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, Modal, TouchableOpacity, Animated, Easing } from 'react-native';
import { Color } from '../GlobalStyles';
import { AwningService } from '../API/RVControlServices';
import { createAwningCANListener } from '../Service/AwningCANListener';
import { FontFamily } from "../GlobalStyles";
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useScreenSize from '../helper/useScreenSize.jsx';
/**
 * Enhanced Awning Control Modal with fluid command switching and CAN bus status detection
 * 
 * @param {Object} props Component props
 * @param {boolean} props.isVisible Controls whether the modal is visible
 * @param {Function} props.onClose Callback when modal is closed
 */
const AwningControlModal = ({ isVisible, onClose }) => {
  const isTablet = useScreenSize();
  const insets = useSafeAreaInsets();
  // Core state
  const [statusMessage, setStatusMessage] = useState('Awning Ready');
  const [showStatus, setShowStatus] = useState(true);
  const [demoMode, setDemoMode] = useState(false);
  
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
    executeRVCCommandBackground(command);
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

  // ——— Bottom sheet on phones, centered card on tablets ———
  const isMoving = awningState.isExtending || awningState.isRetracting;
  const motionLabel = awningState.isExtending
    ? 'Extending'
    : awningState.isRetracting
      ? 'Retracting'
      : awningState.position >= 1
        ? 'Extended'
        : awningState.position <= 0
          ? 'Retracted'
          : 'Stopped';
  const fabricWidth = awningExtension.interpolate({ inputRange: [0, 1], outputRange: ['0%', '58%'] });
  const progressWidth = awningExtension.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  const postHeight = supportPosts.interpolate({ inputRange: [0, 1], outputRange: [0, 80] });
  const fabricTilt = fabricWave.interpolate({ inputRange: [-1, 1], outputRange: ['-1deg', '1deg'] });
  const fabricShake = motorVibration.interpolate({ inputRange: [-3, 3], outputRange: [-0.5, 0.5] });

  const controls = [
    { command: 'retract', label: 'Retract', icon: 'arrow-collapse-left', active: awningState.isRetracting },
    { command: 'stop', label: 'Stop', icon: 'stop', active: awningState.isStopped, danger: true },
    { command: 'extend', label: 'Extend', icon: 'arrow-expand-right', active: awningState.isExtending },
  ];

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType={isTablet ? 'fade' : 'slide'}
      supportedOrientations={['portrait', 'landscape']}
      onRequestClose={onClose}
    >
      <View style={[styles.backdrop, isTablet && styles.backdropTablet]}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close awning controls"
        />
        <View
          style={[
            styles.sheet,
            isTablet ? styles.sheetTablet : { paddingBottom: insets.bottom + 20 },
          ]}
        >
          {!isTablet && <View style={styles.grabber} />}

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <MaterialCommunityIcons name="rv-truck" size={22} color="#FFB267" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Awning</Text>
              <View style={styles.stateRow}>
                <View style={[styles.stateDot, { backgroundColor: isMoving ? '#FFB267' : '#6B6363' }]} />
                <Text style={styles.stateText}>{motionLabel}</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.closeIcon}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <Ionicons name="close" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Awning visual */}
          <View style={styles.scene}>
            <View style={styles.sceneGround} />
            <View style={styles.rvBody}>
              <View style={styles.rvWindow} />
              <View style={styles.rvDoor} />
            </View>
            <View style={styles.rollerTube} />
            <Animated.View
              style={[
                styles.fabric,
                { width: fabricWidth, transform: [{ rotate: fabricTilt }, { translateY: fabricShake }] },
              ]}
            >
              <View style={styles.fabricStripe} />
              <Animated.View style={[styles.post, { height: postHeight }]} />
            </Animated.View>
            <Animated.View style={[styles.shade, { width: fabricWidth, opacity: shadowOpacity }]} />
          </View>

          <View style={styles.progressTrack}>
            <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
          </View>
          <View style={styles.progressLabels}>
            <Text style={styles.progressLabel}>Retracted</Text>
            <Text style={styles.progressLabel}>Extended</Text>
          </View>

          {/* Controls */}
          <View style={styles.controls}>
            {controls.map(({ command, label, icon, active, danger }) => {
              const activeColor = danger ? '#FF6B6B' : '#FFB267';
              return (
                <TouchableOpacity
                  key={command}
                  style={[
                    styles.control,
                    isTablet && styles.controlTablet,
                    active && { backgroundColor: activeColor, borderColor: activeColor },
                  ]}
                  onPress={() => executeFluidCommand(command)}
                  activeOpacity={0.75}
                  accessibilityRole="button"
                  accessibilityLabel={`${label} awning`}
                  accessibilityState={{ selected: active }}
                >
                  <MaterialCommunityIcons
                    name={icon}
                    size={isTablet ? 34 : 28}
                    color={active ? '#1B1B1B' : danger ? '#FF6B6B' : '#FFFFFF'}
                  />
                  <Text style={[styles.controlLabel, { color: active ? '#1B1B1B' : '#FFFFFF' }]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Status */}
          <View style={styles.statusBar}>
            <Ionicons name="information-circle-outline" size={16} color="#9E9696" />
            <Text style={styles.statusMessage} numberOfLines={1}>
              {showStatus ? statusMessage : 'Awning ready'}
            </Text>
            <Text style={styles.canStatus}>
              CAN {canBusListener.current ? 'online' : 'offline'}
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  backdropTablet: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheetTablet: {
    width: 600,
    maxWidth: '90%',
    borderRadius: 28,
    borderWidth: 1,
    paddingHorizontal: 28,
    paddingTop: 24,
    paddingBottom: 28,
  },
  controlTablet: {
    height: 112,
    borderRadius: 22,
  },
  sheet: {
    backgroundColor: '#211D1D',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 10,
    borderTopWidth: 1,
    borderColor: 'rgba(255, 178, 103, 0.15)',
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 178, 103, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  title: {
    color: Color.white0,
    fontSize: 22,
    fontFamily: FontFamily.latoBold,
    fontWeight: '700',
  },
  stateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  stateDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  stateText: {
    color: '#C9C1C1',
    fontSize: 14,
    fontFamily: FontFamily.latoRegular,
  },
  closeIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scene: {
    height: 150,
    borderRadius: 18,
    backgroundColor: '#1B1B1B',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  sceneGround: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 24,
    backgroundColor: '#2A2626',
  },
  rvBody: {
    position: 'absolute',
    left: 16,
    bottom: 24,
    width: '30%',
    height: 96,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 6,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
    backgroundColor: '#3A3434',
    borderWidth: 1,
    borderColor: '#4E4747',
  },
  rvWindow: {
    position: 'absolute',
    top: 14,
    left: 12,
    width: '45%',
    height: 20,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 178, 103, 0.35)',
  },
  rvDoor: {
    position: 'absolute',
    bottom: 0,
    right: 10,
    width: 18,
    height: 50,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
    backgroundColor: '#2A2626',
  },
  rollerTube: {
    position: 'absolute',
    left: '33%',
    bottom: 107,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFB267',
  },
  fabric: {
    position: 'absolute',
    left: '35%',
    bottom: 108,
    height: 8,
    borderRadius: 3,
    backgroundColor: '#FFB267',
  },
  fabricStripe: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: -4,
    height: 4,
    backgroundColor: '#C9853F',
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
  },
  post: {
    position: 'absolute',
    right: 0,
    top: 4,
    width: 3,
    backgroundColor: '#9E9696',
  },
  shade: {
    position: 'absolute',
    left: '35%',
    bottom: 18,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginTop: 16,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: '#FFB267',
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  progressLabel: {
    color: '#9E9696',
    fontSize: 12,
    fontFamily: FontFamily.latoRegular,
  },
  controls: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 12,
  },
  control: {
    flex: 1,
    height: 92,
    borderRadius: 18,
    backgroundColor: '#2A2626',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlLabel: {
    marginTop: 6,
    fontSize: 15,
    fontFamily: FontFamily.latoBold,
    fontWeight: '700',
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#1B1B1B',
  },
  statusMessage: {
    flex: 1,
    color: Color.white0,
    fontSize: 13,
    marginLeft: 8,
    fontFamily: FontFamily.latoRegular,
  },
  canStatus: {
    color: '#FFB267',
    fontSize: 12,
    fontFamily: FontFamily.latoRegular,
    marginLeft: 8,
  },
});

export default AwningControlModal;