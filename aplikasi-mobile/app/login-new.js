// app/login.js - Modern Design
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState, useEffect, useRef } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Animated,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { GovernmentLogo } from '../components/GovernmentLogo';
import { login as apiLogin } from '../services/api';

const { width } = Dimensions.get('window');

export default function LoginScreen() {
  const router = useRouter();
  const [identity, setIdentity] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  
  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const [usernameFocused, setUsernameFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 20,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  async function onSubmit() {
    if (!identity.trim() || !password.trim()) {
      Alert.alert('Peringatan', 'NIP/Username dan password wajib diisi');
      return;
    }
    setBusy(true);
    try {
      await apiLogin(identity.trim(), password.trim());
      router.replace('/dataEntry');
    } catch (e) {
      Alert.alert('Gagal Login', String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ flex: 1 }}>
      {/* Gradient Background */}
      <LinearGradient
        colors={['#059669', '#10B981', '#34D399']}
        style={StyleSheet.absoluteFill}
      />
      
      <ScrollView 
        style={{ flex: 1 }} 
        contentContainerStyle={{ flexGrow: 1, paddingVertical: 20 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View 
          style={[
            styles.container,
            { 
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          {/* Header with Logo */}
          <View style={styles.header}>
            <Animated.View style={{ transform: [{ scale: fadeAnim }] }}>
              <GovernmentLogo />
            </Animated.View>
            <Text style={styles.headerTitle}>HARPA BANUA</Text>
            <Text style={styles.headerSubtitle}>
              Sistem Monitoring Harga Pasar
            </Text>
            <Text style={styles.headerCaption}>Pemerintah Kalimantan Selatan</Text>
          </View>

          {/* Glass Morphism Card */}
          <View style={styles.glassCard}>
            <Text style={styles.formTitle}>Masuk ke Akun Anda</Text>
            <Text style={styles.formSubtitle}>Masukkan kredensial Anda untuk melanjutkan</Text>

            {/* Username Input with Floating Label */}
            <View style={styles.inputContainer}>
              <View style={[
                styles.inputWrapper,
                usernameFocused && styles.inputWrapperFocused
              ]}>
                <Ionicons 
                  name="person-outline" 
                  size={20} 
                  color={usernameFocused ? '#059669' : '#9CA3AF'} 
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="NIP / Username"
                  placeholderTextColor="#9CA3AF"
                  value={identity}
                  onChangeText={setIdentity}
                  onFocus={() => setUsernameFocused(true)}
                  onBlur={() => setUsernameFocused(false)}
                  autoCapitalize="none"
                  editable={!busy}
                />
              </View>
            </View>

            {/* Password Input with Toggle */}
            <View style={styles.inputContainer}>
              <View style={[
                styles.inputWrapper,
                passwordFocused && styles.inputWrapperFocused
              ]}>
                <Ionicons 
                  name="lock-closed-outline" 
                  size={20} 
                  color={passwordFocused ? '#059669' : '#9CA3AF'} 
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Password"
                  placeholderTextColor="#9CA3AF"
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  editable={!busy}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword(!showPassword)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color="#9CA3AF"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Login Button with Gradient */}
            <TouchableOpacity
              style={[styles.buttonContainer, busy && styles.buttonDisabled]}
              onPress={onSubmit}
              disabled={busy}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={busy ? ['#9CA3AF', '#6B7280'] : ['#059669', '#047857']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.gradientButton}
              >
                {busy ? (
                  <View style={styles.buttonContent}>
                    <ActivityIndicator color="#FFFFFF" size="small" />
                    <Text style={styles.buttonText}>Memproses...</Text>
                  </View>
                ) : (
                  <View style={styles.buttonContent}>
                    <Text style={styles.buttonText}>Masuk</Text>
                    <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Info Card with Icon */}
          <View style={styles.infoCard}>
            <View style={styles.infoIconContainer}>
              <Ionicons name="shield-checkmark" size={24} color="#059669" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.infoTitle}>Akun Dikelola Admin</Text>
              <Text style={styles.infoText}>
                Akun dibuat dan dikelola oleh Admin. Hubungi admin jika lupa password.
              </Text>
            </View>
          </View>

          <Text style={styles.footer}>© 2025 HARPA BANUA. All rights reserved.</Text>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
    paddingTop: 20,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 16,
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#FFFFFF',
    marginTop: 8,
    fontWeight: '500',
    opacity: 0.95,
  },
  headerCaption: {
    fontSize: 14,
    color: '#FFFFFF',
    marginTop: 4,
    opacity: 0.85,
  },
  glassCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
  },
  formTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  formSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    paddingHorizontal: 16,
    height: 56,
    transition: 'all 0.3s ease',
  },
  inputWrapperFocused: {
    borderColor: '#059669',
    backgroundColor: '#FFFFFF',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '500',
  },
  eyeButton: {
    padding: 8,
  },
  buttonContainer: {
    marginTop: 24,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonDisabled: {
    opacity: 0.6,
    shadowOpacity: 0,
    elevation: 0,
  },
  gradientButton: {
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#059669',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  infoIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#D1FAE5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
  footer: {
    textAlign: 'center',
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.8,
    marginBottom: 20,
  },
});
