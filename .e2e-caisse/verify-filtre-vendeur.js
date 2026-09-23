/* E2E : filtre par vendeur sur la liste des commandes */
const puppeteer = require("puppeteer-core");

const BASE = "http://localhost:3000";
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const ADMIN = { login: "achille.mballa@novatra-distribution.cm", pwd: "Novatra@2026" };

const ok = (m) => console.log("  ✔ " + m);
const step = (m) => console.log("\n== " + m + " ==");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Change la valeur du select dont l'option 1 porte ce texte (filtre toolbar). */
async function choisirFiltre(page, optionTexte) {
  await page.evaluate((txt) => {
    const sel = Array.from(document.querySelectorAll("select"))
      .find((s) => Array.from(s.options).some((o) => o.textContent.trim() === txt));
    if (!sel) throw new Error("Select avec option « " + txt + " » introuvable");
    const opt = Array.from(sel.options).find((o) => o.textContent.trim() === txt);
    const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value").set;
    setter.call(sel, opt.value);
    sel.dispatchEvent(new Event("change", { bubbles: true }));
  }, optionTexte);
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
    await page.waitForFunction(() => document.body.innerText.includes("Tous les vendeurs"), { timeout: 20000 });
    ok("sélecteur « Tous les vendeurs » présent dans la toolbar");

    step("2. Filtre vendeur = Fotso Emmanuel");
    await choisirFiltre(page, "Fotso Emmanuel");
    await sleep(1500);
    const nb1 = await page.evaluate(() => document.querySelectorAll("tbody tr").length);
    const vendeurs = await page.evaluate(() =>
      Array.from(document.querySelectorAll("tbody tr")).map((r) => r.querySelectorAll("td")[3]?.textContent.trim())
    );
    if (nb1 !== 3) throw new Error("Attendu 3 lignes (Fotso), trouvé : " + nb1);
    if (!vendeurs.every((v) => v === "Fotso Emmanuel")) throw new Error("Vendeurs inattendus : " + vendeurs.join(","));
    ok("3 commandes, toutes de Fotso Emmanuel");
    await page.screenshot({ path: "shot-f1-filtre-vendeur.png" });

    step("3. Filtre vendeur = Tchoumi Sandrine (0 commande)");
    await choisirFiltre(page, "Tchoumi Sandrine");
    await sleep(1500);
    // Le DataTable rend une ligne d'état vide dans le tbody quand la liste est vide
    const videMsg = await page.evaluate(() => document.body.innerText.includes("Aucune commande trouvée"));
    const pasDeDonnees = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll("tbody tr"));
      return rows.every((r) => !r.querySelector(".font-mono")); // aucune ligne de données (code commande)
    });
    if (!videMsg || !pasDeDonnees) throw new Error("État vide inattendu (message présent : " + videMsg + ", sans données : " + pasDeDonnees + ")");
    ok("0 commande + message d'état vide affiché");
    await page.screenshot({ path: "shot-f2-filtre-vide.png" });

    step("4. Retour « Tous les vendeurs »");
    await choisirFiltre(page, "Tous les vendeurs");
    await sleep(1500);
    const nb3 = await page.evaluate(() => document.querySelectorAll("tbody tr").length);
    if (nb3 !== 3) throw new Error("Attendu 3 lignes, trouvé : " + nb3);
    ok("retour à la liste complète");

    step("5. Combinaison vendeur + état");
    await choisirFiltre(page, "Fotso Emmanuel");
    await choisirFiltre(page, "EN PREPARATION");
    await sleep(1500);
    const nb4 = await page.evaluate(() => document.querySelectorAll("tbody tr").length);
    if (nb4 !== 1) throw new Error("Attendu 1 ligne (Fotso + EN_PREPARATION), trouvé : " + nb4);
    ok("combinaison vendeur + état : 1 commande");
    await page.screenshot({ path: "shot-f3-filtre-combine.png" });

    step("RÉSULTAT");
    console.log("\n✅ FILTRE PAR VENDEUR VALIDÉ (seul, vide, combiné)");
  } catch (err) {
    console.error("\n❌ ÉCHEC : " + err.message);
    try {
      await page.screenshot({ path: "shot-f-echec.png" });
      console.error("Capture : shot-f-echec.png");
    } catch (_) { /* ignore */ }
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
