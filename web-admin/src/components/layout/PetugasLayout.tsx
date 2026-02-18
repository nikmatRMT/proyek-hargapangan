// Simple layout for petugas (no sidebar, mobile-like UI)
import React, { useState, useEffect } from 'react';
import { LogOut, Moon, Sun, User, PlusCircle, User as UserIcon } from 'lucide-react';
import { API_BASE, logoutWeb } from '@/api';
import { withMeAvatar } from '@/lib/avatar';
import { BottomNav } from './BottomNav';

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
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      return saved === 'dark';
    }
    return false;
  });
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '/';

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

  const petugasNavItems = [
    { title: 'Input', url: '/input-data', icon: PlusCircle },
    { title: 'Profil', url: '/profile', icon: UserIcon },
  ];

  return (
    <div className={`min-h-screen ${isDarkMode ? 'dark bg-gray-900' : 'bg-gray-50'}`}>
      {/* Header - Mobile Optimized */}
      {/* Header - Mobile Optimized (Admin Style Match) */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md shadow-sm border-b border-gray-200 dark:border-gray-800 transition-colors duration-300">
        <div className="container mx-auto px-4 h-16 max-w-6xl">
          <div className="flex items-center justify-between h-full">
            {/* Logo & Title */}
            <button
              onClick={() => {
                window.history.pushState({}, '', '/input-data');
                window.dispatchEvent(new PopStateEvent('popstate'));
              }}
              className="flex items-center gap-3 hover:opacity-80 transition-opacity min-w-0"
            >
              <div className="h-8 w-8 sm:h-9 sm:w-9 flex-shrink-0">
                <img src="/logo.png" alt="Logo" className="h-full w-full object-contain drop-shadow-sm" />
              </div>
              <div className="text-left min-w-0">
                <h1 className="text-base font-bold tracking-tight text-gray-900 dark:text-gray-100 truncate">HARPA BANUA</h1>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium hidden sm:block">Input Data Harga Pangan</p>
              </div>
            </button>

            {/* User Info & Actions */}
            <div className="flex items-center gap-2">
              {/* User Avatar */}
              <button
                onClick={navigateToProfile}
                className="flex items-center gap-2 pl-2 pr-1.5 py-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors border border-transparent hover:border-gray-200 dark:hover:border-gray-700"
                title="Profil"
              >
                <div className="text-right hidden sm:block">
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 block truncate max-w-24 leading-none">{displayName}</span>
                  <span className="text-[10px] text-gray-500 dark:text-gray-400">Petugas</span>
                </div>
                {avatarUrl ? (
                  <img
                    key={tick}
                    src={avatarUrl}
                    className="h-8 w-8 rounded-full object-cover ring-2 ring-white dark:ring-gray-800 shadow-sm"
                    alt={displayName}
                  />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 text-white grid place-items-center font-bold text-xs shadow-sm ring-2 ring-white dark:ring-gray-800">
                    {initial}
                  </div>
                )}
              </button>

              {/* Dark Mode Toggle */}
              <button
                onClick={toggleDarkMode}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors"
                title={isDarkMode ? 'Mode Cerah' : 'Mode Gelap'}
              >
                {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 transition-colors"
                title="Keluar"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-0 sm:px-4 py-4 sm:py-8 max-w-6xl min-h-[calc(100vh-140px)] pb-20">
        {children}
      </main>

      {/* Mobile Bottom Navigation - Petugas specific */}
      <div className="md:hidden">
        <BottomNav items={petugasNavItems} pathname={pathname} />
      </div>

      {/* Footer */}
      <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 mt-auto md:block hidden">
        <div className="container mx-auto px-4 py-4 sm:py-6 max-w-6xl">
          <div className="text-center">
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 font-medium">
              © 2025 HARPA BANUA - Dinas Ketahanan Pangan Banjarbaru
            </p>
            <p className="text-xs text-gray-500 mt-1 hidden sm:block">
              Sistem Monitoring Harga Pangan Strategis
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
