"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Package,
  RefreshCw,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { api } from "@/lib/api";
import type { Dashboard } from "@/lib/types";
import { money, moneyCompact, dateOnly } from "@/lib/format";
import { Badge, Button, Card, CardHeader, PageTitle, Spinner } from "@/components/ui";
import { isVendeur, useAuth } from "@/lib/auth";
import {
  CommandesParClientChart,
  TopArticlesList,
  VentesParCategorieChart,
  VentesParMoisChart,
} from "@/components/charts";

export default function DashboardPage() {
  const { roles } = useAuth();
  const vendeur = isVendeur(roles);
  const router = useRouter();
  const [data, setData] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Les vendeurs n'ont pas accès aux KPIs ADMIN/MANAGER : on les envoie à leur espace caisse.
  useEffect(() => {
    if (!vendeur) return;
    router.replace("/caisse");
  }, [vendeur, router]);

  // Chargement async : setState dans les callbacks de réponse
  const load = useCallback(() => {
    api<Dashboard>("/dashboard")
      .then((d) => {
        setData(d);
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

  if (loading && !data) {
    return (
      <div className="glass">
        <Spinner className="h-10 w-10" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="glass flex flex-col items-center gap-4 p-12 text-center">
        <AlertTriangle className="h-10 w-10 text-rose-400" />
        <p className="text-sm text-slate-300">{error}</p>
        <p className="text-xs text-slate-500">
          Vérifiez que le serveur est démarré, puis réessayez.
        </p>
        <Button variant="secondary" onClick={load} loading={loading}>
          <RefreshCw className="h-4 w-4" />
          Réessayer
        </Button>
      </div>
    );
  }

  if (!data) return null;

  const d = data;

  const kpis = [
    {
      label: "Chiffre d'affaires (mois)",
      value: money(d.chiffreAffairesMoisEnCours),
      sub: `Jour : ${money(d.chiffreAffairesJourEnCours)}`,
      icon: TrendingUp,
      gradient: "from-indigo-500 to-violet-600",
      iconBg: "bg-indigo-500/15 text-indigo-300",
    },
    {
      label: "CA total",
      value: money(d.chiffreAffairesTotal),
      sub: `${d.nombreVentes} vente${d.nombreVentes > 1 ? "s" : ""} enregistrée${d.nombreVentes > 1 ? "s" : ""}`,
      icon: Wallet,
      gradient: "from-cyan-500 to-blue-600",
      iconBg: "bg-cyan-500/15 text-cyan-300",
    },
    {
      label: "Valeur du stock",
      value: money(d.valeurStock),
      sub: `Marge moyenne : ${moneyCompact(d.margeMoyenne)}`,
      icon: Package,
      gradient: "from-emerald-500 to-teal-600",
      iconBg: "bg-emerald-500/15 text-emerald-300",
    },
    {
      label: "Articles sous seuil",
      value: String(d.stockSousSeuil),
      sub: "Alertes de réapprovisionnement",
      icon: AlertTriangle,
      gradient: d.stockSousSeuil > 0 ? "from-rose-500 to-orange-500" : "from-slate-500 to-slate-600",
      iconBg: d.stockSousSeuil > 0 ? "bg-rose-500/15 text-rose-300" : "bg-slate-500/15 text-slate-300",
    },
  ];

  return (
    <div className="space-y-6">
      <PageTitle
        title="Tableau de bord"
        subtitle={dateOnly(new Date().toISOString())}
        actions={
          <Button variant="secondary" onClick={load} loading={loading}>
            <RefreshCw className="h-4 w-4" />
            Actualiser
          </Button>
        }
      />

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi, i) => (
          <Card key={kpi.label} hover className="relative overflow-hidden p-5 animate-slide-up" >
            <div style={{ animationDelay: `${i * 70}ms` }}>
              <div className="flex items-start justify-between">
                <div className={`rounded-xl p-3 ${kpi.iconBg}`}>
                  <kpi.icon className="h-5 w-5" />
                </div>
                <ArrowUpRight className="h-4 w-4 text-slate-600" />
              </div>
              <p className="mt-4 text-2xl font-bold tracking-tight text-white">{kpi.value}</p>
              <p className="mt-1 text-xs font-medium text-slate-400">{kpi.label}</p>
              <p className="mt-1 text-[11px] text-slate-600">{kpi.sub}</p>
              <div className={`absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r ${kpi.gradient} opacity-70`} />
            </div>
          </Card>
        ))}
      </div>

      {/* Compteurs rapides */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {(
          [
            { label: "Clients", value: d.nombreClients, icon: Users },
            ...(!vendeur ? [{ label: "Fournisseurs", value: d.nombreFournisseurs, icon: Package }] : []),
            { label: "Commandes clients", value: d.nombreCommandesClient, icon: Package },
            ...(!vendeur ? [{ label: "Commandes fournisseurs", value: d.nombreCommandesFournisseur, icon: Package }] : []),
          ] as const
        ).map((c) => (
          <div
            key={c.label}
            className="glass flex items-center gap-3 px-5 py-4 transition hover:border-white/20"
          >
            <c.icon className="h-4 w-4 text-indigo-400" />
            <div>
              <p className="text-lg font-bold text-white">{c.value}</p>
              <p className="text-[11px] text-slate-500">{c.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            title="Chiffre d'affaires mensuel"
            subtitle="Évolution des ventes par mois"
            action={
              <Badge color="indigo">
                <ArrowUpRight className="h-3 w-3" />
                {d.ventesParMois.length} mois
              </Badge>
            }
          />
          <div className="px-6 pb-6">
            <VentesParMoisChart data={d.ventesParMois} />
          </div>
        </Card>

        <Card>
          <CardHeader title="Ventes par catégorie" subtitle="Répartition du CA" />
          <div className="px-6 pb-6">
            <VentesParCategorieChart data={d.ventesParCategorie} />
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card>
          <CardHeader
            title="Top articles"
            subtitle="Meilleures ventes de la période"
            action={
              <Link href="/articles">
                <Button variant="ghost" size="sm">
                  Voir tout
                </Button>
              </Link>
            }
          />
          <div className="px-6 pb-6">
            <TopArticlesList data={d.topArticles} />
          </div>
        </Card>

        <Card>
          <CardHeader title="Commandes par client" subtitle="Montants totaux" />
          <div className="px-6 pb-6">
            <CommandesParClientChart data={d.commandesParClient} />
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Ventes du jour par vendeur"
            subtitle="Performance de l'équipe aujourd'hui"
            action={
              (d.ventesDuJourParVendeur ?? []).length > 0 ? (
                <Badge color="indigo">{(d.ventesDuJourParVendeur ?? []).length} vendeur{d.ventesDuJourParVendeur.length > 1 ? "s" : ""}</Badge>
              ) : (
                <Badge color="slate">Aucune vente</Badge>
              )
            }
          />
          <div className="px-6 pb-6">
            {(d.ventesDuJourParVendeur ?? []).length === 0 ? (
              <p className="py-8 text-center text-xs text-slate-500">
                Aucune vente enregistrée aujourd&apos;hui
              </p>
            ) : (
              <div className="space-y-2">
                {d.ventesDuJourParVendeur.map((v) => (
                  <div
                    key={v.idVendeur}
                    className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3 transition hover:bg-white/[0.05]"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500/30 to-violet-500/30 text-[11px] font-bold text-indigo-300">
                        {(v.nomVendeur ?? "?")
                          .split(" ")
                          .map((m) => m.charAt(0))
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-200">{v.nomVendeur || "—"}</p>
                        <p className="text-[11px] text-slate-500">
                          {Number(v.nombreVentes)} vente{Number(v.nombreVentes) > 1 ? "s" : ""} · {Number(v.articlesVendus)} article{Number(v.articlesVendus) > 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>
                    <span className="shrink-0 text-sm font-semibold text-white">{money(Number(v.chiffreAffaires))}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Alertes stock"
            subtitle="Articles sous le seuil"
            action={
              d.stockSousSeuil > 0 ? (
                <Badge color="red">
                  <AlertTriangle className="h-3 w-3" />
                  {d.stockSousSeuil} alerte{d.stockSousSeuil > 1 ? "s" : ""}
                </Badge>
              ) : (
                <Badge color="emerald">✓ Aucune</Badge>
              )
            }
          />
          <div className="space-y-3 px-6 pb-6">
            {d.stockSousSeuil === 0 && (
              <p className="py-8 text-center text-xs text-slate-500">
                Tous les articles sont au-dessus de leur seuil 🎉
              </p>
            )}
            {d.topArticles.length === 0 && d.stockSousSeuil > 0 && (
              <p className="py-8 text-center text-xs text-slate-500">
                Consultez la page Articles pour voir le détail.
              </p>
            )}
            <div className="flex items-center gap-3 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3">
              <ArrowDownRight className="h-4 w-4 shrink-0 text-rose-300" />
              <p className="text-xs text-rose-200">
                {d.stockSousSeuil > 0
                  ? `${d.stockSousSeuil} article(s) nécessitent un réapprovisionnement.`
                  : "Aucun réapprovisionnement nécessaire."}
              </p>
            </div>
            <Link href="/articles?alerte=1">
              <Button variant="secondary" className="w-full">
                Voir les articles sous seuil
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
