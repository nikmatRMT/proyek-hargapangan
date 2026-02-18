
import React, { useState, useEffect, useMemo } from 'react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarFooter,
  SidebarInset,
} from './sidebar';
import { cn } from '@/lib/utils';
import {
  BarChart3, Users, Settings, Home, User as UserIcon,
  LogOut, Database, ClipboardList, FileSpreadsheet, History,
  LayoutDashboard, ShoppingBag, FolderArchive
} from 'lucide-react';
import { API_BASE, logoutWeb } from '@/api';
import { withMeAvatar } from '@/lib/avatar';
import { Header } from './Header';
import { BottomNav } from './BottomNav';

type Role = 'super_admin' | 'admin' | 'petugas';

type MenuItem = {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  requiredRole?: Role[];
};

type MenuGroup = {
  label: string;
  items: MenuItem[];
};

const MENU_GROUPS: MenuGroup[] = [
  {
    label: 'Overview',
    items: [
      { title: 'Dashboard', url: '/', icon: LayoutDashboard, requiredRole: ['admin', 'super_admin'] },
    ]
  },
  {
    label: 'Data Management',
    items: [
      { title: 'Pasar', url: '/markets', icon: ShoppingBag, requiredRole: ['admin', 'super_admin'] },
      { title: 'Komoditas', url: '/commodities', icon: BarChart3, requiredRole: ['admin', 'super_admin'] },
      { title: 'Input Data', url: '/input-data', icon: ClipboardList, requiredRole: ['petugas'] },
    ]
  },
  {
    label: 'User Management',
    items: [
      { title: 'Kelola Petugas', url: '/users', icon: Users, requiredRole: ['admin', 'super_admin'] },
      { title: 'Riwayat Petugas', url: '/riwayat-petugas', icon: History, requiredRole: ['admin', 'super_admin'] },
      { title: 'Profil Saya', url: '/profile', icon: UserIcon },
    ]
  },
  {
    label: 'Output & System',
    items: [
      { title: 'Output Manager', url: '/output-manager', icon: FileSpreadsheet, requiredRole: ['admin', 'super_admin'] },
      { title: 'Backup & Storage', url: '/backup', icon: FolderArchive, requiredRole: ['admin', 'super_admin'] },
      { title: 'Pengaturan', url: '/settings', icon: Settings, requiredRole: ['super_admin'] },
    ]
  }
];

function readAuthUser() {
  if (typeof window === 'undefined') return null;
  try {
    const s = localStorage.getItem('auth_user');
    return s ? JSON.parse(s) : null;
  } catch {
    return null;
  }
}

