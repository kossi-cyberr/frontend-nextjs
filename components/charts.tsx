"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { monthShort, money } from "@/lib/format";

const TOOLTIP_STYLE = {
  background: "#12172a",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: "12px",
  fontSize: "12px",
  color: "#e2e8f0",
};

/* Courbe du chiffre d'affaires par mois */
export function VentesParMoisChart({ data }: { data: { annee: number; mois: number; chiffreAffaires: number }[] }) {
  const chartData = data.map((d) => ({
    label: `${monthShort(d.mois)} ${String(d.annee).slice(2)}`,
    ca: Number(d.chiffreAffaires),
  }));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="gradCa" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity={0.45} />
              <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} width={60} />
          <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => money(Number(v))} />
          <Area type="monotone" dataKey="ca" stroke="#818cf8" strokeWidth={2.5} fill="url(#gradCa)" dot={false} activeDot={{ r: 5 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/* Barres du CA par catégorie */
export function VentesParCategorieChart({ data }: { data: { designation: string; chiffreAffaires: number }[] }) {
  const chartData = data.map((d) => ({
    name: d.designation || "—",
    ca: Number(d.chiffreAffaires),
  }));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} width={60} />
          <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => money(Number(v))} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
          <Bar dataKey="ca" radius={[8, 8, 0, 0]} maxBarSize={48}>
            {chartData.map((_, i) => (
              <Cell key={i} fill={i % 2 === 0 ? "#6366f1" : "#8b5cf6"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* Donut des commandes par client */
const DONUT_COLORS = ["#6366f1", "#8b5cf6", "#22d3ee", "#10b981", "#f59e0b", "#f472b6"];

export function CommandesParClientChart({ data }: { data: { nom: string; prenom: string; nombreCommandes: number; montantTotal: number }[] }) {
  const chartData = data.map((d) => ({
    name: `${d.nom ?? ""} ${d.prenom ?? ""}`.trim() || "—",
    value: Number(d.montantTotal),
  }));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            innerRadius={55}
            outerRadius={85}
            paddingAngle={4}
            stroke="none"
          >
            {chartData.map((_, i) => (
              <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => money(Number(v))} />
        </PieChart>
      </ResponsiveContainer>
      {chartData.length === 0 && (
        <p className="mt-2 text-center text-xs text-slate-500">Aucune commande client</p>
      )}
    </div>
  );
}

/* Liste top articles avec barres de progression */
export function TopArticlesList({ data }: { data: { designation: string; codeArticle: string; quantiteVendue: number; chiffreAffaires: number }[] }) {
  const max = Math.max(1, ...data.map((d) => Number(d.chiffreAffaires)));
  return (
    <div className="space-y-4">
      {data.length === 0 && <p className="py-8 text-center text-xs text-slate-500">Aucune vente enregistrée</p>}
      {data.slice(0, 6).map((d, i) => (
        <div key={i} className="group">
          <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500/30 to-violet-500/30 text-[11px] font-bold text-indigo-300">
                {i + 1}
              </span>
              <div className="min-w-0">
                <p className="truncate font-medium text-slate-200">{d.designation}</p>
                <p className="text-[10px] text-slate-500">
                  {d.codeArticle} · {num(d.quantiteVendue)} vendus
                </p>
              </div>
            </div>
            <span className="shrink-0 text-xs font-semibold text-slate-300">{money(d.chiffreAffaires)}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-700"
              style={{ width: `${(Number(d.chiffreAffaires) / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function num(n: number) {
  return new Intl.NumberFormat("fr-FR").format(n);
}
