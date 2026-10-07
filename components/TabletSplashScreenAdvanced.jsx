import React from 'react';
import { BootSplash } from './SplashScreens';

// Tablet "swipe right to enter" screen (stage 2). Visuals live in SplashScreens.jsx.
const TabletSplashScreen = ({ onSplashComplete, children }) => (
  <BootSplash onSplashComplete={onSplashComplete} direction="right" badge="Tablet Demo">
    {children}
  </BootSplash>
);

export default TabletSplashScreen;
