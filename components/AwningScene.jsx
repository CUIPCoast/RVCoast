// components/AwningScene.jsx
// End-on view of the RV with an awning that unrolls from the wall.
//   ext:    0 (retracted) .. 1 (fully extended)
//   wave:   -1 .. 1 valance flutter
//   moving: true while the motor runs
import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Rect, Circle, Line, Polygon, Ellipse, Defs, LinearGradient, Stop, G } from 'react-native-svg';

const W = 340;
const H = 170;
const GROUND_Y = 146;
const WALL_X = 118;
const ROLLER = { x: 124, y: 36, r: 6 };
const MAX_REACH = 190; // how far the lead rail travels out from the wall
const PITCH = 16; // drop at full extension so rain runs off
const THICKNESS = 7;
const STRIPES = 8;
const FABRIC = ['#FFB267', '#F3E3CF'];

const lerp = (a, b, t) => a + (b - a) * t;

const AwningScene = ({ ext = 0, wave = 0, moving = false }) => {
  const e = Math.max(0, Math.min(1, ext));
  const reach = MAX_REACH * e;
  const lead = { x: ROLLER.x + reach, y: ROLLER.y + PITCH * e };

  // Fabric band corners (roller side -> lead rail side)
  const topStart = { x: ROLLER.x, y: ROLLER.y - THICKNESS / 2 };
  const botStart = { x: ROLLER.x, y: ROLLER.y + THICKNESS / 2 };
  const topEnd = { x: lead.x, y: lead.y - THICKNESS / 2 };
  const botEnd = { x: lead.x, y: lead.y + THICKNESS / 2 };

  const stripes = [];
  if (reach > 2) {
    for (let i = 0; i < STRIPES; i += 1) {
      const t0 = i / STRIPES;
      const t1 = (i + 1) / STRIPES;
      const pts = [
        [lerp(topStart.x, topEnd.x, t0), lerp(topStart.y, topEnd.y, t0)],
        [lerp(topStart.x, topEnd.x, t1), lerp(topStart.y, topEnd.y, t1)],
        [lerp(botStart.x, botEnd.x, t1), lerp(botStart.y, botEnd.y, t1)],
        [lerp(botStart.x, botEnd.x, t0), lerp(botStart.y, botEnd.y, t0)],
      ];
      stripes.push(
        <Polygon key={i} points={pts.map((p) => p.join(',')).join(' ')} fill={FABRIC[i % 2]} />
      );
    }
  }

  // Valance hangs from the lead rail and sways with the wave
  const sway = wave * 2.5;
  const valance = [
    [lead.x - 2, lead.y + 2],
    [lead.x + 2, lead.y + 2],
    [lead.x + 2 + sway, lead.y + 15],
    [lead.x - 2 + sway, lead.y + 15],
  ];

  // Roller turns as fabric pays out
  const angle = (e * 900 * Math.PI) / 180;
  const spoke = {
    x: ROLLER.x + Math.cos(angle) * (ROLLER.r - 1.5),
    y: ROLLER.y + Math.sin(angle) * (ROLLER.r - 1.5),
  };

  const armBracket = { x: WALL_X + 2, y: 128 };
  const glowPoints = [
    [botStart.x, botStart.y],
    [botEnd.x, botEnd.y],
    [lead.x + 10, GROUND_Y],
    [WALL_X, GROUND_Y],
  ];

  return (
    <View style={styles.wrap}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
        <Defs>
          <LinearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#221C1C" />
            <Stop offset="1" stopColor="#161313" />
          </LinearGradient>
          <LinearGradient id="glow" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#FFB267" stopOpacity="0.28" />
            <Stop offset="1" stopColor="#FFB267" stopOpacity="0" />
          </LinearGradient>
          <LinearGradient id="body" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#3E3737" />
            <Stop offset="1" stopColor="#4A4242" />
          </LinearGradient>
        </Defs>

        {/* Backdrop + ground */}
        <Rect x="0" y="0" width={W} height={H} fill="url(#sky)" />
        <Rect x="0" y={GROUND_Y} width={W} height={H - GROUND_Y} fill="#2A2626" />
        <Line x1="0" x2={W} y1={GROUND_Y} y2={GROUND_Y} stroke="#3A3434" strokeWidth="1" />

        {/* Warm light and shade under the canopy */}
        {e > 0.02 && (
          <G opacity={e}>
            <Polygon points={glowPoints.map((p) => p.join(',')).join(' ')} fill="url(#glow)" />
            <Ellipse
              cx={(WALL_X + lead.x) / 2 + 6}
              cy={GROUND_Y + 3}
              rx={reach / 2 + 8}
              ry={4}
              fill="#000"
              opacity={0.45}
            />
          </G>
        )}

        {/* RV, seen from the rear */}
        <Rect x="16" y="24" width={WALL_X - 16} height="110" rx="14" fill="url(#body)" stroke="#565050" strokeWidth="1" />
        <Rect x="16" y="24" width={WALL_X - 16} height="10" rx="5" fill="#575050" />
        <Rect x="34" y="46" width="44" height="26" rx="5" fill="#FFB267" opacity="0.35" />
        <Rect x="34" y="46" width="44" height="26" rx="5" fill="none" stroke="#5E5656" strokeWidth="1.5" />
        <Rect x="22" y="104" width="6" height="12" rx="2" fill="#FF6B6B" opacity="0.8" />
        <Rect x={WALL_X - 12} y="104" width="6" height="12" rx="2" fill="#FF6B6B" opacity="0.8" />
        <Rect x="14" y="128" width={WALL_X - 12} height="8" rx="3" fill="#2E2929" />
        <Rect x="26" y="134" width="18" height="12" rx="3" fill="#121010" />
        <Rect x={WALL_X - 30} y="134" width="18" height="12" rx="3" fill="#121010" />

        {/* Support arms */}
        {e > 0.04 && (
          <G opacity={Math.min(1, e * 3)}>
            <Line x1={armBracket.x} y1={armBracket.y} x2={lead.x} y2={lead.y + 3} stroke="#8E8686" strokeWidth="3.5" strokeLinecap="round" />
            <Line x1={armBracket.x} y1={armBracket.y} x2={lerp(armBracket.x, lead.x, 0.5)} y2={lerp(armBracket.y, lead.y + 3, 0.5)} stroke="#B5ADAD" strokeWidth="2" strokeLinecap="round" />
            <Circle cx={armBracket.x} cy={armBracket.y} r="3" fill="#B5ADAD" />
          </G>
        )}

        {/* Fabric */}
        {stripes}
        {reach > 2 && (
          <>
            <Polygon points={valance.map((p) => p.join(',')).join(' ')} fill="#C9853F" />
            <Circle cx={lead.x} cy={lead.y} r="4" fill="#D9D2CC" />
          </>
        )}

        {/* Roller tube */}
        <Rect x={WALL_X - 1} y={ROLLER.y - 9} width="6" height="18" rx="2" fill="#575050" />
        <Circle cx={ROLLER.x} cy={ROLLER.y} r={ROLLER.r} fill="#2E2929" stroke={moving ? '#FFB267' : '#9E9696'} strokeWidth="2" />
        <Line x1={ROLLER.x} y1={ROLLER.y} x2={spoke.x} y2={spoke.y} stroke={moving ? '#FFB267' : '#9E9696'} strokeWidth="1.5" strokeLinecap="round" />
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    height: 180,
    borderRadius: 18,
    backgroundColor: '#161313',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
});

export default AwningScene;
