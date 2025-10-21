import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, AlertCircle, Loader2, MapPin } from 'lucide-react';
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
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300 flex items-center justify-center font-bold text-lg">
            {number}
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 pt-2">{title}</h3>
        </div>
        <div className="space-y-4 pl-13">
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

      setSuccess('Laporan harga berhasil dikirim!');
      
      // Reset form
      setSelectedCommodity('');
      setPrice('');
      setNotes('');

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
    <div className="space-y-4">
      {/* Success/Error Messages */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-500 bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300">
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* Step 1: Lokasi Pantauan */}
      <StepCard number="1" title="Lokasi Pantauan">
        <div className="space-y-2">
          <Label htmlFor="market">Pilih Lokasi Pasar</Label>
          <Select value={selectedMarket} onValueChange={setSelectedMarket}>
            <SelectTrigger id="market" className="h-11">
              <SelectValue placeholder="-- Pilih Lokasi Pasar --" />
            </SelectTrigger>
            <SelectContent>
              {PASAR_LIST.map(pasar => (
                <SelectItem key={pasar.value} value={pasar.value}>
                  {pasar.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </StepCard>

      {/* Step 2: Detail Harga Komoditas */}
      <StepCard number="2" title="Detail Harga Komoditas">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="commodity">Pilih Komoditas</Label>
            <Select value={selectedCommodity} onValueChange={setSelectedCommodity}>
              <SelectTrigger id="commodity" className="h-11">
                <SelectValue placeholder="-- Pilih Komoditas --" />
              </SelectTrigger>
              <SelectContent>
                {KOMODITAS_LIST.map(komoditas => (
                  <SelectItem key={komoditas.value} value={komoditas.value}>
                    {komoditas.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="price">
              Masukkan Harga {selectedCommodityData ? `(Rp per ${selectedCommodityData.unit})` : '(Rp)'}
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 dark:text-gray-400 font-medium">
                Rp
              </span>
              <Input
                id="price"
                type="text"
                placeholder="0"
                value={formatRupiah(price)}
                onChange={handlePriceChange}
                className="h-11 pl-10 text-base"
              />
            </div>
            {price && Number(price) > 0 && (
              <p className="text-xs text-muted-foreground">
                Rp {formatRupiah(price)}
              </p>
            )}
          </div>

          {gps.lat && gps.lng && (
            <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950 p-3 rounded-lg">
              <MapPin className="h-4 w-4" />
              <span>GPS Otomatis: {gps.lat}, {gps.lng}</span>
            </div>
          )}
        </div>
      </StepCard>

      {/* Step 3: Informasi Tambahan (Opsional) */}
      <StepCard number="3" title="Informasi Tambahan (Opsional)">
        <div className="space-y-2">
          <Label htmlFor="notes">Keterangan / Catatan</Label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Contoh: Harga cabai naik..."
            className="w-full min-h-[100px] p-3 border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
            maxLength={200}
          />
          <p className="text-xs text-muted-foreground">{notes.length}/200 karakter</p>
        </div>
      </StepCard>

      {/* Submit Button */}
      <Button
        onClick={handleSubmit}
        disabled={loading || !selectedMarket || !selectedCommodity || !price}
        className="w-full h-12 bg-green-600 hover:bg-green-700 text-base font-semibold disabled:opacity-50"
      >
        {loading ? (
          <>
            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            Mengirim Laporan...
          </>
        ) : (
          <>
            <CheckCircle2 className="h-5 w-5 mr-2" />
            Kirim Laporan
          </>
        )}
      </Button>
    </div>
  );
}