async function fetchMe() {
  try {
    const res = await fetch(`${API_BASE}/api/me`, {
      credentials: 'include',
    });
    const ct = res.headers.get('content-type') || '';
    const text = await res.text();
    const data = ct.includes('application/json') && text ? JSON.parse(text) : {};
    if (!res.ok) return null;
    return data?.user || data?.data || data || null;
  } catch {
    return null;
  }
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [me, setMe] = useState<any>(() => readAuthUser());
  const [tick, setTick] = useState(0);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark';
    }
    return false;
  });
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '/';

  const toggleDarkMode = () => {
    setIsDarkMode(prev => {
      const newMode = !prev;
      localStorage.setItem('theme', newMode ? 'dark' : 'light');
      return newMode;
    });
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (isDarkMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, [isDarkMode]);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      const needHydrate = !me || !me.foto || !me.nama_lengkap || !me.role || !me.username;
      if (needHydrate) {
        const fresh = await fetchMe();
        if (fresh && isMounted) {
          setMe(fresh);
          try { localStorage.setItem('auth_user', JSON.stringify(fresh)); } catch { }
          setTick((x) => x + 1);
        }
      }
    })();
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'auth_user') setMe(readAuthUser());
    };
    window.addEventListener('storage', onStorage);
    const onBump = () => setTick((x) => x + 1);
    // @ts-ignore
    window.addEventListener('avatar:bumped', onBump);
    return () => {
      window.removeEventListener('storage', onStorage);
      // @ts-ignore
      window.removeEventListener('avatar:bumped', onBump);
    };
  }, []);

  const displayName: string = me?.nama_lengkap || me?.name || me?.username || 'Admin Demo';
  const role: Role = (me?.role || 'admin') as Role;
  const isActive = (url: string) => (url === '/' ? pathname === '/' : pathname.startsWith(url));

  // Filter groups based on role
  const filteredGroups = useMemo(() => {
    return MENU_GROUPS.map(group => ({
      ...group,
      items: group.items.filter(item => !item.requiredRole || item.requiredRole.includes(role))
    })).filter(group => group.items.length > 0);
  }, [role]);

  async function doLogout() {
    try { await logoutWeb(); } catch { }
    localStorage.removeItem('auth_user'); // ⬅️ FORCE CLEAR
    window.location.href = '/login';
  }

  return (
    <SidebarProvider defaultOpen={sidebarOpen} open={sidebarOpen} onOpenChange={setSidebarOpen}>
      <div className="flex min-h-screen w-full bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
        <Sidebar className="border-r border-border bg-sidebar h-screen sticky top-0 hidden md:flex md:flex-col md:bg-white dark:md:bg-gray-900">
          <SidebarHeader className="h-16 flex items-center px-4 border-b border-sidebar-border">
            <div className="flex items-center gap-2 font-bold text-xl text-green-600 dark:text-green-400">
              <div className="h-8 w-8 flex-shrink-0">
                <img src="/logo.png" alt="Logo" className="h-full w-full object-contain" />
              </div>
              <span className="hidden group-data-[collapsible=icon]:hidden md:inline-block">
                HARPA BANUA
              </span>
            </div>
          </SidebarHeader>

          <SidebarContent className="p-2 gap-1 overflow-y-auto custom-scrollbar">
            {filteredGroups.map((group, idx) => (
              <SidebarGroup key={group.label} className={idx > 0 ? "mt-2" : ""}>
                <SidebarGroupLabel className="text-muted-foreground uppercase text-[10px] font-bold tracking-wider px-2 mb-1 group-data-[collapsible=icon]:hidden">
                  {group.label}
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {group.items.map((item) => (
                      <SidebarMenuItem key={item.url}>
                        <SidebarMenuButton
                          asChild
                          isActive={isActive(item.url)}
                          tooltip={item.title}
                          className={cn(
                            "transition-all duration-200 rounded-lg px-3 py-2",
                            isActive(item.url)
                              ? "bg-green-50 text-green-700 font-medium dark:bg-green-900/20 dark:text-green-400"
                              : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
                          )}
                        >
                          <a href={item.url} className="flex items-center gap-3">
                            <item.icon className={cn("h-5 w-5", isActive(item.url) ? "text-green-600 dark:text-green-400" : "text-gray-500")} />
                            <span>{item.title}</span>
                            {isActive(item.url) && (
                              <div className="ml-auto w-1.5 h-1.5 rounded-full bg-green-500 group-data-[collapsible=icon]:hidden" />
                            )}
                          </a>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            ))}
          </SidebarContent>

          <SidebarFooter className="p-4 border-t border-sidebar-border gap-2 group-data-[collapsible=icon]:hidden">
            <div className="rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-4 border border-green-100 dark:border-green-900/30">
              <div className="flex items-center gap-2 mb-1">
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
                <span className="text-xs font-medium text-green-800 dark:text-green-300">System Online</span>
              </div>
              <p className="text-[10px] text-green-600/80 dark:text-green-400/80">
                Data disinkronisasi otomatis
              </p>
            </div>
          </SidebarFooter>
        </Sidebar>

        <SidebarInset className="flex-1 flex flex-col min-h-screen transition-all duration-300">
          <Header
            user={me}
            isDarkMode={isDarkMode}
            toggleDarkMode={toggleDarkMode}
            onLogout={doLogout}
          />

          <main className="flex-1 p-4 md:p-6 space-y-6 overflow-x-hidden md:container md:max-w-7xl md:mx-auto w-full pb-20 md:pb-6">
            {children}
          </main>

          {/* Mobile Bottom Navigation */}
          <div className="md:hidden fixed bottom-0 left-0 right-0 z-50">
            <BottomNav
              items={filteredGroups.flatMap(g => g.items).slice(0, 4)}
              pathname={pathname}
            />
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
