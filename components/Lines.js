// Lines.js
import React from 'react';
import { View } from 'react-native';

export const HorizontalLine = ({ top, left, width }) => (
  <View
    style={{
      position: 'absolute',
      height: 3,
      width: width,
      backgroundColor: '#4A90E2',
      top,
      left,
      zindex: 2,
    }}
  />
);

export const VerticalLine = ({ top, left, height }) => (
  <View
    style={{
      position: 'absolute',
      width: 3,
      height: height,
      backgroundColor: '#4A90E2',
      top,
      left,
    }}
  />
);

export const ConnectionDot = ({ top, left }) => (
  <View
    style={{
      position: 'absolute',
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: '#fff',
      borderWidth: 2,
      borderColor: '#4A90E2',
      top: top - 5,    // center the dot
      left: left - 5,  // center the dot
      zIndex: 1,
    }}
  />
);
