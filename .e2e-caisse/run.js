/* Parcours e2e vendeur : login → dashboard vendeur → POS → ticket → mes ventes → produits */
const puppeteer = require("puppeteer-core");

const BASE = "http://localhost:3000";
const EMAIL = "emmanuel.fotso@novatra-distribution.cm";
const PWD = "Novatra@2026";
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";

const ok = (m) => console.log("  ✔ " + m);
const step = (m) => console.log("\n== " + m + " ==");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitText(page, text, timeout = 30000) {
  await page.waitForFunction(
    (t) => document.body && document.body.innerText.includes(t),
    { timeout },
    text
  );
  ok(`texte visible : « ${text} »`);
}

async function clickByText(page, selector, text) {
  const clicked = await page.evaluate(
    (sel, txt) => {
      const els = Array.from(document.querySelectorAll(sel));
      const el = els.find(
        (e) => e.textContent && e.textContent.trim().toLowerCase().includes(txt.toLowerCase())
      );
      if (el) {
        el.click();
        return true;
      }
      return false;
    },
    selector,
    text
  );
  if (!clicked) throw new Error(`Élément introuvable : ${selector} « ${text} »`);
  ok(`clic : « ${text} »`);
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage", "--window-size=1440,900"],
    defaultViewport: { width: 1440, height: 900 },
  });
  const page = await browser.newPage();
  page.setDefaultTimeout(45000);

  try {
    step("1. Connexion vendeur");
    await page.goto(BASE + "/login", { waitUntil: "networkidle2", timeout: 60000 });
    await page.waitForSelector("input[type=email]");
    await page.type("input[type=email]", EMAIL, { delay: 10 });
    await page.type("input[type=password]", PWD, { delay: 10 });
    await page.screenshot({ path: "shot-1-login.png" });
    await Promise.all([
      page.waitForNavigation({ waitUntil: "networkidle2", timeout: 60000 }).catch(() => undefined),
      page.click("button[type=submit]"),
    ]);
    // Le dashboard redirige les vendeurs vers /caisse
    await page.waitForFunction(() => window.location.pathname === "/caisse", { timeout: 60000 });
    ok("redirection vers /caisse (dashboard vendeur)");
    await waitText(page, "Espace vendeur");
    await waitText(page, "Ventes du jour");
    await waitText(page, "Chiffre d'affaires du jour");
    await waitText(page, "Produits sous le seuil");
    await sleep(500);
    await page.screenshot({ path: "shot-2-dashboard-vendeur.png" });

    step("2. Ouverture de la caisse (action rapide « Nouvelle vente »)");
    await clickByText(page, "a", "Nouvelle vente");
    await page.waitForFunction(() => window.location.pathname === "/caisse/nouvelle", { timeout: 30000 });
    await waitText(page, "Panier");
    await page.waitForSelector('input[placeholder*="Rechercher"]');

    step("3. Recherche produit « savon » et ajout au panier");
    await page.type('input[placeholder*="Rechercher"]', "savon", { delay: 20 });
    await sleep(600);
    // Le bouton-produit contient désignation, prix et « Stock : » ; on clique celui qui correspond
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll("button"))
        .filter((b) => b.innerText.includes("Savon") && b.innerText.includes("Stock"))
        .sort((a, b) => a.innerText.length - b.innerText.length)[0];
      if (!btn) throw new Error("Produit Savon introuvable dans les résultats");
      btn.click();
    });
    ok("clic produit Savon");
    await page.waitForFunction(
      () => document.body.innerText.includes("stock") &&
            document.body.innerText.includes("Panier") &&
            document.body.innerText.includes("Total"),
      { timeout: 15000 }
    );
    await page.waitForFunction(
      () => !!document.querySelector('button[aria-label="Retirer"]'),
      { timeout: 15000 }
    );
    ok("produit ajouté au panier");

    step("4. Quantité +1 (limite stock vérifiée par les boutons)");
    await page.click('button[aria-label="Augmenter"]');
    await sleep(200);

    step("5. Nom du client (optionnel) puis validation");
    await page.type('input[placeholder*="Awa Diop"]', "Client E2E", { delay: 10 });
    await page.screenshot({ path: "shot-3-pos-panier.png" });
    await clickByText(page, "button", "Valider la vente");

    step("6. Ticket de vente généré");
    await page.waitForSelector(".ticket-printable", { timeout: 30000 });
    const ticketTexte = await page.$eval(".ticket-printable", (el) => el.innerText);
    const codeTicket = (ticketTexte.match(/V-[A-Za-z0-9-]+/) || ["?"])[0];
    if (!ticketTexte.includes("Client E2E")) throw new Error("Nom client absent du ticket");
    if (!ticketTexte.includes("TOTAL")) throw new Error("Total absent du ticket");
    ok(`ticket ${codeTicket} affiché avec client et total`);
    await page.screenshot({ path: "shot-4-ticket.png" });

    step("7. Retour caisse : panier réinitialisé");
    await clickByText(page, "button", "Fermer");
    await waitText(page, "Le panier est vide");
    ok("panier vide après la vente");

    step("8. Mes ventes : historique + détail + réimpression");
    await page.goto(BASE + "/caisse/ventes", { waitUntil: "networkidle2", timeout: 60000 });
    await waitText(page, "Mes ventes");
    await waitText(page, codeTicket);
    await waitText(page, "Client E2E");
    await page.screenshot({ path: "shot-5-mes-ventes.png" });
    await clickByText(page, "button", "Détail");
    await waitText(page, "Montant total");
    await clickByText(page, "button", "Afficher le ticket");
    await page.waitForSelector(".ticket-printable", { timeout: 15000 });
    ok("ticket réimprimable depuis l'historique");
    await clickByText(page, "button", "Fermer");

    step("9. Produits : consultation seule");
    await page.goto(BASE + "/caisse/produits", { waitUntil: "networkidle2", timeout: 60000 });
    await waitText(page, "consultation seule");
    await waitText(page, "Disponible");
    const nbProduits = await page.$$eval("main .grid > div", (els) => els.length);
    ok(`${nbProduits} produit(s) affiché(s)`);
    await page.screenshot({ path: "shot-6-produits.png" });

    step("RÉSULTAT");
    console.log("\n✅ PARCOURS CAISSE COMPLET VALIDÉ — ticket " + codeTicket);
  } catch (err) {
    console.error("\n❌ ÉCHEC : " + err.message);
    try {
      await page.screenshot({ path: "shot-echec.png" });
      console.error("Capture : shot-echec.png");
    } catch (_) { /* ignore */ }
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
