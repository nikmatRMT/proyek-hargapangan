// Simple layout for petugas (no sidebar, mobile-like UI)
import React, { useState, useEffect } from 'react';
import { LogOut, Moon, Sun, User } from 'lucide-react';
import { API_BASE, logoutWeb } from '@/api';
import { withMeAvatar } from '@/lib/avatar';

function readAuthUser() {
  try { return JSON.parse(localStorage.getItem('auth_user') || 'null'); } catch { return null; }
}

async function fetchMe(): Promise<any | null> {
  try {
    const res = await fetch(`${API_BASE}/api/me`, { credentials: 'include' });
    const ct = (res.headers.get('content-type') || '').toLowerCase();
    const text = await res.text();
    const data = ct.includes('application/json') && text ? JSON.parse(text) : {};
    if (!res.ok) return null;
    const u = data.user || data.data || data;
    return u && u.id ? u : null;
  } catch { return null; }
}

export function PetugasLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(readAuthUser());
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved === 'dark';
  });
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  // Sync theme
  useEffect(() => {
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Fetch user data
  useEffect(() => {
    fetchMe().then(u => {
      if (u) {
        setUser(u);
        localStorage.setItem('auth_user', JSON.stringify(u));
      }
    });
  }, []);

  // Avatar with cache busting
  useEffect(() => {
    if (user?.id) {
      const url = withMeAvatar(user);
      setAvatarUrl(url);
    }
  }, [user, tick]);

  async function handleLogout() {
    if (!confirm('Yakin ingin keluar?')) return;
    try {
      await logoutWeb();
      localStorage.removeItem('auth_user');
      window.location.href = '/login';
    } catch (e) {
      console.error('Logout error:', e);
      localStorage.removeItem('auth_user');
      window.location.href = '/login';
    }
  }

  function toggleDarkMode() {
    setIsDarkMode(!isDarkMode);
  }

  const displayName = user?.nama_lengkap || user?.username || 'Petugas';
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div className={`min-h-screen ${isDarkMode ? 'dark bg-gray-900' : 'bg-gray-50'}`}>
      {/* Header - Simple & Clean */}
      <header className="bg-gradient-to-r from-green-600 to-green-700 dark:from-green-700 dark:to-green-800 text-white shadow-lg sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 max-w-4xl">
          <div className="flex items-center justify-between">
            {/* Logo & Title */}
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="Logo" className="h-10 w-10 rounded-lg shadow-md" />
              <div>
                <h1 className="text-lg font-bold">HARPA BANUA</h1>
                <p className="text-xs text-green-100">Input Data Harga Pangan</p>
              </div>
            </div>

            {/* User Info & Actions */}
            <div className="flex items-center gap-2">
              {/* User Avatar */}
              <button
                onClick={() => window.location.href = '/profile'}
                className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-green-500/30 transition-colors"
                title="Profil"
              >
                {avatarUrl ? (
                  <img
                    key={tick}
                    src={avatarUrl}
                    className="h-8 w-8 rounded-full object-cover border-2 border-white"
                    alt={displayName}
                  />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-white text-green-600 grid place-items-center font-bold text-sm">
                    {initial}
                  </div>
                )}
                <span className="text-sm font-medium hidden sm:inline">{displayName}</span>
              </button>

              {/* Dark Mode Toggle */}
              <button
                onClick={toggleDarkMode}
                className="p-2 rounded-lg hover:bg-green-500/30 transition-colors"
                title={isDarkMode ? 'Mode Cerah' : 'Mode Gelap'}
              >
                {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="p-2 rounded-lg hover:bg-red-500/30 transition-colors text-white"
                title="Keluar"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 max-w-4xl">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 mt-12">
        <div className="container mx-auto px-4 py-4 max-w-4xl text-center text-sm text-gray-600 dark:text-gray-400">
          <p>© 2025 HARPA BANUA - Dinas Ketahanan Pangan Banjarbaru</p>
        </div>
      </footer>
    </div>
  );
}
