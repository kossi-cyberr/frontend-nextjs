/* E2E : colonne Vendeur + filtre par état sur la liste des commandes */
const puppeteer = require("puppeteer-core");

const BASE = "http://localhost:3000";
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const ADMIN = { login: "achille.mballa@novatra-distribution.cm", pwd: "Novatra@2026" };

const ok = (m) => console.log("  ✔ " + m);
const step = (m) => console.log("\n== " + m + " ==");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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
    step("1. Connexion admin → page Commandes");
    await page.goto(BASE + "/login", { waitUntil: "networkidle2", timeout: 60000 });
    await page.waitForSelector("input[type=email]");
    await page.type("input[type=email]", ADMIN.login, { delay: 5 });
    await page.type("input[type=password]", ADMIN.pwd, { delay: 5 });
    await Promise.all([
      page.waitForNavigation({ waitUntil: "networkidle2", timeout: 60000 }).catch(() => undefined),
      page.click("button[type=submit]"),
    ]);
    await sleep(1500);
    await page.goto(BASE + "/commandes", { waitUntil: "networkidle2", timeout: 60000 });
    await page.waitForFunction(() => document.body.innerText.includes("Commandes clients"), { timeout: 30000 });
    await sleep(1000);

    step("2. Colonne Vendeur affichée");
    const entetes = await page.evaluate(() =>
      Array.from(document.querySelectorAll("th")).map((t) => t.textContent.trim())
    );
    console.log("    entêtes : " + entetes.join(" | "));
    if (!entetes.some((t) => /vendeur/i.test(t))) throw new Error("Colonne Vendeur absente");
    const vendeurs = await page.evaluate(() =>
      Array.from(document.querySelectorAll("tbody tr")).map((r) => {
        const tds = r.querySelectorAll("td");
        return tds.length >= 4 ? tds[3].textContent.trim() : "?";
      })
    );
    ok("vendeurs affichés : " + vendeurs.join(", "));
    if (!vendeurs.every((v) => v.length > 1)) throw new Error("Un vendeur est vide");
    await page.screenshot({ path: "shot-v1-liste-vendeur.png" });

    step("3. Filtre par état = EN PREPARATION");
    // Le select du filtre est le 1er du DOM (toolbar du DataTable, avant les selects d'état des lignes)
    await page.evaluate(() => {
      const sel = Array.from(document.querySelectorAll("select"))[0];
      const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value").set;
      setter.call(sel, "EN_PREPARATION");
      sel.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await sleep(1500);
    const etats = await page.evaluate(() =>
      Array.from(document.querySelectorAll("tbody tr")).map((r) => r.textContent)
    );
    if (etats.length !== 1) throw new Error("Attendu 1 ligne EN_PREPARATION, trouvé : " + etats.length);
    if (!etats[0].includes("En preparation") && !etats[0].includes("EN PREPARATION") && !etats[0].includes("En préparation"))
      throw new Error("La ligne restante n'est pas EN_PREPARATION");
    ok("filtre actif : 1 seule commande (EN PREPARATION) affichée");
    await page.screenshot({ path: "shot-v2-filtre-etat.png" });

    step("4. Filtre = LIVREE");
    await page.evaluate(() => {
      const sel = Array.from(document.querySelectorAll("select"))[0];
      const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value").set;
      setter.call(sel, "LIVREE");
      sel.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await sleep(1500);
    const nbLivrees = await page.evaluate(() => document.querySelectorAll("tbody tr").length);
    if (nbLivrees !== 2) throw new Error("Attendu 2 lignes LIVREE, trouvé : " + nbLivrees);
    ok("filtre LIVREE : 2 commandes affichées");

    step("5. Retour « Tous les états »");
    await page.evaluate(() => {
      const sel = Array.from(document.querySelectorAll("select"))[0];
      const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value").set;
      setter.call(sel, "");
      sel.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await sleep(1500);
    const nbTous = await page.evaluate(() => document.querySelectorAll("tbody tr").length);
    if (nbTous !== 3) throw new Error("Attendu 3 lignes, trouvé : " + nbTous);
    ok("tous les états : 3 commandes affichées");

    step("RÉSULTAT");
    console.log("\n✅ COLONNE VENDEUR ET FILTRE PAR ÉTAT VALIDÉS");
  } catch (err) {
    console.error("\n❌ ÉCHEC : " + err.message);
    try {
      await page.screenshot({ path: "shot-v-echec.png" });
      console.error("Capture : shot-v-echec.png");
    } catch (_) { /* ignore */ }
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
