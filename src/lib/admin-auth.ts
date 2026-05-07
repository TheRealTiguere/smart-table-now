import { useEffect, useState } from "react";

// Mot de passe admin — peut être surchargé via VITE_ADMIN_PASSWORD au déploiement.
// Self-hostable : pas de backend requis.
const ADMIN_PASSWORD = (import.meta.env.VITE_ADMIN_PASSWORD as string | undefined) ?? "tabli2026";
const KEY = "tabli-admin";

export function login(password: string): boolean {
  if (password === ADMIN_PASSWORD) {
    if (typeof window !== "undefined") localStorage.setItem(KEY, "1");
    return true;
  }
  return false;
}

export function logout() {
  if (typeof window !== "undefined") localStorage.removeItem(KEY);
}

export function isAdmin(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(KEY) === "1";
}

export function useAdmin() {
  const [ok, setOk] = useState(false);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setOk(isAdmin());
    setReady(true);
    const onStorage = () => setOk(isAdmin());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  return { isAdmin: ok, ready, refresh: () => setOk(isAdmin()) };
}
