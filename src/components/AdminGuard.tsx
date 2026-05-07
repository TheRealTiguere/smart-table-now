import { useNavigate } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { useAdmin } from "@/lib/admin-auth";

export function AdminGuard({ children }: { children: ReactNode }) {
  const { isAdmin, ready } = useAdmin();
  const navigate = useNavigate();

  useEffect(() => {
    if (ready && !isAdmin) navigate({ to: "/admin/login" });
  }, [ready, isAdmin, navigate]);

  if (!ready || !isAdmin) {
    return <div className="min-h-screen bg-background" />;
  }
  return <>{children}</>;
}
