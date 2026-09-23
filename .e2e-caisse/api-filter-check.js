/* Vérification filtre etatCommande sur l'API paged */
const BASE = "http://localhost:8089/gestiondestock";

(async () => {
  const auth = await fetch(BASE + "/auth/authentification", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ login: "achille.mballa@novatra-distribution.cm", password: "Novatra@2026" }),
  }).then((r) => r.json());
  const token = auth.accessToken;
  if (!token) {
    console.error("AUTH KO");
    process.exit(1);
  }

  const q = async (params) => {
    const res = await fetch(BASE + "/commandesclients/paged" + params, {
      headers: { Authorization: "Bearer " + token },
    }).then((r) => r.json());
    return res;
  };

  const all = await q("?page=0&size=10");
  console.log("sans filtre : total=" + all.totalElements);

  const livree = await q("?page=0&size=10&etatCommande=LIVREE");
  console.log("LIVREE      : total=" + livree.totalElements + " -> " + (livree.content ?? []).map((c) => c.etatCommande).join(", "));

  const prep = await q("?page=0&size=10&etatCommande=EN_PREPARATION");
  console.log("EN_PREPA    : total=" + prep.totalElements + " -> " + (prep.content ?? []).map((c) => c.etatCommande).join(", "));

  const combo = await q("?page=0&size=10&etatCommande=LIVREE&search=0141");
  console.log("LIVREE+srch : total=" + combo.totalElements + " -> " + (combo.content ?? []).map((c) => c.code).join(", "));
})();
