'use client';
import React, { createContext, useContext, useMemo, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

// ================================
// AvatarBridge: single source of truth
// ================================
type Key = `me` | `user:${number}`;
type Ctx = {
  // naikkan versi cache utk "me" / user tertentu → memaksa refresh src
  bumpMe: () => void;
  bumpUser: (userId: number) => void;
  // utility buat bikin URL final dengan versi
  resolve: (rawSrc: string | null | undefined, key: Key) => string | undefined;
};

const AvatarCtx = createContext<Ctx | null>(null);

export function AvatarBridgeProvider({ children }: { children: React.ReactNode }) {
  // simpan versi cache per key (me, user:ID)
  const [verMap, setVerMap] = useState<Map<Key, number>>(new Map());

  const bump = (key: Key) => {
    setVerMap(prev => {
      const next = new Map(prev);
      next.set(key, (prev.get(key) ?? 0) + 1);
      return next;
    });
  };

  const ctx = useMemo<Ctx>(() => ({
    bumpMe: () => bump('me'),
    bumpUser: (userId: number) => bump(`user:${userId}`),
    resolve: (raw, key) => {
      if (!raw) return undefined;
      // tambahkan ?v= untuk bust cache per key
      const v = verMap.get(key) ?? 0;
      // hindari duplikasi v jika sudah ada querystring
      const sep = raw.includes('?') ? '&' : '?';
      return `${raw}${sep}v=${v}`;
    },
  }), [verMap]);

  return <AvatarCtx.Provider value={ctx}>{children}</AvatarCtx.Provider>;
}

export function useAvatarBridge() {
  const v = useContext(AvatarCtx);
  if (!v) throw new Error('useAvatarBridge must be used within AvatarBridgeProvider');
  return v;
}

// ================================
// Komponen avatar serbaguna
// ================================
type UserAvatarProps = {
  /** pakai 'me' untuk avatar akun yang sedang login (sidebar/header) */
  kind?: 'me' | 'user';
  /** wajib kalau kind='user' */
  userId?: number;
  /** URL foto dari server, contoh: "/uploads/avatar/u5-1728822.webp" */
  src?: string | null;
  /** nama untuk fallback inisial */
  name?: string | null;
  /** ukuran (px) */
  size?: number; // default 40
  className?: string;
  title?: string;
};

export function UserAvatar({
  kind = 'me',
  userId,
  src,
  name,
  size = 40,
  className,
  title,
}: UserAvatarProps) {
  const { resolve } = useAvatarBridge();

  const key: Key = kind === 'me'
    ? 'me'
    : (`user:${userId ?? 0}`);

  const finalSrc = resolve(src ?? undefined, key);
  const initials = (name || 'U')
    .split(' ')
    .filter(Boolean)
    .map(s => s[0]?.toUpperCase() || '')
    .join('')
    .slice(0, 2) || 'U';

  return (
    <Avatar className={className} style={{ width: size, height: size }} title={title}>
      {/* AvatarImage akan pakai cache-busting ?v= */}
      <AvatarImage src={finalSrc} alt={name ?? 'avatar'} />
      <AvatarFallback>{initials}</AvatarFallback>
    </Avatar>
  );
}
