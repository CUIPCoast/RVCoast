import React from 'react';
import { IntroSplash } from './SplashScreens';

// Tablet boot intro (stage 1). Visuals live in SplashScreens.jsx.
const AnimatedSplashScreen = ({ onComplete }) => <IntroSplash onComplete={onComplete} />;

export default AnimatedSplashScreen;
