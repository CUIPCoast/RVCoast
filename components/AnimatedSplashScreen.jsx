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

const AnimatedSplashScreen = ({ onComplete, children }) => {
  const [animationFinished, setAnimationFinished] = useState(false);
  
  // Animation values
  const logoScale = useRef(new Animated.Value(0.3)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoRotate = useRef(new Animated.Value(0)).current;
  const logoBounce = useRef(new Animated.Value(0)).current; // New bounce animation
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
          toValue: -8,
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
                  { translateY: logoBounce } // Add bounce transform
                ]
              }
            ]}>
              
              {/* Motion Lines */}
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

            {/* Animated Text */}
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
  const lineTranslateX = useRef(new Animated.Value(-60)).current;
  const lineOpacity = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    const animate = () => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(lineTranslateX, {
            toValue: 60,
            duration: 1200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(lineTranslateX, {
            toValue: -60,
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
    paddingHorizontal: 40,
  },
  logoContainer: {
    position: 'relative',
    marginBottom: 60,
    width: 200,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  motionLinesContainer: {
    position: 'absolute',
    left: -80,
    top: '50%',
    width: 60,
    height: 60,
    justifyContent: 'space-evenly',
    alignItems: 'flex-end',
    transform: [{ translateY: -30 }],
  },
  motionLine: {
    width: 30,
    height: 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 1,
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 2,
  },
  logo: {
    width: 120,
    height: 120,
    resizeMode: 'contain',
    tintColor: '#FFFFFF',
  },
  logoGlow: {
    position: 'absolute',
    top: -10,
    left: -10,
    width: 140,
    height: 140,
    backgroundColor: '',
    borderRadius: 70,
    zIndex: -1,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 80,
  },
  appName: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 2,
    textShadowColor: 'rgba(255, 140, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  tagline: {
    fontSize: 18,
    color: '#FFB267',
    textAlign: 'center',
    fontWeight: '300',
    letterSpacing: 1,
  },
  loadingContainer: {
    position: 'absolute',
    bottom: 100,
    alignItems: 'center',
  },
  loadingDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF8C00',
  },
});

export default AnimatedSplashScreen;