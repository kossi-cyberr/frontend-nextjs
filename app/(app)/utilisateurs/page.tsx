"use client";

import { useCallback, useEffect, useState } from "react";
import { ShieldCheck, ShieldPlus, UserPlus } from "lucide-react";
import { api } from "@/lib/api";
import type { Utilisateur } from "@/lib/types";
import { useAuth } from "@/lib/auth";
import {
  Badge,
  Button,
  Card,
  Field,
  Input,
  Modal,
  PageTitle,
  Select,
  Spinner,
  useToast,
} from "@/components/ui";

const ROLES_DISPONIBLES = ["ADMIN", "MANAGER", "VENDEUR"];

const ROLE_STYLE: Record<string, "indigo" | "cyan" | "amber"> = {
  ADMIN: "indigo",
  MANAGER: "cyan",
  VENDEUR: "amber",
};

const ADRESSE_VIDE = { addresse1: "", Ville: "", codePostale: "", pays: "" };

export default function UtilisateursPage() {
  const { user: me, isAdmin, refreshUser } = useAuth();
  const { toast, Toaster } = useToast();

  const [users, setUsers] = useState<Utilisateur[]>([]);
  const [loading, setLoading] = useState(true);

  // Formulaire de création
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    nom: "",
    prenom: "",
    email: "",
    motDePasse: "",
    dateDeNaissance: "1990-01-01",
    role: "VENDEUR",
    adresse: ADRESSE_VIDE,
  });

  // Chargement async : setState dans les callbacks de réponse
  const load = useCallback(() => {
    api<Utilisateur[]>("/utilisateurs/all")
      .then((users) => {
        setUsers(users);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const assignRole = async (u: Utilisateur, role: string) => {
    if (!u.id) return;
    try {
      await api(`/utilisateurs/roles/${u.id}/${role}`, { method: "PUT" });
      toast(`Rôle ${role} affecté à ${u.email}`);
      load();
      if (u.id === me?.id) refreshUser();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Affectation impossible", "error");
    }
  };

  const createUser = async () => {
    setCreating(true);
    try {
      const created = await api<Utilisateur>("/utilisateurs/create", {
        method: "POST",
        body: {
          nom: form.nom,
          prenom: form.prenom,
          email: form.email,
          motDePasse: form.motDePasse,
          dateDeNaissance: form.dateDeNaissance,
          adresse: form.adresse,
        },
      });
      if (form.role && created.id) {
        await api(`/utilisateurs/roles/${created.id}/${form.role}`, { method: "PUT" });
      }
      toast(`Utilisateur ${form.email} créé avec le rôle ${form.role}`);
      setShowCreate(false);
      setForm({
        nom: "",
        prenom: "",
        email: "",
        motDePasse: "",
        dateDeNaissance: "1990-01-01",
        role: "VENDEUR",
        adresse: ADRESSE_VIDE,
      });
      load();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Création impossible", "error");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div>
      <PageTitle
        title="Utilisateurs"
        subtitle="Gérez les accès et les rôles de votre équipe"
        actions={
          <div className="flex flex-wrap items-center gap-3">
            {isAdmin && (
              <Button onClick={() => setShowCreate(true)}>
                <UserPlus className="h-4 w-4" />
                Nouvel utilisateur
              </Button>
            )}
            <Badge color="indigo">
              <ShieldCheck className="h-3 w-3" />
              {isAdmin ? "Administrateur" : "Accès limité"}
            </Badge>
          </div>
        }
      />

      <Card>
        {loading ? (
          <Spinner />
        ) : users.length === 0 ? (
          <p className="py-12 text-center text-sm text-slate-500">Aucun utilisateur</p>
        ) : (
          <div className="divide-y divide-white/[0.05]">
            {users.map((u) => (
              <div
                key={u.id}
                className="flex flex-wrap items-center gap-4 px-6 py-4 transition hover:bg-white/[0.02]"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/30 to-violet-500/30 text-sm font-bold text-indigo-200">
                  {`${(u.nom ?? "?").charAt(0)}${(u.prenom ?? "").charAt(0)}`.toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-slate-200">
                    {u.nom} {u.prenom}
                    {u.id === me?.id && <span className="ml-2 text-[10px] text-slate-500">(vous)</span>}
                  </p>
                  <p className="truncate text-xs text-slate-500">{u.email}</p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {(u.roles ?? []).map((r) => (
                    <Badge key={r.id ?? r.rolename} color={ROLE_STYLE[r.rolename ?? ""] ?? "slate"}>
                      {r.rolename}
                    </Badge>
                  ))}
                  {(u.roles ?? []).length === 0 && (
                    <span className="text-[11px] text-slate-600">Aucun rôle</span>
                  )}
                </div>
                {isAdmin && (
                  <div className="flex items-center gap-2">
                    <ShieldPlus className="h-4 w-4 text-indigo-400" />
                    <Select
                      className="!w-36 !py-1.5 text-xs"
                      value=""
                      onChange={(e) => e.target.value && assignRole(u, e.target.value)}
                    >
                      <option value="">+ Ajouter un rôle</option>
                      {ROLES_DISPONIBLES.filter(
                        (r) => !(u.roles ?? []).some((x) => x.rolename === r)
                      ).map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </Select>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {!isAdmin && (
        <p className="mt-4 flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-xs text-amber-200">
          <UserPlus className="h-4 w-4 shrink-0" />
          Seul un administrateur peut créer des utilisateurs et modifier les rôles.
        </p>
      )}

      {/* Modal de création d'utilisateur */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Nouvel utilisateur" wide>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nom *">
            <Input
              placeholder="Dupont"
              value={form.nom}
              onChange={(e) => setForm({ ...form, nom: e.target.value })}
              required
            />
          </Field>
          <Field label="Prénom *">
            <Input
              placeholder="Jean"
              value={form.prenom}
              onChange={(e) => setForm({ ...form, prenom: e.target.value })}
              required
            />
          </Field>
          <Field label="Email *">
            <Input
              type="email"
              placeholder="jean.dupont@entreprise.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </Field>
          <Field label="Mot de passe *">
            <Input
              type="password"
              placeholder="Mot de passe provisoire"
              value={form.motDePasse}
              onChange={(e) => setForm({ ...form, motDePasse: e.target.value })}
              required
              minLength={6}
              autoComplete="new-password"
            />
          </Field>
          <Field label="Date de naissance *">
            <Input
              type="date"
              value={form.dateDeNaissance}
              onChange={(e) => setForm({ ...form, dateDeNaissance: e.target.value })}
              required
            />
          </Field>
          <Field label="Rôle">
            <Select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            >
              {ROLES_DISPONIBLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Adresse 1 *">
            <Input
              placeholder="1 rue de la Paix"
              value={form.adresse.addresse1}
              onChange={(e) =>
                setForm({ ...form, adresse: { ...form.adresse, addresse1: e.target.value } })
              }
              required
            />
          </Field>
          <Field label="Ville *">
            <Input
              placeholder="Lomé"
              value={form.adresse.Ville}
              onChange={(e) =>
                setForm({ ...form, adresse: { ...form.adresse, Ville: e.target.value } })
              }
              required
            />
          </Field>
          <Field label="Code postal *">
            <Input
              placeholder="00000"
              value={form.adresse.codePostale}
              onChange={(e) =>
                setForm({ ...form, adresse: { ...form.adresse, codePostale: e.target.value } })
              }
              required
            />
          </Field>
          <Field label="Pays *">
            <Input
              placeholder="Togo"
              value={form.adresse.pays}
              onChange={(e) =>
                setForm({ ...form, adresse: { ...form.adresse, pays: e.target.value } })
              }
              required
            />
          </Field>
        </div>
        <p className="mt-4 rounded-xl border border-indigo-500/20 bg-indigo-500/10 px-4 py-2.5 text-xs text-indigo-200">
          L&apos;utilisateur sera rattaché automatiquement à votre entreprise. Communiquez-lui son mot de
          passe ; il pourra le changer après sa première connexion.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setShowCreate(false)}>
            Annuler
          </Button>
          <Button onClick={createUser} loading={creating}>
            Créer l&apos;utilisateur
          </Button>
        </div>
      </Modal>

      {Toaster}
    </div>
  );
}
