"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Eye, RefreshCw, Receipt } from "lucide-react";
import { api } from "@/lib/api";
import type { Vente } from "@/lib/types";
import { dateTime, money } from "@/lib/format";
import { montantVente, nombreArticles } from "@/lib/ventes";
import { Badge, Button, Card, Modal, PageTitle } from "@/components/ui";
import TicketVente from "@/components/TicketVente";
import GardeVendeur from "@/components/GardeVendeur";

const TAILLE_PAGE = 10;

/** Historique des ventes du vendeur connecté, avec détail et ticket. */
function MesVentes() {
  const [ventes, setVentes] = useState<Vente[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [detail, setDetail] = useState<Vente | null>(null);
  const [ticket, setTicket] = useState<Vente | null>(null);

  // Chargement async : setState uniquement dans les callbacks de réponse
  const load = useCallback(() => {
    const params = new URLSearchParams({ page: String(page), size: String(TAILLE_PAGE) });
    api<{ content: Vente[]; totalElements: number }>(`/ventes/mes-ventes?${params}`)
      .then((res) => {
        setVentes(res.content);
        setTotal(res.totalElements);
        setError("");
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Impossible de charger vos ventes");
        setLoading(false);
      });
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / TAILLE_PAGE));

  /** Ouvre le détail d'une vente en rechargeant la vente complète (lignes garanties). */
  const ouvrirDetail = (v: Vente) => {
    if (!v.id) {
      setDetail(v);
      return;
    }
    api<Vente>(`/ventes/${v.id}`)
      .then((complete) => setDetail(complete))
      .catch(() => setDetail(v)); // repli : données de la liste si l'appel échoue
  };

  if (error && ventes.length === 0) {
    return (
      <div>
        <PageTitle title="Mes ventes" subtitle="Historique de vos ventes" />
        <div className="glass flex flex-col items-center gap-4 p-12 text-center">
          <AlertTriangle className="h-10 w-10 text-rose-400" />
          <p className="text-sm text-slate-300">{error}</p>
          <Button variant="secondary" onClick={load} loading={loading}>
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
        title="Mes ventes"
        subtitle={`${total} vente${total > 1 ? "s" : ""} enregistrée${total > 1 ? "s" : ""} par vous`}
        actions={
          <Button variant="secondary" onClick={load} loading={loading}>
            <RefreshCw className="h-4 w-4" />
            Actualiser
          </Button>
        }
      />

      <Card>
        {loading ? (
          <div className="p-6 text-center text-sm text-slate-500">Chargement…</div>
        ) : ventes.length === 0 ? (
          <div className="p-6">
            <div className="rounded-xl border border-dashed border-white/10 p-10 text-center">
              <Receipt className="mx-auto h-8 w-8 text-slate-600" />
              <p className="mt-3 text-sm text-slate-400">
                Vous n&apos;avez encore aucune vente. Rendez-vous dans la caisse pour enregistrer
                votre première vente.
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">N°</th>
                  <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Date</th>
                  <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Client</th>
                  <th className="px-6 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">Articles</th>
                  <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Total</th>
                  <th className="px-6 py-3.5" />
                </tr>
              </thead>
              <tbody>
                {ventes.map((v) => (
                  <tr key={v.id} className="border-b border-white/[0.03] transition hover:bg-white/[0.03]">
                    <td className="px-6 py-4">
                      <span className="font-mono text-xs font-semibold text-indigo-300">{v.code}</span>
                    </td>
                    <td className="px-6 py-4 text-slate-300">{dateTime(v.dateVente)}</td>
                    <td className="px-6 py-4 text-slate-400">{v.nomClient || "—"}</td>
                    <td className="px-6 py-4 text-center">
                      <Badge color="indigo">{nombreArticles(v)}</Badge>
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-white">{money(montantVente(v))}</td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => ouvrirDetail(v)}>
                          <Eye className="h-3.5 w-3.5" />
                          Détail
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {total > TAILLE_PAGE && (
          <div className="flex items-center justify-between border-t border-white/[0.06] px-6 py-4">
            <p className="text-xs text-slate-500">
              Page {page + 1}/{totalPages}
            </p>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>
                Précédent
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={page + 1 >= totalPages}
                onClick={() => setPage(page + 1)}
              >
                Suivant
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Détail de la vente */}
      <Modal open={!!detail} onClose={() => setDetail(null)} title={`Vente ${detail?.code ?? ""}`} wide>
        {detail && (
          <div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-slate-500">Date</p>
                <p className="text-slate-200">{dateTime(detail.dateVente)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Client</p>
                <p className="text-slate-200">{detail.nomClient || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Vendeur</p>
                <p className="text-slate-200">{detail.nomVendeur || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Articles</p>
                <p className="text-slate-200">{nombreArticles(detail)}</p>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              {(detail.ligneVentes ?? []).map((l) => (
                <div
                  key={l.id ?? `${l.article?.id}-${l.prixUnitaire}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm text-slate-200">{l.article?.designation ?? "—"}</p>
                    <p className="font-mono text-[11px] text-slate-500">{l.article?.codeArticle}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-medium text-white">
                      {Number(l.quantite ?? 0)} × {money(l.prixUnitaire)}
                    </p>
                    <p className="text-xs text-slate-400">
                      Total : {money(Number(l.quantite ?? 0) * Number(l.prixUnitaire ?? 0))}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 flex items-center justify-between border-t border-white/[0.06] pt-4">
              <span className="text-sm text-slate-400">Montant total</span>
              <span className="text-2xl font-bold text-white">{money(montantVente(detail))}</span>
            </div>

            <div className="mt-5 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setDetail(null)}>
                Fermer
              </Button>
              <Button
                onClick={() => {
                  setTicket(detail);
                  setDetail(null);
                }}
              >
                <Receipt className="h-4 w-4" />
                Afficher le ticket
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {ticket && <TicketVente vente={ticket} onClose={() => setTicket(null)} />}
    </div>
  );
}

export default function MesVentesPage() {
  return (
    <GardeVendeur>
      <MesVentes />
    </GardeVendeur>
  );
}
