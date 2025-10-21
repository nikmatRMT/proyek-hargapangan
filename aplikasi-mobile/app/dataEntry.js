// app/dataEntry.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import RNPickerSelect from 'react-native-picker-select';

import { GovernmentLogo } from '../components/GovernmentLogo';
import {
  API_URL,
  me as apiMe,
  createReport,
  createReportWithPhoto,
  getStoredUser,
} from '../services/api';

// ----------------- helpers avatar -----------------
function absUrl(path) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${API_URL}${p}`;
}
function avatarUrl(path, updatedAt) {
  const abs = absUrl(path);
  if (!abs) return null;
  const ver = updatedAt ? new Date(updatedAt).getTime() : 0;
  return abs + (abs.includes('?') ? '&' : '?') + 'v=' + ver;
}
// ---------------------------------------------------

// --- DATA RESMI (SESUAI DOKUMEN) ---
const daftarPasar = [
  { label: 'Pasar Bauntung', value: 'Pasar Bauntung' },
  { label: 'Pasar Jati', value: 'Pasar Jati' },
  { label: 'Pasar Ulin Raya', value: 'Pasar Ulin Raya' },
  { label: 'Pasar Pagi Loktabat Utara', value: 'Pasar Pagi Loktabat Utara' },
];

const daftarKomoditas = [
  { label: 'Beras', value: 'Beras' },
  { label: 'Minyak Goreng Kemasan', value: 'Minyak Goreng Kemasan' },
  { label: 'Minyak Goreng Curah', value: 'Minyak Goreng Curah' },
  { label: 'Tepung Terigu Kemasan', value: 'Tepung Terigu Kemasan' },
  { label: 'Tepung Terigu Curah', value: 'Tepung Terigu Curah' },
  { label: 'Gula Pasir', value: 'Gula Pasir' },
  { label: 'Telur Ayam', value: 'Telur Ayam' },
  { label: 'Daging Sapi', value: 'Daging Sapi' },
  { label: 'Daging Ayam', value: 'Daging Ayam' },
  { label: 'Kedelai', value: 'Kedelai' },
  { label: 'Bawang Merah', value: 'Bawang Merah' },
  { label: 'Bawang Putih', value: 'Bawang Putih' },
  { label: 'Cabe Merah Besar', value: 'Cabe Merah Besar' },
  { label: 'Cabe Rawit', value: 'Cabe Rawit' },
  { label: 'Ikan Haruan/Gabus', value: 'Ikan Haruan/Gabus' },
  { label: 'Ikan Tongkol/Tuna', value: 'Ikan Tongkol/Tuna' },
  { label: 'Ikan Mas/Nila', value: 'Ikan Mas/Nila' },
  { label: 'Ikan Patin', value: 'Ikan Patin' },
  { label: 'Ikan Papuyu/Betok', value: 'Ikan Papuyu/Betok' },
  { label: 'Ikan Bandeng', value: 'Ikan Bandeng' },
  { label: 'Ikan Kembung/Pindang', value: 'Ikan Kembung/Pindang' },
];

// ==================== HEADER ====================
const PageHeader = () => {
  const router = useRouter();
  const [me, setMe] = useState(null);

  // Ambil user dari API; fallback ke storage
  const loadMe = useCallback(async () => {
    try {
      const { user } = await apiMe();
      setMe(user);
      await AsyncStorage.setItem('user', JSON.stringify(user));
    } catch {
      const u = await getStoredUser();
      if (u) setMe(u);
    }
  }, []);

  useEffect(() => { loadMe(); }, [loadMe]);
  useFocusEffect(useCallback(() => { loadMe(); }, [loadMe])); // refresh saat kembali dari /profile

  const initial = (me?.nama_lengkap || me?.name || 'U').charAt(0).toUpperCase();
  const photo = me?.foto ? avatarUrl(me.foto, me?.updated_at) : null;

  return (
    <View style={styles.header}>
      <View style={styles.headerContent}>
        <GovernmentLogo />
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Lapor Harga Harian</Text>
          <Text style={styles.headerSubtitle}>DKP3 Kota Banjarbaru</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.profileButton} onPress={() => router.push('/profile')}>
        {photo ? (
          <Image source={{ uri: photo }} style={styles.profileAvatar} />
        ) : (
          <View style={styles.initialCircle}>
            <Text style={styles.initialText}>{initial}</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
};
// =================================================

// helper unit komoditas
const unitForCommodity = (komoditas) => {
  const literList = ['Minyak Goreng Kemasan', 'Minyak Goreng Curah'];
  return literList.includes(komoditas) ? 'liter' : 'kg';
};

// --- Halaman Utama ---
export default function DataEntryScreen() {
  const [hargaRaw, setHargaRaw] = useState('');
  const [pasar, setPasar] = useState(null);
  const [komoditas, setKomoditas] = useState(null);
  const [catatan, setCatatan] = useState('');

  const [photoUri, setPhotoUri] = useState(null);
  const [gps, setGps] = useState({ lat: null, lng: null });

  useEffect(() => {
    (async () => {
      try { await apiMe(); } catch { Alert.alert('Sesi berakhir', 'Silakan login kembali'); return; }
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setGps({
          lat: Number(loc.coords.latitude.toFixed(7)),
          lng: Number(loc.coords.longitude.toFixed(7)),
        });
      }
    })();
  }, []);

  const formatRupiah = (angka) => (angka ? Number(angka).toLocaleString('id-ID') : '');
  const hargaNumber = useMemo(() => (hargaRaw ? Number(hargaRaw) : 0), [hargaRaw]);
  const handlePriceChange = (text) => {
    const numericValue = (text || '').replace(/[^0-9]/g, '');
    if (numericValue.length <= 7) setHargaRaw(numericValue);
  };

  async function pickPhoto() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Izin ditolak', 'Akses galeri diperlukan untuk unggah foto.'); return; }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
    if (!res.canceled && res.assets?.[0]?.uri) setPhotoUri(res.assets[0].uri);
  }

  const handleKirim = async () => {
    if (!pasar || !komoditas || !hargaNumber) { Alert.alert('Peringatan', 'Harap lengkapi pasar, komoditas, dan harga.'); return; }
    if (hargaNumber < 1000) { Alert.alert('Peringatan', 'Harga terlalu rendah.'); return; }

    const payload = {
      date: new Date().toISOString().slice(0, 10),
      market_name: pasar,
      commodity_name: komoditas,
      unit: unitForCommodity(komoditas),
      price: hargaNumber,
      notes: catatan || '',
      gps_lat: gps.lat ?? '',
      gps_lng: gps.lng ?? '',
    };

    try {
      if (photoUri) await createReportWithPhoto(payload, photoUri);
      else await createReport(payload);
      Alert.alert('Sukses', 'Laporan berhasil dikirim.');
      setHargaRaw(''); setPasar(null); setKomoditas(null); setCatatan(''); setPhotoUri(null);
    } catch (e) {
      Alert.alert('Gagal', String(e?.message || e));
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardAvoidingContainer}>
      <ScrollView>
        <PageHeader />
        <View style={styles.mainContent}>
          <InfoCard number="1" title="Lokasi Pantauan">
            <Text style={styles.label}>Pilih Lokasi Pasar</Text>
            <RNPickerSelect
              onValueChange={setPasar}
              items={daftarPasar}
              style={pickerSelectStyles}
              placeholder={{ label: '-- Pilih Lokasi Pasar --', value: null }}
              value={pasar}
              useNativeAndroidPickerStyle={false}
            />
          </InfoCard>

          <InfoCard number="2" title="Detail Harga Komoditas">
            <Text style={styles.label}>Pilih Komoditas</Text>
            <RNPickerSelect
              onValueChange={setKomoditas}
              items={daftarKomoditas}
              style={pickerSelectStyles}
              placeholder={{ label: '-- Pilih Komoditas --', value: null }}
              value={komoditas}
              useNativeAndroidPickerStyle={false}
            />
            <Text style={styles.label}>Masukkan Harga (Rp)</Text>
            <View style={styles.priceInputContainer}>
              <Text style={styles.rpSymbol}>Rp</Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                keyboardType="numeric"
                value={formatRupiah(hargaRaw)}
                onChangeText={handlePriceChange}
              />
            </View>
            <Text style={{ color: '#6B7280', marginTop: 8 }}>
              {gps.lat && gps.lng ? `GPS Otomatis: ${gps.lat}, ${gps.lng}` : 'GPS belum tersedia / izin ditolak'}
            </Text>
          </InfoCard>

          <InfoCard number="3" title="Informasi Tambahan (Opsional)">
            <Text style={styles.label}>Keterangan / Catatan</Text>
            <TextInput
              style={[styles.input, { height: 80, textAlignVertical: 'top', paddingLeft: 16, paddingTop: 12 }]}
              placeholder="Contoh: Harga cabai naik..."
              multiline
              value={catatan}
              onChangeText={setCatatan}
            />
            <Text style={[styles.label, { marginTop: 12 }]}>Foto Bukti (opsional)</Text>
            {photoUri ? (
              <View style={{ alignItems: 'center', marginTop: 8 }}>
                <Image source={{ uri: photoUri }} style={{ width: 220, height: 150, borderRadius: 8 }} />
                <TouchableOpacity style={[styles.uploadButton, { marginTop: 8, borderColor: '#EF4444' }]} onPress={() => setPhotoUri(null)}>
                  <Text style={[styles.uploadButtonText, { color: '#EF4444' }]}>Hapus Foto</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.uploadButton} onPress={pickPhoto}>
                <Text style={styles.uploadButtonText}>📤 Upload Foto Bukti</Text>
              </TouchableOpacity>
            )}
          </InfoCard>
        </View>
      </ScrollView>

      <View style={styles.bottomButtonContainer}>
        <TouchableOpacity style={styles.button} onPress={handleKirim}>
          <Text style={styles.buttonText}>Kirim Laporan</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const InfoCard = ({ number, title, children }) => (
  <View style={styles.card}>
    <View style={styles.cardHeader}>
      <View style={styles.cardNumberContainer}><Text style={styles.cardNumber}>{number}</Text></View>
      <Text style={styles.cardTitle}>{title}</Text>
    </View>
    {children}
  </View>
);

// --- StyleSheet ---
const styles = StyleSheet.create({
  keyboardAvoidingContainer: { flex: 1, backgroundColor: '#F0FDF4' },
  header: {
    width: '100%', 
    backgroundColor: '#059669', // Green-600
    paddingHorizontal: 20, 
    paddingTop: 60, 
    paddingBottom: 20,
    alignItems: 'center', 
    borderBottomLeftRadius: 24, 
    borderBottomRightRadius: 24,
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  headerContent: { flexDirection: 'row', alignItems: 'center' },
  headerTextContainer: { marginLeft: 12 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: 'white' },
  headerSubtitle: { fontSize: 12, color: 'rgba(255, 255, 255, 0.9)', marginTop: 2 },

  profileButton: {},
  // avatar foto
  profileAvatar: {
    width: 40, height: 40, borderRadius: 20,
    borderWidth: 2.5, borderColor: 'rgba(255,255,255,0.95)',
    backgroundColor: '#fff',
  },
  // avatar inisial (fallback)
  initialCircle: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#10B981', // Green-500
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2.5, borderColor: 'rgba(255,255,255,0.8)',
  },
  initialText: { color: '#fff', fontWeight: '700', fontSize: 16 },

  mainContent: { padding: 16, paddingBottom: 20 },
  card: { 
    backgroundColor: 'white', 
    borderRadius: 16, 
    padding: 20, 
    marginBottom: 16, 
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 2 },
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  cardNumberContainer: { 
    width: 36, 
    height: 36, 
    borderRadius: 18, 
    backgroundColor: '#D1FAE5', // Green-100
    alignItems: 'center', 
    justifyContent: 'center', 
    marginRight: 12 
  },
  cardNumber: { color: '#047857', fontWeight: 'bold', fontSize: 16 }, // Green-700
  cardTitle: { fontSize: 17, fontWeight: '600', color: '#1F2937' },

  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  priceInputContainer: { position: 'relative', justifyContent: 'center' },
  rpSymbol: { position: 'absolute', left: 16, fontSize: 16, color: '#6B7280', zIndex: 1, fontWeight: '600' },
  input: {
    width: '100%', 
    height: 52, 
    borderWidth: 1, 
    borderColor: '#D1D5DB', 
    borderRadius: 10,
    fontSize: 16, 
    backgroundColor: '#F9FAFB', 
    paddingLeft: 50, 
    paddingRight: 16,
    color: '#1F2937'
  },
  uploadButton: {
    width: '100%', 
    marginTop: 12, 
    paddingVertical: 14, 
    borderWidth: 2, 
    borderColor: '#10B981', // Green-500
    borderRadius: 10, 
    alignItems: 'center', 
    justifyContent: 'center',
    backgroundColor: '#ECFDF5', // Green-50
  },
  uploadButtonText: { color: '#047857', fontWeight: '600', fontSize: 15 }, // Green-700

  bottomButtonContainer: { 
    padding: 16, 
    backgroundColor: 'white', 
    borderTopWidth: 1, 
    borderColor: '#E5E7EB',
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: -2 },
  },
  button: { 
    width: '100%', 
    height: 52, 
    backgroundColor: '#059669', // Green-600
    borderRadius: 10, 
    alignItems: 'center', 
    justifyContent: 'center', 
    elevation: 4,
    shadowColor: '#059669',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  buttonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
});

const pickerSelectStyles = StyleSheet.create({
  inputIOS: {
    fontSize: 16, 
    paddingVertical: 14, 
    paddingHorizontal: 14, 
    borderWidth: 1, 
    borderColor: '#D1D5DB',
    borderRadius: 10, 
    color: '#1F2937', 
    paddingRight: 30, 
    backgroundColor: '#F9FAFB', 
    marginBottom: 16,
  },
  inputAndroid: {
    fontSize: 16, 
    paddingHorizontal: 14, 
    paddingVertical: 10, 
    borderWidth: 1, 
    borderColor: '#D1D5DB',
    borderRadius: 10, 
    color: '#1F2937', 
    paddingRight: 30, 
    backgroundColor: '#F9FAFB', 
    marginBottom: 16,
  },
});
