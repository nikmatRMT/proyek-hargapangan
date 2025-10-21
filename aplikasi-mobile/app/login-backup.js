// app/login.js
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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { GovernmentLogo } from '../components/GovernmentLogo';
import { login as apiLogin } from '../services/api';

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
    <ScrollView style={{ backgroundColor: '#F0FDF4' }} keyboardShouldPersistTaps="handled">
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <GovernmentLogo />
          <Text style={styles.headerTitle}>HARPA BANUA</Text>
          <Text style={styles.headerSubtitle}>
            Sistem Monitoring Harga Pasar
          </Text>
          <Text style={styles.headerSubtext}>
            Harga Pangan Banjarbaru Aktual
          </Text>
        </View>

        {/* Card Form */}
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Masuk ke Akun Anda</Text>
          <Text style={styles.formSubtitle}>Gunakan akun yang terdaftar di sistem</Text>

          <Text style={styles.label}>NIP / Username</Text>
          <TextInput
            style={styles.input}
            placeholder="Masukkan NIP atau Username"
            autoCapitalize="none"
            autoCorrect={false}
            value={identity}
            onChangeText={setIdentity}
            returnKeyType="next"
          />

          <Text style={styles.label}>Password</Text>
          <View style={styles.inputWrap}>
            <TextInput
              style={[styles.input, styles.inputWithToggle]}
              placeholder="Masukkan password"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="password"
              returnKeyType="done"
              onSubmitEditing={onSubmit}
            />
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={showPassword ? 'Sembunyikan password' : 'Lihat password'}
              onPress={() => setShowPassword((s) => !s)}
              style={styles.toggleBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name={showPassword ? 'eye-off' : 'eye'}
                size={22}
                color="#059669"
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.button} onPress={onSubmit} disabled={busy}>
            <Text style={styles.buttonText}>{busy ? 'Memproses…' : 'Masuk'}</Text>
          </TouchableOpacity>
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoIconContainer}>
            <Ionicons name="shield-checkmark" size={24} color="#2563EB" />
          </View>
          <Text style={styles.infoText}>
            Akun dibuat dan dikelola oleh Admin Dinas Ketahanan Pangan, Pertanian, dan Perikanan (DKP3) Kota Banjarbaru
          </Text>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>© 2025 DKP3 Kota Banjarbaru</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', backgroundColor: '#F0FDF4' },
  header: {
    width: '100%',
    backgroundColor: '#059669', // Green-600
    padding: 20,
    paddingTop: 80,
    paddingBottom: 48,
    alignItems: 'center',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTitle: { 
    fontSize: 28, 
    fontWeight: 'bold', 
    color: 'white', 
    marginTop: 16, 
    letterSpacing: 1 
  },
  headerSubtitle: { 
    fontSize: 15, 
    color: 'rgba(255,255,255,0.95)', 
    marginTop: 8, 
    textAlign: 'center',
    fontWeight: '600'
  },
  headerSubtext: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
    textAlign: 'center'
  },

  formCard: {
    width: '90%',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    marginTop: -30,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
  },
  formTitle: { 
    fontSize: 22, 
    fontWeight: 'bold', 
    textAlign: 'center', 
    marginBottom: 8, 
    color: '#1F2937' 
  },
  formSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24
  },

  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8, marginTop: 4 },

  inputWrap: { position: 'relative' },
  input: {
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 16,
    marginBottom: 16,
    fontSize: 16,
    backgroundColor: '#F9FAFB',
    color: '#1F2937'
  },
  inputWithToggle: { paddingRight: 48 },
  toggleBtn: {
    position: 'absolute',
    right: 12,
    top: 0,
    bottom: 16,
    height: 50,
    justifyContent: 'center',
    paddingHorizontal: 4,
  },

  button: {
    width: '100%',
    height: 52,
    backgroundColor: '#059669', // Green-600
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    elevation: 4,
    shadowColor: '#059669',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  buttonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },

  infoCard: {
    width: '90%',
    backgroundColor: '#DBEAFE', // Blue-100
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#93C5FD', // Blue-300
  },
  infoIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: '#1E40AF', // Blue-800
    lineHeight: 18,
  },

  footer: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 24,
    marginBottom: 32,
    textAlign: 'center'
  }
});
