/* Création réelle d'une commande client par le vendeur, puis vérification dans la liste */
const puppeteer = require("puppeteer-core");

const BASE = "http://localhost:3000";
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const EMAIL = "emmanuel.fotso@novatra-distribution.cm";
const PWD = "Novatra@2026";

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
    step("1. Connexion vendeur");
    await page.goto(BASE + "/login", { waitUntil: "networkidle2", timeout: 60000 });
    await page.waitForSelector("input[type=email]");
    await page.type("input[type=email]", EMAIL, { delay: 5 });
    await page.type("input[type=password]", PWD, { delay: 5 });
    await Promise.all([
      page.waitForNavigation({ waitUntil: "networkidle2", timeout: 60000 }).catch(() => undefined),
      page.click("button[type=submit]"),
    ]);
    await page.waitForFunction(() => window.location.pathname === "/caisse", { timeout: 60000 });
    ok("connecté en vendeur");

    step("2. Page Commandes → ouverture du modal de création");
    await page.goto(BASE + "/commandes", { waitUntil: "networkidle2", timeout: 60000 });
    await page.waitForFunction(() => document.body.innerText.includes("Commandes clients"), { timeout: 30000 });
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll("button")).find((b) =>
        b.textContent.includes("Nouvelle commande")
      );
      if (!btn) throw new Error("Bouton Nouvelle commande introuvable pour le vendeur");
      btn.click();
    });
    await page.waitForFunction(() => document.body.innerText.includes("Créer la commande"), { timeout: 15000 });
    ok("modal de création ouvert");

    // Code généré par la page (pré-rempli)
    const code = await page.evaluate(() => {
      const input = Array.from(document.querySelectorAll("input")).find((i) => /^CMD-/.test(i.value));
      return input ? input.value : "";
    });
    if (!code) throw new Error("Code de commande pré-rempli introuvable");
    ok("code généré : " + code);

    step("3. Choix du client et d'un article");
    // Le select client est le premier du modal : on choisit la 1re option non vide
    const clientValue = await page.$$eval("select", (sels) => {
      const sel = sels[0];
      const opt = Array.from(sel.options).find((o) => o.value !== "");
      return opt ? opt.value : "";
    });
    if (!clientValue) throw new Error("Aucun client disponible dans la liste");
    await page.select("select", clientValue);
    ok("client sélectionné");

    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll("button")).find((b) => b.textContent.trim() === "Ajouter");
      if (!btn) throw new Error("Bouton Ajouter introuvable");
      btn.click();
    });
    await sleep(400);
    // Le select article est le 2ᵉ (après l'ajout de la ligne)
    const articleValue = await page.$$eval("select", (sels) => {
      const sel = sels[1];
      if (!sel) throw new Error("Select article introuvable");
      const opt = Array.from(sel.options).find((o) => o.value !== "");
      return opt ? opt.value : "";
    });
    if (!articleValue) throw new Error("Aucun article disponible dans la liste");
    // Le 2ᵉ select est celui de l'article : setValue + événement change natif (React)
    await page.evaluate((val) => {
      const sel = Array.from(document.querySelectorAll("select"))[1];
      if (!sel) throw new Error("Select article introuvable");
      const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value").set;
      setter.call(sel, val);
      sel.dispatchEvent(new Event("change", { bubbles: true }));
    }, articleValue);
    await sleep(400);
    const pu = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input[type="number"]'));
      const puInput = inputs.find((i) => Number(i.value) > 0);
      return puInput ? puInput.value : "0";
    });
    ok("article ajouté, PU TTC auto-rempli : " + pu);
    await page.screenshot({ path: "shot-c1-modal-creation.png" });

    step("4. Validation de la commande");
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll("button")).find((b) =>
        b.textContent.includes("Créer la commande")
      );
      if (!btn) throw new Error("Bouton Créer la commande introuvable");
      if (btn.disabled) throw new Error("Bouton Créer la commande désactivé (formulaire incomplet)");
      btn.click();
    });
    await page.waitForFunction(
      (c) => document.body.innerText.includes("Commande créée"),
      { timeout: 30000 },
      code
    );
    ok("toast « Commande créée » affiché");
    await sleep(1200);

    step("5. Vérification dans la liste");
    await page.type('input[placeholder*="Rechercher"]', code, { delay: 10 });
    await sleep(1200);
    const present = await page.evaluate((c) => document.body.innerText.includes(c), code);
    if (!present) throw new Error("Commande " + code + " absente de la liste après création");
    ok("commande " + code + " visible dans la liste des commandes");
    await page.screenshot({ path: "shot-c2-liste-commandes.png" });

    step("RÉSULTAT");
    console.log("\n✅ COMMANDE " + code + " CRÉÉE PAR LE VENDEUR ET VISIBLE DANS LA LISTE");
  } catch (err) {
    console.error("\n❌ ÉCHEC : " + err.message);
    try {
      await page.screenshot({ path: "shot-c-echec.png" });
      console.error("Capture : shot-c-echec.png");
    } catch (_) { /* ignore */ }
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
