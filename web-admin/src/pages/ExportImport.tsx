// src/pages/ExportImport.tsx
// Halaman untuk mengelola semua output data yang dapat diunduh, seperti export PDF dan Excel.
import React, { useState, useEffect } from 'react';
import { exportMarketExcel } from '../utils/exportExcel';
import { exportPdf } from '../utils/exportPdf';

const OutputManager = () => {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    console.log('Komponen OutputManager dirender');
  }, []);

  const handleExportExcel = async () => {
    setLoading(true);
    try {
      await exportMarketExcel();
      alert('Export Excel berhasil!');
    } catch (error) {
      console.error('Error saat export Excel:', error);
      alert('Export Excel gagal!');
    } finally {
      setLoading(false);
    }
  };

  const handleExportPdf = async () => {
    setLoading(true);
    try {
      await exportPdf();
      alert('Export PDF berhasil!');
    } catch (error) {
      console.error('Error saat export PDF:', error);
      alert('Export PDF gagal!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1>Output Manager</h1>
      <p>Kelola semua output data yang dapat diunduh.</p>
      <button onClick={handleExportExcel} disabled={loading}>
        {loading ? 'Mengunduh...' : 'Export Excel'}
      </button>
      <button onClick={handleExportPdf} disabled={loading}>
        {loading ? 'Mengunduh...' : 'Export PDF'}
      </button>
    </div>
  );
};

export default OutputManager;
