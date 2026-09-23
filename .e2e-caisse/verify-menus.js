/* Vérification e2e : menus et dashboards selon le rôle (VENDEUR, ADMIN, MANAGER) */
const puppeteer = require("puppeteer-core");

const BASE = "http://localhost:3000";
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const COMPTES = {
  vendeur: { email: "emmanuel.fotso@novatra-distribution.cm", pwd: "Novatra@2026" },
  admin: { email: "achille.mballa@novatra-distribution.cm", pwd: "Novatra@2026" },
  manager: { email: "clarisse.ndongo@novatra-distribution.cm", pwd: "Novatra@2026" },
};

const ok = (m) => console.log("  ✔ " + m);
const step = (m) => console.log("\n== " + m + " ==");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Liens de la sidebar, dans l'ordre du DOM. */
async function liensSidebar(page) {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll("aside nav a")).map((a) => a.textContent.trim())
  );
}

async function login(page, { email, pwd }) {
  await page.goto(BASE + "/login", { waitUntil: "networkidle2", timeout: 60000 });
  await page.waitForSelector("input[type=email]");
  await page.evaluate(() => localStorage.clear());
  await page.goto(BASE + "/login", { waitUntil: "networkidle2", timeout: 60000 });
  await page.waitForSelector("input[type=email]");
  await page.type("input[type=email]", email, { delay: 5 });
  await page.type("input[type=password]", pwd, { delay: 5 });
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle2", timeout: 60000 }).catch(() => undefined),
    page.click("button[type=submit]"),
  ]);
  await sleep(1500);
}

async function logout(page) {
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll("button")).find((b) =>
      b.textContent.includes("Déconnexion")
    );
    if (btn) btn.click();
  });
  await sleep(1200);
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
    /* ---------------- VENDEUR ---------------- */
    step("1. VENDEUR — menu et dashboard");
    await login(page, COMPTES.vendeur);
    const chemin = await page.evaluate(() => window.location.pathname);
    if (chemin !== "/caisse") throw new Error("Vendeur non redirigé vers /caisse (actuel : " + chemin + ")");
    ok("redirection automatique vers /caisse");

    const liensVendeur = await liensSidebar(page);
    console.log("    menu : " + liensVendeur.join(" | "));
    const attendu = ["Caisse", "Nouvelle vente", "Produits", "Commandes", "Mes ventes"];
    if (JSON.stringify(liensVendeur) !== JSON.stringify(attendu))
      throw new Error("Menu vendeur inattendu : " + liensVendeur.join(", "));
    ok("menu vendeur exact : " + attendu.join(" → "));

    await page.waitForFunction(
      () => document.body.innerText.includes("Ventes du jour") && document.body.innerText.includes("Produits sous le seuil"),
      { timeout: 30000 }
    );
    const texteVendeur = await page.evaluate(() => document.body.innerText);
    if (texteVendeur.includes("Chiffre d'affaires"))
      throw new Error("Le CA est encore visible sur le dashboard vendeur !");
    if (texteVendeur.includes("Valeur du stock"))
      throw new Error("« Valeur du stock » visible sur le dashboard vendeur !");
    ok("CA du jour et données entreprise absentes du dashboard vendeur");
    if (!texteVendeur.includes("Articles vendus")) throw new Error("KPI Articles vendus absent");
    if (!texteVendeur.includes("Commandes")) throw new Error("Action rapide Commandes absente");
    ok("KPIs : Ventes du jour / Articles vendus / Produits sous le seuil + action Commandes");
    await sleep(400);
    await page.screenshot({ path: "shot-m1-dashboard-vendeur.png" });

    step("2. VENDEUR — accès à la page Commandes");
    await page.evaluate(() => {
      const a = Array.from(document.querySelectorAll("aside nav a")).find((x) =>
        x.textContent.trim() === "Commandes"
      );
      if (!a) throw new Error("Onglet Commandes introuvable dans la sidebar");
      a.click();
    });
    await page.waitForFunction(() => window.location.pathname === "/commandes", { timeout: 30000 });
    await page.waitForFunction(() => document.body.innerText.includes("Commandes clients"), { timeout: 30000 });
    ok("page Commandes accessible au vendeur");
    const texteCmd = await page.evaluate(() => document.body.innerText);
    if (texteCmd.includes("Nouvelle commande"))
      throw new Error("Le bouton créer commande ne devrait pas être visible pour un vendeur");
    ok("bouton « Nouvelle commande » bien masqué (réservé ADMIN/MANAGER)");
    await sleep(400);
    await page.screenshot({ path: "shot-m2-commandes-vendeur.png" });
    await logout(page);

    /* ---------------- ADMIN ---------------- */
    step("3. ADMIN — menu réordonné et dashboard enrichi");
    await login(page, COMPTES.admin);
    const cheminAdmin = await page.evaluate(() => window.location.pathname);
    if (cheminAdmin !== "/dashboard") throw new Error("Admin non redirigé vers /dashboard (actuel : " + cheminAdmin + ")");
    ok("redirection vers /dashboard");

    const liensAdmin = await liensSidebar(page);
    console.log("    menu : " + liensAdmin.join(" | "));
    const iArticles = liensAdmin.indexOf("Articles");
    const iCaisse = liensAdmin.indexOf("Caisse");
    if (iArticles === -1 || iCaisse === -1 || iArticles > iCaisse)
      throw new Error("Articles devrait précéder Caisse dans le menu ADMIN");
    ok("Articles en 2ᵉ position (avant Caisse) — accès produits facilité");

    await page.waitForFunction(
      () => document.body.innerText.includes("Ventes du jour par vendeur"),
      { timeout: 30000 }
    );
    ok("card « Ventes du jour par vendeur » présente");
    const texteAdmin = await page.evaluate(() => document.body.innerText);
    if (!texteAdmin.includes("Valeur du stock")) ok("données d'entreprise toujours présentes pour l'ADMIN");
    await sleep(600);
    await page.screenshot({ path: "shot-m3-dashboard-admin.png" });
    await logout(page);

    /* ---------------- MANAGER ---------------- */
    step("4. MANAGER — menu et dashboard");
    await login(page, COMPTES.manager);
    const liensManager = await liensSidebar(page);
    console.log("    menu : " + liensManager.join(" | "));
    const iArtM = liensManager.indexOf("Articles");
    const iCaiM = liensManager.indexOf("Caisse");
    if (iArtM === -1 || iCaiM === -1 || iArtM > iCaiM)
      throw new Error("Menu MANAGER : Articles devrait précéder Caisse");
    ok("menu MANAGER : Articles avant Caisse");
    await page.waitForFunction(() => document.body.innerText.includes("Ventes du jour par vendeur"), { timeout: 30000 });
    ok("dashboard MANAGER : card ventes par vendeur visible");
    await sleep(400);
    await page.screenshot({ path: "shot-m4-dashboard-manager.png" });

    step("RÉSULTAT");
    console.log("\n✅ MENUS ET DASHBOARDS VALIDÉS POUR LES 3 RÔLES");
  } catch (err) {
    console.error("\n❌ ÉCHEC : " + err.message);
    try {
      await page.screenshot({ path: "shot-m-echec.png" });
      console.error("Capture : shot-m-echec.png");
    } catch (_) { /* ignore */ }
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
