/* E2E : commande avec création de client à la volée (vendeur), livraison (admin), ticket livrée */
const puppeteer = require("puppeteer-core");

const BASE = "http://localhost:3000";
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const COMPTES = {
  vendeur: { email: "emmanuel.fotso@novatra-distribution.cm", pwd: "Novatra@2026" },
  admin: { email: "achille.mballa@novatra-distribution.cm", pwd: "Novatra@2026" },
};

const ok = (m) => console.log("  ✔ " + m);
const step = (m) => console.log("\n== " + m + " ==");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Sélectionne une option d'un <select> en simulant les événements React. */
async function selectReact(page, index, value) {
  await page.evaluate(
    (idx, val) => {
      const sel = Array.from(document.querySelectorAll("select"))[idx];
      if (!sel) throw new Error("Select index " + idx + " introuvable");
      const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value").set;
      setter.call(sel, val);
      sel.dispatchEvent(new Event("change", { bubbles: true }));
    },
    index,
    value
  );
}

/** Valeur de la 1re option non vide d'un select (par index). */
async function premiereOption(page, index) {
  return page.evaluate((idx) => {
    const sel = Array.from(document.querySelectorAll("select"))[idx];
    if (!sel) return "";
    const opt = Array.from(sel.options).find((o) => o.value !== "");
    return opt ? opt.value : "";
  }, index);
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

/** Saisit un champ par son placeholder dans le modal. */
async function taper(page, placeholder, valeur) {
  await page.evaluate((ph) => {
    const input = Array.from(document.querySelectorAll("input")).find((i) => i.placeholder === ph);
    if (!input) throw new Error("Champ introuvable : " + ph);
    input.focus();
  }, placeholder);
  await page.keyboard.type(valeur, { delay: 5 });
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
  const clientNom = "Mbarga";
  const clientPrenom = "Test" + ts;

  try {
    step("1. VENDEUR — commande avec création de client à la volée");
    await login(page, COMPTES.vendeur);
    await page.goto(BASE + "/commandes", { waitUntil: "networkidle2", timeout: 60000 });
    await page.waitForFunction(() => document.body.innerText.includes("Commandes clients"), { timeout: 30000 });

    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll("button")).find((b) =>
        b.textContent.includes("Nouvelle commande")
      );
      if (!btn) throw new Error("Bouton Nouvelle commande introuvable");
      btn.click();
    });
    await page.waitForFunction(() => document.body.innerText.includes("Créer la commande"), { timeout: 15000 });
    const code = await page.evaluate(() => {
      const input = Array.from(document.querySelectorAll("input")).find((i) => /^CMD-/.test(i.value));
      return input ? input.value : "";
    });
    ok("modal ouvert, code : " + code);

    // Bascule « + Nouveau client »
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll("button")).find((b) =>
        b.textContent.includes("Nouveau client")
      );
      if (!btn) throw new Error("Bouton « + Nouveau client » introuvable");
      btn.click();
    });
    await page.waitForFunction(() => document.body.innerText.includes("Téléphone"), { timeout: 10000 });
    ok("formulaire nouveau client affiché");

    await taper(page, "Nom", clientNom);
    await taper(page, "Prénom", clientPrenom);
    await taper(page, "client@exemple.com", `test.${ts}@exemple.cm`);
    await taper(page, "+237 6XX XXX XXX", "+237 690 00 00 " + ts.slice(-2));
    await taper(page, "Rue, quartier", "Rue " + ts + " Akwa");
    await taper(page, "Ville", "Douala");
    await taper(page, "Code postal", "00" + ts.slice(-3));
    ok("formulaire client rempli");

    // Ajout d'un article
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll("button")).find((b) => b.textContent.trim() === "Ajouter");
      if (!btn) throw new Error("Bouton Ajouter introuvable");
      btn.click();
    });
    await sleep(400);
    const articleValue = await premiereOption(page, 1);
    if (!articleValue) throw new Error("Aucun article disponible");
    await selectReact(page, 1, articleValue);
    await sleep(400);
    ok("article ajouté");

    await page.screenshot({ path: "shot-c3-nouveau-client.png" });

    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll("button")).find((b) =>
        b.textContent.includes("Créer le client et la commande")
      );
      if (!btn) throw new Error("Bouton « Créer le client et la commande » introuvable");
      btn.click();
    });
    await page.waitForFunction(
      () => document.body.innerText.includes("Client «") && document.body.innerText.includes("» créé"),
      { timeout: 30000 }
    );
    ok("client créé : " + clientNom + " " + clientPrenom);
    await page.waitForFunction(() => document.body.innerText.includes("Commande créée"), { timeout: 30000 });
    ok("commande " + code + " créée");
    await sleep(1200);
    await logout(page);

    step("2. ADMIN — passage de la commande à LIVRÉE");
    await login(page, COMPTES.admin);
    await page.goto(BASE + "/commandes", { waitUntil: "networkidle2", timeout: 60000 });
    await page.waitForFunction(() => document.body.innerText.includes("Commandes clients"), { timeout: 30000 });
    await page.type('input[placeholder*="Rechercher"]', code, { delay: 10 });
    await sleep(1200);
    await page.waitForFunction((c) => document.body.innerText.includes(c), { timeout: 20000 }, code);

    // Le select d'état de la ligne : on choisit LIVREE
    await page.evaluate((c) => {
      const row = Array.from(document.querySelectorAll("tr")).find((r) => r.textContent.includes(c));
      if (!row) throw new Error("Ligne de la commande introuvable");
      const sel = row.querySelector("select");
      if (!sel) throw new Error("Select d'état introuvable (réservé ADMIN/MANAGER)");
      const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value").set;
      setter.call(sel, "LIVREE");
      sel.dispatchEvent(new Event("change", { bubbles: true }));
    }, code);
    await page.waitForFunction(
      () => document.body.innerText.includes("Commande passée à"),
      { timeout: 20000 }
    );
    ok("commande passée à LIVRÉE");
    await sleep(1200);

    step("3. ADMIN — génération du ticket de la commande livrée");
    await page.evaluate((c) => {
      const row = Array.from(document.querySelectorAll("tr")).find((r) => r.textContent.includes(c));
      if (!row) throw new Error("Ligne introuvable");
      const btn = Array.from(row.querySelectorAll("button")).find((b) => b.textContent.includes("Ticket"));
      if (!btn) throw new Error("Bouton Ticket introuvable sur la commande livrée");
      btn.click();
    }, code);
    await page.waitForSelector(".ticket-printable", { timeout: 15000 });
    const ticketTxt = await page.$eval(".ticket-printable", (el) => el.innerText);
    if (!ticketTxt.includes(code)) throw new Error("Code commande absent du ticket");
    if (!ticketTxt.includes(clientNom)) throw new Error("Nom du client absent du ticket");
    ok("ticket affiché avec code " + code + " et client " + clientNom);
    await page.screenshot({ path: "shot-c4-ticket-livree.png" });

    step("RÉSULTAT");
    console.log("\n✅ COMMANDE AVEC NOUVEAU CLIENT CRÉÉE PAR LE VENDEUR, LIVRÉE, TICKET GÉNÉRÉ — " + code);
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
