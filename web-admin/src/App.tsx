// src/App.tsx
import React, { useEffect, useRef, useState } from "react";
import Dashboard from "./pages/Dashboard";
import Users from "./pages/Users";
import Profile from "./pages/Profile";
import Backup from "./pages/Backup";
import Login from "./pages/Login";
import { AppShell } from "./components/layout/AppShell";
import { bumpMe } from "./lib/avatar"; // ⬅️ tambah

const App = () => {
  const [path, setPath] = useState(window.location.pathname);
  const [authUser, setAuthUser] = useState<any>(() => {
    try { return JSON.parse(localStorage.getItem('auth_user') || 'null'); } catch { return null; }
  });

  // simpan foto lama utk deteksi perubahan
  const prevFotoRef = useRef<string | null>(authUser?.foto ?? null);

  // pantau back/forward
  useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // sinkron localStorage (login/logout, ganti foto, dsb.)
  useEffect(() => {
    const id = setInterval(() => {
      try {
        const v = JSON.parse(localStorage.getItem('auth_user') || 'null');

        // deteksi ganti user/login state
        const userChanged = (v && !authUser) || (!v && authUser) || (v && authUser && v?.id !== authUser?.id);
        const fotoChanged = (v?.foto ?? null) !== (prevFotoRef.current ?? null);

        if (userChanged || fotoChanged) {
          setAuthUser(v);
          // kalau foto akun login berubah, paksa bust cache avatar "me" di seluruh app
          if (fotoChanged) {
            prevFotoRef.current = v?.foto ?? null;
            bumpMe(); // ⬅️ kunci: hanya avatar "me" yang dibump
          }
        }
      } catch {}
    }, 300);
    return () => clearInterval(id);
  }, [authUser]);

  // Jika belum login dan bukan di /login → paksa ke /login
  useEffect(() => {
    if (!authUser && path !== "/login") {
      sessionStorage.setItem('post_login_redirect', path || "/");
      window.history.replaceState({}, "", "/login");
      setPath("/login");
    }
  }, [authUser, path]);

  // Kalau di /login dan sudah login → arahkan ke tujuan awal (atau '/')
  useEffect(() => {
    if (authUser && path === "/login") {
      const dest = sessionStorage.getItem('post_login_redirect') || "/";
      sessionStorage.removeItem('post_login_redirect');
      window.history.replaceState({}, "", dest);
      setPath(dest);
    }
  }, [authUser, path]);

  // Render khusus untuk /login (tanpa AppShell)
  if (path === "/login") {
    return <Login />;
  }

  // Halaman lain dibungkus AppShell
  return (
    <AppShell>
      {path === "/" && <Dashboard />}
      {path === "/users" && <Users />}
      {path === "/profile" && <Profile />}
      {path === "/backup" && <Backup />}
    </AppShell>
  );
};

export default App;
