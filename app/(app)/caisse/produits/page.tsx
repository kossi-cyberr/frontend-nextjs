"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Package, RefreshCw, Search } from "lucide-react";
import { api } from "@/lib/api";
import type { Article, Category } from "@/lib/types";
import { money } from "@/lib/format";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
import { articlesAvecStock, stocksReels } from "@/lib/ventes";
import { Badge, Button, Card, EmptyState, Input, PageTitle, Select, Spinner } from "@/components/ui";
import GardeVendeur from "@/components/GardeVendeur";

/** État de stock d'un article par rapport à son seuil d'alerte. */
function etatStock(stock: number, seuil?: number): { label: string; color: "emerald" | "amber" | "red" } {
  if (stock <= 0) return { label: "Rupture", color: "red" };
  if (seuil != null && stock < seuil) return { label: "Stock bas", color: "amber" };
  return { label: "Disponible", color: "emerald" };
}

/** Vue vendeur des produits : consultation seule (prix, stock, catégorie, état). */
function ProduitsVendeur() {
  const [articles, setArticles] = useState<(Article & { stockReel: number })[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [recherche, setRecherche] = useState("");
  const rechercheDebounced = useDebouncedValue(recherche);
  const [categorieId, setCategorieId] = useState("");
  const [etatFiltre, setEtatFiltre] = useState("");

  const charger = useCallback(() => {
    Promise.all([api<Article[]>("/articles/all"), stocksReels(), api<Category[]>("/categories/all")])
      .then(([all, stocks, cats]) => {
        setArticles(articlesAvecStock(all, stocks));
        setCategories(cats);
        setError("");
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Impossible de charger les produits");
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    charger();
  }, [charger]);

  const resultats = useMemo(() => {
    const q = rechercheDebounced.trim().toLowerCase();
    return articles
      .filter((a) => (categorieId ? a.category?.id === Number(categorieId) : true))
      .filter((a) => {
        if (!etatFiltre) return true;
        const { label } = etatStock(a.stockReel, a.seuilAlerte != null ? Number(a.seuilAlerte) : undefined);
        return label === etatFiltre;
      })
      .filter(
        (a) =>
          !q ||
          (a.designation ?? "").toLowerCase().includes(q) ||
          (a.codeArticle ?? "").toLowerCase().includes(q)
      )
      .sort((a, b) => (a.designation ?? "").localeCompare(b.designation ?? ""));
  }, [articles, rechercheDebounced, categorieId, etatFiltre]);

  if (error && articles.length === 0) {
    return (
      <div>
        <PageTitle title="Produits" subtitle="Prix, stocks et catégories" />
        <div className="glass flex flex-col items-center gap-4 p-12 text-center">
          <AlertTriangle className="h-10 w-10 text-rose-400" />
          <p className="text-sm text-slate-300">{error}</p>
          <Button variant="secondary" onClick={charger} loading={loading}>
            <RefreshCw className="h-4 w-4" />
            Réessayer
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageTitle
        title="Produits"
        subtitle={`${resultats.length} produit${resultats.length > 1 ? "s" : ""} affiché${resultats.length > 1 ? "s" : ""} — consultation seule`}
        actions={
          <Button variant="secondary" onClick={charger} loading={loading}>
            <RefreshCw className="h-4 w-4" />
            Actualiser
          </Button>
        }
      />

      <Card className="p-5">
        <div className="flex flex-col gap-3 lg:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <Input
              className="pl-9"
              placeholder="Rechercher par nom ou code…"
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
            />
          </div>
          <Select className="lg:w-56" value={categorieId} onChange={(e) => setCategorieId(e.target.value)}>
            <option value="">Toutes catégories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.designation}
              </option>
            ))}
          </Select>
          <Select className="lg:w-44" value={etatFiltre} onChange={(e) => setEtatFiltre(e.target.value)}>
            <option value="">Tous les états</option>
            <option value="Disponible">Disponible</option>
            <option value="Stock bas">Stock bas</option>
            <option value="Rupture">Rupture</option>
          </Select>
        </div>

        {loading ? (
          <Spinner />
        ) : resultats.length === 0 ? (
          <EmptyState message="Aucun produit ne correspond aux filtres" />
        ) : (
          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {resultats.map((a) => {
              const etat = etatStock(a.stockReel, a.seuilAlerte != null ? Number(a.seuilAlerte) : undefined);
              return (
                <div
                  key={a.id}
                  className="flex items-center gap-4 rounded-xl border border-white/[0.06] bg-white/[0.03] p-4 transition hover:border-white/[0.12]"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/25 to-violet-500/25">
                    <Package className="h-5 w-5 text-indigo-300" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-200">{a.designation}</p>
                    <p className="truncate font-mono text-[11px] text-slate-500">
                      {a.codeArticle}
                      {a.category?.designation ? ` · ${a.category.designation}` : " · Sans catégorie"}
                    </p>
                    <div className="mt-1.5 flex items-center gap-2">
                      <span className="text-sm font-semibold text-white">{money(a.prixUnitaireTTc ?? a.prixUnitaire)}</span>
                      <Badge color={etat.color}>{etat.label}</Badge>
                      <span className="text-[11px] text-slate-500">
                        Stock : <span className="font-semibold text-slate-300">{a.stockReel}</span>
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

export default function ProduitsPage() {
  return (
    <GardeVendeur>
      <ProduitsVendeur />
    </GardeVendeur>
  );
}
