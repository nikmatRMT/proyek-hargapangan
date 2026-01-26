import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, AlertCircle, Loader2, MapPin, Camera, X, AlertTriangle } from 'lucide-react';
import { submitMobileReport, API_BASE } from '../api';

// Data komoditas sesuai dengan backend (seed-commodities.mjs)
const KOMODITAS_LIST = [
  { label: 'Beras', value: 'Beras', unit: 'kg' },
  { label: 'Minyak Goreng Kemasan', value: 'Minyak Goreng Kemasan', unit: 'liter' },
  { label: 'Minyak Goreng Curah', value: 'Minyak Goreng Curah', unit: 'liter' },
  { label: 'Tepung Terigu Kemasan', value: 'Tepung Terigu Kemasan', unit: 'kg' },
  { label: 'Tepung Terigu Curah', value: 'Tepung Terigu Curah', unit: 'kg' },
  { label: 'Gula Pasir', value: 'Gula Pasir', unit: 'kg' },
  { label: 'Telur Ayam', value: 'Telur Ayam', unit: 'kg' },
  { label: 'Daging Sapi', value: 'Daging Sapi', unit: 'kg' },
  { label: 'Daging Ayam', value: 'Daging Ayam', unit: 'kg' },
  { label: 'Kedelai', value: 'Kedelai', unit: 'kg' },
  { label: 'Bawang Merah', value: 'Bawang Merah', unit: 'kg' },
  { label: 'Bawang Putih', value: 'Bawang Putih', unit: 'kg' },
  { label: 'Cabe Merah Besar', value: 'Cabe Merah Besar', unit: 'kg' },
  { label: 'Cabe Rawit', value: 'Cabe Rawit', unit: 'kg' },
  { label: 'Ikan Haruan/ Gabus', value: 'Ikan Haruan/ Gabus', unit: 'kg' },
  { label: 'Ikan Tongkol/Tuna', value: 'Ikan Tongkol/Tuna', unit: 'kg' },
  { label: 'Ikan Mas/Nila', value: 'Ikan Mas/Nila', unit: 'kg' },
  { label: 'Ikan Patin', value: 'Ikan Patin', unit: 'kg' },
  { label: 'Ikan Papuyu/Betok', value: 'Ikan Papuyu/Betok', unit: 'kg' },
  { label: 'Ikan Bandeng', value: 'Ikan Bandeng', unit: 'kg' },
  { label: 'Ikan Kembung/Pindang', value: 'Ikan Kembung/Pindang', unit: 'kg' },
];

// Helper function untuk mengecek duplikat data
async function checkExistingData(marketName: string, date: string, commodityNames: string[]) {
  try {
    const response = await fetch(`${API_BASE}/api/prices`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Gagal mengecek data existing');
    }

    const data = await response.json();
    const existingReports = data.rows || [];

    // Filter data yang ada untuk pasar, tanggal, dan komoditas yang sama
    const existingData = existingReports.filter((report: any) => {
      const reportDate = report.date || report.tanggal;
      const reportMarket = report.market || report.market_name || report.pasar;
      const reportCommodity = report.commodity || report.commodity_name || report.komoditas;

      return reportDate === date &&
        reportMarket === marketName &&
        commodityNames.includes(reportCommodity);
    });

    return existingData;
  } catch (error) {
    console.error('Error checking existing data:', error);
    return [];
  }
}

// Step Card Component
function StepCard({ number, title, children }: { number: string; title: string; children: React.ReactNode }) {
  return (
    <Card className="shadow-sm">
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-start gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300 flex items-center justify-center font-bold text-lg border-2 border-green-200 dark:border-green-700">
            {number}
          </div>
          <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-gray-100 pt-1 sm:pt-2">{title}</h3>
        </div>
        <div className="space-y-4 sm:space-y-6 pl-0 sm:pl-16">
          {children}
        </div>
      </CardContent>
    </Card>
  );
}

