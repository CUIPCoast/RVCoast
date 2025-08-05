import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from './AuthContext';
import { useScreenSize } from '../helper';
import Ionicons from 'react-native-vector-icons/Ionicons';

const LoginScreen = ({ onSwitchToSignup }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const { login } = useAuth();
  const isTablet = useScreenSize();

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setIsLoading(true);
    try {
      const result = await login({ username: username.trim(), password });
      
      if (!result.success) {
        Alert.alert('Login Failed', result.error || 'Please check your credentials');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const containerStyle = isTablet ? styles.tabletContainer : styles.mobileContainer;
  const cardStyle = isTablet ? styles.tabletCard : styles.mobileCard;

  return (
    <KeyboardAvoidingView
      style={[styles.container, containerStyle]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient
        colors={['#1a1a1a', '#2d2d2d', '#1a1a1a']}
        style={styles.background}
      >
        <View style={[styles.card, cardStyle]}>
          {/* Logo */}
          <View style={styles.logoContainer}>
            <Image
              source={require('../assets/images/icon.png')}
              style={[styles.logo, isTablet && styles.tabletLogo]}
            />
            <Text style={[styles.appTitle, isTablet && styles.tabletAppTitle]}>
              Coast RV
            </Text>
            <Text style={[styles.appSubtitle, isTablet && styles.tabletAppSubtitle]}>
              Connect to your RV
            </Text>
          </View>

          {/* Login Form */}
          <View style={styles.formContainer}>
            <Text style={[styles.title, isTablet && styles.tabletTitle]}>
              Welcome Back
            </Text>
            
            {/* Username Input */}
            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={20} color="#888" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, isTablet && styles.tabletInput]}
                placeholder="Username"
                placeholderTextColor="#888"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* Password Input */}
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="#888" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, isTablet && styles.tabletInput]}
                placeholder="Password"
                placeholderTextColor="#888"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeIcon}
              >
                <Ionicons
                  name={showPassword ? "eye-outline" : "eye-off-outline"}
                  size={20}
                  color="#888"
                />
              </TouchableOpacity>
            </View>

            {/* Login Button */}
            <TouchableOpacity
              style={[styles.loginButton, isTablet && styles.tabletLoginButton]}
              onPress={handleLogin}
              disabled={isLoading}
            >
              <LinearGradient
                colors={['#4FC3F7', '#29B6F6', '#0288D1']}
                style={styles.loginGradient}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={[styles.loginButtonText, isTablet && styles.tabletLoginButtonText]}>
                    Sign In
                  </Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Sign Up Link */}
            <TouchableOpacity
              style={styles.signupLink}
              onPress={onSwitchToSignup}
            >
              <Text style={[styles.signupText, isTablet && styles.tabletSignupText]}>
                Don't have an account?{' '}
                <Text style={styles.signupLinkText}>Sign Up</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mobileContainer: {
    paddingHorizontal: 20,
  },
  tabletContainer: {
    paddingHorizontal: 60,
    justifyContent: 'center',
  },
  background: {
    flex: 1,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: 'rgba(40, 41, 43, 0.95)',
    borderRadius: 20,
    padding: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  mobileCard: {
    marginVertical: 40,
  },
  tabletCard: {
    maxWidth: 500,
    alignSelf: 'center',
    padding: 40,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logo: {
    width: 80,
    height: 60,
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 15,
  },
  tabletLogo: {
    width: 100,
    height: 75,
  },
  appTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  tabletAppTitle: {
    fontSize: 36,
  },
  appSubtitle: {
    fontSize: 16,
    color: '#888',
  },
  tabletAppSubtitle: {
    fontSize: 18,
  },
  formContainer: {
    width: '100%',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 30,
    textAlign: 'center',
  },
  tabletTitle: {
    fontSize: 32,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    marginBottom: 20,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 50,
    color: '#fff',
    fontSize: 16,
  },
  tabletInput: {
    height: 60,
    fontSize: 18,
  },
  eyeIcon: {
    padding: 5,
  },
  loginButton: {
    borderRadius: 12,
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  tabletLoginButton: {
    marginTop: 20,
  },
  loginGradient: {
    borderRadius: 12,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  tabletLoginButtonText: {
    fontSize: 20,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 30,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  dividerText: {
    color: '#888',
    marginHorizontal: 15,
    fontSize: 14,
  },
  signupLink: {
    alignItems: 'center',
  },
  signupText: {
    color: '#888',
    fontSize: 16,
  },
  tabletSignupText: {
    fontSize: 18,
  },
  signupLinkText: {
    color: '#4FC3F7',
    fontWeight: 'bold',
  },
});

export default LoginScreen;