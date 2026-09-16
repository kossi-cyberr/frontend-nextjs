const FCFA = new Intl.NumberFormat("fr-FR", {
  maximumFractionDigits: 0,
});

const FCFA_DEC = new Intl.NumberFormat("fr-FR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function money(value?: number | null): string {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "—";
  return `${FCFA.format(Number(value))} FCFA`;
}

export function moneyCompact(value?: number | null): string {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "—";
  return `${FCFA_DEC.format(Number(value))} F`;
}

export function num(value?: number | null): string {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "—";
  return FCFA.format(Number(value));
}

/** Convertit la valeur d'un input (peut être "") en nombre sûr (NaN -> 0). */
export function numberValue(value: string): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function dateTime(value?: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function dateOnly(value?: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

const MOIS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

export function moisLabel(annee: number, mois: number): string {
  return `${MOIS[mois - 1] ?? mois} ${annee}`;
}

export function monthShort(mois: number): string {
  return (MOIS[mois - 1] ?? mois).slice(0, 3);
}

export function initiales(nom?: string, prenom?: string): string {
  return `${(nom ?? "").charAt(0)}${(prenom ?? "").charAt(0)}`.toUpperCase() || "?";
}
