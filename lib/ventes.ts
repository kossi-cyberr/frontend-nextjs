"use client";

import { api } from "./api";
import type { Article, LigneVente, MvtStk, Vente } from "./types";

/* ------------------------------------------------------------------ */
/* Lignes de vente / panier                                            */
/* ------------------------------------------------------------------ */

export interface PanierItem {
  articleId: number;
  designation: string;
  codeArticle?: string;
  prixUnitaire: number;
  quantite: number;
  stock: number;
}

/** Montant d'une ligne de vente (quantité × prix unitaire). */
export function montantLigne(ligne: Pick<LigneVente, "quantite" | "prixUnitaire">): number {
  return Number(ligne.quantite ?? 0) * Number(ligne.prixUnitaire ?? 0);
}

/** Montant total d'une vente = somme des lignes. */
export function montantVente(vente: Pick<Vente, "ligneVentes">): number {
  return (vente.ligneVentes ?? []).reduce((total, l) => total + montantLigne(l), 0);
}

/** Nombre total d'articles d'une vente (somme des quantités). */
export function nombreArticles(vente: Pick<Vente, "ligneVentes">): number {
  return (vente.ligneVentes ?? []).reduce((total, l) => total + Number(l.quantite ?? 0), 0);
}

/** Total du panier en cours dans la caisse. */
export function totalPanier(items: PanierItem[]): number {
  return items.reduce((total, i) => total + i.prixUnitaire * i.quantite, 0);
}

/* ------------------------------------------------------------------ */
/* Stock réel                                                          */
/* ------------------------------------------------------------------ */

/**
 * Stock réel par article, calculé à partir de l'historique des mouvements
 * (API existante : GET /mvtstk/all — accessible aux VENDEUR en lecture).
 */
export async function stocksReels(): Promise<Map<number, number>> {
  const mvts = await api<MvtStk[]>("/mvtstk/all");
  const stocks = new Map<number, number>();
  for (const mvt of mvts) {
    const id = mvt.article?.id;
    if (id === undefined) continue;
    stocks.set(id, (stocks.get(id) ?? 0) + Number(mvt.quantite ?? 0));
  }
  return stocks;
}

/** Enrichit une liste d'articles avec leur stock réel. */
export function articlesAvecStock(articles: Article[], stocks: Map<number, number>): (Article & { stockReel: number })[] {
  return articles.map((a) => ({ ...a, stockReel: stocks.get(a.id ?? -1) ?? 0 }));
}

/* ------------------------------------------------------------------ */
/* KPIs du vendeur (ventes du jour)                                    */
/* ------------------------------------------------------------------ */

export interface StatsJour {
  nombreVentes: number;
  chiffreAffaires: number;
  nombreArticles: number;
}

/** Est-ce que la date (ISO) tombe aujourd'hui ? */
export function estAujourdheure(value?: string | null): boolean {
  if (!value) return false;
  const d = new Date(value);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

/** Agrège les ventes du jour : nombre de ventes, CA et articles vendus. */
export function statsDuJour(ventes: Vente[]): StatsJour {
  const ventesJour = ventes.filter((v) => estAujourdheure(v.dateVente));
  return {
    nombreVentes: ventesJour.length,
    chiffreAffaires: ventesJour.reduce((total, v) => total + montantVente(v), 0),
    nombreArticles: ventesJour.reduce((total, v) => total + nombreArticles(v), 0),
  };
}

/** Ventes du jour, les plus récentes d'abord. */
export function ventesDuJour(ventes: Vente[]): Vente[] {
  return ventes
    .filter((v) => estAujourdheure(v.dateVente))
    .sort((a, b) => new Date(b.dateVente ?? 0).getTime() - new Date(a.dateVente ?? 0).getTime());
}
