import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, AlertCircle, Loader2, Plus, Trash2 } from 'lucide-react';
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

interface PriceEntry {
  commodityId: number;
  commodityName: string;
  unit: string;
  price: string;
}

export default function InputDataPage() {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [commodities, setCommodities] = useState<Commodity[]>([]);
  const [selectedMarketId, setSelectedMarketId] = useState<string>('');
  const [entries, setEntries] = useState<PriceEntry[]>([
    { commodityId: 0, commodityName: '', unit: '', price: '' }
  ]);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadMarkets();
    loadCommodities();
  }, []);

  async function loadMarkets() {
    try {
      const res = await getMarkets();
      console.log('Markets response:', res);
      const marketData = res.data || res || [];
      setMarkets(Array.isArray(marketData) ? marketData : []);
    } catch (err) {
      console.error('Error loading markets:', err);
      setError('Gagal memuat data pasar. Silakan refresh halaman.');
    } finally {
      setLoadingData(false);
    }
  }

  async function loadCommodities() {
    try {
      const res = await getCommodities();
      console.log('Commodities response:', res);
      const commodityData = res.data || res || [];
      setCommodities(Array.isArray(commodityData) ? commodityData : []);
    } catch (err) {
      console.error('Error loading commodities:', err);
      setError('Gagal memuat data komoditas. Silakan refresh halaman.');
    }
  }

  function addEntry() {
    setEntries([...entries, { commodityId: 0, commodityName: '', unit: '', price: '' }]);
  }

  function removeEntry(index: number) {
    setEntries(entries.filter((_, i) => i !== index));
  }

  function updateEntry(index: number, field: keyof PriceEntry, value: any) {
    const updated = [...entries];
    updated[index] = { ...updated[index], [field]: value };
    
    // Auto-fill commodity name and unit when commodity is selected
    if (field === 'commodityId') {
      const commodity = commodities.find(c => c.id === Number(value));
      if (commodity) {
        updated[index].commodityName = commodity.name;
        updated[index].unit = commodity.unit;
      }
    }
    
    setEntries(updated);
  }

  async function handleSubmit() {
    setError('');
    setSuccess('');

    // Validation
    if (!selectedMarketId) {
      setError('Pilih pasar terlebih dahulu');
      return;
    }

    if (entries.length === 0) {
      setError('Tambahkan minimal 1 komoditas');
      return;
    }

    // Validate all entries
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      if (!entry.commodityId || entry.commodityId === 0) {
        setError(`Pilih komoditas untuk baris ${i + 1}`);
        return;
      }
      if (!entry.price || isNaN(Number(entry.price)) || Number(entry.price) <= 0) {
        setError(`Masukkan harga valid untuk ${entry.commodityName}`);
        return;
      }
    }

    try {
      setLoading(true);

      // Send to backend API
      const payload = {
        marketId: Number(selectedMarketId),
        prices: entries.map(e => ({
          commodityId: e.commodityId,
          price: Number(e.price)
        }))
      };

      await submitPriceReport(payload);

      setSuccess(`Berhasil menyimpan ${entries.length} data harga`);
      
      // Reset form - tambah 1 entry baru
      setEntries([{ commodityId: 0, commodityName: '', unit: '', price: '' }]);
      // Tidak reset market agar bisa langsung input lagi untuk pasar yang sama

      // Auto-hide success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      console.error('Error submitting:', err);
      setError(err.response?.data?.error || 'Gagal menyimpan data');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {loadingData ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-12">
          <div className="flex flex-col items-center justify-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-green-600" />
            <p className="text-muted-foreground">Memuat data...</p>
          </div>
        </div>
      ) : (
        <>
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

          {/* Market Selection Card */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <Label htmlFor="market" className="text-base font-semibold">Pilih Pasar *</Label>
                {markets.length === 0 ? (
                  <div className="p-4 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg text-sm text-yellow-800 dark:text-yellow-200">
                    ⚠️ Tidak ada data pasar. Hubungi admin untuk menambahkan data pasar.
                  </div>
                ) : (
                  <Select value={selectedMarketId} onValueChange={setSelectedMarketId}>
                    <SelectTrigger id="market" className="h-12">
                      <SelectValue placeholder="-- Pilih Pasar --" />
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
            </CardContent>
          </Card>

          {/* Input Form */}
          {!selectedMarketId ? (
            <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed">
              <p className="text-muted-foreground">Pilih pasar terlebih dahulu untuk mulai input data</p>
            </div>
          ) : (
            <>
              {/* Entries List */}
              <div className="space-y-3">
                {entries.map((entry, index) => (
                  <Card key={index}>
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        {/* Commodity Select */}
                        <div className="space-y-1.5">
                          <Label className="text-sm font-medium">
                            Komoditas *
                          </Label>
                          <Select 
                            value={String(entry.commodityId || '')} 
                            onValueChange={(val) => updateEntry(index, 'commodityId', Number(val))}
                          >
                            <SelectTrigger className="h-11">
                              <SelectValue placeholder="-- Pilih Komoditas --" />
                            </SelectTrigger>
                            <SelectContent>
                              {commodities.map(commodity => (
                                <SelectItem key={commodity.id} value={String(commodity.id)}>
                                  {commodity.name} ({commodity.unit})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Price Input */}
                        <div className="space-y-1.5">
                          <Label className="text-sm font-medium">
                            Harga {entry.unit ? `(Rp/${entry.unit})` : '*'}
                          </Label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 font-medium">
                              Rp
                            </span>
                            <Input
                              type="number"
                              placeholder="0"
                              value={entry.price}
                              onChange={(e) => updateEntry(index, 'price', e.target.value)}
                              min="0"
                              className="h-11 pl-10 text-base"
                            />
                          </div>
                        </div>

                        {/* Delete Button */}
                        {entries.length > 1 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeEntry(index)}
                            className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950 border-red-300 dark:border-red-800"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Hapus Komoditas
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Add & Submit Buttons */}
              <div className="space-y-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={addEntry}
                  className="w-full h-11 text-green-600 border-green-600 hover:bg-green-50 dark:hover:bg-green-950"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Tambah Komoditas Lain
                </Button>

                <Button
                  onClick={handleSubmit}
                  disabled={loading || entries.length === 0 || !selectedMarketId}
                  className="w-full h-12 bg-green-600 hover:bg-green-700 text-base font-semibold"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Menyimpan Data...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-5 w-5 mr-2" />
                      Simpan {entries.length} Komoditas
                    </>
                  )}
                </Button>

                {entries.length > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setEntries([{ commodityId: 0, commodityName: '', unit: '', price: '' }]);
                      setError('');
                      setSuccess('');
                    }}
                    disabled={loading}
                    className="w-full text-sm"
                  >
                    Reset Form
                  </Button>
                )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
