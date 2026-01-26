'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarInset,
} from './sidebar';
import { BarChart3, Users, Settings, Home, User as UserIcon, LogOut, Database, Sun, Moon, ClipboardList, FileSpreadsheet, History } from 'lucide-react';
import { API_BASE, logoutWeb } from '@/api';
import { withMeAvatar } from '@/lib/avatar';

type Role = 'super_admin' | 'admin' | 'petugas';

type MenuItem = {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  requiredRole?: Role[];
};

const MENU: MenuItem[] = [
  { title: 'Dashboard', url: '/', icon: Home, requiredRole: ['admin', 'super_admin'] },
  { title: 'Pasar', url: '/markets', icon: Database, requiredRole: ['admin', 'super_admin'] },
  { title: 'Komoditas', url: '/commodities', icon: BarChart3, requiredRole: ['admin', 'super_admin'] },
  { title: 'Output Manager', url: '/output-manager', icon: FileSpreadsheet, requiredRole: ['admin', 'super_admin'] },
  { title: 'Input Data', url: '/input-data', icon: ClipboardList, requiredRole: ['petugas'] },
  { title: 'Riwayat Petugas', url: '/riwayat-petugas', icon: History, requiredRole: ['admin', 'super_admin'] },
  { title: 'Kelola Petugas', url: '/users', icon: Users, requiredRole: ['admin', 'super_admin'] },
  { title: 'Backup & Storage', url: '/backup', icon: Database, requiredRole: ['admin', 'super_admin'] },
  { title: 'Profil Saya', url: '/profile', icon: UserIcon },
  { title: 'Pengaturan', url: '/settings', icon: Settings, requiredRole: ['super_admin'] },
];

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
    // bentuk respons fleksibel: {user:{...}} | {data:{...}} | {...}
    return data?.user || data?.data || data || null;
  } catch {
    return null;
  }
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [me, setMe] = useState<any>(() => readAuthUser());
  const [tick, setTick] = useState(0); // force re-render untuk avatar cache-busting
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark';
    }
    return false;
  });
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '/';

  // Toggle dark mode
  const toggleDarkMode = () => {
    setIsDarkMode(prev => {
      const newMode = !prev;
      localStorage.setItem('theme', newMode ? 'dark' : 'light');
      return newMode;
    });
  };

  // Apply theme to document
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (isDarkMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, [isDarkMode]);

  // Hydrate user dari /api/me setelah mount bila data localStorage belum lengkap (terutama foto)
  useEffect(() => {
    let isMounted = true;
    (async () => {
      const needHydrate =
        !me || !me.foto || !me.nama_lengkap || !me.role || !me.username;
      if (needHydrate) {
        const fresh = await fetchMe();
        if (fresh && isMounted) {
          setMe(fresh);
          try { localStorage.setItem('auth_user', JSON.stringify(fresh)); } catch { }
          setTick((x) => x + 1); // refresh avatar ?v=
        }
      }
    })();
    return () => { isMounted = false; };
    // hanya saat mount / saat 'me' awalnya kosong atau minim
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // sinkron saat localStorage('auth_user') berubah (mis. dari Login/Profile)
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'auth_user') setMe(readAuthUser());
    };
    window.addEventListener('storage', onStorage);
    // re-render saat bump avatar (setelah upload foto)
    const onBump = () => setTick((x) => x + 1);
    // @ts-ignore custom event
    window.addEventListener('avatar:bumped', onBump);
    return () => {
      window.removeEventListener('storage', onStorage);
      // @ts-ignore
      window.removeEventListener('avatar:bumped', onBump);
    };
  }, []);

  const displayName: string =
    me?.nama_lengkap || me?.name || me?.username || 'Admin Demo';
  const role: Role = (me?.role || 'admin') as Role;
  const initial = String(displayName || 'A').charAt(0).toUpperCase();
  const avatarUrl = withMeAvatar(me?.foto || null); // ABSOLUTE + ?v=

  const filteredMenu = useMemo(
    () => MENU.filter((m) => !m.requiredRole || m.requiredRole.includes(role)),
    [role]
  );
  const isActive = (url: string) => (url === '/' ? pathname === '/' : pathname.startsWith(url));
  const roleColor =
    role === 'super_admin'
      ? 'bg-red-100 text-red-800'
      : role === 'admin'
        ? 'bg-blue-100 text-blue-800'
        : 'bg-green-100 text-green-800';
  const roleLabel =
    role === 'super_admin' ? 'Super Admin' : role === 'admin' ? 'Admin' : 'Petugas';

  async function doLogout() {
    try { await logoutWeb(); } catch { }
    try { localStorage.removeItem('auth_user'); } catch { }
    window.location.href = '/login';
  }

  return (
    <SidebarProvider defaultOpen>
      <div className="flex h-screen w-full bg-gray-50 overflow-hidden">
        {/* Sidebar */}
        {sidebarOpen && (
          <Sidebar className={cn(
            "border-r shadow-lg transition-colors duration-300",
            isDarkMode
              ? "border-gray-700 bg-gradient-to-b from-gray-800 to-gray-900 text-gray-100"
              : "border-green-200 bg-gradient-to-b from-green-600 to-green-700 text-white"
          )}>
            <SidebarHeader className={cn(
              "border-b transition-colors duration-300",
              isDarkMode
                ? "border-gray-700 bg-gray-800/50"
                : "border-green-500/30 bg-green-600/50"
            )}>
              <div className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="flex items-center gap-2">
                  <img src="/logo.png" alt="HARPA Logo" className="h-10 w-10 rounded-lg shadow-md" />
                  <div>
                    <div className={cn(
                      "text-sm font-bold leading-none",
                      isDarkMode ? "text-gray-100" : "text-white"
                    )}>HARPA</div>
                    <div className={cn(
                      "text-xs",
                      isDarkMode ? "text-gray-300" : "text-green-50"
                    )}>Harga Pangan Banjarbaru Aktual</div>
                  </div>
                </div>

                <button
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    "rounded-md px-2 py-1 text-sm transition-colors",
                    isDarkMode
                      ? "text-gray-100 hover:bg-gray-700/50"
                      : "text-white hover:bg-green-500/30"
                  )}
                  title="Tutup Sidebar"
                >
                  Tutup
                </button>
              </div>
            </SidebarHeader>

            <SidebarContent className={cn(
              "transition-colors duration-300",
              isDarkMode
                ? "bg-gradient-to-b from-gray-800 to-gray-900"
                : "bg-gradient-to-b from-green-600 to-green-700"
            )}>
              <SidebarGroup>
                <SidebarGroupLabel className={cn(
                  "px-4 py-2 text-xs font-semibold uppercase tracking-wide",
                  isDarkMode ? "text-gray-400" : "text-green-100"
                )}>
                  Menu Utama
                </SidebarGroupLabel>

                <SidebarGroupContent>
                  <SidebarMenu className="px-2">
                    {filteredMenu.map((item) => (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                          asChild
                          className={cn(
                            'transition-colors',
                            isDarkMode
                              ? 'text-gray-100 hover:bg-gray-700/50'
                              : 'text-white hover:bg-green-500/30',
                            isActive(item.url) && (isDarkMode
                              ? 'bg-gray-700 font-medium'
                              : 'bg-green-500/50 font-medium')
                          )}
                        >
                          <a href={item.url}>
                            <div className="flex items-center gap-3">
                              <item.icon className="h-5 w-5" />
                              <span>{item.title}</span>
                            </div>
                          </a>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>

            <SidebarFooter className={cn(
              "border-t p-3 transition-colors duration-300",
              isDarkMode
                ? "border-gray-700 bg-gray-800"
                : "border-gray-200 bg-gray-100"
            )}>
              <SidebarMenu>
                <SidebarMenuItem>
                  <div className={cn(
                    "flex items-center gap-3 px-2 py-2 rounded-md transition-colors",
                    isDarkMode
                      ? "hover:bg-gray-700"
                      : "hover:bg-gray-200"
                  )}>
                    {avatarUrl ? (
                      <img
                        key={tick}
                        src={avatarUrl}
                        className="h-9 w-9 rounded-full object-cover border"
                        alt={displayName}
                      />
                    ) : (
                      <div className="h-9 w-9 rounded-full bg-green-600 text-white grid place-items-center">
                        {initial}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className={cn(
                        "text-sm font-medium truncate",
                        isDarkMode ? "text-gray-100" : "text-gray-900"
                      )}>{displayName}</div>
                      <span className={cn('mt-0.5 inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium', roleColor)}>
                        {roleLabel}
                      </span>
                    </div>
                    <button
                      onClick={doLogout}
                      className={cn(
                        "ml-2 inline-flex items-center gap-2 rounded-md px-2 py-1 text-sm transition-colors",
                        isDarkMode
                          ? "text-red-400 hover:bg-red-900/20"
                          : "text-red-600 hover:bg-red-50"
                      )}
                      title="Logout"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Logout</span>
                    </button>
                  </div>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarFooter>
          </Sidebar>
        )}

        {/* Konten */}
        <SidebarInset className={cn('flex-1 w-full transition-all duration-300', sidebarOpen ? 'pl-2' : 'pl-0')}>
          {!sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(true)}
              className="fixed left-3 top-3 z-50 rounded-md border border-gray-300 bg-white p-2 shadow hover:bg-gray-100"
              title="Buka Sidebar"
            >
              <BarChart3 className="h-5 w-5 text-gray-700" />
            </button>
          )}

          {/* Header */}
          <header className={cn(
            "border-b transition-colors duration-300",
            isDarkMode
              ? "bg-gray-800 border-gray-700"
              : "bg-white border-gray-200"
          )}>
            <div className="flex items-center justify-between px-6 py-3">
              <nav className={cn(
                "text-sm transition-colors",
                isDarkMode ? "text-gray-400" : "text-gray-600"
              )}>
                <a
                  href="/"
                  className={cn(
                    "hover:text-green-600 transition-colors",
                    isDarkMode ? "text-gray-400 hover:text-green-400" : ""
                  )}
                >Dashboard</a>
                <span className={cn(
                  "mx-2",
                  isDarkMode ? "text-gray-600" : "text-gray-400"
                )}>  /</span>
                <span className={cn(
                  "font-medium",
                  isDarkMode ? "text-gray-100" : "text-gray-900"
                )}>
                  {pathname === '/' ? 'Dashboard' : pathname.replace('/', '')}
                </span>
              </nav>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className={cn(
                    "text-sm font-medium",
                    isDarkMode ? "text-gray-100" : "text-gray-900"
                  )}>{displayName}</p>
                  <p className={cn(
                    "text-xs capitalize",
                    isDarkMode ? "text-gray-400" : "text-gray-500"
                  )}>{(role || '').replace('_', ' ')}</p>
                </div>
                {avatarUrl ? (
                  <img
                    key={tick}
                    src={avatarUrl}
                    className="h-9 w-9 rounded-full object-cover border"
                    alt={displayName}
                  />
                ) : (
                  <div className="h-9 w-9 rounded-full bg-green-600 text-white grid place-items-center">
                    {initial}
                  </div>
                )}
              </div>
            </div>
          </header>

          <div className={cn(
            "app-shell-full w-full h-full overflow-y-auto p-6 transition-colors duration-300",
            isDarkMode ? "bg-gray-900 dark-mode" : "bg-gray-50"
          )}>
            {children}
          </div>

          {/* Floating Dark Mode Toggle */}
          <button
            onClick={toggleDarkMode}
            className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-gradient-to-br from-green-500 to-green-700 text-white shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-300 flex items-center justify-center group"
            title={isDarkMode ? 'Mode Cerah' : 'Mode Gelap'}
          >
            {isDarkMode ? (
              <Sun className="h-6 w-6 transition-transform group-hover:rotate-180 duration-500" />
            ) : (
              <Moon className="h-6 w-6 transition-transform group-hover:-rotate-12 duration-300" />
            )}
          </button>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
