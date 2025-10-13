import React from 'react';
import { Switch, Platform } from 'react-native';

const ToggleSwitch = ({ isOn, setIsOn, disabled = false }) => {
  return (
    <Switch
      value={isOn}
      onValueChange={setIsOn}
      disabled={disabled}
      trackColor={{
        false: '#767577',
        true: '#FFB267'
      }}
      thumbColor={isOn ? '#FFFFFF' : '#f4f3f4'}
      ios_backgroundColor="#3e3e3e"
      style={{
        transform: Platform.OS === 'ios' ? [{ scaleX: 0.9 }, { scaleY: 0.9 }] : [],
      }}
    />
  );
};

export default ToggleSwitch;
