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

const MobileSplashScreen = ({ onSplashComplete, children }) => {
  const [showSwipeHint, setShowSwipeHint] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showMainScreen, setShowMainScreen] = useState(false);
  
  // Splash screen animations
  const translateY = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const hintOpacity = useRef(new Animated.Value(1)).current;
  
  // Main screen entrance animations
  const mainScreenTranslateY = useRef(new Animated.Value(height)).current;
  const mainScreenOpacity = useRef(new Animated.Value(0)).current;
  const mainScreenScale = useRef(new Animated.Value(0.9)).current;
  
  // Background transition
  const backgroundFade = useRef(new Animated.Value(1)).current;
  
  // Logo float animation
  const logoFloat = useRef(new Animated.Value(0)).current;
  
  // Logo glow animation
  const logoGlowOpacity = useRef(new Animated.Value(0.6)).current;
  
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
          toValue: -8,
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

    // Logo glow pulsing animation
    const glowAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(logoGlowOpacity, {
          toValue: 0.3,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(logoGlowOpacity, {
          toValue: 0.8,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    glowAnimation.start();

    // Stagger feature items animation - trigger immediately
    const featureStagger = Animated.stagger(150, 
      featureAnimations.map(anim => 
        Animated.spring(anim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 80,
          friction: 8,
        })
      )
    );
    
    // Start feature animations right away
    featureStagger.start();

    // Hint pulsing animation
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(hintOpacity, {
          toValue: 0.4,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(hintOpacity, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    );
    pulseAnimation.start();

    return () => {
      floatAnimation.stop();
      glowAnimation.stop();
      pulseAnimation.stop();
    };
  }, []);

  // Create PanResponder for vertical swipe gesture (mobile)
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return Math.abs(gestureState.dy) > 20 && Math.abs(gestureState.dx) < 100;
      },
      onPanResponderMove: (evt, gestureState) => {
        if (gestureState.dy < 0 && !isTransitioning) { // Swipe up
          translateY.setValue(gestureState.dy);
          const progress = Math.min(Math.abs(gestureState.dy) / (height * 0.3), 1);
          scaleAnim.setValue(1 - progress * 0.1);
          fadeAnim.setValue(1 - progress * 0.3);
          
          // Start revealing main screen
          mainScreenTranslateY.setValue(height + gestureState.dy * 0.5);
          mainScreenOpacity.setValue(progress * 0.3);
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        const { dy, vy } = gestureState;
        
        if ((dy < -height * 0.25 || vy < -0.5) && !isTransitioning) {
          handleTransition();
        } else if (!isTransitioning) {
          // Spring back to original position
          Animated.parallel([
            Animated.spring(translateY, {
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
            Animated.spring(mainScreenTranslateY, {
              toValue: height,
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
      Animated.timing(translateY, {
        toValue: -height,
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
      Animated.timing(mainScreenTranslateY, {
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
          transform: [{ translateY }]
        }
      ]}>
        <LinearGradient
          colors={['#000000', '#111111', '#000000']}
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
                    opacity: logoGlowOpacity
                  }
                ]} />
              </Animated.View>
              
              <Animated.Text style={[
                styles.title,
                {
                  transform: [{
                    translateY: logoFloat.interpolate({
                      inputRange: [-8, 0],
                      outputRange: [-2, 0],
                      extrapolate: 'clamp',
                    })
                  }]
                }
              ]}>
                RV Control System Mobile Demo
              </Animated.Text>
              
              <Text style={styles.subtitle}>Smart RV Management</Text>
              
              {/* Feature highlights with stagger animation */}
              <View style={styles.featuresContainer}>
                {[
                  { icon: "bulb", text: "Smart Lighting" },
                  { icon: "thermometer", text: "Climate Control" },
                  { icon: "water", text: "Water Monitoring" },
                  { icon: "battery-charging", text: "Power Management" }
                ].map((feature, index) => (
                  <Animated.View
                    key={index}
                    style={[
                      styles.featureItem,
                      {
                        opacity: featureAnimations[index],
                        transform: [{
                          translateY: featureAnimations[index].interpolate({
                            inputRange: [0, 1],
                            outputRange: [30, 0],
                            extrapolate: 'clamp',
                          })
                        }]
                      }
                    ]}
                  >
                    <Icon name={feature.icon} size={18} color="#FF8C00" />
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
                      translateY: hintOpacity.interpolate({
                        inputRange: [0.4, 1],
                        outputRange: [0, -8],
                        extrapolate: 'clamp',
                      })
                    }]
                  }
                ]}>
                  <Icon name="chevron-up" size={24} color="#FFB267" />
                </Animated.View>
                <Animated.View style={[
                  styles.swipeChevron,
                  {
                    opacity: 0.7,
                    transform: [{
                      translateY: hintOpacity.interpolate({
                        inputRange: [0.4, 1],
                        outputRange: [3, -3],
                        extrapolate: 'clamp',
                      })
                    }]
                  }
                ]}>
                  <Icon name="chevron-up" size={24} color="#FFB267" />
                </Animated.View>
                <Animated.View style={[
                  styles.swipeChevron,
                  {
                    opacity: 0.4,
                    transform: [{
                      translateY: hintOpacity.interpolate({
                        inputRange: [0.4, 1],
                        outputRange: [6, 2],
                        extrapolate: 'clamp',
                      })
                    }]
                  }
                ]}>
                  <Icon name="chevron-up" size={24} color="#FFB267" />
                </Animated.View>
              </View>
              <Text style={styles.swipeText}>Swipe up to enter</Text>
              
              {/* Progress bar */}
              <Animated.View style={[
                styles.progressBar,
                {
                  height: translateY.interpolate({
                    inputRange: [-height * 0.3, 0],
                    outputRange: [60, 0],
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
              { translateY: mainScreenTranslateY },
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
    paddingHorizontal: 30,
    paddingVertical: 20,
  },
  skipButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 1000,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  skipButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  logoSection: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    marginTop: 40,
  },
  logoContainer: {
    position: 'relative',
    marginBottom: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 90,
    height: 90,
    resizeMode: 'contain',
    tintColor: '#FFFFFF',
  },
  logoGlow: {
    position: 'absolute',
    top: -8,
    left: -8,
    width: 106,
    height: 106,
    backgroundColor: '#FF8C00',
    borderRadius: 53,
    zIndex: -1,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 0.5,
    textShadowColor: 'rgba(255, 140, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#CCCCCC',
    textAlign: 'center',
    marginBottom: 30,
    fontWeight: '300',
    letterSpacing: 0.3,
  },
  featuresContainer: {
    gap: 12,
    marginTop: 15,
    width: '100%',
    paddingHorizontal: 10,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    
    paddingHorizontal: 42,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 140, 0, 0.2)',
    height: 50,
    width: 250,
  },
  featureText: {
    color: '#E0E0E0',
    fontSize: 14,
    marginLeft: 10,
    fontWeight: '500',
    flex: 1,
    textAlign: 'left',
  },
  swipeSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  swipeIndicator: {
    alignItems: 'center',
    marginBottom: 12,
    height: 30,
    justifyContent: 'center',
  },
  swipeChevron: {
    position: 'absolute',
  },
  swipeText: {
    color: '#FFB267',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  progressBar: {
    width: 3,
    backgroundColor: '#FF8C00',
    borderRadius: 2,
    marginTop: 5,
  },
  bottomSection: {
    alignItems: 'center',
    gap: 4,
    marginBottom: 20,
  },
  versionText: {
    color: '#888888',
    fontSize: 12,
    fontWeight: '500',
  },
  copyrightText: {
    color: '#666666',
    fontSize: 10,
    fontWeight: '400',
  },
});

export default MobileSplashScreen;