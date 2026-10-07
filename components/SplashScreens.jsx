import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  StatusBar,
  PanResponder,
  Easing,
  AccessibilityInfo,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { FontFamily } from '../GlobalStyles';

// Shared boot screens for phone and tablet, styled to the app theme
// (dark brown surfaces, sandy-orange accent).
//   IntroSplash – short animated brand intro, calls onComplete when done.
//   BootSplash  – "swipe to enter" demo screen that reveals `children`.

const ACCENT = '#FFB267';
const ACCENT_DEEP = '#FF8C00';
const BACKGROUND = ['#211D1D', '#1B1B1B', '#0E0C0C'];

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const PROGRESS_W = 180;
// Sum of the intro steps (600 + 500 + 1600 + 600) plus slack for the spring.
const INTRO_DURATION_MS = 3800;

// If a splash screen throws, log it and skip straight to the next stage
// instead of leaving the user on a blank screen.
class SplashErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error, info) {
    console.error(`[Splash] ${this.props.name} crashed, skipping:`, error, info?.componentStack);
    this.props.onSkip?.();
  }

  render() {
    if (this.state.failed) {
      return <View style={{ flex: 1, backgroundColor: '#211D1D' }}>{this.props.fallback}</View>;
    }
    return this.props.children;
  }
}

const useReduceMotion = () => {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => mounted && setReduce(value))
      .catch(() => {});
    return () => { mounted = false; };
  }, []);
  return reduce;
};

// Dashes sliding under the RV to suggest it is driving.
const RoadLines = ({ width, animate }) => {
  const shift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animate) return undefined;
    const loop = Animated.loop(
      Animated.timing(shift, { toValue: 1, duration: 700, easing: Easing.linear, useNativeDriver: true })
    );
    loop.start();
    return () => loop.stop();
  }, [animate]);

  const translateX = shift.interpolate({ inputRange: [0, 1], outputRange: [0, -28] });

  return (
    <View style={[styles.road, { width }]} pointerEvents="none">
      <Animated.View style={[styles.roadInner, { transform: [{ translateX }] }]}>
        {Array.from({ length: Math.ceil(width / 28) + 2 }).map((_, i) => (
          <View key={i} style={styles.roadDash} />
        ))}
      </Animated.View>
    </View>
  );
};

