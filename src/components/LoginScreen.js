import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Image, ImageBackground } from 'react-native';
import { useDispatch } from 'react-redux';
import { loginUser } from '../actions/authActions';
import { COLORS, FONTS, LOGO_SIZES, FONT_SIZES } from '../constants/theme';

const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    setLoading(true);
    try {
      const result = await dispatch(loginUser(email, password));
      setLoading(false);

      if (!result.success) {
        Alert.alert('Login Failed', result.error || 'Invalid credentials');
      }
    } catch (error) {
      console.error('LoginScreen: Error during login:', error);
      setLoading(false);
      Alert.alert('Login Error', error.message || 'An error occurred');
    }
  };

  return (
    <ImageBackground 
      source={require('../../assets/background_image.png')} 
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      <View style={styles.container}>
        <View style={styles.topSection}>
          <View style={styles.logoContainer}>
            <Image 
              source={require('../../assets/hi_logo.png')} 
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
          
          <Text style={styles.title}>ShowRunner App</Text>
        </View>
        
        <View style={styles.formSection}>
          <Text style={styles.subtitle}>Please login to manage & run your shows.</Text>
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#CCCCCC"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#CCCCCC"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Logging in...' : 'Login'}
          </Text>
        </TouchableOpacity>
        </View>
      </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  topSection: {
    flex: 0.33,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 40,
  },
  logoContainer: {
    width: '100%',
    height: 195,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 5,
  },
  logo: {
    ...LOGO_SIZES.LARGE,
  },
  title: {
    fontSize: FONT_SIZES.TITLE_LARGE,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 5,
    fontFamily: FONTS.BITINK,
  },
  subtitle: {
    fontSize: FONT_SIZES.SUBTITLE,
    textAlign: 'center',
    marginBottom: 15,
    marginTop: 0,
    color: COLORS.TEAL,
  },
  formSection: {
    flex: 0.67,
    justifyContent: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.BLACK,
    backgroundColor: COLORS.BLACK,
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    fontSize: FONT_SIZES.BODY,
    color: COLORS.WHITE,
  },
  button: {
    backgroundColor: COLORS.PRIMARY_BLUE,
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: COLORS.DISABLED,
  },
  buttonText: {
    color: COLORS.WHITE,
    fontSize: FONT_SIZES.BODY,
    fontWeight: 'bold',
  },
});

export default LoginScreen;

