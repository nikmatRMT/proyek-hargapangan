
import React from 'react';
import { Menu, Bell, Sun, Moon, LogOut, User, Settings, Search } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarTrigger } from "@/components/layout/sidebar";
import { Input } from "@/components/ui/input";
import { withMeAvatar } from '@/lib/avatar';

type HeaderProps = {
    user: any;
    isDarkMode: boolean;
    toggleDarkMode: () => void;
    onLogout: () => void;
};

export function Header({ user, isDarkMode, toggleDarkMode, onLogout }: HeaderProps) {
    const displayName = user?.nama_lengkap || user?.name || user?.username || 'Admin';
    const role = user?.role || 'admin';
    const avatarUrl = withMeAvatar(user?.foto);

    return (
        <header className="sticky top-0 z-30 flex h-16 w-full items-center gap-4 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md px-6 shadow-sm border-b border-white/20 dark:border-gray-800/50 transition-colors duration-300">
            <SidebarTrigger />

            {/* Breadcrumbs / Title Placeholder */}
            <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">Dashboard</span>
                <span className="text-gray-300">/</span>
                <span>Overview</span>
            </div>

            <div className="ml-auto flex items-center gap-4">
                {/* Dark Mode Toggle */}
                <button
                    onClick={toggleDarkMode}
                    className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-colors"
                    title={isDarkMode ? 'Mode Cerah' : 'Mode Gelap'}
                >
                    {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                </button>

                {/* User Dropdown */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button className="flex items-center gap-3 pl-3 py-1.5 pr-1.5 rounded-full hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border border-gray-100 dark:border-gray-800">
                            <div className="text-right hidden md:block">
                                <p className="text-sm font-semibold text-foreground leading-none">{displayName}</p>
                                <p className="text-xs text-muted-foreground mt-0.5 capitalize">{role.replace('_', ' ')}</p>
                            </div>
                            {avatarUrl ? (
                                <img src={avatarUrl} alt={displayName} className="h-8 w-8 rounded-full object-cover ring-2 ring-white dark:ring-gray-800 shadow-sm" />
                            ) : (
                                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white ring-2 ring-white dark:ring-gray-800 shadow-sm">
                                    {displayName.charAt(0).toUpperCase()}
                                </div>
                            )}
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 p-2">
                        <DropdownMenuLabel>Akun Saya</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="cursor-pointer" onClick={() => window.location.href = '/profile'}>
                            <User className="mr-2 h-4 w-4" />
                            <span>Profil</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="cursor-pointer text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 focus:text-red-700 focus:bg-red-50" onClick={onLogout}>
                            <LogOut className="mr-2 h-4 w-4" />
                            <span>Keluar</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    );
}
