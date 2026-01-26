import React, { useState } from "react";
import type { Layout } from "@/hooks/useColumnLayout";

type Props = {
  defaults: Layout;
  layout: Layout;
  onChange: (next: Layout) => void;
  onClose: () => void;
  onReset: () => void;
};

export default function ColumnSettings({ defaults, layout, onChange, onClose, onReset }: Props) {
  const [local, setLocal] = useState<Layout>({ ...layout });

  const handleChange = (key: string, raw: string) => {
    const v = Number(raw.replace(/[^^\d.]/g, ""));
    setLocal((s) => ({ ...s, [key]: Number.isFinite(v) ? v : 0 }));
  };

  const apply = () => {
    const sum = Object.values(local).reduce((a, b) => a + (b || 0), 0);
    if (sum <= 0) {
      onChange(defaults);
    } else {
      onChange(local);
    }
    onClose();
  };

  return (
    <div className="p-3 bg-white border rounded shadow-md w-[360px]">
      <div className="flex items-center justify-between mb-2">
        <strong>Atur lebar kolom</strong>
        <button className="text-sm text-gray-500" onClick={onClose}>Tutup</button>
      </div>

      <div className="space-y-2 max-h-72 overflow-auto">
        {Object.keys(local).map((k) => (
          <div key={k} className="flex items-center gap-2">
            <div className="flex-1 text-sm">{k}</div>
            <input
              type="number"
              min={0}
              max={100}
              value={local[k] as number}
              onChange={(e) => handleChange(k, e.target.value)}
              className="w-20 px-2 py-1 border rounded text-sm"
            />
            <span className="text-xs text-gray-500">%</span>
          </div>
        ))}
      </div>

      <div className="flex gap-2 justify-end mt-3">
        <button className="px-2 py-1 text-sm border rounded" onClick={() => { setLocal(defaults); onReset(); }}>
          Reset
        </button>
        <button className="px-3 py-1 bg-blue-600 text-white rounded text-sm" onClick={apply}>
          Simpan
        </button>
      </div>
    </div>
  );
}
