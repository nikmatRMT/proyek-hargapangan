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
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadMarkets();
    loadCommodities();
  }, []);

  async function loadMarkets() {
    try {
      const res = await getMarkets();
      setMarkets(res.data || []);
    } catch (err) {
      console.error('Error loading markets:', err);
      setError('Gagal memuat data pasar');
    }
  }

  async function loadCommodities() {
    try {
      const res = await getCommodities();
      setCommodities(res.data || []);
    } catch (err) {
      console.error('Error loading commodities:', err);
      setError('Gagal memuat data komoditas');
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
    <div className="container mx-auto py-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Input Data Harga Pangan</CardTitle>
          <CardDescription>
            Masukkan data harga komoditas untuk pasar yang Anda kelola
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Success Alert */}
          {success && (
            <Alert className="border-green-500 bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300">
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          {/* Market Selection */}
          <div className="space-y-2">
            <Label htmlFor="market">Pilih Pasar *</Label>
            <Select value={selectedMarketId} onValueChange={setSelectedMarketId}>
              <SelectTrigger id="market">
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
          </div>

          {/* Price Entries */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Daftar Komoditas & Harga</Label>
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                onClick={addEntry}
                disabled={!selectedMarketId}
                className="text-green-600 border-green-600 hover:bg-green-50 dark:hover:bg-green-950"
              >
                <Plus className="h-4 w-4 mr-1" />
                Tambah Komoditas
              </Button>
            </div>

            {!selectedMarketId ? (
              <div className="text-center py-8 text-muted-foreground bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed">
                <p className="text-sm">Pilih pasar terlebih dahulu untuk mulai input data</p>
              </div>
            ) : (
              <div className="space-y-3">
                {entries.map((entry, index) => (
                  <div 
                    key={index} 
                    className="grid grid-cols-1 md:grid-cols-[2fr_1.5fr_auto] gap-3 p-4 border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow"
                  >
                    {/* Commodity Select */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                        Komoditas *
                      </Label>
                      <Select 
                        value={String(entry.commodityId || '')} 
                        onValueChange={(val) => updateEntry(index, 'commodityId', Number(val))}
                      >
                        <SelectTrigger className="h-10">
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
                      <Label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                        Harga {entry.unit ? `(Rp/${entry.unit})` : '*'}
                      </Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 text-sm">
                          Rp
                        </span>
                        <Input
                          type="number"
                          placeholder="0"
                          value={entry.price}
                          onChange={(e) => updateEntry(index, 'price', e.target.value)}
                          min="0"
                          className="h-10 pl-9"
                        />
                      </div>
                    </div>

                    {/* Delete Button */}
                    <div className="flex items-end">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => removeEntry(index)}
                        className="h-10 w-10 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950 border-red-300 dark:border-red-800"
                        title="Hapus komoditas ini"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className="flex justify-between gap-3 pt-4 border-t">
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              {entries.length > 0 && (
                <span>
                  Total: <strong className="text-green-600 dark:text-green-400">{entries.length}</strong> komoditas
                </span>
              )}
            </div>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEntries([{ commodityId: 0, commodityName: '', unit: '', price: '' }]);
                  setError('');
                  setSuccess('');
                }}
                disabled={loading}
              >
                Reset Form
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={loading || entries.length === 0 || !selectedMarketId}
                className="bg-green-600 hover:bg-green-700 min-w-[140px]"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Simpan Data
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
