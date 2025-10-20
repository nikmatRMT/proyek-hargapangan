// src/pages/Login.tsx
'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { BarChart3, Eye, EyeOff, Shield, Mail, Lock, AlertCircle } from 'lucide-react';

type Role = 'admin' | 'petugas';

const API_BASE = (import.meta as any)?.env?.VITE_API_URL || 'http://localhost:4000';

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) setError('');
  }

  function validateForm() {
    if (!formData.username.trim()) {
      setError('Username/NIP tidak boleh kosong');
      return false;
    }
    if (!formData.password) {
      setError('Password tidak boleh kosong');
      return false;
    }
    if (formData.password.length < 6) {
      setError('Password minimal 6 karakter');
      return false;
    }
    return true;
  }

  async function doBackendLogin(username: string, password: string) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    if (!res.ok) {
      try {
        const j = await res.json();
        throw new Error(j?.message || `Login gagal (HTTP ${res.status})`);
      } catch {
        throw new Error(`Login gagal (HTTP ${res.status})`);
      }
    }

    const data = await res.json(); // { ok: true, user: {...} }
    return data;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;          // cegah double submit
    if (!validateForm()) return;

    setLoading(true);
    setError('');

    try {
      const data = await doBackendLogin(formData.username.trim(), formData.password);

      // === FIX PENTING ===
      // Simpan user ke localStorage agar App.tsx mengenali status login
      localStorage.setItem('auth_user', JSON.stringify(data?.user ?? null));

      // Redirect ke halaman target (default '/')
      const redirectTo = sessionStorage.getItem('post_login_redirect') || '/';
      // pakai full reload agar state tersinkron tanpa menyentuh router lain
      window.location.href = redirectTo;
    } catch (err: any) {
      const msg = (err?.message || '').toLowerCase();
      if (msg.includes('unauthorized') || msg.includes('401')) {
        setError('Username/NIP atau password salah');
      } else if (msg.includes('forbidden') || msg.includes('403')) {
        setError('Akses ditolak. Hubungi admin untuk memastikan akun Anda memiliki izin.');
      } else {
        setError(err?.message || 'Terjadi kesalahan saat login. Silakan coba lagi.');
      }
    } finally {
      setLoading(false);
    }
  }

  function togglePasswordVisibility() {
    setShowPassword(s => !s);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 p-4">
      <div className="w-full max-w-md">
        {/* Logo & Brand */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-gradient-to-br from-green-500 to-green-700 p-4 rounded-2xl shadow-lg">
              <BarChart3 className="h-10 w-10 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">HARPA BANUA</h1>
          <p className="text-gray-600 text-lg">Harga Pangan Banjarbaru Aktual</p>
          <p className="text-gray-500 text-sm mt-1">Sistem Monitoring Harga Pasar</p>
        </div>

        {/* Login Card */}
        <Card className="shadow-lg">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">Masuk ke Akun</CardTitle>
            <CardDescription className="text-center">
              Masukkan username/NIP dan password untuk mengakses sistem
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="username">Username / NIP</Label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <Input
                    id="username"
                    name="username"
                    type="text"
                    placeholder="Masukkan username atau NIP (18 digit)"
                    value={formData.username}
                    onChange={handleInputChange}
                    className="pl-10"
                    disabled={loading}
                    autoComplete="username"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Masukkan password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="pl-10 pr-10"
                    disabled={loading}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={togglePasswordVisibility}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    disabled={loading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-green-600 hover:bg-green-700"
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Memproses...
                  </div>
                ) : (
                  'Masuk'
                )}
              </Button>
            </form>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-card text-muted-foreground">Atau</span>
                </div>
              </div>

              <div className="mt-4 text-center">
                <a href="#" className="text-sm text-green-600 hover:text-green-800">
                  Lupa password?
                </a>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6 border-blue-200 bg-blue-50/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-600" />
              Informasi Akun
            </CardTitle>
            <CardDescription className="text-blue-800">
              Akun dibuat dan dikelola oleh Admin Dinas Ketahanan Pangan, Pertanian, dan Perikanan (DKP3) Kota Banjarbaru.
            </CardDescription>
          </CardHeader>
        </Card>

        <div className="text-center mt-6 text-sm text-gray-500">
          <p>&copy; 2025 DKP3 Banjarbaru. All rights reserved.</p>
          <p className="mt-1">
            Dikembangkan oleh <span className="font-medium text-green-600">Tim IT DKP3</span>
          </p>
        </div>
      </div>
    </div>
  );
}
