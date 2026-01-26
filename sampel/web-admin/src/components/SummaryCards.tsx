import { FileText, TrendingDown, TrendingUp } from 'lucide-react';
import React from 'react';
import { formatCurrency } from '../utils/format';

interface Props {
  total: number;
  avg: number|null;
  max: number|null;
  min: number|null;
}

const SummaryCards: React.FC<Props> = ({ total, avg, max, min }) => (
  <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
    <div className="card">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-600">Total Data</span>
        <FileText className="w-5 h-5 text-blue-600" />
      </div>
      <div className="text-2xl font-bold text-gray-900">{total}</div>
      <p className="text-xs text-gray-500 mt-1">Data harga tercatat</p>
    </div>

    <div className="card">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-600">Rata-rata Harga</span>
        <TrendingUp className="w-5 h-5 text-green-600" />
      </div>
      <div className="text-2xl font-bold text-gray-900">{avg!=null ? formatCurrency(avg) : '—'}</div>
      <p className="text-xs text-gray-500 mt-1">Semua komoditas</p>
    </div>

    <div className="card">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-600">Harga Tertinggi</span>
        <TrendingUp className="w-5 h-5 text-red-600" />
      </div>
      <div className="text-2xl font-bold text-gray-900">{max!=null ? formatCurrency(max) : '—'}</div>
      <p className="text-xs text-gray-500 mt-1">—</p>
    </div>

    <div className="card">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-600">Harga Terendah</span>
        <TrendingDown className="w-5 h-5 text-blue-600" />
      </div>
      <div className="text-2xl font-bold text-gray-900">{min!=null ? formatCurrency(min) : '—'}</div>
      <p className="text-xs text-gray-500 mt-1">—</p>
    </div>
  </div>
);

export default SummaryCards;
