// ErrorBoundary.jsx
// Catches render errors in a section of the UI and shows a small inline notice
// instead of letting the error take over the whole screen.
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Color, FontFamily } from '../GlobalStyles';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error(`[ErrorBoundary] ${this.props.name ?? 'section'} crashed:`, error, info?.componentStack);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <View style={styles.wrapper}>
        <View style={styles.card}>
          <Text style={styles.title}>Something went wrong here</Text>
          {__DEV__ && (
            <Text style={styles.message} numberOfLines={3}>
              {String(this.state.error?.message ?? this.state.error)}
            </Text>
          )}
          <Pressable style={styles.button} onPress={this.reset} accessibilityRole="button">
            <Text style={styles.buttonText}>Try again</Text>
          </Pressable>
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#2A2525',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  title: {
    color: '#fff',
    fontSize: 16,
    fontFamily: FontFamily.manropeBold,
  },
  message: {
    color: '#9E9696',
    fontSize: 12,
    marginTop: 6,
    textAlign: 'center',
  },
  button: {
    marginTop: 12,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: Color.colorSandybrown,
  },
  buttonText: {
    color: '#1B1B1B',
    fontSize: 14,
    fontFamily: FontFamily.manropeBold,
  },
});

export default ErrorBoundary;
