// app/login.js
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { GovernmentLogo } from '../components/GovernmentLogo';
import { login as apiLogin } from '../services/api';

export default function LoginScreen() {
  const router = useRouter();
  const [identity, setIdentity] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);

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
    <ScrollView style={{ backgroundColor: '#F7F8FC' }} keyboardShouldPersistTaps="handled">
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <GovernmentLogo />
          <Text style={styles.headerTitle}>HARPA BANUA</Text>
          <Text style={styles.headerSubtitle}>
            Sistem Pelaporan - Harga Pangan Banjarbaru Aktual
          </Text>
        </View>

        {/* Card Form */}
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Masuk ke Akun Anda</Text>

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
                color="#2563EB"
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.button} onPress={onSubmit} disabled={busy}>
            <Text style={styles.buttonText}>{busy ? 'Memproses…' : 'Masuk'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', backgroundColor: '#F7F8FC' },
  header: {
    width: '100%',
    backgroundColor: '#1E40AF',
    padding: 20,
    paddingTop: 80,
    paddingBottom: 48,
    alignItems: 'center',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: 'white', marginTop: 16, letterSpacing: 0.5 },
  headerSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.9)', marginTop: 6, textAlign: 'center' },

  formCard: {
    width: '90%',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    marginTop: -30,
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  formTitle: { fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 24, color: '#1A202C' },

  label: { fontSize: 14, color: '#4A5568', marginBottom: 8 },

  inputWrap: { position: 'relative' },
  input: {
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 16,
    marginBottom: 16,
    fontSize: 16,
    backgroundColor: '#F8FAFC',
  },
  inputWithToggle: { paddingRight: 48 }, // ruang untuk ikon mata
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
    height: 50,
    backgroundColor: '#2563EB',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  buttonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
});
