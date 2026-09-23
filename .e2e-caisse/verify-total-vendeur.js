/* E2E : total liste, vendeur rattaché, date livraison, ticket enrichi */
const puppeteer = require("puppeteer-core");

const BASE = "http://localhost:3000";
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const COMPTES = {
  vendeur: { login: "emmanuel.fotso@novatra-distribution.cm", pwd: "Novatra@2026" },
  admin: { login: "achille.mballa@novatra-distribution.cm", pwd: "Novatra@2026" },
};

const ok = (m) => console.log("  ✔ " + m);
const step = (m) => console.log("\n== " + m + " ==");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function selectReact(page, index, value) {
  await page.evaluate(
    (idx, val) => {
      const sel = Array.from(document.querySelectorAll("select"))[idx];
      if (!sel) throw new Error("Select " + idx + " introuvable");
      const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value").set;
      setter.call(sel, val);
      sel.dispatchEvent(new Event("change", { bubbles: true }));
    },
    index,
    value
  );
}

async function premiereOption(page, index) {
  return page.evaluate((idx) => {
    const sel = Array.from(document.querySelectorAll("select"))[idx];
    if (!sel) return "";
    const opt = Array.from(sel.options).find((o) => o.value !== "");
    return opt ? opt.value : "";
  }, index);
}

async function login(page, { login: email, pwd }) {
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
    const btn = Array.from(document.querySelectorAll("button")).find((b) => b.textContent.includes("Déconnexion"));
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
  const ts = Date.now().toString().slice(-6);

  page.on("console", (msg) => {
    if (msg.type() === "error") console.log("  [console.error] " + msg.text().slice(0, 200));
  });
  page.on("pageerror", (err) => console.log("  [pageerror] " + String(err).slice(0, 200)));

  try {
    step("1. ADMIN — colonne Total visible dans la liste");
    await login(page, COMPTES.admin);
    await page.goto(BASE + "/commandes", { waitUntil: "networkidle2", timeout: 60000 });
    await page.waitForFunction(() => document.body.innerText.includes("Commandes clients"), { timeout: 30000 });
    await page.waitForFunction(() => /total/i.test(document.body.innerText), { timeout: 20000 });
    const montants = await page.evaluate(() =>
      Array.from(document.querySelectorAll("td, .grid > div"))
        .map((e) => e.textContent.trim())
        .filter((t) => /^\d[\d\s.,]*\s?(FCFA|XAF|F)?$/.test(t) && /\d{4,}/.test(t.replace(/\s/g, "")))
    );
    ok("colonne Total présente, montants visibles : " + (montants.slice(0, 3).join(", ") || "voir capture"));
    await sleep(400);
    await page.screenshot({ path: "shot-t1-liste-total.png" });
    await logout(page);

    step("2. VENDEUR — création commande (vendeur rattaché côté serveur)");
    await login(page, COMPTES.vendeur);
    await page.goto(BASE + "/commandes", { waitUntil: "networkidle2", timeout: 60000 });
    await page.waitForFunction(() => document.body.innerText.includes("Commandes clients"), { timeout: 30000 });
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll("button")).find((b) => b.textContent.includes("Nouvelle commande"));
      if (!btn) throw new Error("Bouton Nouvelle commande introuvable");
      btn.click();
    });
    await page.waitForFunction(() => document.body.innerText.includes("Créer la commande"), { timeout: 15000 });
    const code = await page.evaluate(() => {
      const input = Array.from(document.querySelectorAll("input")).find((i) => /^CMD-/.test(i.value));
      return input ? input.value : "";
    });
    // Les selects du modal commencent après celui du DataTable (« N / page ») : client = 1
    const clientValue = await premiereOption(page, 1);
    if (!clientValue) throw new Error("Aucun client");
    await selectReact(page, 1, clientValue);
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll("button")).find((b) => b.textContent.trim() === "Ajouter");
      if (!btn) throw new Error("Ajouter introuvable");
      btn.click();
    });
    await sleep(400);
    // Après ajout de la ligne : article = 2
    const artValue = await premiereOption(page, 2);
    if (!artValue) throw new Error("Aucun article");
    await selectReact(page, 2, artValue);
    await sleep(400);
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll("button")).find((b) => b.textContent.includes("Créer la commande"));
      if (!btn || btn.disabled) throw new Error("Bouton créer indisponible/désactivé");
      btn.click();
    });
    await page.waitForFunction(() => document.body.innerText.includes("Commande créée"), { timeout: 30000 });
    ok("commande " + code + " créée par le vendeur");
    await sleep(1500);
    await logout(page);

    step("3. ADMIN — livraison puis ticket enrichi (vendeur + livrée le)");
    await login(page, COMPTES.admin);
    await page.goto(BASE + "/commandes", { waitUntil: "networkidle2", timeout: 60000 });
    await page.waitForFunction(() => document.body.innerText.includes("Commandes clients"), { timeout: 30000 });
    await page.type('input[placeholder*="Rechercher"]', code, { delay: 10 });
    await sleep(1200);

    // Total de la commande dans la ligne de liste
    const totalLigne = await page.evaluate((c) => {
      const row = Array.from(document.querySelectorAll("tr")).find((r) => r.textContent.includes(c));
      return row ? row.textContent : "";
    }, code);
    if (!/[\d]{3,}/.test(totalLigne.replace(/\s/g, ""))) throw new Error("Total absent de la ligne de liste");
    ok("total affiché dans la ligne : " + (totalLigne.match(/[\d][\d\s.]*/g) || []).slice(-1)[0]);

    // Passage LIVREE
    await page.evaluate((c) => {
      const row = Array.from(document.querySelectorAll("tr")).find((r) => r.textContent.includes(c));
      const sel = row.querySelector("select");
      const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value").set;
      setter.call(sel, "LIVREE");
      sel.dispatchEvent(new Event("change", { bubbles: true }));
    }, code);
    await page.waitForFunction(() => document.body.innerText.includes("Commande passée à"), { timeout: 20000 });
    ok("commande livrée");
    await sleep(1500);

    // Ticket enrichi
    await page.evaluate((c) => {
      const row = Array.from(document.querySelectorAll("tr")).find((r) => r.textContent.includes(c));
      const btn = Array.from(row.querySelectorAll("button")).find((b) => b.textContent.includes("Ticket"));
      if (!btn) throw new Error("Bouton Ticket introuvable");
      btn.click();
    }, code);
    await page.waitForSelector(".ticket-printable", { timeout: 15000 });
    const ticket = await page.$eval(".ticket-printable", (el) => el.innerText);
    if (!ticket.includes(code)) throw new Error("Code absent du ticket");
    if (!ticket.includes("Vendeur")) throw new Error("Vendeur absent du ticket");
    if (!ticket.includes("Livrée le")) throw new Error("Date de livraison absente du ticket");
    const vendeurTicket = (ticket.match(/Vendeur\s*\n\s*(.+)/) || [])[1]?.trim();
    ok("ticket : vendeur = " + (vendeurTicket || "—") + " + « Livrée le » présent");
    await page.screenshot({ path: "shot-t2-ticket-enrichi.png" });

    step("RÉSULTAT");
    console.log("\n✅ TOTAL, VENDEUR ET DATE DE LIVRAISON VALIDÉS — " + code);
  } catch (err) {
    console.error("\n❌ ÉCHEC : " + err.message);
    try {
      await page.screenshot({ path: "shot-t-echec.png" });
      console.error("Capture : shot-t-echec.png");
    } catch (_) { /* ignore */ }
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
