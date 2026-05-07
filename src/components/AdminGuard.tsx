import { useNavigate } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { useMe } from "@/lib/use-me";

export function AdminGuard({
  children,
  requireRole,
}: {
  children: ReactNode;
  requireRole?: "super_admin" | "restaurant_admin";
}) {
  const { data: me, isLoading } = useMe();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoading) return;
    if (!me) {
      navigate({ to: "/admin/login" });
      return;
    }
    if (requireRole === "super_admin" && me.role !== "super_admin") {
      navigate({ to: "/dashboard" });
    }
  }, [isLoading, me, navigate, requireRole]);

  if (isLoading || !me) {
    return <div className="min-h-screen bg-background" />;
  }
  if (requireRole === "super_admin" && me.role !== "super_admin") {
    return <div className="min-h-screen bg-background" />;
  }
  return <>{children}</>;
}
