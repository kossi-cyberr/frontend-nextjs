"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Boxes, Building2, Eye, EyeOff, Lock, Mail, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { Button, Field, Input, Modal, useToast } from "@/components/ui";
import type { Entreprise } from "@/lib/types";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const { toast, Toaster } = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [showSignup, setShowSignup] = useState(false);
  const [signupLoading, setSignupLoading] = useState(false);
  const [company, setCompany] = useState({
    nom: "",
    email: "",
    numTel: "",
    description: "",
    codefiscale: "",
    adresse: { addresse1: "", Ville: "", codePostale: "", pays: "" },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connexion impossible");
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async () => {
    setSignupLoading(true);
    try {
      const created = await api<Entreprise>("/entreprises/create", {
        method: "POST",
        body: company,
        auth: false,
      });
      const mdp = created.motDePasse ?? "";
      toast(
        `Entreprise « ${created.nom} » créée. Mot de passe admin : ${mdp} — pensez à le changer après connexion.`
      );
      setShowSignup(false);
      setEmail(company.email);
      setPassword(mdp);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Création impossible", "error");
    } finally {
      setSignupLoading(false);
    }
  };

  return (
    <div className="app-bg relative flex min-h-screen items-center justify-center overflow-hidden p-6">
      {/* Particules décoratives */}
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-indigo-600/20 blur-3xl animate-glow" />
      <div className="pointer-events-none absolute -bottom-40 -right-24 h-[28rem] w-[28rem] rounded-full bg-violet-600/15 blur-3xl animate-glow" />

      <div className="relative z-10 w-full max-w-md animate-slide-up">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-xl shadow-indigo-500/40">
            <Boxes className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            <span className="text-gradient">StockFlow</span>
          </h1>
          <p className="mt-2 flex items-center gap-1.5 text-sm text-slate-400">
            <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
            Pilotez votre stock, vos ventes et vos factures
          </p>
        </div>

        <div className="glass p-8">
          <h2 className="mb-6 text-lg font-semibold text-white">Connexion</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Email">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  className="field pl-10"
                  type="email"
                  placeholder="vous@entreprise.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </Field>

            <Field label="Mot de passe">
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  className="field pl-10 pr-10"
                  type={showPwd ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-slate-300"
                >
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </Field>

            {error && (
              <p className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-2.5 text-xs text-red-300">
                {error}
              </p>
            )}

            <Button type="submit" loading={loading} className="w-full">
              Se connecter
            </Button>
          </form>

          <div className="mt-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-[11px] text-slate-500">Première visite ?</span>
            <div className="h-px flex-1 bg-white/10" />
          </div>

          <Button
            variant="secondary"
            className="mt-4 w-full"
            onClick={() => setShowSignup(true)}
          >
            <Building2 className="h-4 w-4" />
            Créer mon entreprise
          </Button>
        </div>

        <p className="mt-6 text-center text-[11px] text-slate-600">
          Version 1.0 · API Spring Boot · JWT sécurisé
        </p>
      </div>

      {/* Modal création d'entreprise */}
      <Modal open={showSignup} onClose={() => setShowSignup(false)} title="Créer mon entreprise" wide>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nom de l'entreprise">
            <Input
              placeholder="Ma société SARL"
              value={company.nom}
              onChange={(e) => setCompany({ ...company, nom: e.target.value })}
            />
          </Field>
          <Field label="Email (identifiant admin)">
            <Input
              type="email"
              placeholder="admin@societe.com"
              value={company.email}
              onChange={(e) => setCompany({ ...company, email: e.target.value })}
            />
          </Field>
          <Field label="Téléphone">
            <Input
              placeholder="+228 90 00 00 00"
              value={company.numTel}
              onChange={(e) => setCompany({ ...company, numTel: e.target.value })}
            />
          </Field>
          <Field label="Code fiscal">
            <Input
              placeholder="CF-2024-001"
              value={company.codefiscale}
              onChange={(e) => setCompany({ ...company, codefiscale: e.target.value })}
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Description">
              <Input
                placeholder="Activité de l'entreprise"
                value={company.description}
                onChange={(e) => setCompany({ ...company, description: e.target.value })}
              />
            </Field>
          </div>
          <Field label="Adresse 1">
            <Input
              placeholder="1 rue de la Paix"
              value={company.adresse.addresse1}
              onChange={(e) =>
                setCompany({ ...company, adresse: { ...company.adresse, addresse1: e.target.value } })
              }
            />
          </Field>
          <Field label="Ville">
            <Input
              placeholder="Lomé"
              value={company.adresse.Ville}
              onChange={(e) =>
                setCompany({ ...company, adresse: { ...company.adresse, Ville: e.target.value } })
              }
            />
          </Field>
          <Field label="Code postal">
            <Input
              placeholder="00000"
              value={company.adresse.codePostale}
              onChange={(e) =>
                setCompany({ ...company, adresse: { ...company.adresse, codePostale: e.target.value } })
              }
            />
          </Field>
          <Field label="Pays">
            <Input
              placeholder="Togo"
              value={company.adresse.pays}
              onChange={(e) =>
                setCompany({ ...company, adresse: { ...company.adresse, pays: e.target.value } })
              }
            />
          </Field>
        </div>
        <p className="mt-4 rounded-xl border border-indigo-500/20 bg-indigo-500/10 px-4 py-2.5 text-xs text-indigo-200">
          Un administrateur est créé automatiquement. Le mot de passe temporaire vous sera affiché
          après la création — pensez à le changer lors de la première connexion.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setShowSignup(false)}>
            Annuler
          </Button>
          <Button onClick={handleSignup} loading={signupLoading}>
            Créer l'entreprise
          </Button>
        </div>
      </Modal>

      {Toaster}
    </div>
  );
}
