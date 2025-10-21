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
  container: { flex: 1, backgroundColor: '#F0FDF4' },

  header: {
    width: '100%',
    backgroundColor: '#059669', // Green-600
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: 'white' },
  backButton: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },

  scrollContent: { padding: 20, alignItems: 'center' },

  profileCard: {
    width: '100%', 
    backgroundColor: 'white', 
    borderRadius: 16,
    padding: 24, 
    alignItems: 'center', 
    marginBottom: 20, 
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 2 },
  },
  avatarWrap: { alignItems: 'center', marginTop: -56 },
  avatar: {
    width: 120, height: 120, borderRadius: 60,
    borderWidth: 5, borderColor: 'white', backgroundColor: '#E5E7EB',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  avatarFallback: { backgroundColor: '#D1FAE5', alignItems: 'center', justifyContent: 'center' }, // Green-100
  avatarInitial: { fontSize: 42, fontWeight: '700', color: '#047857' }, // Green-700

  profileName: { fontSize: 22, fontWeight: 'bold', color: '#1F2937', marginTop: 12 },
  profileRole: { fontSize: 15, color: '#6B7280', marginTop: 4, fontWeight: '500' },
  profileOrg: { fontSize: 13, color: '#9CA3AF', marginTop: 2 },

  btn: {
    marginTop: 16, 
    alignSelf: 'center',
    backgroundColor: '#059669', // Green-600
    paddingVertical: 11, 
    paddingHorizontal: 24, 
    borderRadius: 10,
    elevation: 3,
    shadowColor: '#059669',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  btnText: { color: 'white', fontWeight: '700', fontSize: 14 },

  infoCard: { 
    width: '100%', 
    backgroundColor: 'white', 
    borderRadius: 16, 
    padding: 16, 
    marginBottom: 20, 
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 2 },
  },
  infoRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingVertical: 14, 
    borderBottomWidth: 1, 
    borderBottomColor: '#F3F4F6' 
  },
  infoIcon: { fontSize: 22, marginRight: 16, width: 28 },
  infoLabel: { fontSize: 13, color: '#6B7280', marginBottom: 2 },
  infoValue: { fontSize: 16, fontWeight: '600', color: '#1F2937' },

  logoutButton: { 
    width: '100%', 
    height: 52, 
    backgroundColor: '#EF4444', 
    borderRadius: 10, 
    alignItems: 'center', 
    justifyContent: 'center', 
    elevation: 4,
    shadowColor: '#EF4444',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  logoutButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
});
