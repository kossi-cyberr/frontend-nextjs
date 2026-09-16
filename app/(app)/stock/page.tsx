"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowDownCircle, ArrowUpCircle, Boxes, PackageSearch } from "lucide-react";
import { api } from "@/lib/api";
import type { Article, MvtStk } from "@/lib/types";
import { dateTime, num } from "@/lib/format";
import { canManage, useAuth } from "@/lib/auth";
import {
  Badge,
  Button,
  Card,
  Field,
  Input,
  Modal,
  PageTitle,
  Select,
  useToast,
} from "@/components/ui";

const TYPES: Record<string, { color: "emerald" | "red" | "indigo"; label: string }> = {
  ENTREE: { color: "emerald", label: "Entrée" },
  SORTIE: { color: "red", label: "Sortie" },
  CORRECTION_POS: { color: "indigo", label: "Correction +" },
  CORRECTION_NEG: { color: "indigo", label: "Correction −" },
};

export default function StockPage() {
  const { roles } = useAuth();
  const manage = canManage(roles);
  const { toast, Toaster } = useToast();

  const [articles, setArticles] = useState<Article[]>([]);
  const [articleId, setArticleId] = useState("");
  const [stock, setStock] = useState<number | null>(null);
  const [movements, setMovements] = useState<MvtStk[]>([]);
  const [loading, setLoading] = useState(false);

  const [mvtOpen, setMvtOpen] = useState(false);
  const [mvtType, setMvtType] = useState<"entree" | "sortie" | "correctionpos" | "correctionneg">("entree");
  const [quantite, setQuantite] = useState(1);
  const [saving, setSaving] = useState(false);

  const loadArticle = useCallback(async () => {
    try {
      setArticles(await api<Article[]>("/articles/all"));
    } catch {
      /* silencieux */
    }
  }, []);

  useEffect(() => {
    loadArticle();
  }, [loadArticle]);

  const loadDetail = useCallback(
    async (id: string) => {
      if (!id) return;
      setLoading(true);
      try {
        const [stockVal, mvt] = await Promise.all([
          api<number>(`/mvtstk/stockreel/${id}`),
          api<MvtStk[]>(`/mvtstk/filter/article/${id}`),
        ]);
        setStock(stockVal);
        setMovements(mvt);
      } catch {
        setStock(null);
        setMovements([]);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    loadDetail(articleId);
  }, [articleId, loadDetail]);

  const doMvt = async () => {
    setSaving(true);
    try {
      await api(`/mvtstk/${mvtType}`, {
        method: "POST",
        body: { article: { id: Number(articleId) }, quantite },
      });
      toast("Mouvement enregistré");
      setMvtOpen(false);
      loadDetail(articleId);
      loadArticle();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Mouvement impossible", "error");
    } finally {
      setSaving(false);
    }
  };

  const openMvt = (type: typeof mvtType) => {
    setMvtType(type);
    setQuantite(1);
    setMvtOpen(true);
  };

  const selected = articles.find((a) => String(a.id) === articleId);
  const stockLow = selected?.seuilAlerte != null && stock != null && stock < selected.seuilAlerte;

  return (
    <div>
      <PageTitle title="Stock" subtitle="Suivez et ajustez les niveaux de stock par article" />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Sélecteur + niveau */}
        <Card className="p-6">
          <Field label="Article">
            <div className="relative">
              <PackageSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <Select className="pl-10" value={articleId} onChange={(e) => setArticleId(e.target.value)}>
                <option value="">— Sélectionner un article —</option>
                {articles.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.designation} ({a.codeArticle})
                  </option>
                ))}
              </Select>
            </div>
          </Field>

          {articleId && (
            <div className="mt-6">
              <div className="flex items-center gap-4">
                <div
                  className={`flex h-20 w-20 items-center justify-center rounded-2xl ${
                    stockLow
                      ? "bg-gradient-to-br from-rose-500/25 to-orange-500/25 text-rose-300"
                      : "bg-gradient-to-br from-indigo-500/25 to-violet-500/25 text-indigo-300"
                  }`}
                >
                  <Boxes className="h-9 w-9" />
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-widest text-slate-500">Stock réel</p>
                  {loading ? (
                    <p className="text-3xl font-bold text-slate-500">…</p>
                  ) : (
                    <p className="text-4xl font-bold tracking-tight text-white">{num(stock)}</p>
                  )}
                  {stockLow && <Badge color="red" className="mt-2">Sous le seuil ({num(selected?.seuilAlerte)})</Badge>}
                  {!stockLow && selected?.seuilAlerte != null && (
                    <Badge color="emerald" className="mt-2">Au-dessus du seuil</Badge>
                  )}
                </div>
              </div>

              {manage && (
                <div className="mt-6 grid grid-cols-2 gap-3">
                  <Button variant="success" onClick={() => openMvt("entree")}>
                    <ArrowUpCircle className="h-4 w-4" />
                    Entrée
                  </Button>
                  <Button variant="danger" onClick={() => openMvt("sortie")}>
                    <ArrowDownCircle className="h-4 w-4" />
                    Sortie
                  </Button>
                  <Button variant="secondary" onClick={() => openMvt("correctionpos")}>
                    Correction +
                  </Button>
                  <Button variant="secondary" onClick={() => openMvt("correctionneg")}>
                    Correction −
                  </Button>
                </div>
              )}
            </div>
          )}
        </Card>

        {/* Historique */}
        <Card className="xl:col-span-2">
          <div className="px-6 pt-6 pb-4">
            <h3 className="text-base font-semibold text-white">Historique des mouvements</h3>
            <p className="mt-0.5 text-xs text-slate-400">
              {selected ? `${selected.designation} — ${movements.length} mouvement(s)` : "Sélectionnez un article"}
            </p>
          </div>
          <div className="max-h-[26rem] space-y-2 overflow-y-auto px-6 pb-6">
            {!articleId && <p className="py-10 text-center text-sm text-slate-500">👈 Choisissez un article</p>}
            {articleId && !loading && movements.length === 0 && (
              <p className="py-10 text-center text-sm text-slate-500">Aucun mouvement enregistré</p>
            )}
            {movements.map((m) => {
              const cfg = TYPES[m.typeMvt ?? ""] ?? { color: "slate" as const, label: m.typeMvt ?? "—" };
              const positive = m.quantite != null && m.quantite >= 0;
              return (
                <div
                  key={m.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3 transition hover:bg-white/[0.05]"
                >
                  <div className="flex items-center gap-3">
                    {positive ? (
                      <ArrowUpCircle className="h-5 w-5 text-emerald-400" />
                    ) : (
                      <ArrowDownCircle className="h-5 w-5 text-red-400" />
                    )}
                    <div>
                      <p className="text-sm font-medium text-slate-200">{cfg.label}</p>
                      <p className="text-[11px] text-slate-500">
                        {dateTime(m.dateMvt)} · {m.sourceMvt ?? ""}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`text-lg font-bold ${
                      positive ? "text-emerald-300" : "text-red-300"
                    }`}
                  >
                    {positive ? "+" : ""}
                    {num(m.quantite)}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Modal quantité */}
      <Modal open={mvtOpen} onClose={() => setMvtOpen(false)} title="Nouveau mouvement">
        <Field label="Quantité">
          <Input
            type="number"
            min={1}
            value={quantite}
            onChange={(e) => setQuantite(Number(e.target.value))}
          />
        </Field>
        <p className="mt-3 text-xs text-slate-500">
          {mvtType === "sortie" || mvtType === "correctionneg"
            ? "Le montant sera déduit du stock."
            : "Le montant sera ajouté au stock."}
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setMvtOpen(false)}>
            Annuler
          </Button>
          <Button onClick={doMvt} loading={saving}>
            Valider
          </Button>
        </div>
      </Modal>

      {Toaster}
    </div>
  );
}
