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
import { BarChart3, Users, Settings, Home, User as UserIcon, LogOut } from 'lucide-react';
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
  { title: 'Dashboard', url: '/', icon: Home },
  { title: 'Kelola Petugas', url: '/users', icon: Users, requiredRole: ['admin', 'super_admin'] },
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
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '/';

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
          try { localStorage.setItem('auth_user', JSON.stringify(fresh)); } catch {}
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
    try { await logoutWeb(); } catch {}
    try { localStorage.removeItem('auth_user'); } catch {}
    window.location.href = '/login';
  }

  return (
    <SidebarProvider defaultOpen>
      <div className="flex h-screen w-full bg-gray-50 overflow-hidden">
        {/* Sidebar */}
        {sidebarOpen && (
          <Sidebar className="border-r border-gray-200 bg-gray-100 text-gray-800 shadow-sm">
            <SidebarHeader className="border-b border-gray-200 bg-gray-200/80">
              <div className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="bg-white p-2 rounded-lg shadow-sm">
                    <BarChart3 className="h-7 w-7 text-green-600" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-gray-900 leading-none">HARPA</div>
                    <div className="text-xs text-gray-600">Harga Pangan Banjarbaru Aktual</div>
                  </div>
                </div>

                <button
                  onClick={() => setSidebarOpen(false)}
                  className="rounded-md px-2 py-1 text-sm hover:bg-gray-200"
                  title="Tutup Sidebar"
                >
                  Tutup
                </button>
              </div>
            </SidebarHeader>

            <SidebarContent className="bg-gray-100">
              <SidebarGroup>
                <SidebarGroupLabel className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-600">
                  Menu Utama
                </SidebarGroupLabel>

                <SidebarGroupContent>
                  <SidebarMenu className="px-2">
                    {filteredMenu.map((item) => (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                          asChild
                          className={cn('hover:bg-gray-200', isActive(item.url) && 'bg-gray-200 font-medium')}
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

            <SidebarFooter className="border-t border-gray-200 bg-gray-100 p-3">
              <SidebarMenu>
                <SidebarMenuItem>
                  <div className="flex items-center gap-3 px-2 py-2 rounded-md hover:bg-gray-200">
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
                      <div className="text-sm font-medium truncate">{displayName}</div>
                      <span className={cn('mt-0.5 inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium', roleColor)}>
                        {roleLabel}
                      </span>
                    </div>
                    <button
                      onClick={doLogout}
                      className="ml-2 inline-flex items-center gap-2 rounded-md px-2 py-1 text-sm text-red-600 hover:bg-red-50"
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
          <header className="bg-white border-b border-gray-200">
            <div className="flex items-center justify-between px-6 py-3">
              <nav className="text-sm text-gray-600">
                <a href="/" className="hover:text-gray-900">Dashboard</a>
                <span className="mx-2 text-gray-400">/</span>
                <span className="font-medium text-gray-900">
                  {pathname === '/' ? 'Dashboard' : pathname.replace('/', '')}
                </span>
              </nav>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{displayName}</p>
                  <p className="text-xs text-gray-500 capitalize">{(role || '').replace('_', ' ')}</p>
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

          <div className="app-shell-full w-full h-full overflow-y-auto bg-gray-50 p-6">
            {children}
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
