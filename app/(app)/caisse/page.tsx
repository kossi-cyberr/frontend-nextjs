"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Package,
  RefreshCw,
  Receipt,
  ShoppingCart,
  ClipboardList,
} from "lucide-react";
import { api } from "@/lib/api";
import type { Article, Vente } from "@/lib/types";
import { dateTime, money } from "@/lib/format";
import {
  articlesAvecStock,
  montantVente,
  nombreArticles,
  statsDuJour,
  stocksReels,
  ventesDuJour,
} from "@/lib/ventes";
import { Badge, Button, Card, CardHeader, EmptyState, PageTitle, Spinner } from "@/components/ui";
import GardeVendeur from "@/components/GardeVendeur";

/** Dashboard vendeur : ventes du jour, articles vendus, alertes stock. */
function CaisseDashboard() {
  const [ventes, setVentes] = useState<Vente[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Chargement async : setState uniquement dans les callbacks de réponse
  const load = useCallback(() => {
    Promise.all([
      api<Vente[]>("/ventes/all"),
      api<Article[]>("/articles/all"),
      api<Article[]>("/articles/sous-seuil"),
      stocksReels(),
    ])
      .then(([allVentes, allArticles, sousSeuil, stocks]) => {
        setVentes(allVentes);
        // Marque les articles sous leur seuil d'alerte (liste dédiée de l'API)
        const idsSousSeuil = new Set(sousSeuil.map((a) => a.id));
        setArticles(
          articlesAvecStock(allArticles, stocks).map((a) => ({
            ...a,
            sousSeuil: idsSousSeuil.has(a.id ?? -1),
          }))
        );
        setError("");
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Impossible de charger le tableau de bord");
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading && ventes.length === 0 && articles.length === 0) {
    return (
      <div className="glass">
        <Spinner className="h-10 w-10" />
      </div>
    );
  }

  if (error && ventes.length === 0 && articles.length === 0) {
    return (
      <div className="glass flex flex-col items-center gap-4 p-12 text-center">
        <AlertTriangle className="h-10 w-10 text-rose-400" />
        <p className="text-sm text-slate-300">{error}</p>
        <Button variant="secondary" onClick={load} loading={loading}>
          <RefreshCw className="h-4 w-4" />
          Réessayer
        </Button>
      </div>
    );
  }

  const stats = statsDuJour(ventes);
  const dernieres = ventesDuJour(ventes).slice(0, 5);
  const alertesStock = articles.filter((a) => (a as Article & { sousSeuil?: boolean }).sousSeuil);

  const actions = [
    {
      href: "/caisse/nouvelle",
      label: "Nouvelle vente",
      sub: "Ouvrir la caisse",
      icon: ShoppingCart,
      gradient: "from-indigo-500 to-violet-600",
    },
    {
      href: "/commandes",
      label: "Commandes",
      sub: "Commandes clients",
      icon: ClipboardList,
      gradient: "from-amber-500 to-orange-600",
    },
    {
      href: "/caisse/produits",
      label: "Voir les produits",
      sub: "Prix et stocks",
      icon: Package,
      gradient: "from-cyan-500 to-blue-600",
    },
    {
      href: "/caisse/ventes",
      label: "Voir mes ventes",
      sub: "Historique et tickets",
      icon: Receipt,
      gradient: "from-emerald-500 to-teal-600",
    },
  ];

  const kpis = [
    {
      label: "Ventes du jour",
      value: String(stats.nombreVentes),
      icon: ShoppingCart,
      iconBg: "bg-indigo-500/15 text-indigo-300",
    },
    {
      label: "Articles vendus (jour)",
      value: String(stats.nombreArticles),
      icon: Package,
      iconBg: "bg-cyan-500/15 text-cyan-300",
    },
    {
      label: "Produits sous le seuil",
      value: String(alertesStock.length),
      icon: AlertTriangle,
      iconBg: alertesStock.length > 0 ? "bg-rose-500/15 text-rose-300" : "bg-slate-500/15 text-slate-300",
    },
  ];

  return (
    <div>
      <PageTitle
        title="Espace vendeur"
        subtitle="Vos ventes du jour et l'état du stock, en un coup d'œil"
        actions={
          <Button variant="secondary" onClick={load} loading={loading}>
            <RefreshCw className="h-4 w-4" />
            Actualiser
          </Button>
        }
      />

      {/* KPIs du jour */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {kpis.map((kpi) => (
          <Card key={kpi.label} hover className="p-5">
            <div className="flex items-start justify-between">
              <div className={`rounded-xl p-3 ${kpi.iconBg}`}>
                <kpi.icon className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-4 text-2xl font-bold tracking-tight text-white">{kpi.value}</p>
            <p className="mt-1 text-xs font-medium text-slate-400">{kpi.label}</p>
          </Card>
        ))}
      </div>

      {/* Actions rapides */}
      <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {actions.map((a) => (
          <Link key={a.href} href={a.href}>
            <Card hover className="group flex items-center gap-4 p-5">
              <div className={`rounded-xl bg-gradient-to-br ${a.gradient} p-3 text-white shadow-lg`}>
                <a.icon className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-white">{a.label}</p>
                <p className="text-xs text-slate-500">{a.sub}</p>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-600 transition group-hover:translate-x-1 group-hover:text-indigo-300" />
            </Card>
          </Link>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Dernières ventes */}
        <Card className="xl:col-span-2">
          <CardHeader
            title="Dernières ventes du jour"
            subtitle={`${stats.nombreVentes} vente${stats.nombreVentes > 1 ? "s" : ""} aujourd'hui`}
            action={
              <Link href="/caisse/ventes">
                <Button variant="ghost" size="sm">
                  Tout voir
                </Button>
              </Link>
            }
          />
          <div className="px-6 pb-6">
            {dernieres.length === 0 ? (
              <EmptyState message="Aucune vente enregistrée aujourd'hui" />
            ) : (
              <div className="space-y-2">
                {dernieres.map((v) => (
                  <div
                    key={v.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-200">
                        <span className="font-mono text-xs font-semibold text-indigo-300">{v.code}</span>
                        {v.nomClient && <span className="text-slate-400"> · {v.nomClient}</span>}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {dateTime(v.dateVente)} · {nombreArticles(v)} article{nombreArticles(v) > 1 ? "s" : ""}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold text-white">{money(montantVente(v))}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Alertes stock */}
        <Card>
          <CardHeader
            title="Produits sous le seuil"
            subtitle="À réapprovisionner"
            action={
              alertesStock.length > 0 ? (
                <Badge color="red">{alertesStock.length}</Badge>
              ) : (
                <Badge color="emerald">✓ Aucune</Badge>
              )
            }
          />
          <div className="max-h-72 space-y-2 overflow-y-auto px-6 pb-6">
            {alertesStock.length === 0 && (
              <p className="py-8 text-center text-xs text-slate-500">
                Tous les produits sont au-dessus de leur seuil 🎉
              </p>
            )}
            {alertesStock.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-200">{a.designation}</p>
                  <p className="font-mono text-[10px] text-slate-500">{a.codeArticle}</p>
                </div>
                <Badge color="red">Stock : {a.seuilAlerte ?? 0} max</Badge>
              </div>
            ))}
            {alertesStock.length > 0 && (
              <Link href="/caisse/produits" className="block">
                <Button variant="secondary" className="w-full">
                  Voir les produits
                </Button>
              </Link>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

export default function CaisseHomePage() {
  return (
    <GardeVendeur>
      <CaisseDashboard />
    </GardeVendeur>
  );
}
