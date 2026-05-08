import { useNavigate, useLocation } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { useMe } from "@/lib/use-me";
import type { Role } from "@/lib/auth.functions";
import { setActiveTenantLocal } from "@/lib/config-store";

export function AdminGuard({
  children,
  requireRole,
}: {
  children: ReactNode;
  requireRole?: Role;
}) {
  const { data: me, isLoading } = useMe();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (me?.tenantId) setActiveTenantLocal(me.tenantId);
  }, [me?.tenantId]);

  useEffect(() => {
    if (isLoading) return;
    if (!me) {
      navigate({ to: "/admin/login" });
      return;
    }
    // super_admin can access everything
    if (me.role === "super_admin") return;
    // kitchen can only see /cuisine
    if (me.role === "kitchen" && location.pathname !== "/cuisine") {
      navigate({ to: "/cuisine" });
      return;
    }
    if (requireRole && me.role !== requireRole) {
      navigate({ to: "/dashboard" });
    }
  }, [isLoading, me, navigate, requireRole, location.pathname]);

  if (isLoading || !me) {
    return <div className="min-h-screen bg-background" />;
  }
  if (me.role === "kitchen" && location.pathname !== "/cuisine") {
    return <div className="min-h-screen bg-background" />;
  }
  if (requireRole && me.role !== requireRole && me.role !== "super_admin") {
    return <div className="min-h-screen bg-background" />;
  }
  return <>{children}</>;
}
