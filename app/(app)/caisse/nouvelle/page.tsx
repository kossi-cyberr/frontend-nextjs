"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Minus,
  Plus,
  Printer,
  Search,
  ShoppingCart,
  Trash2,
} from "lucide-react";
import { api } from "@/lib/api";
import type { Article, Vente } from "@/lib/types";
import { money } from "@/lib/format";
import {
  articlesAvecStock,
  type PanierItem,
  stocksReels,
  totalPanier,
} from "@/lib/ventes";
import { Badge, Button, Card, EmptyState, Input, PageTitle, Select, useToast } from "@/components/ui";
import TicketVente from "@/components/TicketVente";
import GardeVendeur from "@/components/GardeVendeur";

/** Page caisse : rechercher → ajouter au panier → quantité → valider. */
function CaisseNouvelle() {
  const { toast, Toaster } = useToast();

  const [articles, setArticles] = useState<(Article & { stockReel: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [recherche, setRecherche] = useState("");
  const [categorieId, setCategorieId] = useState("");
  const [categories, setCategories] = useState<{ id?: number; designation?: string }[]>([]);

  const [panier, setPanier] = useState<PanierItem[]>([]);
  const [nomClient, setNomClient] = useState("");
  const [validation, setValidation] = useState(false);

  const [venteCreee, setVenteCreee] = useState<Vente | null>(null);
  const [ticketOuvert, setTicketOuvert] = useState(false);

  const searchRef = useRef<HTMLInputElement>(null);

  const charger = useCallback(() => {
    Promise.all([api<Article[]>("/articles/all"), stocksReels(), api<{ id?: number; designation?: string }[]>("/categories/all")])
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

  const categoriesUtilisees = useMemo(() => {
    const ids = new Set(articles.map((a) => a.category?.id).filter((id): id is number => id !== undefined));
    return categories.filter((c) => c.id !== undefined && ids.has(c.id));
  }, [articles, categories]);

  const resultats = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    return articles
      .filter((a) => (categorieId ? a.category?.id === Number(categorieId) : true))
      .filter(
        (a) =>
          !q ||
          (a.designation ?? "").toLowerCase().includes(q) ||
          (a.codeArticle ?? "").toLowerCase().includes(q)
      )
      .sort((a, b) => (b.stockReel > 0 ? 1 : 0) - (a.stockReel > 0 ? 1 : 0));
  }, [articles, recherche, categorieId]);

  /** Ajoute un produit au panier (ou incrémente s'il y est déjà), dans la limite du stock. */
  const ajouter = (a: Article & { stockReel: number }) => {
    if (a.stockReel <= 0) {
      toast(`« ${a.designation} » est en rupture de stock`, "error");
      return;
    }
    setPanier((p) => {
      const existant = p.find((i) => i.articleId === a.id);
      if (existant) {
        if (existant.quantite >= a.stockReel) {
          toast(`Stock maximum atteint pour « ${a.designation} » (${a.stockReel})`, "error");
          return p;
        }
        return p.map((i) => (i.articleId === a.id ? { ...i, quantite: i.quantite + 1 } : i));
      }
      return [
        ...p,
        {
          articleId: a.id ?? -1,
          designation: a.designation ?? "—",
          codeArticle: a.codeArticle,
          prixUnitaire: Number(a.prixUnitaireTTc ?? a.prixUnitaire ?? 0),
          quantite: 1,
          stock: a.stockReel,
        },
      ];
    });
  };

  /** Modifie la quantité d'une ligne, bornée entre 1 et le stock disponible. */
  const changerQuantite = (articleId: number, quantite: number) => {
    setPanier((p) =>
      p.map((i) =>
        i.articleId === articleId ? { ...i, quantite: Math.max(1, Math.min(i.stock, quantite)) } : i
      )
    );
  };

  const retirer = (articleId: number) =>
    setPanier((p) => p.filter((i) => i.articleId !== articleId));

  const total = totalPanier(panier);

  const valider = async () => {
    if (panier.length === 0) return;
    setValidation(true);
    try {
      const code = `V-${Date.now().toString().slice(-6)}`;
      const venteCree = await api<Vente>("/ventes/create", {
        method: "POST",
        body: {
          code,
          dateVente: new Date().toISOString(),
          commentaire: "Vente caisse",
          nomClient: nomClient.trim() || null,
          ligneVentes: panier.map((i) => ({
            article: { id: i.articleId },
            quantite: i.quantite,
            prixUnitaire: i.prixUnitaire,
          })),
        },
      });
      // Le backend renvoie la vente enrichie (lignes) ; on complète au besoin
      const venteComplete: Vente = {
        ...venteCree,
        nomClient: nomClient.trim() || undefined,
        ligneVentes:
          venteCree.ligneVentes?.length === panier.length
            ? venteCree.ligneVentes
            : panier.map((i, idx) => ({
                id: venteCree.ligneVentes?.[idx]?.id,
                article: { id: i.articleId, designation: i.designation, codeArticle: i.codeArticle },
                quantite: i.quantite,
                prixUnitaire: i.prixUnitaire,
              })),
      };
      setVenteCreee(venteComplete);
      setTicketOuvert(true);
      toast("Vente enregistrée — stock mis à jour");
      setPanier([]);
      setNomClient("");
      // Rafraîchit les stocks après la vente
      charger();
      searchRef.current?.focus();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Enregistrement impossible", "error");
    } finally {
      setValidation(false);
    }
  };

  return (
    <div>
      <PageTitle
        title="Nouvelle vente"
        subtitle="Rechercher → Ajouter au panier → Quantité → Valider"
        actions={
          venteCreee && (
            <Button variant="secondary" onClick={() => setTicketOuvert(true)}>
              <Printer className="h-4 w-4" />
              Réimprimer le dernier ticket
            </Button>
          )
        }
      />

      {error && articles.length === 0 ? (
        <div className="glass flex flex-col items-center gap-4 p-12 text-center">
          <AlertTriangle className="h-10 w-10 text-rose-400" />
          <p className="text-sm text-slate-300">{error}</p>
          <Button variant="secondary" onClick={charger} loading={loading}>
            Réessayer
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
          {/* Colonne produits */}
          <div className="xl:col-span-3">
            <Card className="p-5">
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <Input
                    ref={searchRef}
                    className="pl-9"
                    placeholder="Rechercher par nom ou code…"
                    value={recherche}
                    onChange={(e) => setRecherche(e.target.value)}
                    autoFocus
                  />
                </div>
                <Select
                  className="sm:w-52"
                  value={categorieId}
                  onChange={(e) => setCategorieId(e.target.value)}
                >
                  <option value="">Toutes catégories</option>
                  {categoriesUtilisees.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.designation}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="mt-4 max-h-[28rem] space-y-2 overflow-y-auto pr-1">
                {loading && <EmptyState message="Chargement des produits…" />}
                {!loading && resultats.length === 0 && (
                  <EmptyState message="Aucun produit ne correspond à la recherche" />
                )}
                {resultats.map((a) => {
                  const rupture = a.stockReel <= 0;
                  return (
                    <button
                      key={a.id}
                      onClick={() => ajouter(a)}
                      disabled={rupture}
                      className={`flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition ${
                        rupture
                          ? "cursor-not-allowed border-white/[0.04] bg-white/[0.01] opacity-50"
                          : "border-white/[0.06] bg-white/[0.03] hover:border-indigo-400/40 hover:bg-white/[0.06]"
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-200">{a.designation}</p>
                        <p className="font-mono text-[11px] text-slate-500">
                          {a.codeArticle}
                          {a.category?.designation ? ` · ${a.category.designation}` : ""}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <div className="text-right">
                          <p className="text-sm font-semibold text-white">{money(a.prixUnitaireTTc ?? a.prixUnitaire)}</p>
                          <p className={`text-[11px] ${rupture ? "text-red-400" : "text-slate-500"}`}>
                            {rupture ? "Rupture" : `Stock : ${a.stockReel}`}
                          </p>
                        </div>
                        <Plus className="h-4 w-4 text-indigo-300" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </Card>
          </div>

          {/* Colonne panier */}
          <div className="xl:col-span-2">
            <Card className="flex flex-col p-5">
              <div className="flex items-center gap-2 pb-4">
                <ShoppingCart className="h-5 w-5 text-indigo-300" />
                <h3 className="text-base font-semibold text-white">Panier</h3>
                {panier.length > 0 && <Badge color="indigo">{panier.length}</Badge>}
              </div>

              {panier.length === 0 ? (
                <EmptyState message="Le panier est vide — ajoutez un produit" />
              ) : (
                <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                  {panier.map((i) => (
                    <div
                      key={i.articleId}
                      className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-200">{i.designation}</p>
                          <p className="text-[11px] text-slate-500">{money(i.prixUnitaire)} · stock {i.stock}</p>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => retirer(i.articleId)} aria-label="Retirer">
                          <Trash2 className="h-3.5 w-3.5 text-red-300" />
                        </Button>
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => changerQuantite(i.articleId, i.quantite - 1)}
                            disabled={i.quantite <= 1}
                            aria-label="Diminuer"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </Button>
                          <Input
                            type="number"
                            min={1}
                            max={i.stock}
                            value={i.quantite}
                            onChange={(e) => changerQuantite(i.articleId, Number(e.target.value))}
                            className="!w-16 text-center"
                          />
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => changerQuantite(i.articleId, i.quantite + 1)}
                            disabled={i.quantite >= i.stock}
                            aria-label="Augmenter"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        <span className="text-sm font-semibold text-white">
                          {money(i.prixUnitaire * i.quantite)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-4 space-y-3 border-t border-white/[0.06] pt-4">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-slate-400">
                    Nom du client (optionnel)
                  </span>
                  <Input
                    value={nomClient}
                    onChange={(e) => setNomClient(e.target.value)}
                    placeholder="Ex. : Awa Diop"
                  />
                </label>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">Total</span>
                  <span className="text-2xl font-bold tracking-tight text-white">{money(total)}</span>
                </div>

                <Button
                  className="w-full"
                  onClick={valider}
                  loading={validation}
                  disabled={panier.length === 0}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Valider la vente
                </Button>
              </div>
            </Card>
          </div>
        </div>
      )}

      {ticketOuvert && venteCreee && (
        <TicketVente vente={venteCreee} onClose={() => setTicketOuvert(false)} />
      )}
      {Toaster}
    </div>
  );
}

export default function CaisseNouvellePage() {
  return (
    <GardeVendeur>
      <CaisseNouvelle />
    </GardeVendeur>
  );
}
