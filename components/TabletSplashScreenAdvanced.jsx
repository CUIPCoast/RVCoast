import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  Image, 
  StyleSheet, 
  Animated, 
  Dimensions,
  StatusBar,
  TouchableOpacity,
  PanResponder,
  Easing
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
const { width, height } = Dimensions.get('window');

const TabletSplashScreen = ({ onSplashComplete, children }) => {
  const [showSwipeHint, setShowSwipeHint] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showMainScreen, setShowMainScreen] = useState(false);
  
  // Splash screen animations
  const translateX = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const hintOpacity = useRef(new Animated.Value(1)).current;
  
  // Main screen entrance animations
  const mainScreenTranslateX = useRef(new Animated.Value(width)).current;
  const mainScreenOpacity = useRef(new Animated.Value(0)).current;
  const mainScreenScale = useRef(new Animated.Value(0.9)).current;
  
  // Background transition
  const backgroundFade = useRef(new Animated.Value(1)).current;
  
  // Logo float animation
  const logoFloat = useRef(new Animated.Value(0)).current;
  
  // Feature items stagger animation
  const featureAnimations = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0)
  ]).current;

  // Initial entrance animations
  useEffect(() => {
    // Logo floating animation
    const floatAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(logoFloat, {
          toValue: -10,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(logoFloat, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    floatAnimation.start();

    // Stagger feature items animation
    const featureStagger = Animated.stagger(200, 
      featureAnimations.map(anim => 
        Animated.spring(anim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        })
      )
    );
    
    setTimeout(() => featureStagger.start(), 500);

    // Hint pulsing animation
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(hintOpacity, {
          toValue: 0.3,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(hintOpacity, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );
    pulseAnimation.start();

    return () => {
      floatAnimation.stop();
      pulseAnimation.stop();
    };
  }, []);

  // Create PanResponder for swipe gesture
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return Math.abs(gestureState.dx) > 20 && Math.abs(gestureState.dy) < 100;
      },
      onPanResponderMove: (evt, gestureState) => {
        if (gestureState.dx > 0 && !isTransitioning) {
          translateX.setValue(gestureState.dx);
          const progress = Math.min(gestureState.dx / (width * 0.3), 1);
          scaleAnim.setValue(1 - progress * 0.1);
          fadeAnim.setValue(1 - progress * 0.3);
          
          // Start revealing main screen
          mainScreenTranslateX.setValue(width - gestureState.dx * 0.5);
          mainScreenOpacity.setValue(progress * 0.3);
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        const { dx, vx } = gestureState;
        
        if ((dx > width * 0.25 || vx > 0.5) && !isTransitioning) {
          handleTransition();
        } else if (!isTransitioning) {
          // Spring back to original position
          Animated.parallel([
            Animated.spring(translateX, {
              toValue: 0,
              useNativeDriver: true,
              tension: 100,
              friction: 8,
            }),
            Animated.spring(scaleAnim, {
              toValue: 1,
              useNativeDriver: true,
              tension: 100,
              friction: 8,
            }),
            Animated.spring(fadeAnim, {
              toValue: 1,
              useNativeDriver: true,
              tension: 100,
              friction: 8,
            }),
            Animated.spring(mainScreenTranslateX, {
              toValue: width,
              useNativeDriver: true,
              tension: 100,
              friction: 8,
            }),
            Animated.spring(mainScreenOpacity, {
              toValue: 0,
              useNativeDriver: true,
              tension: 100,
              friction: 8,
            }),
          ]).start();
        }
      },
    })
  ).current;

  const handleTransition = () => {
    if (isTransitioning) return;
    
    setIsTransitioning(true);
    setShowMainScreen(true);

    // Complex transition sequence
    Animated.parallel([
      // Splash screen exit
      Animated.timing(translateX, {
        toValue: -width,
        duration: 800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.8,
        duration: 800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      
      // Main screen entrance
      Animated.timing(mainScreenTranslateX, {
        toValue: 0,
        duration: 800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(mainScreenOpacity, {
        toValue: 1,
        duration: 600,
        delay: 200,
        useNativeDriver: true,
      }),
      Animated.spring(mainScreenScale, {
        toValue: 1,
        tension: 50,
        friction: 8,
        delay: 300,
        useNativeDriver: true,
      }),
      
      // Background transition
      Animated.timing(backgroundFade, {
        toValue: 0,
        duration: 1000,
        delay: 400,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setTimeout(() => {
        onSplashComplete();
      }, 200);
    });
  };

  const handleSkip = () => {
    handleTransition();
  };

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      
      {/* Splash Screen */}
      <Animated.View style={[
        styles.splashContainer,
        {
          opacity: backgroundFade,
          transform: [{ translateX }]
        }
      ]}>
        <LinearGradient
          colors={['#000000', '#1a1a1a', '#2d2d2d']}
          style={styles.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <TouchableOpacity 
            style={styles.skipButton} 
            onPress={handleSkip}
          >
            <Text style={styles.skipButtonText}>Skip</Text>
          </TouchableOpacity>

          <Animated.View 
            style={[
              styles.content,
              {
                transform: [{ scale: scaleAnim }],
                opacity: fadeAnim,
              }
            ]}
            {...panResponder.panHandlers}
          >
            
            {/* Main Logo and Branding */}
            <View style={styles.logoSection}>
              <Animated.View style={[
                styles.logoContainer,
                {
                  transform: [
                    { translateY: logoFloat },
                    { 
                      scale: scaleAnim.interpolate({
                        inputRange: [0.8, 1],
                        outputRange: [0.9, 1],
                        extrapolate: 'clamp',
                      })
                    }
                  ]
                }
              ]}>
                <Image
                  source={require("../assets/trailer.png")}
                  style={[styles.logo]}
                />
                <Animated.View style={[
                  styles.logoGlow,
                  {
                    opacity: hintOpacity.interpolate({
                      inputRange: [0.3, 1],
                      outputRange: [0.2, 0.6],
                      extrapolate: 'clamp',
                    })
                  }
                ]} />
              </Animated.View>
              
              <Animated.Text style={[
                styles.title,
                {
                  transform: [{
                    translateY: logoFloat.interpolate({
                      inputRange: [-10, 0],
                      outputRange: [-2, 0],
                      extrapolate: 'clamp',
                    })
                  }]
                }
              ]}>
                RV Control System Tablet Demo
              </Animated.Text>
              
              <Text style={styles.subtitle}>Next Generation Smart RV Management</Text>
              
              {/* Feature highlights with stagger animation */}
              <View style={styles.featuresContainer}>
                {[
                  { icon: "bulb", text: "Smart Lighting Control" },
                  { icon: "thermometer", text: "Climate Management" },
                  { icon: "water", text: "Water System Monitoring" },
                  { icon: "battery-charging", text: "Power Management" }
                ].map((feature, index) => (
                  <Animated.View
                    key={index}
                    style={[
                      styles.featureItem,
                      {
                        opacity: featureAnimations[index],
                        transform: [{
                          translateX: featureAnimations[index].interpolate({
                            inputRange: [0, 1],
                            outputRange: [50, 0],
                            extrapolate: 'clamp',
                          })
                        }]
                      }
                    ]}
                  >
                    <Icon name={feature.icon} size={20} color="#FF8C00" />
                    <Text style={styles.featureText}>{feature.text}</Text>
                  </Animated.View>
                ))}
              </View>
            </View>

            {/* Enhanced Swipe Indicator */}
            <Animated.View style={[
              styles.swipeSection,
              { opacity: hintOpacity }
            ]}>
              <View style={styles.swipeIndicator}>
                <Animated.View style={[
                  styles.swipeChevron,
                  {
                    transform: [{
                      translateX: hintOpacity.interpolate({
                        inputRange: [0.3, 1],
                        outputRange: [0, 10],
                        extrapolate: 'clamp',
                      })
                    }]
                  }
                ]}>
                  <Icon name="chevron-forward" size={30} color="#FFB267" />
                </Animated.View>
                <Animated.View style={[
                  styles.swipeChevron,
                  {
                    opacity: 0.7,
                    transform: [{
                      translateX: hintOpacity.interpolate({
                        inputRange: [0.3, 1],
                        outputRange: [-5, 5],
                        extrapolate: 'clamp',
                      })
                    }]
                  }
                ]}>
                  <Icon name="chevron-forward" size={30} color="#FFB267" />
                </Animated.View>
                <Animated.View style={[
                  styles.swipeChevron,
                  {
                    opacity: 0.4,
                    transform: [{
                      translateX: hintOpacity.interpolate({
                        inputRange: [0.3, 1],
                        outputRange: [-10, 0],
                        extrapolate: 'clamp',
                      })
                    }]
                  }
                ]}>
                  <Icon name="chevron-forward" size={30} color="#FFB267" />
                </Animated.View>
              </View>
              <Text style={styles.swipeText}>Swipe right to enter</Text>
              
              {/* Progress bar */}
              <Animated.View style={[
                styles.progressBar,
                {
                  width: translateX.interpolate({
                    inputRange: [0, width * 0.3],
                    outputRange: [0, 100],
                    extrapolate: 'clamp',
                  })
                }
              ]} />
            </Animated.View>

            {/* Bottom branding */}
            <View style={styles.bottomSection}>
              <Text style={styles.versionText}>v2.0.1</Text>
              <Text style={styles.copyrightText}>© 2024 RV Control Systems</Text>
            </View>
          </Animated.View>
        </LinearGradient>
      </Animated.View>

      {/* Main Screen Preview/Transition */}
      {showMainScreen && (
        <Animated.View style={[
          styles.mainScreenContainer,
          {
            opacity: mainScreenOpacity,
            transform: [
              { translateX: mainScreenTranslateX },
              { scale: mainScreenScale }
            ]
          }
        ]}>
          {children}
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  splashContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    zIndex: 2,
  },
  mainScreenContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    zIndex: 1,
  },
  gradient: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 20,
  },
  skipButton: {
    position: 'absolute',
    top: 50,
    right: 30,
    zIndex: 1000,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  skipButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  logoSection: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  logoContainer: {
    width: 200,
    height: 120,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
    shadowColor: '#FF8C00',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
    position: 'relative',
  },
  logoGlow: {
    position: 'absolute',
    width: 220,
    height: 140,
    backgroundColor: '#FF8C00',
    borderRadius: 25,
    opacity: 0.3,
    zIndex: -1,
  },
  logo: {
    width: 160,
    height: 160,
    resizeMode: 'contain',
    tintColor: '#FFFFFF', 
  },
  title: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: 1,
    textShadowColor: 'rgba(255, 140, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 18,
    color: '#CCCCCC',
    textAlign: 'center',
    marginBottom: 40,
    fontWeight: '300',
    letterSpacing: 0.5,
  },
  featuresContainer: {
    gap: 15,
    marginTop: 20,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    minWidth: 250,
    borderWidth: 1,
    borderColor: 'rgba(255, 140, 0, 0.2)',
  },
  featureText: {
    color: '#E0E0E0',
    fontSize: 16,
    marginLeft: 12,
    fontWeight: '500',
  },
  swipeSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  swipeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  swipeChevron: {
    marginLeft: -10,
  },
  swipeText: {
    color: '#FFB267',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 1,
    marginBottom: 10,
  },
  progressBar: {
    height: 3,
    backgroundColor: '#FF8C00',
    borderRadius: 2,
    marginTop: 5,
  },
  bottomSection: {
    alignItems: 'center',
    gap: 5,
  },
  versionText: {
    color: '#888888',
    fontSize: 14,
    fontWeight: '500',
  },
  copyrightText: {
    color: '#666666',
    fontSize: 12,
    fontWeight: '400',
  },
});

export default TabletSplashScreen;