// Accent RV mark with a soft pulsing halo.
const BrandMark = ({ size = 140, animate = true }) => {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animate) return undefined;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [animate]);

  const haloScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] });
  const haloOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.12] });

  return (
    <View style={{ width: size * 1.3, height: size * 1.3, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View
        style={[
          styles.halo,
          {
            width: size * 1.2,
            height: size * 1.2,
            borderRadius: size * 0.6,
            opacity: haloOpacity,
            transform: [{ scale: haloScale }],
          },
        ]}
      />
      <View style={[styles.mark, { width: size, height: size, borderRadius: size / 2 }]}>
        <MaterialCommunityIcons name="rv-truck" size={size * 0.46} color={ACCENT} />
        <RoadLines width={size * 0.62} animate={animate} />
      </View>
    </View>
  );
};

// ———————————————————— Stage 1: animated intro ————————————————————
const IntroSplashInner = ({ onComplete, compact = false }) => {
  const reduceMotion = useReduceMotion();
  const markScale = useRef(new Animated.Value(0.6)).current;
  const markOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textShift = useRef(new Animated.Value(20)).current;
  const progress = useRef(new Animated.Value(0)).current;
  const exitOpacity = useRef(new Animated.Value(1)).current;
  const exitScale = useRef(new Animated.Value(1)).current;

  const completed = useRef(false);

  useEffect(() => {
    // Hand off exactly once. The navigation must never depend on an animation
    // callback (callbacks can report finished:false or not fire),
    // so a timer guarantees we move on even if the animation stalls.
    const finish = () => {
      if (completed.current) return;
      completed.current = true;
      console.log('[Splash] intro complete');
      onComplete?.();
    };

    Animated.sequence([
      Animated.parallel([
        Animated.timing(markOpacity, { toValue: 1, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.spring(markScale, { toValue: 1, tension: 60, friction: 7, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(textOpacity, { toValue: 1, duration: 500, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(textShift, { toValue: 0, duration: 500, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      ]),
      Animated.timing(progress, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(exitOpacity, { toValue: 0, duration: 600, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
        Animated.timing(exitScale, { toValue: 1.06, duration: 600, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
      ]),
    ]).start(finish);

    const fallback = setTimeout(finish, INTRO_DURATION_MS);
    return () => clearTimeout(fallback);
  }, []);

  // Fill slides in from the left.
  const barShift = progress.interpolate({ inputRange: [0, 1], outputRange: [-PROGRESS_W, 0] });

  return (
    <View style={styles.root}>
      <StatusBar hidden />
      <Animated.View style={[styles.fill, { opacity: exitOpacity, transform: [{ scale: exitScale }] }]}>
        <LinearGradient colors={BACKGROUND} style={styles.fill} start={{ x: 0, y: 0 }} end={{ x: 0.4, y: 1 }}>
          <View style={styles.center}>
            <Animated.View style={{ opacity: markOpacity, transform: [{ scale: markScale }] }}>
              <BrandMark size={compact ? 120 : 150} animate={!reduceMotion} />
            </Animated.View>

            <Animated.View style={[styles.introText, { opacity: textOpacity, transform: [{ translateY: textShift }] }]}>
              <Text style={[styles.appName, compact && styles.appNameCompact]}>RV Control</Text>
              <Text style={[styles.tagline, compact && styles.taglineCompact]}>Smart RV Management</Text>
            </Animated.View>
          </View>

          <Animated.View style={[styles.introProgress, { opacity: textOpacity }]}>
            <View style={styles.progressTrack}>
              <Animated.View style={[styles.progressFill, { transform: [{ translateX: barShift }] }]} />
            </View>
            <Text style={styles.progressLabel}>Starting up…</Text>
          </Animated.View>
        </LinearGradient>
      </Animated.View>
    </View>
  );
};

// ———————————————————— Stage 2: swipe to enter ————————————————————
const FEATURES = {
  long: [
    { icon: 'bulb-outline', text: 'Smart Lighting Control' },
    { icon: 'thermometer-outline', text: 'Climate Management' },
    { icon: 'water-outline', text: 'Water System Monitoring' },
    { icon: 'battery-charging-outline', text: 'Power Management' },
  ],
  short: [
    { icon: 'bulb-outline', text: 'Smart Lighting' },
    { icon: 'thermometer-outline', text: 'Climate Control' },
    { icon: 'water-outline', text: 'Water Monitoring' },
    { icon: 'battery-charging-outline', text: 'Power Management' },
  ],
};

const TRACK_W = 320;
const KNOB = 56;
const V_TRACK_TRAVEL = 120; // how far the phone's vertical slider knob travels

const BootSplashInner = ({ onSplashComplete, children, direction = 'right', badge = 'Demo' }) => {
  const horizontal = direction === 'right';
  const dim = horizontal ? SCREEN_W : SCREEN_H;
  const reduceMotion = useReduceMotion();

  const [showMain, setShowMain] = useState(false);
  const transitioning = useRef(false);

  const knobTravel = horizontal ? TRACK_W - KNOB - 8 : V_TRACK_TRAVEL;
  const knob = useRef(new Animated.Value(0)).current; // slider knob position, 0..knobTravel
  const drag = useRef(new Animated.Value(0)).current; // page slide-out distance, only animated on enter
  const contentScale = useRef(new Animated.Value(1)).current;
  const contentFade = useRef(new Animated.Value(1)).current;
  const splashOpacity = useRef(new Animated.Value(1)).current;
  const mainOffset = useRef(new Animated.Value(dim)).current;
  const mainOpacity = useRef(new Animated.Value(0)).current;
  const mainScale = useRef(new Animated.Value(0.94)).current;
  const hint = useRef(new Animated.Value(0)).current;
  const featureAnims = useRef(FEATURES.long.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    Animated.stagger(
      140,
      featureAnims.map((anim) => Animated.spring(anim, { toValue: 1, tension: 80, friction: 9, useNativeDriver: true }))
    ).start();

    if (reduceMotion) return undefined;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(hint, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(hint, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [reduceMotion]);

  const finished = useRef(false);
  const finish = () => {
    if (finished.current) return;
    finished.current = true;
    console.log('[Splash] entering app');
    onSplashComplete?.();
  };

  const enter = () => {
    if (transitioning.current) return;
    transitioning.current = true;
    setShowMain(true);

    Animated.parallel([
      Animated.timing(drag, { toValue: dim, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(contentFade, { toValue: 0, duration: 500, useNativeDriver: true }),
      Animated.timing(contentScale, { toValue: 0.85, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(mainOffset, { toValue: 0, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(mainOpacity, { toValue: 1, duration: 500, delay: 150, useNativeDriver: true }),
      Animated.spring(mainScale, { toValue: 1, tension: 50, friction: 8, delay: 200, useNativeDriver: true }),
      Animated.timing(splashOpacity, { toValue: 0, duration: 800, delay: 300, useNativeDriver: true }),
    ]).start(() => setTimeout(finish, 150));

    // Same guarantee as the intro: never rely on the animation callback alone.
    setTimeout(finish, 1300);
  };

  // Slider: only the knob follows the finger. The page stays put until the knob
  // reaches the end of the track, then the page slides over.
  const releaseKnob = (delta, velocity) => {
    const complete = delta >= knobTravel * 0.9 || (velocity > 0.5 && delta >= knobTravel * 0.5);
    if (complete) {
      Animated.timing(knob, { toValue: knobTravel, duration: 120, easing: Easing.out(Easing.quad), useNativeDriver: false })
        .start(enter);
    } else {
      Animated.spring(knob, { toValue: 0, tension: 120, friction: 10, useNativeDriver: false }).start();
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !transitioning.current,
      onMoveShouldSetPanResponder: () => !transitioning.current,
      onPanResponderTerminationRequest: () => false,
      onPanResponderMove: (_, g) => {
        if (transitioning.current) return;
        const delta = horizontal ? g.dx : -g.dy;
        knob.setValue(Math.max(0, Math.min(delta, knobTravel)));
      },
      onPanResponderRelease: (_, g) => {
        if (transitioning.current) return;
        releaseKnob(horizontal ? g.dx : -g.dy, horizontal ? g.vx : -g.vy);
      },
      onPanResponderTerminate: () => releaseKnob(0, 0),
    })
  ).current;

  // Screen reader users activate the slider instead of dragging it.
  const sliderA11y = {
    accessible: true,
    accessibilityRole: 'button',
    accessibilityLabel: 'Enter app',
    accessibilityHint: horizontal ? 'Slide the button to the right to enter' : 'Slide the button up to enter',
    onAccessibilityTap: enter,
  };

  // On enter the splash slides off; main screen comes in from the opposite side.
  const splashTransform = horizontal
    ? [{ translateX: drag }]
    : [{ translateY: Animated.multiply(drag, -1) }];
  const mainTransform = horizontal
    ? [{ translateX: Animated.multiply(mainOffset, -1) }, { scale: mainScale }]
    : [{ translateY: mainOffset }, { scale: mainScale }];

  const knobShift = horizontal ? knob : Animated.multiply(knob, -1);
  const labelFade = knob.interpolate({ inputRange: [0, knobTravel * 0.6], outputRange: [1, 0], extrapolate: 'clamp' });
  const fillSize = knob.interpolate({ inputRange: [0, knobTravel], outputRange: [KNOB + 8, knobTravel + KNOB + 8], extrapolate: 'clamp' });
  const hintShift = hint.interpolate({ inputRange: [0, 1], outputRange: [0, horizontal ? 6 : -6] });
  const features = horizontal ? FEATURES.long : FEATURES.short;

  return (
    <View style={styles.root}>
      <StatusBar hidden />

      {showMain && (
        <Animated.View style={[styles.layer, { zIndex: 1, opacity: mainOpacity, transform: mainTransform }]}>
          {children}
        </Animated.View>
      )}

      <Animated.View style={[styles.layer, { zIndex: 2, opacity: splashOpacity, transform: splashTransform }]}>
        <LinearGradient colors={BACKGROUND} style={styles.fill} start={{ x: 0, y: 0 }} end={{ x: 0.4, y: 1 }}>
          <Animated.View
            style={[styles.bootContent, { opacity: contentFade, transform: [{ scale: contentScale }] }]}
          >
            <View style={styles.bootHero}>
              <BrandMark size={horizontal ? 120 : 100} animate={!reduceMotion} />
              <Text style={[styles.bootTitle, !horizontal && styles.bootTitleCompact]}>RV Control System</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{badge}</Text>
              </View>
              <Text style={styles.bootSubtitle}>
                {horizontal ? 'Next Generation Smart RV Management' : 'Smart RV Management'}
              </Text>

              <View style={[styles.features, horizontal && styles.featuresGrid]}>
                {features.map((f, i) => (
                  <Animated.View
                    key={f.text}
                    style={[
                      styles.feature,
                      horizontal && styles.featureGridItem,
                      {
                        opacity: featureAnims[i],
                        transform: [{
                          translateY: featureAnims[i].interpolate({ inputRange: [0, 1], outputRange: [16, 0] }),
                        }],
                      },
                    ]}
                  >
                    <View style={styles.featureIcon}>
                      <Ionicons name={f.icon} size={18} color={ACCENT} />
                    </View>
                    <Text style={styles.featureText}>{f.text}</Text>
                  </Animated.View>
                ))}
              </View>
            </View>

            {/* Swipe control */}
            {horizontal ? (
              <View style={styles.track} {...panResponder.panHandlers} {...sliderA11y}>
                <Animated.View style={[styles.trackFill, { width: fillSize }]} />
                <Animated.Text style={[styles.trackLabel, { opacity: labelFade }]}>Slide to enter</Animated.Text>
                <Animated.View style={[styles.knobWrap, { transform: [{ translateX: knobShift }] }]}>
                  <View style={styles.knob}>
                    <Animated.View style={{ transform: [{ translateX: hintShift }] }}>
                      <Ionicons name="chevron-forward" size={26} color="#1B1B1B" />
                    </Animated.View>
                  </View>
                </Animated.View>
              </View>
            ) : (
              <View style={styles.swipeUp}>
                <View style={styles.vTrack} {...panResponder.panHandlers} {...sliderA11y}>
                  <Animated.View style={[styles.vTrackFill, { height: fillSize }]} />
                  <Animated.View style={[styles.vKnobWrap, { transform: [{ translateY: knobShift }] }]}>
                    <View style={styles.knob}>
                      <Animated.View style={{ transform: [{ translateY: hintShift }] }}>
                        <Ionicons name="chevron-up" size={26} color="#1B1B1B" />
                      </Animated.View>
                    </View>
                  </Animated.View>
                </View>
                <Animated.Text style={[styles.swipeUpLabel, { opacity: labelFade }]}>Slide up to enter</Animated.Text>
              </View>
            )}

            <Text style={styles.version}>v2.0.1 · © 2024 RV Control Systems</Text>
          </Animated.View>
        </LinearGradient>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0E0C0C',
  },
  fill: {
    flex: 1,
  },
  layer: {
    ...StyleSheet.absoluteFill,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },

  // Brand mark
  halo: {
    position: 'absolute',
    backgroundColor: ACCENT,
  },
  mark: {
    backgroundColor: '#2A2626',
    borderWidth: 2,
    borderColor: 'rgba(255, 178, 103, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  road: {
    height: 3,
    overflow: 'hidden',
    marginTop: 4,
  },
  roadInner: {
    flexDirection: 'row',
  },
  roadDash: {
    width: 16,
    height: 3,
    borderRadius: 2,
    marginRight: 12,
    backgroundColor: 'rgba(255, 178, 103, 0.55)',
  },

  // Intro
  introText: {
    alignItems: 'center',
    marginTop: 28,
  },
  appName: {
    color: '#FFFFFF',
    fontSize: 48,
    fontFamily: FontFamily.latoBold,
    letterSpacing: 1.5,
  },
  appNameCompact: {
    fontSize: 38,
  },
  tagline: {
    color: ACCENT,
    fontSize: 18,
    fontFamily: FontFamily.latoRegular,
    letterSpacing: 1,
    marginTop: 6,
  },
  taglineCompact: {
    fontSize: 16,
  },
  introProgress: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 80,
    alignItems: 'center',
  },
  progressTrack: {
    width: PROGRESS_W,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
  },
  progressFill: {
    width: '100%',
    height: '100%',
    borderRadius: 2,
    backgroundColor: ACCENT_DEEP,
  },
  progressLabel: {
    color: '#9E9696',
    fontSize: 13,
    fontFamily: FontFamily.latoRegular,
    marginTop: 10,
    letterSpacing: 0.5,
  },

  // Boot
  bootContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 24,
  },
  bootHero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  bootTitle: {
    color: '#FFFFFF',
    fontSize: 40,
    fontFamily: FontFamily.latoBold,
    textAlign: 'center',
    marginTop: 12,
  },
  bootTitleCompact: {
    fontSize: 30,
  },
  badge: {
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 178, 103, 0.15)',
  },
  badgeText: {
    color: ACCENT,
    fontSize: 13,
    fontFamily: FontFamily.latoBold,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  bootSubtitle: {
    color: '#C9C1C1',
    fontSize: 17,
    fontFamily: FontFamily.latoRegular,
    textAlign: 'center',
    marginTop: 12,
  },
  features: {
    marginTop: 32,
    width: '100%',
    maxWidth: 340,
    gap: 10,
  },
  featuresGrid: {
    maxWidth: 580,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 14,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 178, 103, 0.15)',
  },
  featureGridItem: {
    width: 270,
  },
  featureIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255, 178, 103, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  featureText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: FontFamily.latoRegular,
  },
  track: {
    width: TRACK_W,
    height: KNOB + 8,
    borderRadius: (KNOB + 8) / 2,
    backgroundColor: '#1B1B1B',
    borderWidth: 1,
    borderColor: 'rgba(255, 178, 103, 0.25)',
    justifyContent: 'center',
    marginBottom: 20,
  },
  trackLabel: {
    position: 'absolute',
    left: KNOB + 12,
    right: 16,
    textAlign: 'center',
    color: '#C9C1C1',
    fontSize: 15,
    fontFamily: FontFamily.latoBold,
    letterSpacing: 0.5,
  },
  knobWrap: {
    position: 'absolute',
    left: 4,
  },
  trackFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: (KNOB + 8) / 2,
    backgroundColor: 'rgba(255, 178, 103, 0.18)',
  },
  vTrack: {
    width: KNOB + 8,
    height: V_TRACK_TRAVEL + KNOB + 8,
    borderRadius: (KNOB + 8) / 2,
    backgroundColor: '#1B1B1B',
    borderWidth: 1,
    borderColor: 'rgba(255, 178, 103, 0.25)',
  },
  vTrackFill: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: (KNOB + 8) / 2,
    backgroundColor: 'rgba(255, 178, 103, 0.18)',
  },
  vKnobWrap: {
    position: 'absolute',
    left: 3,
    bottom: 3,
  },
  knob: {
    width: KNOB,
    height: KNOB,
    borderRadius: KNOB / 2,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swipeUp: {
    alignItems: 'center',
    marginBottom: 20,
  },
  swipeUpLabel: {
    color: '#C9C1C1',
    fontSize: 15,
    fontFamily: FontFamily.latoBold,
    letterSpacing: 0.5,
    marginTop: 10,
  },
  version: {
    color: '#6B6363',
    fontSize: 12,
    fontFamily: FontFamily.latoRegular,
  },
});

// Public exports: each stage is wrapped so a crash can never strand the user.
export const IntroSplash = (props) => (
  <SplashErrorBoundary name="IntroSplash" onSkip={props.onComplete}>
    <IntroSplashInner {...props} />
  </SplashErrorBoundary>
);

export const BootSplash = (props) => {
  useEffect(() => {
    console.log(`[Splash] boot screen mounted (${props.direction || 'right'})`);
  }, []);
  return (
    <SplashErrorBoundary name="BootSplash" onSkip={props.onSplashComplete} fallback={props.children}>
      <BootSplashInner {...props} />
    </SplashErrorBoundary>
  );
};
