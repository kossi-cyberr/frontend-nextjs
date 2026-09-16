"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Users,
  Truck,
  ShoppingCart,
  Receipt,
  Boxes,
  ShieldCheck,
  LogOut,
} from "lucide-react";
import { photoUrl } from "@/lib/api";
import { canManage, useAuth } from "@/lib/auth";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/articles", label: "Articles", icon: Package },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/fournisseurs", label: "Fournisseurs", icon: Truck },
  { href: "/commandes", label: "Commandes", icon: ShoppingCart },
  { href: "/ventes", label: "Ventes", icon: Receipt },
  { href: "/stock", label: "Stock", icon: Boxes },
  { href: "/utilisateurs", label: "Utilisateurs", icon: ShieldCheck },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout, roles } = useAuth();

  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-white/[0.06] bg-black/30 backdrop-blur-xl lg:flex">
      <div className="flex items-center gap-3 px-6 py-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/30">
          <Boxes className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-sm font-bold tracking-tight text-white">StockFlow</p>
          <p className="text-[10px] uppercase tracking-widest text-slate-500">
            Gestion de stock
          </p>
        </div>
      </div>

      <nav className="mt-2 flex-1 space-y-1 px-3">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={`group relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all ${
                active
                  ? "bg-gradient-to-r from-indigo-500/20 to-violet-500/10 text-white"
                  : "text-slate-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              {active && (
                <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-gradient-to-b from-indigo-400 to-violet-500" />
              )}
              <Icon
                className={`h-[18px] w-[18px] ${
                  active ? "text-indigo-300" : "text-slate-500 group-hover:text-slate-300"
                }`}
              />
              {label}
              {active && (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-indigo-400 animate-glow" />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/[0.06] p-4">
        <Link href="/profil" className="mb-3 flex items-center gap-3 rounded-xl bg-white/[0.04] p-3 transition hover:bg-white/[0.08]">
          {photoUrl(user?.photo) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photoUrl(user?.photo)}
              alt="Avatar"
              className="h-9 w-9 shrink-0 rounded-full object-cover ring-1 ring-white/10"
            />
          ) : (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-xs font-bold text-white">
              {((user?.nom ?? "U").charAt(0) + (user?.prenom ?? "").charAt(0)).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-white">
              {user?.nom} {user?.prenom}
            </p>
            <p className="truncate text-[10px] text-slate-500">{user?.email}</p>
          </div>
        </Link>
        <div className="mb-3 flex flex-wrap gap-1.5 px-1">
          {roles.map((r) => (
            <span
              key={r}
              className="rounded-md bg-indigo-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-300"
            >
              {r}
            </span>
          ))}
          {!canManage(roles) && roles.length === 0 && (
            <span className="text-[10px] text-slate-500">Aucun rôle</span>
          )}
        </div>
        <button
          onClick={logout}
          className="flex w-full items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm text-slate-400 transition hover:bg-red-500/10 hover:text-red-300"
        >
          <LogOut className="h-4 w-4" />
          Déconnexion
        </button>
      </div>
    </aside>
  );
}
