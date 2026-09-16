"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Check, Pencil, X } from "lucide-react";
import { api, photoUrl, uploadFile } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Utilisateur } from "@/lib/types";
import { Button, Card, Field, Input, PageTitle, useToast } from "@/components/ui";

export default function ProfilPage() {
  const { user, refreshUser } = useAuth();
  const { toast, Toaster } = useToast();

  const [edition, setEdition] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const [form, setForm] = useState({
    nom: "",
    prenom: "",
    dateDeNaissance: "",
    addresse1: "",
    addresse2: "",
    Ville: "",
    codePostale: "",
    pays: "",
  });
  const [fichier, setFichier] = useState<File | null>(null);
  const [apercu, setApercu] = useState<string | undefined>(undefined);
  const inputPhoto = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      setForm({
        nom: user.nom ?? "",
        prenom: user.prenom ?? "",
        dateDeNaissance: user.dateDeNaissance ?? "",
        addresse1: user.adresse?.addresse1 ?? "",
        addresse2: user.adresse?.addresse2 ?? "",
        Ville: user.adresse?.Ville ?? "",
        codePostale: user.adresse?.codePostale ?? "",
        pays: user.adresse?.pays ?? "",
      });
    }
  }, [user, edition]);

  if (!user) return null;

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function enregistrerProfil() {
    setEnCours(true);
    try {
      const maj = await api<Utilisateur>("/utilisateurs/me", {
        method: "PUT",
        body: {
          nom: form.nom,
          prenom: form.prenom,
          dateDeNaissance: form.dateDeNaissance || undefined,
          adresse: {
            addresse1: form.addresse1,
            addresse2: form.addresse2,
            Ville: form.Ville,
            codePostale: form.codePostale,
            pays: form.pays,
          },
        },
      });
      await refreshUser();
      setEdition(false);
      toast("Profil mis à jour avec succès");
      void maj;
    } catch (e) {
      toast(e instanceof Error ? e.message : "Erreur lors de la mise à jour", "error");
    } finally {
      setEnCours(false);
    }
  }

  function choisirPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFichier(f);
    const reader = new FileReader();
    reader.onload = () => setApercu(reader.result as string);
    reader.readAsDataURL(f);
  }

  async function enregistrerPhoto() {
    if (!fichier) return;
    setEnCours(true);
    try {
      await uploadFile<Utilisateur>("/utilisateurs/me/photo", fichier);
      await refreshUser();
      setFichier(null);
      setApercu(undefined);
      toast("Photo de profil mise à jour");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Erreur lors de l'envoi de la photo", "error");
    } finally {
      setEnCours(false);
    }
  }

  const photoAffichee = apercu ?? photoUrl(user.photo);
  const initiales = ((user.nom ?? "U").charAt(0) + (user.prenom ?? "").charAt(0)).toUpperCase();
  const adresseComplete =
    [
      user.adresse?.addresse1,
      user.adresse?.addresse2,
      user.adresse?.Ville,
      user.adresse?.codePostale,
      user.adresse?.pays,
    ]
      .filter(Boolean)
      .join(", ") || "—";

  return (
    <div className="mx-auto max-w-4xl">
      <PageTitle
        title="Mon profil"
        subtitle="Consultez et modifiez vos informations personnelles"
        actions={
          !edition && (
            <Button onClick={() => setEdition(true)}>
              <Pencil className="h-4 w-4" /> Modifier
            </Button>
          )
        }
      />

      <div className="grid gap-6 md:grid-cols-[280px_1fr]">
        {/* Carte identité */}
        <Card className="flex flex-col items-center p-6 text-center">
          <div className="relative">
            {photoAffichee ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photoAffichee}
                alt="Photo de profil"
                className="h-28 w-28 rounded-full object-cover ring-2 ring-indigo-500/40"
              />
            ) : (
              <div className="flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-3xl font-bold text-white ring-2 ring-indigo-500/40">
                {initiales}
              </div>
            )}
          </div>

          <div className="mt-3 flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => inputPhoto.current?.click()} disabled={enCours}>
              <Camera className="h-3.5 w-3.5" /> Choisir une photo
            </Button>
            {fichier && (
              <Button size="sm" onClick={enregistrerPhoto} loading={enCours}>
                <Check className="h-3.5 w-3.5" /> OK
              </Button>
            )}
            <input ref={inputPhoto} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={choisirPhoto} />
          </div>

          <h2 className="mt-4 text-lg font-semibold text-white">
            {user.nom} {user.prenom}
          </h2>
          <p className="text-xs text-slate-400">{user.email}</p>
          <div className="mt-3 flex flex-wrap justify-center gap-1.5">
            {(user.roles ?? []).map((r) => (
              <span
                key={r.id ?? r.rolename}
                className="rounded-md bg-indigo-500/15 px-2 py-0.5 text-[10px] font-semibold text-indigo-300"
              >
                {r.rolename}
              </span>
            ))}
          </div>
        </Card>

        {/* Détails / édition */}
        <Card className="p-6">
          {edition ? (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Nom">
                  <Input value={form.nom} onChange={set("nom")} />
                </Field>
                <Field label="Prénom">
                  <Input value={form.prenom} onChange={set("prenom")} />
                </Field>
                <Field label="Date de naissance">
                  <Input type="date" value={form.dateDeNaissance} onChange={set("dateDeNaissance")} />
                </Field>
              </div>
              <div className="pt-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Adresse</div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Adresse 1">
                  <Input value={form.addresse1} onChange={set("addresse1")} />
                </Field>
                <Field label="Adresse 2">
                  <Input value={form.addresse2} onChange={set("addresse2")} />
                </Field>
                <Field label="Ville">
                  <Input value={form.Ville} onChange={set("Ville")} />
                </Field>
                <Field label="Code postal">
                  <Input value={form.codePostale} onChange={set("codePostale")} />
                </Field>
                <Field label="Pays">
                  <Input value={form.pays} onChange={set("pays")} />
                </Field>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="secondary" onClick={() => setEdition(false)} disabled={enCours}>
                  <X className="h-4 w-4" /> Annuler
                </Button>
                <Button onClick={enregistrerProfil} loading={enCours}>
                  <Check className="h-4 w-4" /> Enregistrer
                </Button>
              </div>
            </div>
          ) : (
            <dl className="space-y-4">
              <div className="flex justify-between gap-4 border-b border-white/5 pb-3">
                <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">Nom complet</dt>
                <dd className="text-sm text-slate-200">{user.nom} {user.prenom}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-white/5 pb-3">
                <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">Email</dt>
                <dd className="text-sm text-slate-200">{user.email}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-white/5 pb-3">
                <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">Date de naissance</dt>
                <dd className="text-sm text-slate-200">{user.dateDeNaissance || "—"}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-white/5 pb-3">
                <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">Adresse</dt>
                <dd className="text-right text-sm text-slate-200">{adresseComplete}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">Entreprise</dt>
                <dd className="text-sm text-slate-200">{user.entreprise?.nom || "—"}</dd>
              </div>
            </dl>
          )}
        </Card>
      </div>
      {Toaster}
    </div>
  );
}
