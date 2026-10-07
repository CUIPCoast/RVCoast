import React from 'react';
import { BootSplash } from './SplashScreens';

// Phone "swipe up to enter" screen (stage 2). Visuals live in SplashScreens.jsx.
const MobileSplashScreen = ({ onSplashComplete, children }) => (
  <BootSplash onSplashComplete={onSplashComplete} direction="up" badge="Mobile Demo">
    {children}
  </BootSplash>
);

export default MobileSplashScreen;
