
import React from 'react';
import { Home, Search, PlusCircle, User, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';

export type BottomNavItem = {
    title: string;
    url: string;
    icon: React.ElementType;
};

type BottomNavProps = {
    items: BottomNavItem[];
    pathname: string;
};

export function BottomNav({ items, pathname }: BottomNavProps) {
    const isActive = (url: string) => (url === '/' ? pathname === '/' : pathname.startsWith(url));


    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 h-16 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 md:hidden safe-area-pb">
            <div className="grid grid-cols-4 h-full">
                {items.map((item) => (
                    <a
                        key={item.url}
                        href={item.url}
                        className={cn(
                            "flex flex-col items-center justify-center gap-1 transition-colors relative",
                            isActive(item.url)
                                ? "text-green-600 dark:text-green-400"
                                : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
                        )}
                    >
                        {isActive(item.url) && (
                            <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-green-600 rounded-b-full shadow-[0_0_8px_rgba(22,163,74,0.5)]" />
                        )}
                        <item.icon className={cn("h-6 w-6", isActive(item.url) && "animate-in zoom-in-50 duration-200")} />
                        <span className="text-[10px] font-medium">{item.title}</span>
                    </a>
                ))}
            </div>
        </nav>
    );
}
