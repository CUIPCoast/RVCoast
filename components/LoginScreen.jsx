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
        colors={['#0D0D0D', '#1A1A1A', '#2D2D2D']}
        style={styles.background}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Decorative Background Elements */}
        <View style={styles.backgroundElements}>
          <View style={[styles.floatingElement, styles.element1]} />
          <View style={[styles.floatingElement, styles.element2]} />
          <View style={[styles.floatingElement, styles.element3]} />
        </View>

        <View style={[styles.card, cardStyle]}>
          {/* Logo Section */}
          <View style={styles.logoContainer}>
            <View style={[styles.logoWrapper, isTablet && styles.tabletLogoWrapper]}>
              <Image
                source={require('../assets/images/icon.png')}
                style={[styles.logo, isTablet && styles.tabletLogo]}
              />
              <View style={styles.logoGlow} />
            </View>
            <Text style={[styles.appTitle, isTablet && styles.tabletAppTitle]}>
              Coast RV
            </Text>
            <Text style={[styles.appSubtitle, isTablet && styles.tabletAppSubtitle]}>
              Connect to your RV
            </Text>
          </View>

          {/* Welcome Section */}
          <View style={styles.welcomeSection}>
            <Text style={[styles.title, isTablet && styles.tabletTitle]}>
              Welcome Back
            </Text>
            <Text style={[styles.subtitle, isTablet && styles.tabletSubtitle]}>
              Sign in to control your RV
            </Text>
          </View>

          {/* Login Form */}
          <View style={styles.formContainer}>
            {/* Username Input */}
            <View style={[styles.inputContainer, isTablet && styles.tabletInputContainer]}>
              <View style={styles.inputIconWrapper}>
                <Ionicons name="person-outline" size={isTablet ? 24 : 20} color="#FFB267" />
              </View>
              <TextInput
                style={[styles.input, isTablet && styles.tabletInput]}
                placeholder="Username"
                placeholderTextColor="#666"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* Password Input */}
            <View style={[styles.inputContainer, isTablet && styles.tabletInputContainer]}>
              <View style={styles.inputIconWrapper}>
                <Ionicons name="lock-closed-outline" size={isTablet ? 24 : 20} color="#FFB267" />
              </View>
              <TextInput
                style={[styles.input, isTablet && styles.tabletInput]}
                placeholder="Password"
                placeholderTextColor="#666"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeIcon}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={showPassword ? "eye-outline" : "eye-off-outline"}
                  size={isTablet ? 24 : 20}
                  color="#888"
                />
              </TouchableOpacity>
            </View>

            {/* Login Button */}
            <TouchableOpacity
              style={[styles.loginButton, isTablet && styles.tabletLoginButton]}
              onPress={handleLogin}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#FFB267', '#FF9A3D', '#E8751A']}
                style={styles.loginGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {isLoading ? (
                  <ActivityIndicator color="#000" size={isTablet ? "large" : "default"} />
                ) : (
                  <Text style={[styles.loginButtonText, isTablet && styles.tabletLoginButtonText]}>
                    Sign In
                  </Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Forgot Password */}
            <TouchableOpacity style={styles.forgotPassword} activeOpacity={0.7}>
              <Text style={[styles.forgotPasswordText, isTablet && styles.tabletForgotPasswordText]}>
                Forgot Password?
              </Text>
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={[styles.dividerText, isTablet && styles.tabletDividerText]}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Sign Up Link */}
            <View style={styles.signupSection}>
              <Text style={[styles.signupText, isTablet && styles.tabletSignupText]}>
                Don't have an account?
              </Text>
              <TouchableOpacity
                onPress={onSwitchToSignup}
                activeOpacity={0.7}
                style={styles.signupButton}
              >
                <Text style={[styles.signupLinkText, isTablet && styles.tabletSignupLinkText]}>
                  Sign Up
                </Text>
              </TouchableOpacity>
            </View>
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
  backgroundElements: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  floatingElement: {
    position: 'absolute',
    borderRadius: 100,
    opacity: 0.1,
  },
  element1: {
    width: 200,
    height: 200,
    backgroundColor: '#FFB267',
    top: '10%',
    right: '-10%',
  },
  element2: {
    width: 150,
    height: 150,
    backgroundColor: '#4F7BFA',
    bottom: '20%',
    left: '-10%',
  },
  element3: {
    width: 100,
    height: 100,
    backgroundColor: '#FFB267',
    top: '60%',
    right: '20%',
  },
  card: {
    backgroundColor: 'rgba(26, 26, 26, 0.95)',
    borderRadius: 24,
    padding: 32,
    borderWidth: 1,
    borderColor: 'rgba(255, 178, 103, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  mobileCard: {
    marginVertical: 40,
  },
  tabletCard: {
    maxWidth: 520,
    alignSelf: 'center',
    padding: 48,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoWrapper: {
    position: 'relative',
    marginBottom: 16,
  },
  tabletLogoWrapper: {
    marginBottom: 20,
  },
  logo: {
    width: 88,
    height: 66,
    backgroundColor: '#FFB267',
    borderRadius: 16,
    shadowColor: '#FFB267',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  tabletLogo: {
    width: 110,
    height: 82,
    borderRadius: 20,
  },
  logoGlow: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    backgroundColor: '#FFB267',
    borderRadius: 20,
    opacity: 0.2,
    zIndex: -1,
  },
  appTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  tabletAppTitle: {
    fontSize: 40,
    marginBottom: 8,
  },
  appSubtitle: {
    fontSize: 16,
    color: '#FFB267',
    fontWeight: '500',
  },
  tabletAppSubtitle: {
    fontSize: 18,
  },
  welcomeSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  tabletTitle: {
    fontSize: 36,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#888',
    fontWeight: '400',
  },
  tabletSubtitle: {
    fontSize: 18,
  },
  formContainer: {
    width: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    marginBottom: 20,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 178, 103, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tabletInputContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  inputIconWrapper: {
    marginRight: 12,
    padding: 4,
  },
  input: {
    flex: 1,
    height: 56,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  tabletInput: {
    height: 64,
    fontSize: 18,
  },
  eyeIcon: {
    padding: 8,
    marginLeft: 8,
  },
  loginButton: {
    borderRadius: 16,
    marginTop: 16,
    shadowColor: '#FFB267',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  tabletLoginButton: {
    marginTop: 24,
    borderRadius: 20,
  },
  loginGradient: {
    borderRadius: 16,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginButtonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  tabletLoginButtonText: {
    fontSize: 20,
  },
  forgotPassword: {
    alignItems: 'center',
    marginTop: 16,
    paddingVertical: 8,
  },
  forgotPasswordText: {
    color: '#FFB267',
    fontSize: 14,
    fontWeight: '500',
  },
  tabletForgotPasswordText: {
    fontSize: 16,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 32,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  dividerText: {
    color: '#666',
    marginHorizontal: 16,
    fontSize: 14,
    fontWeight: '500',
  },
  tabletDividerText: {
    fontSize: 16,
    marginHorizontal: 20,
  },
  signupSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  signupText: {
    color: '#888',
    fontSize: 16,
    fontWeight: '400',
    marginRight: 4,
  },
  tabletSignupText: {
    fontSize: 18,
  },
  signupButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  signupLinkText: {
    color: '#FFB267',
    fontSize: 16,
    fontWeight: '600',
  },
  tabletSignupLinkText: {
    fontSize: 18,
  },
});

export default LoginScreen;