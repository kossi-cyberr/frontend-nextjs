"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Receipt, Trash2, X } from "lucide-react";
import { api } from "@/lib/api";
import type { Article, Vente } from "@/lib/types";
import { dateTime, numberValue } from "@/lib/format";
import { canManage, useAuth } from "@/lib/auth";
import {
  Badge,
  Button,
  ConfirmDialog,
  Field,
  Input,
  Modal,
  PageTitle,
  Select,
  useToast,
} from "@/components/ui";
import DataTable, { type Column } from "@/components/DataTable";

export default function VentesPage() {
  const { roles } = useAuth();
  const manage = canManage(roles);
  const { toast, Toaster } = useToast();

  const [rows, setRows] = useState<Vente[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [search, setSearch] = useState("");
  const [deleting, setDeleting] = useState<Vente | null>(null);

  const [articles, setArticles] = useState<Article[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    code: "",
    commentaire: "",
    lignes: [] as { articleId: string; quantite: number; prixUnitaire: number }[],
  });

  // Code par défaut généré une seule fois à l'ouverture du modal (Date.now() est impure au rendu)
  const openCreate = () => {
    setForm((f) => ({ ...f, code: `V-${Date.now().toString().slice(-6)}` }));
    setCreateOpen(true);
  };

  // Chargement async : setState dans les callbacks de réponse
  const load = useCallback(() => {
    const params = new URLSearchParams({ page: String(page), size: String(size) });
    if (search) params.set("search", search);
    api<{ content: Vente[]; totalElements: number }>(`/ventes/paged?${params}`)
      .then((res) => {
        setRows(res.content);
        setTotal(res.totalElements);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [page, size, search]);

  useEffect(() => {
    load();
    api<Article[]>("/articles/all")
      .then(setArticles)
      .catch(() => undefined);
  }, [load]);

  const addLine = () => setForm((f) => ({ ...f, lignes: [...f.lignes, { articleId: "", quantite: 1, prixUnitaire: 0 }] }));

  const updateLine = (idx: number, patch: Partial<{ articleId: string; quantite: number; prixUnitaire: number }>) =>
    setForm((f) => ({ ...f, lignes: f.lignes.map((l, i) => (i === idx ? { ...l, ...patch } : l)) }));

  const create = async () => {
    // Validation : au moins une ligne complète avant l'appel API
    const lignesInvalides = form.lignes.filter((l) => !l.articleId || l.quantite <= 0);
    if (lignesInvalides.length > 0) {
      toast("Chaque ligne doit avoir un article et une quantité positive", "error");
      return;
    }
    setCreating(true);
    try {
      await api("/ventes/create", {
        method: "POST",
        body: {
          code: form.code,
          dateVente: new Date().toISOString(),
          commentaire: form.commentaire,
          ligneVentes: form.lignes.map((l) => ({
            article: { id: Number(l.articleId) },
            quantite: l.quantite,
            prixUnitaire: l.prixUnitaire,
          })),
        },
      });
      toast("Vente enregistrée — stock mis à jour");
      setCreateOpen(false);
      setForm({ code: `V-${Date.now().toString().slice(-6)}`, commentaire: "", lignes: [] });
      load();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Enregistrement impossible", "error");
    } finally {
      setCreating(false);
    }
  };

  const remove = async () => {
    if (!deleting?.id) return;
    try {
      await api(`/ventes/delete/${deleting.id}`, { method: "DELETE" });
      toast("Vente supprimée");
      setDeleting(null);
      load();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Suppression impossible", "error");
    }
  };

  const columns: Column<Vente>[] = [
    {
      key: "code",
      header: "Code",
      sortable: true,
      render: (v) => <span className="font-mono text-xs font-semibold text-indigo-300">{v.code}</span>,
    },
    {
      key: "dateVente",
      header: "Date",
      sortable: true,
      render: (v) => <span className="text-slate-300">{dateTime(v.dateVente)}</span>,
    },
    {
      key: "commentaire",
      header: "Commentaire",
      render: (v) => <span className="text-slate-400">{v.commentaire || "—"}</span>,
    },
    {
      key: "lignes",
      header: "Articles",
      render: (v) => (
        <Badge color="indigo">{(v.ligneVentes ?? []).length} ligne{(v.ligneVentes ?? []).length > 1 ? "s" : ""}</Badge>
      ),
    },
    ...(manage
      ? [
          {
            key: "actions",
            header: "",
            align: "right" as const,
            render: (v: Vente) => (
              <Button variant="ghost" size="sm" onClick={() => setDeleting(v)}>
                <Trash2 className="h-3.5 w-3.5 text-red-300" />
              </Button>
            ),
          },
        ]
      : []),
  ];

  return (
    <div>
      <PageTitle
        title="Ventes"
        subtitle={`${total} vente${total > 1 ? "s" : ""} — le stock est déduit automatiquement`}
        actions={
          // Création ouverte à tout utilisateur connecté (VENDEUR inclus) —
          // seul le bouton de suppression reste réservé à ADMIN/MANAGER.
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Nouvelle vente
          </Button>
        }
      />

      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        totalElements={total}
        page={page}
        size={size}
        onPageChange={setPage}
        onSizeChange={(s) => {
          setSize(s);
          setPage(0);
        }}
        searchValue={search}
        onSearch={(s) => {
          setSearch(s);
          setPage(0);
        }}
        searchPlaceholder="Rechercher un code…"
        rowKey={(v) => String(v.id)}
        emptyMessage="Aucune vente enregistrée"
        toolbar={<Receipt className="h-4 w-4 text-indigo-400" />}
      />

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Nouvelle vente" wide>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Code">
            <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
          </Field>
          <Field label="Commentaire">
            <Input
              value={form.commentaire}
              onChange={(e) => setForm({ ...form, commentaire: e.target.value })}
              placeholder="Vente au comptoir…"
            />
          </Field>
        </div>

        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Articles ({form.lignes.length})
            </span>
            <Button variant="secondary" size="sm" onClick={addLine}>
              <Plus className="h-3.5 w-3.5" />
              Ajouter
            </Button>
          </div>
          <div className="space-y-3">
            {form.lignes.length === 0 && (
              <p className="rounded-xl border border-dashed border-white/10 py-6 text-center text-xs text-slate-500">
                Ajoutez au moins un article
              </p>
            )}
            {form.lignes.map((l, idx) => (
              <div key={idx} className="flex flex-wrap items-end gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
                <div className="min-w-44 flex-1">
                  <Field label="Article">
                    <Select
                      value={l.articleId}
                      onChange={(e) => {
                        const art = articles.find((a) => String(a.id) === e.target.value);
                        updateLine(idx, { articleId: e.target.value, prixUnitaire: art?.prixUnitaireTTc ?? 0 });
                      }}
                    >
                      <option value="">— Choisir —</option>
                      {articles.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.designation} ({a.codeArticle})
                        </option>
                      ))}
                    </Select>
                  </Field>
                </div>
                <div className="w-24">
                  <Field label="Qté">
                    <Input type="number" min={1} value={l.quantite} onChange={(e) => updateLine(idx, { quantite: numberValue(e.target.value) })} />
                  </Field>
                </div>
                <div className="w-32">
                  <Field label="PU">
                    <Input type="number" min={0} value={l.prixUnitaire} onChange={(e) => updateLine(idx, { prixUnitaire: numberValue(e.target.value) })} />
                  </Field>
                </div>
                <div className="pb-2">
                  <Button variant="ghost" size="sm" onClick={() => setForm((f) => ({ ...f, lignes: f.lignes.filter((_, i) => i !== idx) }))}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setCreateOpen(false)}>
            Annuler
          </Button>
          <Button onClick={create} loading={creating} disabled={form.lignes.length === 0}>
            Enregistrer la vente
          </Button>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={remove}
        title="Supprimer la vente"
        message={`Supprimer la vente « ${deleting?.code} » ?`}
      />

      {Toaster}
    </div>
  );
}
