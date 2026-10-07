import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, PanResponder, Pressable } from 'react-native';
import Svg, { Path, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { FontFamily } from '../GlobalStyles';

// Themed thermostat: a 270° arc you can drag anywhere along, plus −/+ steppers
// with press-and-hold. Replaces react-native-radial-slider, whose only touch
// target was the small knob.
//
// onChange(value)    fires on every user change (drag or step), never for prop updates.
// onChangeEnd(value) fires when the finger lifts or a stepper is released.

const ACCENT = '#FFB267';
const START_DEG = 135; // bottom-left; arc runs clockwise to bottom-right
const SWEEP_DEG = 270;

const toRad = (deg) => (deg * Math.PI) / 180;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

const pointAt = (cx, cy, r, deg) => ({
  x: cx + r * Math.cos(toRad(deg)),
  y: cy + r * Math.sin(toRad(deg)),
});

const arcPath = (cx, cy, r, fromDeg, toDeg) => {
  const start = pointAt(cx, cy, r, fromDeg);
  const end = pointAt(cx, cy, r, toDeg);
  const largeArc = toDeg - fromDeg > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`;
};

const ThermostatDial = ({
  value,
  min = 60,
  max = 85,
  onChange,
  onChangeEnd,
  size = 220,
  unit = '°F',
  caption = 'Set to',
  disabled = false,
}) => {
  const stroke = Math.round(size * 0.075);
  const knobR = Math.max(14, Math.round(size * 0.07));
  const r = size / 2 - Math.max(stroke, knobR * 2) / 2 - 2;
  const c = size / 2;

  const span = max - min;
  const fraction = clamp((value - min) / span, 0, 1);
  const valueDeg = START_DEG + SWEEP_DEG * fraction;
  const knob = pointAt(c, c, r, valueDeg);

  // Refs so the PanResponder (created once) always sees current props.
  const latest = useRef({ value, onChange, onChangeEnd, disabled, min, max });
  latest.current = { value, onChange, onChangeEnd, disabled, min, max };

  const emit = (next) => {
    const { value: cur, onChange: cb, min: lo, max: hi } = latest.current;
    const v = clamp(Math.round(next), lo, hi);
    if (v !== cur) cb?.(v);
    return v;
  };

  // Map a touch (relative to the dial box) to a value. Touches in the bottom
  // gap snap to whichever end is closer, so the value never wraps around.
  const valueFromTouch = (x, y) => {
    const { min: lo, max: hi } = latest.current;
    const deg = (Math.atan2(y - c, x - c) * 180) / Math.PI;
    const rel = (deg - START_DEG + 720) % 360;
    const f = rel <= SWEEP_DEG ? rel / SWEEP_DEG : rel < SWEEP_DEG + (360 - SWEEP_DEG) / 2 ? 1 : 0;
    return lo + f * (hi - lo);
  };

  const onRing = (x, y) => {
    const d = Math.hypot(x - c, y - c);
    return d > r - stroke * 2.2 && d < r + stroke * 2.2;
  };

  const lastValue = useRef(value);
  const pan = useRef(
    PanResponder.create({
      // Only claim touches that start on the ring; the center stays tappable.
      onStartShouldSetPanResponder: (e) =>
        !latest.current.disabled && onRing(e.nativeEvent.locationX, e.nativeEvent.locationY),
      onMoveShouldSetPanResponder: () => false,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (e) => {
        lastValue.current = emit(valueFromTouch(e.nativeEvent.locationX, e.nativeEvent.locationY));
      },
      onPanResponderMove: (e) => {
        lastValue.current = emit(valueFromTouch(e.nativeEvent.locationX, e.nativeEvent.locationY));
      },
      onPanResponderRelease: () => latest.current.onChangeEnd?.(lastValue.current),
      onPanResponderTerminate: () => latest.current.onChangeEnd?.(lastValue.current),
    })
  ).current;

  // Steppers: one step on press, then repeat while held.
  const repeat = useRef({ timeout: null, interval: null });
  const stopRepeat = () => {
    clearTimeout(repeat.current.timeout);
    clearInterval(repeat.current.interval);
    repeat.current = { timeout: null, interval: null };
  };
  useEffect(() => stopRepeat, []);

  const step = (delta) => emit(latest.current.value + delta);
  const startStep = (delta) => {
    if (latest.current.disabled) return;
    stopRepeat();
    step(delta);
    repeat.current.timeout = setTimeout(() => {
      repeat.current.interval = setInterval(() => step(delta), 120);
    }, 400);
  };
  const endStep = () => {
    if (!repeat.current.timeout && !repeat.current.interval) return;
    stopRepeat();
    latest.current.onChangeEnd?.(latest.current.value);
  };

  const [pressed, setPressed] = useState(null);
  const stepper = (delta, icon, label) => {
    const atLimit = delta < 0 ? value <= min : value >= max;
    return (
      <Pressable
        onPressIn={() => { setPressed(delta); startStep(delta); }}
        onPressOut={() => { setPressed(null); endStep(); }}
        // Not disabled at the limit: disabling mid-hold would cancel the press
        // without onPressOut and leave the repeat timer running. Values clamp anyway.
        disabled={disabled}
        style={[
          styles.stepper,
          pressed === delta && styles.stepperPressed,
          (disabled || atLimit) && styles.stepperDisabled,
        ]}
        accessibilityRole="button"
        accessibilityLabel={label}
        hitSlop={8}
      >
        <Ionicons name={icon} size={26} color={pressed === delta ? '#1B1B1B' : ACCENT} />
      </Pressable>
    );
  };

  return (
    <View style={styles.wrap}>
      <View
        style={{ width: size, height: size }}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel="Thermostat setpoint"
        accessibilityValue={{ min, max, now: value, text: `${value}${unit}` }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(e) => {
          const v = step(e.nativeEvent.actionName === 'increment' ? 1 : -1);
          latest.current.onChangeEnd?.(v);
        }}
      >
        <Svg width={size} height={size}>
          <Defs>
            <LinearGradient id="thermoArc" x1="0" y1="1" x2="1" y2="0">
              <Stop offset="0" stopColor="#FFD3A8" />
              <Stop offset="1" stopColor="#FF8C00" />
            </LinearGradient>
          </Defs>
          <Path
            d={arcPath(c, c, r, START_DEG, START_DEG + SWEEP_DEG)}
            stroke="#2A2626"
            strokeWidth={stroke}
            strokeLinecap="round"
            fill="none"
          />
          {fraction > 0.001 && (
            <Path
              d={arcPath(c, c, r, START_DEG, valueDeg)}
              stroke="url(#thermoArc)"
              strokeWidth={stroke}
              strokeLinecap="round"
              fill="none"
            />
          )}
          <Circle cx={knob.x} cy={knob.y} r={knobR} fill={ACCENT} stroke="#1B1B1B" strokeWidth={4} />
        </Svg>

        <View style={styles.center} pointerEvents="none">
          <Text style={[styles.caption, { fontSize: Math.max(12, size * 0.06) }]}>{caption}</Text>
          <Text style={[styles.value, { fontSize: size * 0.24 }]}>
            {Math.round(value)}
            <Text style={[styles.unit, { fontSize: size * 0.08 }]}>{unit}</Text>
          </Text>
          <Text style={[styles.range, { fontSize: Math.max(11, size * 0.05) }]}>{min}–{max}</Text>
        </View>

        {/* Touch layer over the dial; only the ring band responds (see onRing). */}
        <View style={StyleSheet.absoluteFill} {...pan.panHandlers} />
      </View>

      <View style={[styles.steppers, { width: Math.max(size * 0.8, 160) }]}>
        {stepper(-1, 'remove', 'Decrease temperature')}
        {stepper(1, 'add', 'Increase temperature')}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
  },
  center: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  caption: {
    color: '#9E9696',
    fontFamily: FontFamily.latoRegular,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  value: {
    color: '#FFFFFF',
    fontFamily: FontFamily.latoBold,
  },
  unit: {
    color: '#9E9696',
    fontFamily: FontFamily.latoRegular,
  },
  range: {
    color: '#6B6363',
    fontFamily: FontFamily.latoRegular,
    marginTop: 2,
  },
  steppers: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  stepper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2A2626',
    borderWidth: 1,
    borderColor: 'rgba(255, 178, 103, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperPressed: {
    backgroundColor: ACCENT,
    borderColor: ACCENT,
  },
  stepperDisabled: {
    opacity: 0.35,
  },
});

export default ThermostatDial;
