/* Vérification filtre vendeurId (+ combinaisons) sur /commandesclients/paged */
const BASE = "http://localhost:8089/gestiondestock";

(async () => {
  const safeJson = async (r) => {
    const t = await r.text();
    try {
      return JSON.parse(t);
    } catch {
      throw new Error("Réponse non-JSON (status " + r.status + ") : " + t.slice(0, 150));
    }
  };

  const auth = await fetch(BASE + "/auth/authentification", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ login: "achille.mballa@novatra-distribution.cm", password: "Novatra@2026" }),
  }).then(safeJson);
  const token = auth.accessToken;
  if (!token) {
    console.error("AUTH KO");
    process.exit(1);
  }

  const q = async (params) => {
    const res = await fetch(BASE + "/commandesclients/paged" + params, {
      headers: { Authorization: "Bearer " + token },
    }).then(safeJson);
    return res;
  };

  const all = await q("?page=0&size=10");
  console.log("sans filtre        : total=" + all.totalElements);

  const fotso = await q("?page=0&size=10&vendeurId=903");
  console.log("vendeurId=903      : total=" + fotso.totalElements + " -> " + (fotso.content ?? []).map((c) => c.nomVendeur).join(", "));

  const sandrine = await q("?page=0&size=10&vendeurId=904");
  console.log("vendeurId=904      : total=" + sandrine.totalElements + (sandrine.totalElements === 0 ? " (aucune commande)" : " -> " + sandrine.content.map((c) => c.nomVendeur).join(", ")));

  const combo = await q("?page=0&size=10&vendeurId=903&etatCommande=LIVREE");
  console.log("903 + LIVREE       : total=" + combo.totalElements + " -> " + (combo.content ?? []).map((c) => c.code + "/" + c.etatCommande).join(", "));

  const combo3 = await q("?page=0&size=10&vendeurId=903&etatCommande=LIVREE&search=0141");
  console.log("903+LIVREE+search  : total=" + combo3.totalElements + " -> " + (combo3.content ?? []).map((c) => c.code).join(", "));
})();
