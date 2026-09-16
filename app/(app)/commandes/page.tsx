"use client";

import { useCallback, useEffect, useState } from "react";
import { Eye, FileText, Plus, Trash2, X } from "lucide-react";
import { api, downloadFile } from "@/lib/api";
import type { Article, Client, CommandeClient, EtatCommande, LigneVente } from "@/lib/types";
import { dateTime, money, numberValue } from "@/lib/format";
import { canManage, useAuth } from "@/lib/auth";
import {
  Badge,
  Button,
  ConfirmDialog,
  EtatBadge,
  Field,
  Input,
  Modal,
  PageTitle,
  Select,
  useToast,
} from "@/components/ui";
import DataTable, { type Column } from "@/components/DataTable";

const ETATS: EtatCommande[] = ["EN_PREPARATION", "VALIDEE", "LIVREE"];

export default function CommandesPage() {
  const { roles } = useAuth();
  const manage = canManage(roles);
  const { toast, Toaster } = useToast();

  const [rows, setRows] = useState<CommandeClient[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [search, setSearch] = useState("");

  const [lines, setLines] = useState<LigneVente[]>([]);
  const [linesOpen, setLinesOpen] = useState(false);
  const [deleting, setDeleting] = useState<CommandeClient | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [creating, setCreating] = useState(false);
  const [newCmd, setNewCmd] = useState({
    code: "",
    clientId: "",
    lignes: [] as { articleId: string; quantite: number; prixUnitaire: number }[],
  });

  // Code par défaut généré à l'ouverture du modal (Date.now() est impure au rendu)
  const openCreate = () => {
    setNewCmd((c) => ({ ...c, code: `CMD-${Date.now().toString().slice(-6)}` }));
    setCreateOpen(true);
  };

  // Chargement async : setState dans les callbacks de réponse
  const load = useCallback(() => {
    const params = new URLSearchParams({ page: String(page), size: String(size) });
    if (search) params.set("search", search);
    api<{ content: CommandeClient[]; totalElements: number }>(`/commandesclients/paged?${params}`)
      .then((res) => {
        setRows(res.content);
        setTotal(res.totalElements);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [page, size, search]);

  const loadRefs = useCallback(() => {
    Promise.all([api<Client[]>("/clients/all"), api<Article[]>("/articles/all")])
      .then(([c, a]) => {
        setClients(c);
        setArticles(a);
      })
      .catch(() => undefined /* silencieux */);
  }, []);

  useEffect(() => {
    load();
    loadRefs();
  }, [load, loadRefs]);

  const openLines = async (cmd: CommandeClient) => {
    try {
      const res = await api<LigneVente[]>(`/commandesclients/lignesCommande/${cmd.id}`);
      setLines(res);
      setLinesOpen(true);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Impossible de charger les lignes", "error");
    }
  };

  const changeEtat = async (cmd: CommandeClient, etat: EtatCommande) => {
    try {
      await api(`/commandesclients/update/etat/${cmd.id}/${etat}`, { method: "PATCH" });
      toast(`Commande passée à « ${etat} »`);
      load();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Changement d'état impossible", "error");
    }
  };

  const remove = async () => {
    if (!deleting?.id) return;
    try {
      await api(`/commandesclients/delete/${deleting.id}`, { method: "DELETE" });
      toast("Commande supprimée");
      setDeleting(null);
      load();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Suppression impossible", "error");
    }
  };

  const addLine = () => {
    setNewCmd((c) => ({
      ...c,
      lignes: [...c.lignes, { articleId: "", quantite: 1, prixUnitaire: 0 }],
    }));
  };

  const updateLine = (idx: number, patch: Partial<{ articleId: string; quantite: number; prixUnitaire: number }>) => {
    setNewCmd((c) => ({
      ...c,
      lignes: c.lignes.map((l, i) => (i === idx ? { ...l, ...patch } : l)),
    }));
  };

  const create = async () => {
    // Validation : client choisi et lignes complètes avant l'appel API
    if (!newCmd.clientId) {
      toast("Veuillez sélectionner un client", "error");
      return;
    }
    const lignesInvalides = newCmd.lignes.filter((l) => !l.articleId || l.quantite <= 0);
    if (lignesInvalides.length > 0) {
      toast("Chaque ligne doit avoir un article et une quantité positive", "error");
      return;
    }
    setCreating(true);
    try {
      await api("/commandesclients/create", {
        method: "POST",
        body: {
          code: newCmd.code,
          dateComande: new Date().toISOString(),
          etatCommande: "EN_PREPARATION",
          client: { id: Number(newCmd.clientId) },
          ligneComandeClientList: newCmd.lignes.map((l) => ({
            article: { id: Number(l.articleId) },
            quantite: l.quantite,
            prixUnitaire: l.prixUnitaire,
          })),
        },
      });
      toast("Commande créée");
      setCreateOpen(false);
      setNewCmd({ code: `CMD-${Date.now().toString().slice(-6)}`, clientId: "", lignes: [] });
      load();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Création impossible", "error");
    } finally {
      setCreating(false);
    }
  };

  const columns: Column<CommandeClient>[] = [
    {
      key: "code",
      header: "Commande",
      sortable: true,
      render: (c) => <span className="font-mono text-xs font-semibold text-indigo-300">{c.code}</span>,
    },
    {
      key: "dateComande",
      header: "Date",
      sortable: true,
      render: (c) => <span className="text-slate-300">{dateTime(c.dateComande)}</span>,
    },
    {
      key: "client",
      header: "Client",
      render: (c) => (
        <span className="text-slate-200">
          {c.client ? `${c.client.nom} ${c.client.prenom ?? ""}` : "—"}
        </span>
      ),
    },
    {
      key: "etatCommande",
      header: "État",
      sortable: true,
      render: (c) => <EtatBadge etat={c.etatCommande} />,
    },
    {
      key: "actions",
      header: "Actions",
      render: (c) => (
        <div className="flex flex-wrap items-center gap-2">
          {manage && (
            <Select
              className="!w-36 !py-1.5 text-xs"
              value={c.etatCommande ?? ""}
              onChange={(e) => changeEtat(c, e.target.value as EtatCommande)}
            >
              <option value="" disabled>
                État…
              </option>
              {ETATS.map((e) => (
                <option key={e} value={e}>
                  {e.replaceAll("_", " ")}
                </option>
              ))}
            </Select>
          )}
          <Button variant="ghost" size="sm" onClick={() => openLines(c)}>
            <Eye className="h-3.5 w-3.5" />
            Lignes
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => downloadFile(`/commandesclients/${c.id}/facture/pdf`, `facture-${c.code}.pdf`)}
          >
            <FileText className="h-3.5 w-3.5" />
            PDF
          </Button>
          {manage && (
            <Button variant="ghost" size="sm" onClick={() => setDeleting(c)}>
              <Trash2 className="h-3.5 w-3.5 text-red-300" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageTitle
        title="Commandes clients"
        subtitle={`${total} commande${total > 1 ? "s" : ""}`}
        actions={
          manage && (
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Nouvelle commande
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
        searchPlaceholder="Rechercher un code…"
        rowKey={(c) => String(c.id)}
        emptyMessage="Aucune commande trouvée"
        toolbar={<Badge color="indigo">Suivi des états en temps réel</Badge>}
      />

      {/* Détail des lignes */}
      <Modal open={linesOpen} onClose={() => setLinesOpen(false)} title="Lignes de la commande" wide>
        <div className="space-y-2">
          {lines.length === 0 && <p className="py-6 text-center text-sm text-slate-500">Aucune ligne</p>}
          {lines.map((l) => (
            <div
              key={l.id}
              className="flex items-center justify-between rounded-xl border border-white/[0.07] bg-white/[0.03] px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium text-slate-200">{l.article?.designation}</p>
                <p className="text-[11px] text-slate-500">{l.article?.codeArticle}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-white">
                  {money((l.prixUnitaire ?? 0) * (l.quantite ?? 0))}
                </p>
                <p className="text-[11px] text-slate-500">
                  {l.quantite} × {money(l.prixUnitaire)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Modal>

      {/* Création de commande */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Nouvelle commande client"
        wide
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Code">
            <Input value={newCmd.code} onChange={(e) => setNewCmd({ ...newCmd, code: e.target.value })} />
          </Field>
          <Field label="Client">
            <Select
              value={newCmd.clientId}
              onChange={(e) => setNewCmd({ ...newCmd, clientId: e.target.value })}
            >
              <option value="">— Sélectionner —</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nom} {c.prenom}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Articles ({newCmd.lignes.length})
            </span>
            <Button variant="secondary" size="sm" onClick={addLine}>
              <Plus className="h-3.5 w-3.5" />
              Ajouter
            </Button>
          </div>
          <div className="space-y-3">
            {newCmd.lignes.length === 0 && (
              <p className="rounded-xl border border-dashed border-white/10 py-6 text-center text-xs text-slate-500">
                Ajoutez au moins un article
              </p>
            )}
            {newCmd.lignes.map((l, idx) => (
              <div key={idx} className="flex flex-wrap items-end gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
                <div className="min-w-44 flex-1">
                  <Field label="Article">
                    <Select
                      value={l.articleId}
                      onChange={(e) => {
                        // Empêche deux lignes avec le même article
                        if (newCmd.lignes.some((x, i) => i !== idx && x.articleId === e.target.value)) {
                          toast("Cet article est déjà dans la commande", "error");
                          return;
                        }
                        const art = articles.find((a) => String(a.id) === e.target.value);
                        updateLine(idx, {
                          articleId: e.target.value,
                          prixUnitaire: art?.prixUnitaireTTc ?? 0,
                        });
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
                    <Input
                      type="number"
                      min={1}
                      value={l.quantite}
                      onChange={(e) => updateLine(idx, { quantite: numberValue(e.target.value) })}
                    />
                  </Field>
                </div>
                <div className="w-32">
                  <Field label="PU TTC">
                    <Input
                      type="number"
                      min={0}
                      value={l.prixUnitaire}
                      onChange={(e) => updateLine(idx, { prixUnitaire: numberValue(e.target.value) })}
                    />
                  </Field>
                </div>
                <div className="pb-2">
                  <Button variant="ghost" size="sm" onClick={() => setNewCmd((c) => ({ ...c, lignes: c.lignes.filter((_, i) => i !== idx) }))}>
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
          <Button onClick={create} loading={creating} disabled={!newCmd.clientId || newCmd.lignes.length === 0}>
            Créer la commande
          </Button>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={remove}
        title="Supprimer la commande"
        message={`Supprimer la commande « ${deleting?.code} » ?`}
      />

      {Toaster}
    </div>
  );
}