export default function InputDataPage() {
  const [inputMode, setInputMode] = useState<'single' | 'multi'>('single');
  const [selectedMarket, setSelectedMarket] = useState<string>('');
  const [markets, setMarkets] = useState<Array<{ id: number; nama_pasar: string }>>([]);
  const [commoditiesList, setCommoditiesList] = useState<Array<{ id: number; nama_komoditas: string }>>([]);
  const [date, setDate] = useState<string>(() => new Date().toISOString().split('T')[0]);

  // Single input states
  const [selectedCommodity, setSelectedCommodity] = useState<string>('');
  const [price, setPrice] = useState<string>('');

  // Multi input states
  const [commodityPrices, setCommodityPrices] = useState<Record<string, string>>({});

  const [notes, setNotes] = useState<string>('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [gps, setGps] = useState<{ lat: number | null; lng: number | null }>({ lat: null, lng: null });
  const [duplicateWarning, setDuplicateWarning] = useState<string>('');

  useEffect(() => {
    getLocation();
  }, []);

  // load markets & commodities from backend
  useEffect(() => {
    fetch(`${API_BASE}/api/markets`, { credentials: 'include' }).then(r => r.json()).then(d => setMarkets(d?.rows || [])).catch(() => { });
    fetch(`${API_BASE}/api/commodities`, { credentials: 'include' }).then(r => r.json()).then(d => setCommoditiesList(d?.rows || [])).catch(() => { });
    try {
      const au = JSON.parse(localStorage.getItem('auth_user') || 'null');
      setIsAdmin(Boolean(au && au.role === 'admin'));
    } catch { }
  }, []);

  // Cek duplikat data saat pasar, tanggal, atau harga berubah
  useEffect(() => {
    const checkDuplicates = async () => {
      if (!selectedMarket || !date) {
        setDuplicateWarning('');
        return;
      }

      const validEntries = Object.entries(commodityPrices).filter(([_, price]) => price && Number(price) > 0);

      if (validEntries.length === 0) {
        setDuplicateWarning('');
        return;
      }

      const commodityNames = validEntries.map(([name]) => name);
      const existingData = await checkExistingData(selectedMarket, date, commodityNames);

      if (existingData.length > 0) {
        const duplicateList = existingData.map((data: any) => {
          const commodityName = data.commodity || data.commodity_name || data.komoditas;
          const existingPrice = data.price || data.harga;
          return `• ${commodityName}: Rp ${Number(existingPrice).toLocaleString('id-ID')}`;
        }).join('\n');

        setDuplicateWarning(
          `⚠️ Data untuk tanggal ${date} di pasar ${selectedMarket} sudah ada:\n\n${duplicateList}\n\n` +
          `Anda dapat:\n` +
          `1. Mengedit data yang ada di halaman admin\n` +
          `2. Menggunakan tanggal yang berbeda\n` +
          `3. Melanjutkan jika ini adalah data yang berbeda`
        );
      } else {
        setDuplicateWarning('');
      }
    };

    // Debounce check untuk mengurangi API calls
    const timeoutId = setTimeout(checkDuplicates, 500);
    return () => clearTimeout(timeoutId);
  }, [selectedMarket, date, commodityPrices]);

  const [addingMarket, setAddingMarket] = useState(false);
  const [newMarketName, setNewMarketName] = useState('');
  const [addingCommodity, setAddingCommodity] = useState(false);
  const [newCommodityName, setNewCommodityName] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);

  async function getLocation() {
    if ('geolocation' in navigator) {
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject);
        });
        setGps({
          lat: Number(position.coords.latitude.toFixed(7)),
          lng: Number(position.coords.longitude.toFixed(7))
        });
      } catch (err) {
        console.log('GPS not available:', err);
      }
    }
  }

  function formatRupiah(value: string) {
    const number = value.replace(/[^0-9]/g, '');
    return number ? Number(number).toLocaleString('id-ID') : '';
  }

  function handlePriceChange(commodityName: string, value: string) {
    const cleanValue = value.replace(/[^0-9]/g, '');
    if (cleanValue.length <= 7) {
      setCommodityPrices(prev => ({
        ...prev,
        [commodityName]: cleanValue
      }));
    }
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      // Validasi tipe file
      if (!file.type.match(/^image\/(jpeg|jpg|png|webp)/)) {
        setError('File harus berupa gambar (JPG/PNG/WebP)');
        return;
      }
      // Validasi ukuran max 5MB
      if (file.size > 5 * 1024 * 1024) {
        setError('Ukuran foto maksimal 5MB');
        return;
      }
      setPhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
      setError('');
    }
  }

  function removePhoto() {
    setPhoto(null);
    setPhotoPreview('');
  }

  async function handleSubmit() {
    setError('');
    setSuccess('');

    // Validation
    if (!selectedMarket) {
      setError('Pilih pasar terlebih dahulu');
      return;
    }

    // Build valid entries based on input mode
    let validEntries: [string, string][] = [];

    if (inputMode === 'single') {
      // Single mode: use selectedCommodity and price
      if (!selectedCommodity) {
        setError('Pilih komoditas terlebih dahulu');
        return;
      }
      if (!price || Number(price) <= 0) {
        setError('Masukkan harga komoditas');
        return;
      }
      if (Number(price) < 1000) {
        setError('Harga minimal Rp 1.000');
        return;
      }
      validEntries = [[selectedCommodity, price]];
    } else {
      // Multi mode: filter commodityPrices
      validEntries = Object.entries(commodityPrices).filter(([_, p]) => p && Number(p) > 0);

      if (validEntries.length === 0) {
        setError('Masukkan minimal satu harga komoditas');
        return;
      }

      // Validasi harga minimal
      const invalidPrices = validEntries.filter(([_, p]) => Number(p) < 1000);
      if (invalidPrices.length > 0) {
        setError('Semua harga minimal Rp 1.000');
        return;
      }
    }

    try {
      setLoading(true);

      const today = date || new Date().toISOString().split('T')[0];

      // Kirim setiap komoditas sebagai request terpisah
      const promises = validEntries.map(async ([commodityName, price]) => {
        const commodityData = KOMODITAS_LIST.find(k => k.value === commodityName);

        const payload = {
          date: today,
          market_name: selectedMarket,
          commodity_name: commodityName,
          unit: commodityData?.unit || 'kg',
          price: Number(price),
          notes: notes || '',
          gps_lat: gps.lat ? String(gps.lat) : '',
          gps_lng: gps.lng ? String(gps.lng) : '',
        };

        // Gunakan FormData kalau ada foto (hanya untuk pertama)
        if (photo && validEntries[0][0] === commodityName) {
          const formData = new FormData();
          Object.entries(payload).forEach(([key, value]) => {
            formData.append(key, String(value));
          });
          formData.append('photo', photo);

          const response = await fetch(`${API_BASE}/m/reports`, {
            method: 'POST',
            credentials: 'include',
            body: formData,
          });

          if (!response.ok) {
            const text = await response.text();
            throw new Error(text || `HTTP ${response.status}`);
          }
        } else {
          await submitMobileReport(payload);
        }
      });

      await Promise.all(promises);

      setSuccess(`Berhasil mengirim ${validEntries.length} laporan harga!`);

      // Reset form
      if (inputMode === 'single') {
        setPrice('');
        setSelectedCommodity('');
      } else {
        setCommodityPrices({});
      }
      setNotes('');
      removePhoto();

      // Auto-hide success message
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      console.error('Error submitting:', err);

      // Handle duplicate error (409 Conflict)
      if (err.response?.status === 409) {
        const errorData = err.response?.data;
        if (errorData?.message) {
          // Tampilkan pesan duplikasi yang user-friendly
          setError(errorData.message);

          // Tampilkan info data yang sudah ada
          if (errorData?.existing_data) {
            const existing = errorData.existing_data;
            const existingInfo = `Data sudah ada: ${existing.harga ? `Rp ${Number(existing.harga).toLocaleString('id-ID')}` : 'Harga kosong'}${existing.keterangan ? ` (${existing.keterangan})` : ''}`;
            setError(`${errorData.message}\n\n${existingInfo}`);
          }
        } else {
          setError('Data laporan sudah ada. Silakan edit data yang ada atau gunakan tanggal yang berbeda.');
        }
      } else {
        setError(err.response?.data?.error || err.response?.data?.message || 'Gagal mengirim laporan');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-6xl mx-auto space-y-4 sm:space-y-6 px-2 sm:px-0">
      {/* Success/Error Messages */}
      {error && (
        <Alert variant="destructive" className="shadow-sm mx-2 sm:mx-0">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-sm whitespace-pre-line">{error}</AlertDescription>
        </Alert>
      )}

      {duplicateWarning && (
        <Alert className="border-amber-500 bg-amber-50 dark:bg-amber-950 text-amber-800 dark:text-amber-200 shadow-sm mx-2 sm:mx-0">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-sm whitespace-pre-line">{duplicateWarning}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-500 bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 shadow-sm mx-2 sm:mx-0">
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription className="text-sm">{success}</AlertDescription>
        </Alert>
      )}

      {/* Step 1: Lokasi Pantauan */}
      <div className="mx-2 sm:mx-0">
        <StepCard number="1" title="Lokasi & Tanggal Laporan">
          <div className="space-y-4 sm:space-y-6">
            <div className="space-y-3">
              <Label htmlFor="market" className="text-sm sm:text-base font-medium">Pilih Lokasi Pasar</Label>
              <div className="flex items-start gap-2">
                <div className="flex-1">
                  <Select value={selectedMarket} onValueChange={setSelectedMarket}>
                    <SelectTrigger id="market" className="h-12 text-sm sm:text-base">
                      <SelectValue placeholder="-- Pilih Lokasi Pasar --" />
                    </SelectTrigger>
                    <SelectContent>
                      {markets.map(pasar => (
                        <SelectItem key={pasar.id} value={String(pasar.nama_pasar)} className="text-sm sm:text-base py-3">
                          {pasar.nama_pasar}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-sm sm:text-base font-medium">Pilih Tanggal Laporan</Label>
              <Input
                type="date"
                value={date}
                onChange={(e: any) => setDate(e.target.value)}
                className="h-12 w-full"
              />
            </div>

            {gps.lat && gps.lng && (
              <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950 p-3 sm:p-4 rounded-lg border border-green-200 dark:border-green-800">
                <MapPin className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="font-medium">Lokasi GPS Terdeteksi</p>
                  <p className="text-xs opacity-80 break-all">{gps.lat}, {gps.lng}</p>
                </div>
              </div>
            )}
          </div>
        </StepCard>
      </div>

      {/* Mode Toggle */}
      <div className="mx-2 sm:mx-0 mb-4">
        <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 border rounded-lg shadow-sm">
          <div className="flex items-center gap-3">
            <Label className="text-sm font-medium">Mode Input:</Label>
            <div className="flex gap-2">
              <button
                onClick={() => setInputMode('single')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${inputMode === 'single'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
              >
                Single Input
              </button>
              <button
                onClick={() => setInputMode('multi')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${inputMode === 'multi'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
              >
                Multi Input
              </button>
            </div>
          </div>
          <div className="text-xs text-gray-500">
            {inputMode === 'single' ? 'Input satu komoditas per laporan' : 'Input banyak komoditas sekaligus'}
          </div>
        </div>
      </div>

      {/* Step 2: Input Harga - Single atau Multi Mode */}
      <div className="mx-2 sm:mx-0">
        <StepCard number="2" title={inputMode === 'single' ? 'Input Harga Komoditas' : 'Input Harga Semua Komoditas'}>
          {inputMode === 'single' ? (
            // Single Input Mode
            <div className="space-y-4 sm:space-y-6">
              <div className="space-y-3">
                <Label htmlFor="commodity" className="text-sm sm:text-base font-medium">Pilih Komoditas</Label>
                <div className="flex items-start gap-2">
                  <div className="flex-1">
                    <Select value={selectedCommodity} onValueChange={setSelectedCommodity}>
                      <SelectTrigger id="commodity" className="h-12 text-sm sm:text-base">
                        <SelectValue placeholder="-- Pilih Komoditas --" />
                      </SelectTrigger>
                      <SelectContent>
                        {commoditiesList.map(k => (
                          <SelectItem key={k.id} value={k.nama_komoditas} className="text-sm sm:text-base py-3">{k.nama_komoditas}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {isAdmin && (
                    <div className="mt-1">
                      <button type="button" className="px-3 py-2 border rounded text-sm" onClick={() => { setAddingCommodity((s) => !s); setNewCommodityName(''); }}>
                        + Komoditas
                      </button>
                    </div>
                  )}
                </div>
                {addingCommodity && (
                  <div className="mt-3 flex gap-2 items-center">
                    <Input value={newCommodityName} onChange={(e: any) => setNewCommodityName(e.target.value)} placeholder="Nama komoditas baru" className="flex-1" />
                    <Button size="sm" onClick={async () => {
                      if (!newCommodityName.trim()) { setError('Nama komoditas kosong'); return; }
                      try {
                        const res = await fetch(`${API_BASE}/api/commodities`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nama_komoditas: newCommodityName.trim() }) });
                        const data = await res.json();
                        if (!res.ok) throw new Error(data?.message || data?.error || 'Gagal menambah komoditas');
                        setCommoditiesList((c) => [...c, data.row]);
                        setSelectedCommodity(data.row.nama_komoditas || '');
                        setAddingCommodity(false);
                        setNewCommodityName('');
                      } catch (err: any) { setError(err?.message || 'Gagal menambah komoditas'); }
                    }}>Simpan</Button>
                    <Button variant="outline" size="sm" onClick={() => { setAddingCommodity(false); setNewCommodityName(''); }}>Batal</Button>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <Label htmlFor="price" className="text-sm sm:text-base font-medium">
                  Masukkan Harga {selectedCommodity ? `(Rp per ${KOMODITAS_LIST.find(k => k.value === selectedCommodity)?.unit || 'kg'})` : '(Rp)'}
                </Label>
                <div className="relative">
                  <span className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-gray-600 dark:text-gray-400 font-medium text-sm sm:text-base">
                    Rp
                  </span>
                  <Input
                    id="price"
                    type="text"
                    placeholder="0"
                    value={formatRupiah(price)}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9]/g, '');
                      if (value.length <= 7) {
                        setPrice(value);
                      }
                    }}
                    className="h-12 pl-10 sm:pl-12 pr-3 sm:pr-4 text-sm sm:text-base font-medium"
                  />
                </div>
                {price && Number(price) > 0 && (
                  <p className="text-xs sm:text-sm text-muted-foreground bg-gray-50 dark:bg-gray-800 p-2 sm:p-3 rounded-lg">
                    <strong>Rp {formatRupiah(price)}</strong>
                  </p>
                )}
              </div>

              {gps.lat && gps.lng && (
                <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950 p-3 sm:p-4 rounded-lg border border-green-200 dark:border-green-800">
                  <MapPin className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium">Lokasi GPS Terdeteksi</p>
                    <p className="text-xs opacity-80 break-all">{gps.lat}, {gps.lng}</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            // Multi Input Mode
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {commoditiesList.map(commodity => {
                  const commodityData = KOMODITAS_LIST.find(k => k.value === commodity.nama_komoditas);
                  const currentPrice = commodityPrices[commodity.nama_komoditas] || '';

                  return (
                    <div key={commodity.id} className="space-y-2 p-4 border rounded-lg bg-gray-50 dark:bg-gray-800">
                      <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {commodity.nama_komoditas}
                      </Label>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                        (Rp per {commodityData?.unit || 'kg'})
                      </div>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 dark:text-gray-400 font-medium text-sm">
                          Rp
                        </span>
                        <Input
                          type="text"
                          placeholder="0"
                          value={formatRupiah(currentPrice)}
                          onChange={(e) => handlePriceChange(commodity.nama_komoditas, e.target.value)}
                          className="h-10 pl-10 pr-3 text-sm font-medium"
                        />
                      </div>
                      {currentPrice && Number(currentPrice) > 0 && (
                        <p className="text-xs text-muted-foreground bg-white dark:bg-gray-700 p-2 rounded">
                          <strong>Rp {formatRupiah(currentPrice)}</strong>
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  <strong>Total komoditas dengan harga:</strong> {Object.values(commodityPrices).filter(price => price && Number(price) > 0).length} dari {commoditiesList.length}
                </p>
              </div>
            </div>
          )}
        </StepCard>
      </div>

      {/* Step 3: Informasi Tambahan (Opsional) */}
      <div className="mx-2 sm:mx-0">
        <StepCard number="3" title="Informasi Tambahan (Opsional)">
          <div className="space-y-4 sm:space-y-6">
            <div className="space-y-3">
              <Label htmlFor="notes" className="text-sm sm:text-base font-medium">Keterangan / Catatan</Label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Contoh: Harga cabai naik karena cuaca..."
                className="w-full min-h-[100px] sm:min-h-[120px] p-3 sm:p-4 border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 text-sm sm:text-base resize-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                maxLength={200}
              />
              <div className="flex justify-between items-center text-xs sm:text-sm">
                <p className="text-muted-foreground">{notes.length}/200 karakter</p>
                <div className="text-gray-400">Opsional</div>
              </div>
            </div>

            <div className="space-y-3">
              <Label htmlFor="photo" className="text-sm sm:text-base font-medium">Foto Bukti (Opsional)</Label>
              {!photoPreview ? (
                <label
                  htmlFor="photo"
                  className="flex flex-col items-center justify-center gap-2 sm:gap-3 w-full h-24 sm:h-32 px-3 sm:px-4 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 dark:border-gray-600 transition-colors group"
                >
                  <Camera className="h-6 w-6 sm:h-8 sm:w-8 text-gray-400 group-hover:text-green-500 transition-colors" />
                  <div className="text-center">
                    <span className="text-sm sm:text-base text-gray-600 dark:text-gray-400 font-medium">Upload Foto Bukti</span>
                    <p className="text-xs sm:text-sm text-gray-400 mt-1">JPG, PNG, WebP (maks 5MB)</p>
                  </div>
                  <input
                    id="photo"
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="hidden"
                  />
                </label>
              ) : (
                <div className="relative bg-gray-50 dark:bg-gray-800 p-3 sm:p-4 rounded-lg">
                  <img
                    src={photoPreview}
                    alt="Preview"
                    className="w-full h-48 sm:h-64 object-cover rounded-lg shadow-sm"
                  />
                  <button
                    type="button"
                    onClick={removePhoto}
                    className="absolute top-5 sm:top-6 right-5 sm:right-6 p-1.5 sm:p-2 bg-red-600 text-white rounded-full hover:bg-red-700 shadow-lg transition-colors"
                  >
                    <X className="h-3 w-3 sm:h-4 sm:w-4" />
                  </button>
                  <div className="mt-2 sm:mt-3 flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{photo?.name}</p>
                      <p className="text-xs text-gray-500">Ukuran: {photo && (photo.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                    <div className="text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900 px-2 py-1 rounded flex-shrink-0">
                      Siap
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </StepCard>
      </div>

      {/* Submit Button */}
      <div className="pt-4 mx-2 sm:mx-0">
        <Button
          onClick={handleSubmit}
          disabled={loading || !selectedMarket || (inputMode === 'single' ? (!selectedCommodity || !price || Number(price) <= 0) : Object.values(commodityPrices).filter(p => p && Number(p) > 0).length === 0) || duplicateWarning.length > 0}
          className="w-full h-12 sm:h-14 bg-green-600 hover:bg-green-700 text-base sm:text-lg font-semibold disabled:opacity-50 shadow-lg transition-all duration-200"
        >
          {loading ? (
            <>
              <Loader2 className="h-5 w-5 sm:h-6 sm:w-6 mr-2 sm:mr-3 animate-spin" />
              <span className="hidden sm:inline">Mengirim Laporan...</span>
              <span className="sm:hidden">Mengirim...</span>
            </>
          ) : duplicateWarning.length > 0 ? (
            <>
              <AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6 mr-2 sm:mr-3" />
              <span className="hidden sm:inline">Tidak Dapat Mengirim - Data Duplikat</span>
              <span className="sm:hidden">Data Duplikat</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6 mr-2 sm:mr-3" />
              Kirim Laporan {inputMode === 'multi' ? `(${Object.values(commodityPrices).filter(p => p && Number(p) > 0).length})` : ''}
            </>
          )}
        </Button>

        {duplicateWarning.length > 0 && (
          <div className="mt-3 p-3 bg-amber-100 dark:bg-amber-900 border border-amber-300 dark:border-amber-700 rounded-lg">
            <p className="text-xs sm:text-sm text-amber-800 dark:text-amber-200 font-medium">
              ⚠️ <strong>Data duplikat terdeteksi!</strong> Silakan perbaiki masalah di atas sebelum mengirim laporan.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
