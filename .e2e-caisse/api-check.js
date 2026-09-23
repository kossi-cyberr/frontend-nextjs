/* Diagnostic API : auth + champs nouveaux du DTO commande */
const BASE = "http://localhost:8089/gestiondestock";

(async () => {
  const auth = await fetch(BASE + "/auth/authentification", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ login: "achille.mballa@novatra-distribution.cm", password: "Novatra@2026" }),
  }).then((r) => r.json());

  const token = auth.accessToken;
  if (!token) {
    console.error("AUTH KO :", JSON.stringify(auth).slice(0, 200));
    process.exit(1);
  }
  console.log("auth ok");

  const res = await fetch(BASE + "/commandesclients/paged?page=0&size=3", {
    headers: { Authorization: "Bearer " + token },
  }).then((r) => r.json());

  for (const c of res.content ?? []) {
    console.log(
      `${c.code} | etat=${c.etatCommande} | total=${c.montantTotal ?? "—"} | vendeur=${c.nomVendeur ?? "—"} | dateLivraison=${c.dateLivraison ?? "—"}`
    );
  }
})();
