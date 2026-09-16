"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Download, FileSpreadsheet, Package, Plus, Trash2 } from "lucide-react";
import { api, downloadFile } from "@/lib/api";
import type { Article, Category } from "@/lib/types";
import { money } from "@/lib/format";
import { useAuth, canManage } from "@/lib/auth";
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

const EMPTY: Article = {
  codeArticle: "",
  designation: "",
  prixUnitaire: 0,
  tauxTva: 18,
  prixUnitaireTTc: 0,
  seuilAlerte: 0,
  category: {},
};

function ArticlesInner() {
  const { roles } = useAuth();
  const manage = canManage(roles);
  const { toast, Toaster } = useToast();
  const searchParams = useSearchParams();

  const [articles, setArticles] = useState<Article[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [sousSeuilIds, setSousSeuilIds] = useState<Set<number>>(new Set());
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("id");
  const [sortDir, setSortDir] = useState("asc");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Article | null>(null);
  const [form, setForm] = useState<Article>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<Article | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        size: String(size),
        sortBy,
        sortDir,
      });
      if (search) params.set("search", search);
      const res = await api<{ content: Article[]; totalElements: number }>(
        `/articles/paged?${params}`
      );
      setArticles(res.content);
      setTotal(res.totalElements);

      const sousSeuil = await api<Article[]>("/articles/sous-seuil");
      setSousSeuilIds(new Set(sousSeuil.map((a) => a.id).filter((id): id is number => id !== undefined)));
    } finally {
      setLoading(false);
    }
  }, [page, size, search, sortBy, sortDir]);

  const loadCategories = useCallback(async () => {
    try {
      setCategories(await api<Category[]>("/categories/all"));
    } catch {
      /* silencieux */
    }
  }, []);

  useEffect(() => {
    load();
    loadCategories();
  }, [load, loadCategories]);

  useEffect(() => {
    if (searchParams.get("alerte") === "1") {
      setSearch("");
    }
  }, [searchParams]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY);
    setModalOpen(true);
  };

  const openEdit = (a: Article) => {
    setEditing(a);
    setForm({ ...a, category: a.category ?? {} });
    setModalOpen(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      await api<Article>("/articles/create", { method: "POST", body: form });
      toast(editing ? "Article modifié" : "Article créé");
      setModalOpen(false);
      load();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Enregistrement impossible", "error");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!deleting?.id) return;
    try {
      await api(`/articles/delete/${deleting.id}`, { method: "DELETE" });
      toast("Article supprimé");
      setDeleting(null);
      load();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Suppression impossible", "error");
    }
  };

  const columns: Column<Article>[] = [
    {
      key: "codeArticle",
      header: "Code",
      sortable: true,
      render: (a) => (
        <span className="font-mono text-xs font-semibold text-indigo-300">{a.codeArticle}</span>
      ),
    },
    {
      key: "designation",
      header: "Désignation",
      sortable: true,
      render: (a) => (
        <div>
          <p className="font-medium text-slate-200">{a.designation}</p>
          <p className="text-[11px] text-slate-500">
            {a.category?.designation || a.category?.codeCategory || "Sans catégorie"}
          </p>
        </div>
      ),
    },
    {
      key: "prixUnitaire",
      header: "PU HT",
      sortable: true,
      align: "right",
      render: (a) => <span className="text-slate-300">{money(a.prixUnitaire)}</span>,
    },
    {
      key: "tauxTva",
      header: "TVA",
      align: "right",
      render: (a) => <span className="text-slate-400">{a.tauxTva ?? 0} %</span>,
    },
    {
      key: "prixUnitaireTTc",
      header: "PU TTC",
      sortable: true,
      align: "right",
      render: (a) => <span className="font-semibold text-white">{money(a.prixUnitaireTTc)}</span>,
    },
    {
      key: "seuilAlerte",
      header: "Seuil",
      sortable: true,
      align: "center",
      render: (a) => (
        <div className="flex items-center justify-center">
          {a.id && sousSeuilIds.has(a.id) ? (
            <Badge color="red">Stock bas</Badge>
          ) : (
            <span className="text-slate-500">{a.seuilAlerte ?? "—"}</span>
          )}
        </div>
      ),
    },
    ...(manage
      ? [
          {
            key: "actions",
            header: "",
            align: "right" as const,
            render: (a: Article) => (
              <div className="flex justify-end gap-1">
                <Button variant="ghost" size="sm" onClick={() => openEdit(a)}>
                  Modifier
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setDeleting(a)}>
                  <Trash2 className="h-3.5 w-3.5 text-red-300" />
                </Button>
              </div>
            ),
          },
        ]
      : []),
  ];

  return (
    <div>
      <PageTitle
        title="Articles"
        subtitle={`${total} référence${total > 1 ? "s" : ""} dans votre stock`}
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() => downloadFile("/exports/articles/excel", "articles.xlsx")}
            >
              <FileSpreadsheet className="h-4 w-4" />
              Excel
            </Button>
            <Button variant="secondary" onClick={() => downloadFile("/exports/articles/csv", "articles.csv")}>
              <Download className="h-4 w-4" />
              CSV
            </Button>
            {manage && (
              <Button onClick={openCreate}>
                <Plus className="h-4 w-4" />
                Nouvel article
              </Button>
            )}
          </>
        }
      />

      <DataTable
        columns={columns}
        rows={articles}
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
        searchPlaceholder="Rechercher un article, un code…"
        sortBy={sortBy}
        sortDir={sortDir}
        onSort={(sb, sd) => {
          setSortBy(sb);
          setSortDir(sd);
        }}
        rowKey={(a) => String(a.id)}
        emptyMessage="Aucun article trouvé"
        toolbar={
          <div className="flex items-center gap-2">
            <Badge color="indigo">
              <Package className="h-3 w-3" />
              {articles.length} affichés
            </Badge>
            {sousSeuilIds.size > 0 && (
              <Badge color="red">{sousSeuilIds.size} sous seuil</Badge>
            )}
          </div>
        }
      />

      {/* Modal création / édition */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Modifier l'article" : "Nouvel article"}
        wide
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Code article">
            <Input
              value={form.codeArticle}
              onChange={(e) => setForm({ ...form, codeArticle: e.target.value })}
              placeholder="ART-001"
            />
          </Field>
          <Field label="Désignation">
            <Input
              value={form.designation}
              onChange={(e) => setForm({ ...form, designation: e.target.value })}
              placeholder="Clavier mécanique"
            />
          </Field>
          <Field label="Prix unitaire HT (FCFA)">
            <Input
              type="number"
              value={form.prixUnitaire}
              onChange={(e) => setForm({ ...form, prixUnitaire: Number(e.target.value) })}
            />
          </Field>
          <Field label="Taux TVA (%)">
            <Input
              type="number"
              value={form.tauxTva}
              onChange={(e) => setForm({ ...form, tauxTva: Number(e.target.value) })}
            />
          </Field>
          <Field label="Prix unitaire TTC (FCFA)">
            <Input
              type="number"
              value={form.prixUnitaireTTc}
              onChange={(e) => setForm({ ...form, prixUnitaireTTc: Number(e.target.value) })}
            />
          </Field>
          <Field label="Seuil d'alerte stock">
            <Input
              type="number"
              value={form.seuilAlerte}
              onChange={(e) => setForm({ ...form, seuilAlerte: Number(e.target.value) })}
              placeholder="10"
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Catégorie">
              <Select
                value={form.category?.id ?? ""}
                onChange={(e) =>
                  setForm({ ...form, category: { id: Number(e.target.value) || undefined } })
                }
              >
                <option value="">— Sélectionner —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.designation || c.codeCategory}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setModalOpen(false)}>
            Annuler
          </Button>
          <Button onClick={save} loading={saving}>
            {editing ? "Enregistrer" : "Créer l'article"}
          </Button>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={remove}
        title="Supprimer l'article"
        message={`Voulez-vous vraiment supprimer « ${deleting?.designation} » ? Cette action est irréversible.`}
      />

      {Toaster}
    </div>
  );
}

export default function ArticlesPage() {
  return (
    <Suspense fallback={null}>
      <ArticlesInner />
    </Suspense>
  );
}
