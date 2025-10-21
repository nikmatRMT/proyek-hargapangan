import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, AlertCircle, Loader2, MapPin, Camera, X } from 'lucide-react';
import { submitMobileReport } from '../api';

// Data static seperti di mobile app
const PASAR_LIST = [
  { label: 'Pasar Bauntung', value: 'Pasar Bauntung' },
  { label: 'Pasar Jati', value: 'Pasar Jati' },
  { label: 'Pasar Ulin Raya', value: 'Pasar Ulin Raya' },
  { label: 'Pasar Pagi Loktabat Utara', value: 'Pasar Pagi Loktabat Utara' },
];

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
  const [selectedMarket, setSelectedMarket] = useState<string>('');
  const [selectedCommodity, setSelectedCommodity] = useState<string>('');
  const [price, setPrice] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [gps, setGps] = useState<{ lat: number | null; lng: number | null }>({ lat: null, lng: null });

  useEffect(() => {
    getLocation();
  }, []);

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

  function handlePriceChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value.replace(/[^0-9]/g, '');
    if (value.length <= 7) {
      setPrice(value);
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

    if (!selectedCommodity) {
      setError('Pilih komoditas terlebih dahulu');
      return;
    }

    const priceNumber = Number(price);
    if (!price || priceNumber <= 0) {
      setError('Masukkan harga yang valid');
      return;
    }

    if (priceNumber < 1000) {
      setError('Harga terlalu rendah (minimal Rp 1.000)');
      return;
    }

    try {
      setLoading(true);

      // Format payload seperti mobile app
      const today = new Date().toISOString().split('T')[0];
      const commodityData = KOMODITAS_LIST.find(k => k.value === selectedCommodity);
      
      // Gunakan FormData kalau ada foto
      if (photo) {
        const formData = new FormData();
        formData.append('date', today);
        formData.append('market_name', selectedMarket);
        formData.append('commodity_name', selectedCommodity);
        formData.append('unit', commodityData?.unit || 'kg');
        formData.append('price', String(priceNumber));
        formData.append('notes', notes || '');
        formData.append('gps_lat', gps.lat ? String(gps.lat) : '');
        formData.append('gps_lng', gps.lng ? String(gps.lng) : '');
        formData.append('photo', photo);

        // Kirim dengan FormData
        const response = await fetch('/m/reports', {
          method: 'POST',
          credentials: 'include',
          body: formData,
        });

        if (!response.ok) {
          const text = await response.text();
          throw new Error(text || `HTTP ${response.status}`);
        }
      } else {
        // Tanpa foto, kirim JSON biasa
        const payload = {
          date: today,
          market_name: selectedMarket,
          commodity_name: selectedCommodity,
          unit: commodityData?.unit || 'kg',
          price: priceNumber,
          notes: notes || '',
          gps_lat: gps.lat ? String(gps.lat) : '',
          gps_lng: gps.lng ? String(gps.lng) : '',
        };

        console.log('Sending payload:', payload);
        await submitMobileReport(payload);
      }

      setSuccess('Laporan harga berhasil dikirim!');
      
      // Reset form
      setSelectedCommodity('');
      setPrice('');
      setNotes('');
      removePhoto();

      // Auto-hide success message
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      console.error('Error submitting:', err);
      setError(err.response?.data?.error || 'Gagal mengirim laporan');
    } finally {
      setLoading(false);
    }
  }

  const selectedCommodityData = KOMODITAS_LIST.find(k => k.value === selectedCommodity);

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4 sm:space-y-6 px-2 sm:px-0">
      {/* Success/Error Messages */}
      {error && (
        <Alert variant="destructive" className="shadow-sm mx-2 sm:mx-0">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-sm">{error}</AlertDescription>
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
        <StepCard number="1" title="Lokasi Pantauan">
          <div className="space-y-3">
            <Label htmlFor="market" className="text-sm sm:text-base font-medium">Pilih Lokasi Pasar</Label>
            <Select value={selectedMarket} onValueChange={setSelectedMarket}>
              <SelectTrigger id="market" className="h-12 text-sm sm:text-base">
                <SelectValue placeholder="-- Pilih Lokasi Pasar --" />
              </SelectTrigger>
              <SelectContent>
                {PASAR_LIST.map(pasar => (
                  <SelectItem key={pasar.value} value={pasar.value} className="text-sm sm:text-base py-3">
                    {pasar.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </StepCard>
      </div>

      {/* Step 2: Detail Harga Komoditas */}
      <div className="mx-2 sm:mx-0">
        <StepCard number="2" title="Detail Harga Komoditas">
          <div className="space-y-4 sm:space-y-6">
            <div className="space-y-3">
              <Label htmlFor="commodity" className="text-sm sm:text-base font-medium">Pilih Komoditas</Label>
              <Select value={selectedCommodity} onValueChange={setSelectedCommodity}>
                <SelectTrigger id="commodity" className="h-12 text-sm sm:text-base">
                  <SelectValue placeholder="-- Pilih Komoditas --" />
                </SelectTrigger>
                <SelectContent>
                  {KOMODITAS_LIST.map(komoditas => (
                    <SelectItem key={komoditas.value} value={komoditas.value} className="text-sm sm:text-base py-3">
                      {komoditas.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label htmlFor="price" className="text-sm sm:text-base font-medium">
                Masukkan Harga {selectedCommodityData ? `(Rp per ${selectedCommodityData.unit})` : '(Rp)'}
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
                  onChange={handlePriceChange}
                  className="h-12 pl-10 sm:pl-12 pr-3 sm:pr-4 text-sm sm:text-base font-medium"
                />
              </div>
              {price && Number(price) > 0 && (
                <p className="text-xs sm:text-sm text-muted-foreground bg-gray-50 dark:bg-gray-800 p-2 sm:p-3 rounded-lg">
                  💰 <strong>Rp {formatRupiah(price)}</strong>
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
                <div className="text-gray-400">💡 Opsional</div>
              </div>
            </div>

            <div className="space-y-3">
              <Label htmlFor="photo" className="text-sm sm:text-base font-medium">Foto Bukti</Label>
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
                      ✓ Siap
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
          disabled={loading || !selectedMarket || !selectedCommodity || !price}
          className="w-full h-12 sm:h-14 bg-green-600 hover:bg-green-700 text-base sm:text-lg font-semibold disabled:opacity-50 shadow-lg transition-all duration-200"
        >
          {loading ? (
            <>
              <Loader2 className="h-5 w-5 sm:h-6 sm:w-6 mr-2 sm:mr-3 animate-spin" />
              <span className="hidden sm:inline">Mengirim Laporan...</span>
              <span className="sm:hidden">Mengirim...</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6 mr-2 sm:mr-3" />
              Kirim Laporan
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
