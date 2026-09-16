"use client";

import { useCallback, useEffect, useState } from "react";
import { Mail, MapPin, Phone, Plus, Trash2, Truck, Users } from "lucide-react";
import { api } from "@/lib/api";
import { canManage, useAuth } from "@/lib/auth";
import {
  Button,
  ConfirmDialog,
  Field,
  Input,
  Modal,
  PageTitle,
  useToast,
} from "@/components/ui";
import DataTable, { type Column } from "@/components/DataTable";

interface Partner {
  id?: number;
  nom?: string;
  prenom?: string;
  mail?: string;
  numTel?: string;
  adresse?: { addresse1?: string; Ville?: string; pays?: string };
}

const EMPTY: Partner = { nom: "", prenom: "", mail: "", numTel: "", adresse: { addresse1: "", Ville: "", pays: "" } };

export default function PartnersPage({ kind }: { kind: "clients" | "fournisseurs" }) {
  const { roles } = useAuth();
  const manage = canManage(roles);
  const { toast, Toaster } = useToast();
  const isClient = kind === "clients";

  const [rows, setRows] = useState<Partner[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("id");
  const [sortDir, setSortDir] = useState("asc");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Partner | null>(null);
  const [form, setForm] = useState<Partner>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<Partner | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), size: String(size), sortBy, sortDir });
      if (search) params.set("search", search);
      const res = await api<{ content: Partner[]; totalElements: number }>(`/${kind}/paged?${params}`);
      setRows(res.content);
      setTotal(res.totalElements);
    } finally {
      setLoading(false);
    }
  }, [kind, page, size, search, sortBy, sortDir]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY);
    setModalOpen(true);
  };

  const openEdit = (p: Partner) => {
    setEditing(p);
    setForm({ ...p, adresse: p.adresse ?? {} });
    setModalOpen(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      await api(`/${kind}/create`, { method: "POST", body: form });
      toast(editing ? "Enregistré" : "Créé avec succès");
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
      await api(`/${kind}/delete/${deleting.id}`, { method: "DELETE" });
      toast("Supprimé");
      setDeleting(null);
      load();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Suppression impossible", "error");
    }
  };

  const columns: Column<Partner>[] = [
    {
      key: "nom",
      header: "Nom",
      sortable: true,
      render: (p) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/30 to-violet-500/30 text-xs font-bold text-indigo-200">
            {`${(p.nom ?? "?").charAt(0)}${(p.prenom ?? "").charAt(0)}`.toUpperCase()}
          </div>
          <div>
            <p className="font-medium text-slate-200">
              {p.nom} {p.prenom}
            </p>
            {p.adresse?.Ville && <p className="text-[11px] text-slate-500">{p.adresse.Ville}</p>}
          </div>
        </div>
      ),
    },
    {
      key: "mail",
      header: "Email",
      render: (p) =>
        p.mail ? (
          <span className="inline-flex items-center gap-1.5 text-slate-300">
            <Mail className="h-3.5 w-3.5 text-slate-500" />
            {p.mail}
          </span>
        ) : (
          <span className="text-slate-600">—</span>
        ),
    },
    {
      key: "numTel",
      header: "Téléphone",
      render: (p) =>
        p.numTel ? (
          <span className="inline-flex items-center gap-1.5 text-slate-300">
            <Phone className="h-3.5 w-3.5 text-slate-500" />
            {p.numTel}
          </span>
        ) : (
          <span className="text-slate-600">—</span>
        ),
    },
    {
      key: "adresse",
      header: "Adresse",
      render: (p) =>
        p.adresse?.addresse1 ? (
          <span className="inline-flex items-center gap-1.5 text-slate-400">
            <MapPin className="h-3.5 w-3.5 text-slate-600" />
            {p.adresse.addresse1}
          </span>
        ) : (
          <span className="text-slate-600">—</span>
        ),
    },
    ...(manage
      ? [
          {
            key: "actions",
            header: "",
            align: "right" as const,
            render: (p: Partner) => (
              <div className="flex justify-end gap-1">
                <Button variant="ghost" size="sm" onClick={() => openEdit(p)}>
                  Modifier
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setDeleting(p)}>
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
        title={isClient ? "Clients" : "Fournisseurs"}
        subtitle={`${total} ${isClient ? "client" : "fournisseur"}${total > 1 ? "s" : ""} enregistré${total > 1 ? "s" : ""}`}
        actions={
          manage && (
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Nouveau
            </Button>
          )
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
        searchPlaceholder={`Rechercher un ${isClient ? "client" : "fournisseur"}…`}
        sortBy={sortBy}
        sortDir={sortDir}
        onSort={(sb, sd) => {
          setSortBy(sb);
          setSortDir(sd);
        }}
        rowKey={(p) => String(p.id)}
        emptyMessage={isClient ? "Aucun client trouvé" : "Aucun fournisseur trouvé"}
        toolbar={
          isClient ? (
            <Users className="h-4 w-4 text-indigo-400" />
          ) : (
            <Truck className="h-4 w-4 text-indigo-400" />
          )
        }
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Modifier" : isClient ? "Nouveau client" : "Nouveau fournisseur"}
        wide
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nom">
            <Input value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} />
          </Field>
          <Field label="Prénom">
            <Input value={form.prenom} onChange={(e) => setForm({ ...form, prenom: e.target.value })} />
          </Field>
          <Field label="Email">
            <Input
              type="email"
              value={form.mail}
              onChange={(e) => setForm({ ...form, mail: e.target.value })}
            />
          </Field>
          <Field label="Téléphone">
            <Input value={form.numTel} onChange={(e) => setForm({ ...form, numTel: e.target.value })} />
          </Field>
          <Field label="Adresse">
            <Input
              value={form.adresse?.addresse1 ?? ""}
              onChange={(e) =>
                setForm({ ...form, adresse: { ...(form.adresse ?? {}), addresse1: e.target.value } })
              }
            />
          </Field>
          <Field label="Ville">
            <Input
              value={form.adresse?.Ville ?? ""}
              onChange={(e) =>
                setForm({ ...form, adresse: { ...(form.adresse ?? {}), Ville: e.target.value } })
              }
            />
          </Field>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setModalOpen(false)}>
            Annuler
          </Button>
          <Button onClick={save} loading={saving}>
            Enregistrer
          </Button>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={remove}
        title="Supprimer"
        message={`Supprimer « ${deleting?.nom} ${deleting?.prenom ?? ""} » ? Les enregistrements liés bloqueront la suppression.`}
      />

      {Toaster}
    </div>
  );
}
