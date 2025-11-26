// src/components/FilterBar.tsx
import React from "react";
import { Calendar } from "lucide-react";
import type { SortKey } from "../constants/sort";
import { SORT_OPTIONS } from "../constants/sort";

type Market = { id: number; nama_pasar: string };

type Props = {
  allDates: boolean;
  setAllDates: (v: boolean) => void;

  startDate: string;
  setStartDate: (v: string) => void;

  endDate: string;
  setEndDate: (v: string) => void;

  markets: Market[];
  selectedMarketId: number | "all";
  setSelectedMarketId: (v: number | "all") => void;

  sort: SortKey;
  setSort: (v: SortKey) => void;
};

const FilterBar: React.FC<Props> = ({
  allDates,
  setAllDates,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  markets,
  selectedMarketId,
  setSelectedMarketId,
  sort,
  setSort,
}) => {
  return (
    <section className="bg-white border-b border-gray-200 px-8 py-4">
      <div className="flex items-center gap-4 flex-wrap">

        {/* Semua tanggal */}
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={allDates}
            onChange={(e) => setAllDates(e.target.checked)}
          />
          <span className="text-sm text-gray-700">Semua tanggal</span>
        </label>

        {/* Rentang tanggal */}
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-500" />
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            disabled={allDates}
            className="px-3 py-2 border rounded-lg text-sm disabled:opacity-50"
            aria-label="Tanggal mulai"
          />
          <span className="text-gray-500">-</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            disabled={allDates}
            className="px-3 py-2 border rounded-lg text-sm disabled:opacity-50"
            aria-label="Tanggal akhir"
          />
        </div>

        {/* Dropdown Pasar */}
        <select
          value={selectedMarketId}
          onChange={(e) => {
            const v = e.target.value;
            setSelectedMarketId(v === "all" ? "all" : Number(v));
          }}
          className="px-3 py-2 border rounded-lg text-sm"
          aria-label="Pilih pasar"
        >
          <option value="all">Semua Pasar</option>
          {markets.map((m) => (
            <option key={m.id} value={m.id}>
              {m.nama_pasar}
            </option>
          ))}
        </select>

        {/* Sort */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Urut:</span>
          <select
            className="px-3 py-2 border rounded-lg text-sm"
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            aria-label="Urutkan tanggal"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </section>
  );
};

export default FilterBar;
