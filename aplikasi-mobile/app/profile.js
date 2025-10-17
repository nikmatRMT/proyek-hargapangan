// app/profile.js
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  logout as apiLogout,
  me as apiMe,
  avatarUrl,
  bumpAvatar,
  uploadMyAvatar,
} from '../services/api';

const InfoRow = ({ label, value, icon }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoIcon}>{icon}</Text>
    <View>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  </View>
);

export default function ProfileScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState(null);

  async function loadMe() {
    setLoading(true);
    try {
      const { user } = await apiMe();
      setUser(user);
    } catch (e) {
      Alert.alert('Sesi berakhir', 'Silakan login kembali');
      router.replace('/login');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadMe(); }, []);

  async function onPickAvatar() {
    // minta izin galeri
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Izin dibutuhkan', 'Aktifkan izin akses galeri untuk memilih foto.');
      return;
    }

    const pick = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (pick.canceled) return;

    const uri = pick.assets?.[0]?.uri;
    if (!uri) return;

    setSaving(true);
    try {
      const res = await uploadMyAvatar(uri); // { user, raw }
      if (res?.user) {
        setUser(res.user);
      }
      bumpAvatar?.(); // kalau disediakan di services/api untuk bust cache
      Alert.alert('Berhasil', 'Foto profil diperbarui.');
    } catch (e) {
      Alert.alert('Gagal', e?.message || 'Upload gagal. Coba lagi.');
    } finally {
      setSaving(false);
    }
  }

  async function onLogout() {
    await apiLogout();
    router.replace('/login');
  }

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  const fullName = user?.nama_lengkap || user?.name || '-';
  const initial = String(fullName || 'U').charAt(0).toUpperCase();
  const photo = user?.foto ? avatarUrl(user.foto, user?.updated_at) : null;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profil Pengguna</Text>

        <TouchableOpacity
          onPress={onPickAvatar}
          style={[styles.backButton, { backgroundColor: 'rgba(255,255,255,0.18)' }]}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Ionicons name="image-outline" size={22} color="white" />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Kartu Profil */}
        <View style={styles.profileCard}>
          <View style={styles.avatarWrap}>
            {photo ? (
              <Image source={{ uri: photo }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Text style={styles.avatarInitial}>{initial}</Text>
              </View>
            )}
          </View>

          <Text style={styles.profileName}>{fullName}</Text>
          <Text style={styles.profileRole}>Petugas Pemantau Harga</Text>
          <Text style={styles.profileOrg}>DKP3 Kota Banjarbaru</Text>

          <TouchableOpacity
            onPress={onPickAvatar}
            disabled={saving}
            style={[styles.btn, saving && { opacity: 0.7 }]}
          >
            <Text style={styles.btnText}>{saving ? 'Mengunggah…' : 'Ubah Foto'}</Text>
          </TouchableOpacity>
        </View>

        {/* Informasi */}
        <View style={styles.infoCard}>
          <InfoRow label="NIP / Username" value={user?.username || '-'} icon="👤" />
          <InfoRow label="Telepon" value={user?.phone || '-'} icon="📞" />
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
          <Text style={styles.logoutButtonText}>Keluar</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F8FC' },

  header: {
    width: '100%',
    backgroundColor: '#1E40AF',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 8,
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: 'white' },
  backButton: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },

  scrollContent: { padding: 20, alignItems: 'center' },

  profileCard: {
    width: '100%', backgroundColor: 'white', borderRadius: 16,
    padding: 24, alignItems: 'center', marginBottom: 20, elevation: 5,
  },
  avatarWrap: { alignItems: 'center', marginTop: -56 },
  avatar: {
    width: 120, height: 120, borderRadius: 60,
    borderWidth: 4, borderColor: '#E5EDFF', backgroundColor: '#eee',
  },
  avatarFallback: { backgroundColor: '#E5ECF9', alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontSize: 42, fontWeight: '700', color: '#2563EB' },

  profileName: { fontSize: 22, fontWeight: 'bold', color: '#1A202C', marginTop: 12 },
  profileRole: { fontSize: 16, color: '#4A5568', marginTop: 4 },
  profileOrg: { fontSize: 14, color: '#6B7280', marginTop: 2 },

  btn: {
    marginTop: 14, alignSelf: 'center',
    backgroundColor: '#2F6BFF', paddingVertical: 10, paddingHorizontal: 18, borderRadius: 10,
  },
  btnText: { color: 'white', fontWeight: '700' },

  infoCard: { width: '100%', backgroundColor: 'white', borderRadius: 16, padding: 16, marginBottom: 20, elevation: 5 },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  infoIcon: { fontSize: 20, marginRight: 16 },
  infoLabel: { fontSize: 14, color: '#6B7280' },
  infoValue: { fontSize: 16, fontWeight: '600', color: '#1A202C' },

  logoutButton: { width: '100%', height: 50, backgroundColor: '#EF4444', borderRadius: 12, alignItems: 'center', justifyContent: 'center', elevation: 5 },
  logoutButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
});
