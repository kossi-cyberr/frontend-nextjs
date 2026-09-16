"use client";

import { Bell, Menu } from "lucide-react";
import Link from "next/link";
import { photoUrl } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export default function Topbar({ onMenu }: { onMenu?: () => void }) {
  const { user } = useAuth();

  const avatar = photoUrl(user?.photo);
  const initiales = ((user?.nom ?? "U").charAt(0) + (user?.prenom ?? "").charAt(0)).toUpperCase();

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-white/[0.06] bg-night/70 px-6 py-4 backdrop-blur-xl">
      <div className="flex items-center gap-3">
        {onMenu && (
          <button
            onClick={onMenu}
            className="rounded-lg p-2 text-slate-300 transition hover:bg-white/5 lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}
        <div className="hidden items-center gap-2 text-xs text-slate-500 sm:flex">
          <span className="rounded-md bg-emerald-500/15 px-2 py-1 font-medium text-emerald-300">
            ● API connectée
          </span>
          <span>{user?.entreprise?.nom ?? "Espace de travail"}</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button className="relative rounded-xl border border-white/10 bg-white/5 p-2.5 text-slate-300 transition hover:bg-white/10">
          <Bell className="h-4 w-4" />
          <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500" />
        </button>
        <Link
          href="/profil"
          title="Mon profil"
          className="transition hover:opacity-80"
        >
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatar}
              alt="Mon profil"
              className="h-9 w-9 rounded-full object-cover ring-2 ring-indigo-500/40"
            />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-xs font-bold text-white">
              {initiales}
            </div>
          )}
        </Link>
      </div>
    </header>
  );
}
