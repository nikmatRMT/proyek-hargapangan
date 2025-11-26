'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Role } from '@/types';

type User = {
  id: number;
  name: string;
  username: string;
  role: Role;
};

type AuthContextType = {
  user: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  // Simulasi ambil user dari localStorage
  useEffect(() => {
    const saved = localStorage.getItem('user');
    if (saved) setUser(JSON.parse(saved));
  }, []);

  // Login sederhana (dummy) — nanti bisa kamu sambungkan ke API-mu
  const login = async (username: string, password: string) => {
    // Contoh: username & password diambil dari DB users
    if (username === 'superadmin' && password === 'password') {
      const u = { id: 1, name: 'Super Admin', username, role: 'super_admin' as Role };
      localStorage.setItem('user', JSON.stringify(u));
      setUser(u);
      return true;
    }
    if (username === 'admin' && password === 'password') {
      const u = { id: 2, name: 'Admin DKP3', username, role: 'admin' as Role };
      localStorage.setItem('user', JSON.stringify(u));
      setUser(u);
      return true;
    }
    if (username === 'petugas' && password === 'password') {
      const u = { id: 3, name: 'Petugas Lapangan', username, role: 'petugas' as Role };
      localStorage.setItem('user', JSON.stringify(u));
      setUser(u);
      return true;
    }
    return false;
  };

  const logout = () => {
    localStorage.removeItem('user');
    setUser(null);
    window.location.href = '/'; // arahkan ke login page
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
