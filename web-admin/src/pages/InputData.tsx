import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, AlertCircle, Loader2, MapPin } from 'lucide-react';
import { getMarkets, getCommodities, submitPriceReport } from '../api';

interface Market {
  id: number;
  nama_pasar: string;
}

interface Commodity {
  id: number;
  name: string;
  unit: string;
}

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
  const [markets, setMarkets] = useState<Market[]>([]);
  const [commodities, setCommodities] = useState<Commodity[]>([]);
  
  const [selectedMarketId, setSelectedMarketId] = useState<string>('');
  const [selectedCommodityId, setSelectedCommodityId] = useState<string>('');
  const [price, setPrice] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [gps, setGps] = useState<{ lat: number | null; lng: number | null }>({ lat: null, lng: null });

  useEffect(() => {
    loadData();
    getLocation();
  }, []);

  async function loadData() {
    try {
      const [marketsRes, commoditiesRes] = await Promise.all([
        getMarkets(),
        getCommodities()
      ]);
      
      // Backend returns { rows: [...] } for markets and { data: [...] } for commodities
      const marketData = marketsRes.rows || marketsRes.data || marketsRes || [];
      const commodityData = commoditiesRes.data || commoditiesRes || [];
      
      console.log('Markets loaded:', marketData);
      console.log('Commodities loaded:', commodityData);
      
      setMarkets(Array.isArray(marketData) ? marketData : []);
      setCommodities(Array.isArray(commodityData) ? commodityData : []);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Gagal memuat data. Silakan refresh halaman.');
    } finally {
      setLoadingData(false);
    }
  }

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
    if (!selectedMarketId) {
      setError('Pilih pasar terlebih dahulu');
      return;
    }

    if (!selectedCommodityId) {
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

      const payload = {
        marketId: Number(selectedMarketId),
        prices: [{
          commodityId: Number(selectedCommodityId),
          price: priceNumber
        }]
      };

      await submitPriceReport(payload);

      setSuccess('Laporan harga berhasil dikirim!');
      
      // Reset form
      setSelectedCommodityId('');
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

  const selectedCommodity = commodities.find(c => c.id === Number(selectedCommodityId));

  if (loadingData) {
    return (
      <div className="space-y-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-12">
          <div className="flex flex-col items-center justify-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-green-600" />
            <p className="text-muted-foreground">Memuat data...</p>
          </div>
        </div>
      </div>
    );
  }

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
          {markets.length === 0 ? (
            <div className="p-4 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg text-sm text-yellow-800 dark:text-yellow-200">
              ⚠️ Tidak ada data pasar. Hubungi admin untuk menambahkan data pasar.
            </div>
          ) : (
            <Select value={selectedMarketId} onValueChange={setSelectedMarketId}>
              <SelectTrigger id="market" className="h-11">
                <SelectValue placeholder="-- Pilih Lokasi Pasar --" />
              </SelectTrigger>
              <SelectContent>
                {markets.map(market => (
                  <SelectItem key={market.id} value={String(market.id)}>
                    {market.nama_pasar}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </StepCard>

      {/* Step 2: Detail Harga Komoditas */}
      {selectedMarketId && (
        <StepCard number="2" title="Detail Harga Komoditas">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="commodity">Pilih Komoditas</Label>
              <Select value={selectedCommodityId} onValueChange={setSelectedCommodityId}>
                <SelectTrigger id="commodity" className="h-11">
                  <SelectValue placeholder="-- Pilih Komoditas --" />
                </SelectTrigger>
                <SelectContent>
                  {commodities.map(commodity => (
                    <SelectItem key={commodity.id} value={String(commodity.id)}>
                      {commodity.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">
                Masukkan Harga {selectedCommodity ? `(Rp per ${selectedCommodity.unit})` : '(Rp)'}
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
      )}

      {/* Step 3: Informasi Tambahan (Opsional) */}
      {selectedMarketId && selectedCommodityId && (
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
      )}

      {/* Submit Button */}
      {selectedMarketId && selectedCommodityId && price && (
        <Button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full h-12 bg-green-600 hover:bg-green-700 text-base font-semibold"
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
      )}
    </div>
  );
}
