"use client";

import { useEffect, useState } from "react";
import { Printer, X } from "lucide-react";
import type { Vente } from "@/lib/types";
import { dateTime } from "@/lib/format";
import { montantLigne, montantVente, nombreArticles } from "@/lib/ventes";
import { Button, Modal } from "@/components/ui";

/**
 * Ticket de vente imprimable, réutilisé par la caisse (après validation)
 * et par « Mes ventes » (consultation / réimpression).
 */
export default function TicketVente({
  vente,
  dateLivraison,
  onClose,
}: {
  vente: Vente;
  /** Date de livraison (commandes livrées) — affichée seulement si présente. */
  dateLivraison?: string;
  onClose: () => void;
}) {
  const [impression, setImpression] = useState(false);

  // Retire la classe d'impression une fois la boîte système fermée
  useEffect(() => {
    if (!impression) return;
    const after = () => setImpression(false);
    window.addEventListener("afterprint", after);
    return () => window.removeEventListener("afterprint", after);
  }, [impression]);

  const imprimer = () => {
    setImpression(true);
    window.print();
  };

  const lignes = vente.ligneVentes ?? [];

  return (
    <Modal open onClose={onClose} title={`Ticket ${vente.code ?? ""}`} wide>
      <div className="ticket-printable rounded-xl border border-white/10 bg-white p-6 text-slate-900 shadow-inner">
        <div className="text-center">
          <p className="text-lg font-bold uppercase tracking-widest">STOCK-HUB</p>
          <p className="text-xs text-slate-500">Ticket de vente</p>
        </div>

        <div className="mt-4 border-t border-dashed border-slate-300 pt-3 text-xs">
          <div className="flex justify-between">
            <span className="text-slate-500">N°</span>
            <span className="font-mono font-semibold">{vente.code ?? "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Date</span>
            <span>{dateTime(vente.dateVente)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Vendeur</span>
            <span>{vente.nomVendeur ?? "—"}</span>
          </div>
          {vente.nomClient && (
            <div className="flex justify-between">
              <span className="text-slate-500">Client</span>
              <span>{vente.nomClient}</span>
            </div>
          )}
          {dateLivraison && (
            <div className="flex justify-between">
              <span className="text-slate-500">Livrée le</span>
              <span>{dateTime(dateLivraison)}</span>
            </div>
          )}
        </div>

        <table className="mt-4 w-full border-t border-dashed border-slate-300 text-xs">
          <thead>
            <tr className="text-left text-slate-500">
              <th className="py-2">Article</th>
              <th className="py-2 text-center">Qté</th>
              <th className="py-2 text-right">P.U.</th>
              <th className="py-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {lignes.map((l) => (
              <tr key={l.id ?? `${l.article?.id}-${l.prixUnitaire}`} className="border-t border-slate-200">
                <td className="py-2 pr-2 font-medium">{l.article?.designation ?? "—"}</td>
                <td className="py-2 text-center">{Number(l.quantite ?? 0)}</td>
                <td className="py-2 text-right">{Number(l.prixUnitaire ?? 0).toFixed(2)}</td>
                <td className="py-2 text-right font-semibold">{montantLigne(l).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-3 flex justify-between border-t-2 border-slate-800 pt-3 text-base font-bold">
          <span>TOTAL</span>
          <span>{montantVente(vente).toFixed(2)} FCFA</span>
        </div>
        <p className="mt-2 text-center text-[10px] text-slate-500">
          {nombreArticles(vente)} article{nombreArticles(vente) > 1 ? "s" : ""} · Merci de votre visite
        </p>
      </div>

      <div className="mt-5 flex justify-end gap-3">
        <Button variant="secondary" onClick={onClose}>
          <X className="h-4 w-4" />
          Fermer
        </Button>
        <Button onClick={imprimer}>
          <Printer className="h-4 w-4" />
          Imprimer
        </Button>
      </div>

      {/* Styles d'impression : seuls le ticket et les boutons d'action restent visibles.
          Injectés via <style> natif (styled-jsx n'est pas dépendance directe du projet). */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              body * { visibility: hidden; }
              .ticket-printable, .ticket-printable * { visibility: visible; }
              .ticket-printable {
                position: fixed;
                inset: 0;
                max-height: none;
                overflow: visible;
                border: none;
                box-shadow: none;
              }
            }
          `,
        }}
      />
    </Modal>
  );
}
