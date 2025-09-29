import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  Image, 
  StyleSheet, 
  Animated, 
  Dimensions,
  StatusBar,
  Easing
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

const MobileAnimatedSplashScreen = ({ onComplete, children }) => {
  const [animationFinished, setAnimationFinished] = useState(false);
  
  // Animation values
  const logoScale = useRef(new Animated.Value(0.3)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoRotate = useRef(new Animated.Value(0)).current;
  const logoBounce = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textTranslateY = useRef(new Animated.Value(30)).current;
  const backgroundOpacity = useRef(new Animated.Value(1)).current;
  const containerScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    startAnimation();
    // Start bounce animation after logo entrance (1.2 seconds delay)
    setTimeout(() => {
      startBounceAnimation();
    }, 1200);
  }, []);

  const startBounceAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(logoBounce, {
          toValue: -6, // Reduced bounce for mobile
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(logoBounce, {
          toValue: 0,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const startAnimation = () => {
    // Sequence of animations
    Animated.sequence([
      // Logo entrance
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 800,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(logoScale, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(logoRotate, {
          toValue: 1,
          duration: 1000,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      
      // Text entrance (delay for logo to settle)
      Animated.delay(200),
      Animated.parallel([
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 600,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.spring(textTranslateY, {
          toValue: 0,
          tension: 80,
          friction: 8,
          useNativeDriver: true,
        }),
      ]),
      
      // Hold the animation for a moment
      Animated.delay(1500),
      
      // Exit animation
      Animated.parallel([
        Animated.timing(backgroundOpacity, {
          toValue: 0,
          duration: 800,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(containerScale, {
          toValue: 1.1,
          duration: 800,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      setAnimationFinished(true);
      setTimeout(() => {
        onComplete();
      }, 100);
    });
  };

  if (animationFinished) {
    return children;
  }

  const rotateInterpolation = logoRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      
      <Animated.View style={[
        styles.splashContainer,
        {
          opacity: backgroundOpacity,
          transform: [{ scale: containerScale }]
        }
      ]}>
        <LinearGradient
          colors={['#000000', '#111111', '#000000']}
          style={styles.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.content}>
            
            {/* Animated Logo with Motion Lines */}
            <Animated.View style={[
              styles.logoContainer,
              {
                opacity: logoOpacity,
                transform: [
                  { scale: logoScale },
                  { rotate: rotateInterpolation },
                  { translateY: logoBounce }
                ]
              }
            ]}>
              
              {/* Motion Lines - Mobile optimized */}
              <Animated.View style={[
                styles.motionLinesContainer,
                { opacity: logoOpacity }
              ]}>
                <MotionLine delay={0} />
                <MotionLine delay={150} />
                <MotionLine delay={300} />
              </Animated.View>

              <Image
                source={require("../assets/trailer.png")}
                style={styles.logo}
              />
              
              {/* Glow effect */}
              <Animated.View style={[
                styles.logoGlow,
                {
                  opacity: logoOpacity.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 0.6],
                    extrapolate: 'clamp',
                  })
                }
              ]} />
            </Animated.View>

            {/* Animated Text - Mobile optimized */}
            <Animated.View style={[
              styles.textContainer,
              {
                opacity: textOpacity,
                transform: [{ translateY: textTranslateY }]
              }
            ]}>
              <Text style={styles.appName}>RV Control</Text>
              <Text style={styles.tagline}>Smart RV Management</Text>
            </Animated.View>

            {/* Loading indicator */}
            <Animated.View style={[
              styles.loadingContainer,
              { opacity: textOpacity }
            ]}>
              <View style={styles.loadingDots}>
                <LoadingDot delay={0} />
                <LoadingDot delay={200} />
                <LoadingDot delay={400} />
              </View>
            </Animated.View>

          </View>
        </LinearGradient>
      </Animated.View>
    </View>
  );
};

// Motion line component with continuous movement animation
const MotionLine = ({ delay }) => {
  const lineTranslateX = useRef(new Animated.Value(-50)).current; // Reduced for mobile
  const lineOpacity = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    const animate = () => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(lineTranslateX, {
            toValue: 50,
            duration: 1200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(lineTranslateX, {
            toValue: -50,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      ).start();
    };

    const timer = setTimeout(animate, delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <Animated.View style={[
      styles.motionLine,
      {
        opacity: lineOpacity,
        transform: [{ translateX: lineTranslateX }]
      }
    ]} />
  );
};

// Loading dot component with individual animation
const LoadingDot = ({ delay }) => {
  const dotOpacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animate = () => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(dotOpacity, {
            toValue: 1,
            duration: 600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(dotOpacity, {
            toValue: 0.3,
            duration: 600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    };

    const timer = setTimeout(animate, delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <Animated.View style={[
      styles.loadingDot,
      { opacity: dotOpacity }
    ]} />
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  splashContainer: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30, // Reduced for mobile
  },
  logoContainer: {
    position: 'relative',
    marginBottom: 50, // Reduced for mobile
    width: 160, // Reduced for mobile
    height: 100, // Reduced for mobile
    justifyContent: 'center',
    alignItems: 'center',
  },
  motionLinesContainer: {
    position: 'absolute',
    left: -60, // Adjusted for mobile
    top: '50%',
    width: 50, // Reduced for mobile
    height: 50, // Reduced for mobile
    justifyContent: 'space-evenly',
    alignItems: 'flex-end',
    transform: [{ translateY: -25 }], // Adjusted for mobile
  },
  motionLine: {
    width: 25, // Reduced for mobile
    height: 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 1,
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 2,
  },
  logo: {
    width: 90, // Reduced from tablet's 120
    height: 90, // Reduced from tablet's 120
    resizeMode: 'contain',
    tintColor: '#FFFFFF',
  },
  
  textContainer: {
    alignItems: 'center',
    marginBottom: 60, // Reduced for mobile
  },
  appName: {
    fontSize: 36, // Reduced from tablet's 48
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 1.5, // Reduced from tablet's 2
    textShadowColor: 'rgba(255, 140, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  tagline: {
    fontSize: 16, // Reduced from tablet's 18
    color: '#FFB267',
    textAlign: 'center',
    fontWeight: '300',
    letterSpacing: 0.8, // Reduced from tablet's 1
  },
  loadingContainer: {
    position: 'absolute',
    bottom: 80, // Adjusted for mobile
    alignItems: 'center',
  },
  loadingDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6, // Reduced from tablet's 8
  },
  loadingDot: {
    width: 7, // Reduced from tablet's 8
    height: 7, // Reduced from tablet's 8
    borderRadius: 3.5, // Adjusted for smaller size
    backgroundColor: '#FF8C00',
  },
});

export default MobileAnimatedSplashScreen;