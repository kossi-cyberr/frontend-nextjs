"use client";

import { useAuth } from "@/lib/auth";
import { Spinner } from "@/components/ui";

/**
 * Garde d'accès des pages vendeur : l'espace caisse est ouvert à tous les
 * rôles authentifiés (le backend reste le garant des autorisations).
 */
export default function GardeVendeur({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading || !user) {
    return (
      <div className="glass">
        <Spinner className="h-10 w-10" />
      </div>
    );
  }
  return <>{children}</>;
}
