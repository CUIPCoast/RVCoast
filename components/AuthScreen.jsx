import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import LoginScreen from './LoginScreen';
import SignupScreen from './SignupScreen';

const AuthScreen = () => {
  const [isLogin, setIsLogin] = useState(true);

  const switchToSignup = () => setIsLogin(false);
  const switchToLogin = () => setIsLogin(true);

  return (
    <View style={styles.container}>
      {isLogin ? (
        <LoginScreen onSwitchToSignup={switchToSignup} />
      ) : (
        <SignupScreen onSwitchToLogin={switchToLogin} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default AuthScreen;