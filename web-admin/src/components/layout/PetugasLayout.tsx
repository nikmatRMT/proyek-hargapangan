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
      try {
        const url = withMeAvatar(user?.foto || null); // ⬅️ Pass foto field, not user object
        setAvatarUrl(url || null);
      } catch (err) {
        console.error('Avatar error:', err);
        setAvatarUrl(null);
      }
    }
  }, [user, tick]);

  // Listen for avatar update events
  useEffect(() => {
    const onBump = () => setTick((t) => t + 1);
    window.addEventListener('avatar:bumped', onBump);
    return () => window.removeEventListener('avatar:bumped', onBump);
  }, []);

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

  function navigateToProfile() {
    try {
      window.history.pushState({}, '', '/profile');
      window.dispatchEvent(new PopStateEvent('popstate'));
    } catch (err) {
      console.error('Navigation error:', err);
      window.location.href = '/profile';
    }
  }

  const displayName = user?.nama_lengkap || user?.username || 'Petugas';
  const initial = (displayName || 'P').charAt(0).toUpperCase();

  return (
    <div className={`min-h-screen ${isDarkMode ? 'dark bg-gray-900' : 'bg-gray-50'}`}>
      {/* Header - Simple & Clean */}
      <header className="bg-gradient-to-r from-green-600 to-green-700 dark:from-green-700 dark:to-green-800 text-white shadow-lg sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 max-w-6xl">
          <div className="flex items-center justify-between">
            {/* Logo & Title */}
            <button
              onClick={() => {
                window.history.pushState({}, '', '/input-data');
                window.dispatchEvent(new PopStateEvent('popstate'));
              }}
              className="flex items-center gap-4 hover:opacity-80 transition-opacity"
            >
              <div className="h-12 w-12 rounded-xl bg-white/20 backdrop-blur-sm p-2 shadow-lg">
                <img src="/logo.png" alt="Logo" className="h-full w-full rounded-lg object-contain" />
              </div>
              <div className="text-left">
                <h1 className="text-xl font-bold tracking-tight">HARPA BANUA</h1>
                <p className="text-sm text-green-100 font-medium">Input Data Harga Pangan</p>
              </div>
            </button>

            {/* User Info & Actions */}
            <div className="flex items-center gap-3">
              {/* User Avatar */}
              <button
                onClick={navigateToProfile}
                className="flex items-center gap-3 px-4 py-2 rounded-xl hover:bg-green-500/30 transition-colors group"
                title="Profil"
              >
                {avatarUrl ? (
                  <img
                    key={tick}
                    src={avatarUrl}
                    className="h-10 w-10 rounded-full object-cover border-2 border-white shadow-sm group-hover:scale-105 transition-transform"
                    alt={displayName}
                  />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-white text-green-600 grid place-items-center font-bold text-base shadow-sm group-hover:scale-105 transition-transform">
                    {initial}
                  </div>
                )}
                <div className="text-left hidden sm:block">
                  <span className="text-sm font-medium block">{displayName}</span>
                  <span className="text-xs text-green-100 opacity-80">Petugas</span>
                </div>
              </button>

              {/* Dark Mode Toggle */}
              <button
                onClick={toggleDarkMode}
                className="p-3 rounded-xl hover:bg-green-500/30 transition-colors"
                title={isDarkMode ? 'Mode Cerah' : 'Mode Gelap'}
              >
                {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="p-3 rounded-xl hover:bg-red-500/30 transition-colors text-white"
                title="Keluar"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-6xl min-h-[calc(100vh-200px)]">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 mt-auto">
        <div className="container mx-auto px-4 py-6 max-w-6xl">
          <div className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
              © 2025 HARPA BANUA - Dinas Ketahanan Pangan Banjarbaru
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Sistem Monitoring Harga Pangan Strategis
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
