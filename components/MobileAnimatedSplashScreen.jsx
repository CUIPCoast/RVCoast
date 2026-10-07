import React from 'react';
import { IntroSplash } from './SplashScreens';

// Phone boot intro (stage 1). Visuals live in SplashScreens.jsx.
const MobileAnimatedSplashScreen = ({ onComplete }) => <IntroSplash onComplete={onComplete} compact />;

export default MobileAnimatedSplashScreen;
