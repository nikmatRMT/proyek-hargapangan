import React from "react";
import { getCommodities } from "../api";

type Commodity = { id: number; nama_komoditas?: string; name?: string; nama?: string };

type Props = {
  value?: string;
  onChange: (commodity: string) => void;
  className?: string;
  placeholder?: string;
};

export function CommoditySelector({ 
  value, 
  onChange, 
  className = "", 
  placeholder = "Pilih komoditas" 
}: Props) {
  const [commodities, setCommodities] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let mounted = true;
    
    async function loadCommodities() {
      try {
        setLoading(true);
        setError(null);
        
        const res = await getCommodities();
        const list = Array.isArray((res as any).rows) 
          ? (res as any).rows 
          : Array.isArray(res) 
          ? (res as any) 
          : [];
        
        if (!mounted) return;
        
        // Extract commodity names
        const names = list
          .map((c: Commodity) => 
            c.nama_komoditas || c.name || c.nama || String(c.id)
          )
          .filter(Boolean)
          .sort();
        
        setCommodities(names);
      } catch (e) {
        if (!mounted) return;
        console.error("Gagal load komoditas:", e);
        setError("Gagal memuat komoditas");
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadCommodities();
    
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <select 
        className={`px-3 py-2 border rounded-lg text-sm bg-white dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 disabled:opacity-50 ${className}`}
        disabled
      >
        <option>Memuat...</option>
      </select>
    );
  }

  if (error) {
    return (
      <select 
        className={`px-3 py-2 border rounded-lg text-sm bg-white dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 ${className}`}
        disabled
      >
        <option>Error: {error}</option>
      </select>
    );
  }

  return (
    <select
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      className={`px-3 py-2 border rounded-lg text-sm bg-white dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 ${className}`}
    >
      <option value="">{placeholder}</option>
      {commodities.map((name) => (
        <option key={name} value={name}>
          {name}
        </option>
      ))}
    </select>
  );
}
