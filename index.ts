import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import * as fs from "fs";
import * as path from "path";
import { createHash, randomBytes } from "crypto";

// Fase 4: gedeelde spel-engine (Game Show, Boss Challenges, Board Game); dezelfde code draait ook in de app (solo)
// eslint-disable-next-line @typescript-eslint/no-var-requires
const CC = require("../engine.js");

const PORT = Number(process.env.PORT || 8080);
const DATA_FILE = process.env.DATA_FILE || path.join(__dirname, "..", "data.json");
const W = 2000, LIFT_X = 1850, UP_X = 140, DOWN_X = 340, REACH = 170, MAX_SPEED = 420;

interface FloorDef { n: number; name: string; minLevel: number; secret: boolean }
const FLOORS: FloorDef[] = [
  { n: 0, name: "Begane grond - Receptie", minLevel: 1, secret: false },
  { n: 1, name: "Verdieping 1 - Hoofdcasino", minLevel: 1, secret: false },
  { n: 2, name: "Verdieping 2 - Arcade Corner", minLevel: 2, secret: false },
  { n: 3, name: "Verdieping 3 - Casino Lounge", minLevel: 2, secret: false },
  { n: 4, name: "Verdieping 4 - VIP", minLevel: 3, secret: false },
  { n: 5, name: "Verdieping 5 - Trophy Room", minLevel: 3, secret: false },
  { n: 6, name: "Verdieping 6 - Geheim", minLevel: 1, secret: true },
];
// Verborgen voorwerpen: de server bepaalt of je dichtbij genoeg staat en hoeveel XP je krijgt.
const DISC: Record<string, { floor: number; x: number; xp: number; unlocks?: number }> = {
  coin: { floor: 1, x: 900, xp: 50 },
  painting: { floor: 5, x: 1000, xp: 100, unlocks: 6 },
};
const FIRST_VISIT_XP = 50;

// Fase 2: huisdieren, accessoires, skins en VIP (zelfde regels als in de app)
const PETS: { id: string; minLevel: number; needs?: string }[] = [
  { id: "cat", minLevel: 1 }, { id: "dog", minLevel: 2 }, { id: "rabbit", minLevel: 2 },
  { id: "penguin", minLevel: 3 }, { id: "fox", minLevel: 3 }, { id: "chip", minLevel: 1, needs: "coin" },
  { id: "robot", minLevel: 4 }, { id: "dragon", minLevel: 5 }, { id: "alien", minLevel: 6 },
  { id: "unicorn", minLevel: 1, needs: "painting" },
  { id: "owl", minLevel: 1, needs: "boss_dealer" }, { id: "ghost", minLevel: 1, needs: "boss_mystery" },
];
const ACCS: Record<string, { minLevel: number; vip?: string; pass?: number }> = {
  hat: { minLevel: 2 }, bow: { minLevel: 2 }, shades: { minLevel: 3 }, headphones: { minLevel: 4 },
  medal: { minLevel: 1, vip: "bronze" }, scarf: { minLevel: 1, vip: "silver" }, crown: { minLevel: 1, vip: "gold" },
  gem: { minLevel: 1, vip: "diamond" }, trident: { minLevel: 1, vip: "legendary" },
};
const SKIN_LEVELS = [1, 3, 6];

// Gratis Battle Pass (alleen cosmetisch): 30 tiers, elke tier = 80 pass-XP
const ITEMS: { id: string; rarity: number }[] = [
  { id: "it_plant", rarity: 0 }, { id: "it_vase", rarity: 0 }, { id: "it_candle", rarity: 0 }, { id: "it_frame", rarity: 1 },
  { id: "it_disco", rarity: 2 }, { id: "it_fountain", rarity: 2 }, { id: "it_statue", rarity: 3 },
  { id: "it_star", rarity: 0 }, { id: "it_clover", rarity: 0 }, { id: "it_balloon", rarity: 0 }, { id: "it_fire", rarity: 1 },
  { id: "it_rainbow", rarity: 1 }, { id: "it_comet", rarity: 2 }, { id: "it_gem", rarity: 3 },
  { id: "it_chip_red", rarity: 0 }, { id: "it_chip_blue", rarity: 0 }, { id: "it_chip_green", rarity: 1 },
  { id: "it_chip_gold", rarity: 2 }, { id: "it_chip_purple", rarity: 2 }, { id: "it_chip_black", rarity: 3 },
  { id: "it_back_joker", rarity: 1 }, { id: "it_back_flower", rarity: 2 }, { id: "it_back_dragon", rarity: 3 },
];
function grantItem(a: { items: Record<string, number> }, min = 0): string {
  const r = rollRarity(min);
  const pool = ITEMS.filter(i => i.rarity === r);
  const it = pool[Math.floor(Math.random() * pool.length)];
  a.items[it.id] = (a.items[it.id] || 0) + 1;
  return it.id;
}
const isItem = (id: string) => ITEMS.some(i => i.id === id);
function rollRarity(min: number): number {
  const w = [55, 30, 12, 3];
  for (let i = 0; i < min; i++) w[i] = 0;
  let r = Math.random() * w.reduce((x, y) => x + y, 0);
  for (let i = 0; i < 4; i++) { r -= w[i]; if (r < 0) return i; }
  return 3;
}
const LOGOS = ["🎰", "🃏", "👑", "🦁", "🐉", "🚀", "⚡", "🔥", "🌟", "🏆", "💎", "🍀"];
const PASS_TIER_XP = 80, PASS_MAX = 30;
const PASS_KIND: Record<number, "title" | "bg" | "acc"> = {};
for (const t of [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 30]) PASS_KIND[t] = "title";
for (const t of [2, 5, 8, 11, 14, 17, 20, 23, 26, 29]) PASS_KIND[t] = "bg";
for (const t of [3, 6, 9, 12, 15, 18, 21, 24, 27]) { PASS_KIND[t] = "acc"; ACCS["pass" + t] = { minLevel: 1, pass: t }; }
const passTier = (a: { passXP: number }) => Math.min(Math.floor(a.passXP / PASS_TIER_XP), PASS_MAX);
const VIPS: { id: string; minLevel: number; minPets: number; allFloors: boolean; xp: number }[] = [
  { id: "bronze", minLevel: 3, minPets: 0, allFloors: false, xp: 100 },
  { id: "silver", minLevel: 5, minPets: 3, allFloors: false, xp: 150 },
  { id: "gold", minLevel: 7, minPets: 0, allFloors: true, xp: 200 },
  { id: "diamond", minLevel: 8, minPets: 6, allFloors: false, xp: 300 },
  { id: "legendary", minLevel: 12, minPets: 10, allFloors: false, xp: 500 },
];
const BAD_WORDS = ["fuck", "shit", "kut", "kanker", "hoer", "nazi", "porn", "sex"];
function cleanPetName(raw: string): string | null {
  const t = raw.trim();
  if (t === "") return "";
  if (t.length > 12 || !/^[\p{L}\p{N} _-]+$/u.test(t)) return null;
  const low = t.toLowerCase();
  if (BAD_WORDS.some(w => low.includes(w))) return null;
  return t;
}

interface ChatLine { t: number; from: string; text: string }
interface Club {
  id: string; name: string; desc: string; logo: string; color: number; owner: string;
  members: Record<string, string>; requests: string[]; invites: string[]; xp: number; created: number; chat: ChatLine[];
}
interface Listing { id: string; seller: string; give: string; want: string; created: number; pending: { buyer: string; ts: number } | null }
interface Account {
  name: string; tokenHash: string; xp: number; visited: number[]; discoveries: string[]; lastFloor: number;
  pets: string[]; petActive: string; petNames: Record<string, string>; petSkin: Record<string, number>;
  petAcc: Record<string, string>; vipSeen: string[]; lastDaily: string;
  passXP: number; passClaimed: number[]; title: number; bg: number;
  club: string; items: Record<string, number>; wishlist: string[]; showcase: string[];
  history: { t: number; text: string }[]; blocked: string[]; starter: boolean;
  trophies: string[]; playDay: string; playCount: number;
}
interface Player { id: string; ws: WebSocket; acc: Account; floor: number; x: number; lastMove: number; hadOthers: boolean; alive: boolean }

let accounts: Record<string, Account> = {};
let clubs: Record<string, Club> = {};
let listings: Listing[] = [];
let reports: { t: number; by: string; who: string; reason: string }[] = [];
try {
  const raw = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  if (raw && raw.accounts) { accounts = raw.accounts; clubs = raw.clubs || {}; listings = raw.listings || []; reports = raw.reports || []; }
  else accounts = raw; // oud formaat (Fase 1/2)
} catch { /* eerste start */ }
for (const a of Object.values(accounts)) { // oudere accounts bijwerken
  a.pets ||= ["cat"]; a.petActive ||= "cat"; a.petNames ||= {}; a.petSkin ||= {};
  a.petAcc ||= {}; a.vipSeen ||= []; a.lastDaily ||= "";
  if (a.passXP === undefined) a.passXP = a.xp; // bestaande spelers starten met hun huidige XP
  a.passClaimed ||= []; a.title ||= 0; a.bg ||= 0;
  a.trophies ||= []; a.playDay ||= ""; a.playCount ||= 0;
  a.club ||= ""; a.items ||= {}; a.wishlist ||= []; a.showcase ||= []; a.history ||= []; a.blocked ||= [];
  if (!a.starter) { a.starter = true; for (let i = 0; i < 3; i++) grantItem(a); } // startpakket voor bestaande spelers
}
let saveTimer: NodeJS.Timeout | null = null;
function save(): void {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    try { const tmp = DATA_FILE + ".tmp"; fs.writeFileSync(tmp, JSON.stringify({ accounts, clubs, listings, reports })); fs.renameSync(tmp, DATA_FILE); }
    catch (e) { console.error("Opslaan mislukt", e); }
  }, 2000);
}

const hash = (s: string) => createHash("sha256").update(s).digest("hex");
const level = (a: Account) => Math.floor(a.xp / 100) + 1;
const unlocked = (a: Account) => FLOORS.filter(f => f.secret ? a.discoveries.includes("painting") : level(a) >= f.minLevel).map(f => f.n);
const meOf = (a: Account) => ({
  name: a.name, xp: a.xp, level: level(a), unlocked: unlocked(a), visited: a.visited, discoveries: a.discoveries,
  lastFloor: a.lastFloor, pets: a.pets, petActive: a.petActive, petNames: a.petNames, petSkin: a.petSkin,
  petAcc: a.petAcc, vipSeen: a.vipSeen, lastDaily: a.lastDaily,
  passXP: a.passXP, passClaimed: a.passClaimed, title: a.title, bg: a.bg,
  club: a.club, items: a.items, wishlist: a.wishlist, showcase: a.showcase, history: a.history, blocked: a.blocked,
  trophies: a.trophies,
});
const petLook = (a: Account) => ({ id: a.petActive, name: a.petNames[a.petActive] || "", skin: a.petSkin[a.petActive] || 0, acc: a.petAcc[a.petActive] || "" });
const vipOk = (v: { minLevel: number; minPets: number; allFloors: boolean }, a: Account) =>
  level(a) >= v.minLevel && a.pets.length >= v.minPets && (!v.allFloors || a.visited.length >= 7);
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const send = (ws: WebSocket, o: object) => { if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(o)); };
const players = new Map<string, Player>();

function addXpAcc(a: Account, amount: number): string {
  const before = level(a);
  a.xp += amount;
  a.passXP += amount;
  if (a.club && clubs[a.club]) clubs[a.club].xp += amount;
  save();
  return level(a) > before ? ` Niveau ${level(a)} bereikt!` : "";
}
function addXp(p: Player, amount: number): string { return addXpAcc(p.acc, amount); }


// ===== Fase 3: clubs, chat-moderatie en marktplaats =====
function notify(key: string, o: object) { const p = players.get(key); if (p) send(p.ws, o); }
function pushMe(a: Account) { notify(a.name.toLowerCase(), { t: "me", me: meOf(a) }); }
function hist(a: Account, text: string) { a.history.push({ t: Date.now(), text }); if (a.history.length > 30) a.history.shift(); }
const nameOf = (key: string) => accounts[key]?.name ?? key;
function maskBad(text: string): string {
  let out = text;
  for (const w of BAD_WORDS) out = out.replace(new RegExp(w, "gi"), "*".repeat(w.length));
  return out;
}
const clubBrief = (c: Club) => ({ id: c.id, name: c.name, logo: c.logo, color: c.color, desc: c.desc, members: Object.keys(c.members).length, xp: c.xp });
function clubFull(c: Club, me: Account) {
  const role = c.members[me.name.toLowerCase()];
  const admin = role === "owner" || role === "admin";
  return {
    ...clubBrief(c), myRole: role,
    memberList: Object.entries(c.members).map(([k, r]) => ({ name: nameOf(k), role: r, online: players.has(k) })),
    requests: admin ? c.requests.map(nameOf) : [],
    invites: admin ? c.invites.map(nameOf) : [],
    chat: c.chat.filter(l => !me.blocked.includes(l.from.toLowerCase())).slice(-40),
  };
}
function sendClub(p: Player) { const c = p.acc.club ? clubs[p.acc.club] : undefined; send(p.ws, { t: "club", club: c ? clubFull(c, p.acc) : null }); }
function sendClubList(p: Player, q: string) {
  const k = q.toLowerCase(), my = p.acc.name.toLowerCase();
  const list = Object.values(clubs).filter(c => !k || c.name.toLowerCase().includes(k)).sort((a, b) => b.xp - a.xp).slice(0, 30).map(clubBrief);
  const invites = Object.values(clubs).filter(c => c.invites.includes(my)).map(clubBrief);
  send(p.ws, { t: "clubs", list, invites });
}
function leaveClub(a: Account) {
  const c = clubs[a.club], key = a.name.toLowerCase();
  a.club = "";
  if (!c) return;
  const wasOwner = c.owner === key;
  delete c.members[key];
  const rest = Object.keys(c.members);
  if (rest.length === 0) { delete clubs[c.id]; return; }
  if (wasOwner) { const next = rest.find(k => c.members[k] === "admin") ?? rest[0]; c.owner = next; c.members[next] = "owner"; }
}
const lastChatAt = new Map<string, number>();
const MAX_CLUB = 30;

function sendMarket(p: Player) {
  const my = p.acc.name.toLowerCase();
  const list = listings.slice(-150).reverse().map(l => ({
    id: l.id, seller: nameOf(l.seller), give: l.give, want: l.want, mine: l.seller === my,
    pendingBuyer: l.pending ? nameOf(l.pending.buyer) : null, pendingMine: l.pending?.buyer === my,
  }));
  send(p.ws, { t: "market", listings: list });
}

function handleSocial(p: Player, m: any, err: (t: string) => void): void {
  const a = p.acc, key = a.name.toLowerCase(), ws = p.ws;
  const myClub = a.club ? clubs[a.club] : undefined;
  const role = myClub ? myClub.members[key] : undefined;
  const isAdmin = role === "owner" || role === "admin";
  const toast = (text: string, item?: string) => send(ws, { t: "toast", text, item });
  const target = String(m.name || "").trim().toLowerCase();

  switch (m.t) {
    // ---------- clubs
    case "clubList": sendClubList(p, String(m.q || "").slice(0, 16)); break;
    case "clubInfo": sendClub(p); break;
    case "clubCreate": {
      if (a.club) return err("Je zit al in een club.");
      const name = String(m.name || "").trim();
      if (!/^[A-Za-z0-9 _-]{3,16}$/.test(name)) return err("Clubnaam: 3-16 tekens (letters, cijfers, spatie, - of _).");
      if (BAD_WORDS.some(w => name.toLowerCase().includes(w))) return err("Deze clubnaam is niet toegestaan.");
      if (Object.values(clubs).some(c => c.name.toLowerCase() === name.toLowerCase())) return err("Deze clubnaam bestaat al.");
      const id = randomBytes(4).toString("hex");
      const logo = LOGOS.includes(String(m.logo)) ? String(m.logo) : LOGOS[0];
      const color = Number.isInteger(m.color) && m.color >= 0 && m.color < 8 ? m.color : 0;
      clubs[id] = { id, name, desc: maskBad(String(m.desc || "").trim().slice(0, 60)), logo, color, owner: key,
        members: { [key]: "owner" }, requests: [], invites: [], xp: 0, created: Date.now(), chat: [] };
      a.club = id; save(); sendClub(p); toast(`🏰 Club "${name}" is opgericht!`);
      break;
    }
    case "clubRequest": {
      const c = clubs[String(m.id)];
      if (a.club) return err("Je zit al in een club.");
      if (!c) return err("Deze club bestaat niet meer.");
      if (Object.keys(c.members).length >= MAX_CLUB) return err("Deze club is vol.");
      if (!c.requests.includes(key)) c.requests.push(key);
      save();
      for (const [k, r] of Object.entries(c.members)) if (r !== "member") notify(k, { t: "toast", text: `📩 ${a.name} wil lid worden van ${c.name}.` });
      toast("Aanvraag verstuurd!");
      break;
    }
    case "clubInvite": {
      if (!myClub || !isAdmin) return err("Alleen de eigenaar of een beheerder kan uitnodigen.");
      const t = accounts[target];
      if (!t || t.blocked.includes(key)) return err("Speler niet gevonden.");
      if (t.club) return err("Die speler zit al in een club.");
      if (Object.keys(myClub.members).length >= MAX_CLUB) return err("Je club is vol.");
      if (!myClub.invites.includes(target)) myClub.invites.push(target);
      save(); sendClub(p);
      notify(target, { t: "toast", text: `📨 ${a.name} nodigt je uit voor ${myClub.name}.` });
      toast("Uitnodiging verstuurd!");
      break;
    }
    case "clubRespond": {
      const c = clubs[String(m.id)];
      if (!c || !c.invites.includes(key)) return err("Deze uitnodiging bestaat niet meer.");
      c.invites = c.invites.filter(k => k !== key);
      if (m.accept === true) {
        if (a.club) return err("Je zit al in een club.");
        if (Object.keys(c.members).length >= MAX_CLUB) return err("Deze club is vol.");
        c.members[key] = "member"; c.requests = c.requests.filter(k => k !== key); a.club = c.id;
        toast(`🏰 Welkom bij ${c.name}!`);
      }
      save(); sendClub(p); sendClubList(p, "");
      break;
    }
    case "clubDecide": {
      if (!myClub || !isAdmin) return err("Geen toestemming.");
      if (!myClub.requests.includes(target)) return;
      myClub.requests = myClub.requests.filter(k => k !== target);
      const t = accounts[target];
      if (m.accept === true && t && !t.club && Object.keys(myClub.members).length < MAX_CLUB) {
        myClub.members[target] = "member"; t.club = myClub.id;
        notify(target, { t: "toast", text: `🏰 Je bent toegelaten tot ${myClub.name}!` });
        const tp = players.get(target); if (tp) sendClub(tp);
      }
      save(); sendClub(p);
      break;
    }
    case "clubRole": {
      if (!myClub || role !== "owner") return err("Alleen de eigenaar kan rollen wijzigen.");
      if (!myClub.members[target] || target === key || (m.role !== "admin" && m.role !== "member")) return;
      myClub.members[target] = m.role; save(); sendClub(p);
      const tp = players.get(target); if (tp) sendClub(tp);
      break;
    }
    case "clubKick": {
      if (!myClub || !isAdmin) return err("Geen toestemming.");
      const r = myClub.members[target];
      if (!r || target === key || r === "owner" || (role === "admin" && r !== "member")) return err("Je kunt deze speler niet verwijderen.");
      delete myClub.members[target];
      if (accounts[target]) accounts[target].club = "";
      save(); sendClub(p);
      notify(target, { t: "toast", text: `Je bent uit ${myClub.name} verwijderd.` });
      const tp = players.get(target); if (tp) sendClub(tp);
      break;
    }
    case "clubLeave": { if (!myClub) return; leaveClub(a); save(); sendClub(p); sendClubList(p, ""); break; }
    case "clubDisband": {
      if (!myClub || role !== "owner") return err("Alleen de eigenaar kan de club opheffen.");
      for (const k of Object.keys(myClub.members)) { if (accounts[k]) accounts[k].club = ""; const tp = players.get(k); if (tp) { delete clubs[myClub.id]; sendClub(tp); } }
      delete clubs[myClub.id]; save(); sendClubList(p, "");
      break;
    }
    case "clubChat": {
      if (!myClub) return;
      const now = Date.now();
      if (now - (lastChatAt.get(key) || 0) < 1500) return err("Rustig aan met chatten.");
      lastChatAt.set(key, now);
      const text = maskBad(String(m.text || "").replace(/\s+/g, " ").trim().slice(0, 120));
      if (!text) return;
      const line: ChatLine = { t: now, from: a.name, text };
      myClub.chat.push(line); if (myClub.chat.length > 60) myClub.chat.shift();
      save();
      for (const k of Object.keys(myClub.members)) {
        const rp = players.get(k);
        if (rp && !rp.acc.blocked.includes(key)) send(rp.ws, { t: "clubMsg", msg: line });
      }
      break;
    }
    // ---------- veiligheid: rapporteren en blokkeren (geen persoonlijke gegevens zichtbaar)
    case "report": {
      if (!accounts[target] || target === key) return;
      reports.push({ t: Date.now(), by: a.name, who: accounts[target].name, reason: String(m.reason || "").slice(0, 80) });
      if (reports.length > 500) reports.shift();
      save(); toast("🚩 Bedankt voor je melding. We bekijken het.");
      break;
    }
    case "block": {
      if (!accounts[target] || target === key) return;
      if (m.on === false) a.blocked = a.blocked.filter(k => k !== target);
      else if (!a.blocked.includes(target) && a.blocked.length < 50) a.blocked.push(target);
      save(); pushMe(a); if (myClub) sendClub(p);
      break;
    }
    // ---------- marktplaats
    case "market": sendMarket(p); break;
    case "marketList": {
      const give = String(m.give), want = String(m.want);
      if (!isItem(give) || !isItem(want) || give === want) return err("Ongeldig aanbod.");
      if ((a.items[give] || 0) < 1) return err("Je hebt dit item niet.");
      if (listings.filter(l => l.seller === key).length >= 5) return err("Je hebt al 5 aanbiedingen.");
      a.items[give]--; // item wordt vastgehouden (escrow) tot de ruil klaar is of je het intrekt
      listings.push({ id: randomBytes(5).toString("hex"), seller: key, give, want, created: Date.now(), pending: null });
      save(); pushMe(a); sendMarket(p); toast("📦 Aanbod geplaatst.");
      break;
    }
    case "marketCancel": {
      const l = listings.find(x => x.id === String(m.id));
      if (!l || l.seller !== key) return;
      if (l.pending) return err("Er loopt een ruilvoorstel. Accepteer of wijs het eerst af.");
      listings = listings.filter(x => x !== l);
      a.items[l.give] = (a.items[l.give] || 0) + 1;
      save(); pushMe(a); sendMarket(p); toast("Aanbod ingetrokken.");
      break;
    }
    case "marketPropose": {
      const l = listings.find(x => x.id === String(m.id));
      if (!l) return err("Dit aanbod bestaat niet meer.");
      if (l.seller === key) return err("Je kunt niet met jezelf ruilen.");
      if (l.pending) return err("Er loopt al een voorstel voor dit aanbod.");
      if ((a.items[l.want] || 0) < 1) return err("Je hebt het gevraagde item niet.");
      a.items[l.want]--; // jouw item wordt vastgehouden
      l.pending = { buyer: key, ts: Date.now() };
      save(); pushMe(a); sendMarket(p);
      notify(l.seller, { t: "toast", text: `📩 ${a.name} stelt een ruil voor. Kijk bij Mijn handel.` });
      toast("Voorstel verstuurd. De andere speler moet ook bevestigen.");
      break;
    }
    case "marketWithdraw": {
      const l = listings.find(x => x.id === String(m.id));
      if (!l || !l.pending || l.pending.buyer !== key) return;
      a.items[l.want] = (a.items[l.want] || 0) + 1;
      l.pending = null;
      save(); pushMe(a); sendMarket(p); toast("Voorstel ingetrokken.");
      break;
    }
    case "marketDecide": {
      const l = listings.find(x => x.id === String(m.id));
      if (!l || l.seller !== key || !l.pending) return;
      const buyer = accounts[l.pending.buyer];
      const bkey = l.pending.buyer;
      if (!buyer) { l.pending = null; return; }
      if (m.accept === true) {
        a.items[l.want] = (a.items[l.want] || 0) + 1;
        buyer.items[l.give] = (buyer.items[l.give] || 0) + 1;
        listings = listings.filter(x => x !== l);
        hist(a, `Geruild met ${buyer.name}: gegeven ${l.give}, gekregen ${l.want}`);
        hist(buyer, `Geruild met ${a.name}: gegeven ${l.want}, gekregen ${l.give}`);
        save(); pushMe(a); pushMe(buyer); sendMarket(p);
        notify(bkey, { t: "toast", text: `✅ ${a.name} heeft je ruil geaccepteerd!`, item: l.give });
        toast("✅ Ruil voltooid!", l.want);
      } else {
        buyer.items[l.want] = (buyer.items[l.want] || 0) + 1;
        l.pending = null;
        hist(buyer, `Voorstel aan ${a.name} afgewezen`);
        save(); pushMe(buyer); sendMarket(p);
        notify(bkey, { t: "toast", text: `${a.name} heeft je voorstel afgewezen. Je item is terug.` });
      }
      break;
    }
    case "wish": {
      const id = String(m.id);
      if (!isItem(id)) return;
      if (m.on === false) a.wishlist = a.wishlist.filter(x => x !== id);
      else if (!a.wishlist.includes(id) && a.wishlist.length < 20) a.wishlist.push(id);
      save(); pushMe(a);
      break;
    }
    case "showcase": {
      const ids: string[] = Array.isArray(m.ids) ? m.ids.map(String) : [];
      const uniq = Array.from(new Set(ids)).slice(0, 3);
      if (!uniq.every(id => isItem(id) && (a.items[id] || 0) > 0)) return err("Je hebt dit item niet.");
      a.showcase = uniq; save(); pushMe(a);
      break;
    }
  }
}

// ===== Fase 4: Game Show, Boss Challenges en Board Game (engine.js) =====
const hub = CC.createHub({
  send: (pid: string, o: object) => { const p = players.get(pid); if (p) send(p.ws, o); },
  reward: (pid: string, r: any) => applyReward(pid, r),
});
function applyReward(key: string, r: any) {
  const a = accounts[key];
  if (!a) return;
  let xp = Math.max(0, Math.floor(Number(r.xp) || 0));
  let first = false;
  if (typeof r.trophy === "string") {
    if (!a.trophies.includes(r.trophy)) { a.trophies.push(r.trophy); first = true; } else xp = Math.round(xp * 0.3); // herhaalde trofee: minder XP
  }
  let petNew = false;
  if (typeof r.petKey === "string" && r.win === true && !a.discoveries.includes(r.petKey)) { a.discoveries.push(r.petKey); petNew = true; }
  const today = new Date().toISOString().slice(0, 10);
  if (a.playDay !== today) { a.playDay = today; a.playCount = 0; }
  a.playCount++;
  if (a.playCount > 8) xp = Math.round(xp * 0.2); // dagelijkse limiet tegen XP-farmen
  const lv = addXpAcc(a, xp);
  let gift: string | undefined;
  if (typeof r.itemMin === "number" && (first || r.win === true) && a.playCount <= 8) gift = grantItem(a, r.itemMin);
  save();
  let text = `🏁 Spel afgelopen: +${xp} XP.${lv}`;
  if (first) text += " 🏆 Nieuwe trofee!";
  if (petNew) text += " 🐾 Nieuw huisdier ontgrendeld!";
  notify(key, { t: "me", me: meOf(a) });
  notify(key, { t: "toast", text, item: gift });
  hub.setLevel(key, level(a));
}
setInterval(() => hub.tick(Date.now()), 250);
const HUB_MSGS = new Set(["room.create", "room.join", "room.quick", "room.leave", "room.start", "room.sync", "ans", "roll", "pick"]);

// Webversie: de server levert zelf de speelbare pagina (public/index.html). Link naar een kamer: https://JOUW-SERVER/?room=CODE
const WEB_FILES = [path.join(__dirname, "..", "public", "index.html"), path.join(__dirname, "..", "index.html")]; // met of zonder map
const server = createServer((req: any, res: any) => {
  if (req.url === "/health") { res.writeHead(200); res.end("Casino Club server OK"); return; }
  let html = "";
  for (const f of WEB_FILES) { try { html = fs.readFileSync(f, "utf8"); break; } catch { /* volgende */ } }
  if (!html) { res.writeHead(200); res.end("Casino Club server OK"); return; }
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-cache" });
  res.end(html);
});
const wss = new WebSocketServer({ server, maxPayload: 4096 });

wss.on("connection", (ws: WebSocket) => {
  let p: Player | null = null;
  let count = 0, winStart = Date.now();

  ws.on("pong", () => { if (p) p.alive = true; });
  ws.on("message", raw => {
    const now = Date.now();
    if (now - winStart > 1000) { winStart = now; count = 0; }
    if (++count > 40) return; // simpele flood-bescherming
    let m: any;
    try { m = JSON.parse(raw.toString()); } catch { return; }
    if (!m || typeof m.t !== "string") return;

    if (m.t === "hello") {
      if (p) return;
      const name = String(m.name || "").trim();
      const fatal = (text: string) => { send(ws, { t: "error", text, fatal: true }); ws.close(); };
      if (!/^[A-Za-z0-9_]{3,16}$/.test(name)) return fatal("Naam: 3-16 tekens, alleen letters, cijfers en _.");
      const key = name.toLowerCase();
      let acc = accounts[key];
      let newToken: string | undefined;
      if (acc) {
        if (!m.token || hash(String(m.token)) !== acc.tokenHash) return fatal("Deze naam is al van iemand anders.");
      } else {
        const tok: string = randomBytes(24).toString("hex");
        newToken = tok;
        acc = { name, tokenHash: hash(tok), xp: 0, visited: [0], discoveries: [], lastFloor: 0, pets: ["cat"], petActive: "cat", petNames: {}, petSkin: {}, petAcc: {}, vipSeen: [], lastDaily: "", passXP: 0, passClaimed: [], title: 0, bg: 0,
          club: "", items: {}, wishlist: [], showcase: [], history: [], blocked: [], starter: true, trophies: [], playDay: "", playCount: 0 };
        for (let i = 0; i < 3; i++) grantItem(acc);
        accounts[key] = acc;
        save();
      }
      const old = players.get(key);
      if (old) { old.ws.close(); players.delete(key); }
      const floor = unlocked(acc).includes(acc.lastFloor) ? acc.lastFloor : 0;
      p = { id: randomBytes(4).toString("hex"), ws, acc, floor, x: 400, lastMove: now, hadOthers: false, alive: true };
      players.set(key, p);
      send(ws, { t: "welcome", token: newToken, floors: FLOORS, me: meOf(acc), floor, x: 400 });
      hub.connect(key, { name: acc.name, level: level(acc) }, Date.now());
      return;
    }
    if (!p) return;
    if (HUB_MSGS.has(m.t)) { const hk = p.acc.name.toLowerCase(); hub.setLevel(hk, level(p.acc)); hub.message(hk, m, now); return; }
    const pl = p;
    const err = (text: string) => send(ws, { t: "error", text });

    if (m.t === "move") {
      const x = Number(m.x);
      if (!Number.isFinite(x)) return;
      const dt = Math.max(now - pl.lastMove, 20) / 1000;
      const allowed = MAX_SPEED * dt + 30;
      pl.x = clamp(pl.x + clamp(x - pl.x, -allowed, allowed), 0, W);
      pl.lastMove = now;
    } else if (m.t === "floor") {
      const to = Number(m.to);
      if (!Number.isInteger(to) || !FLOORS[to]) return err("Onbekende verdieping.");
      if (to === pl.floor) return;
      if (!unlocked(pl.acc).includes(to)) return err("Deze verdieping is nog vergrendeld.");
      const arrive = 400; // menu-gestuurd: je kiest een verdieping, geen loopafstand meer
      pl.floor = to; pl.x = arrive; pl.acc.lastFloor = to; pl.hadOthers = true;
      let extra = "";
      let gift: string | undefined;
      if (!pl.acc.visited.includes(to)) {
        pl.acc.visited.push(to);
        extra = ` Eerste bezoek: +${FIRST_VISIT_XP} XP!` + addXp(pl, FIRST_VISIT_XP);
        gift = grantItem(pl.acc);
      }
      save();
      send(ws, { t: "floor", floor: to, x: arrive, me: meOf(pl.acc) });
      if (extra) send(ws, { t: "toast", text: FLOORS[to].name + "." + extra, item: gift });
    } else if (m.t === "discover") {
      const d = DISC[String(m.id)];
      if (!d) return;
      if (d.floor !== pl.floor) return err("Dat zit niet op deze verdieping.");
      const id = String(m.id);
      if (pl.acc.discoveries.includes(id)) return; // geen dubbele beloning
      pl.acc.discoveries.push(id);
      let text = `Gevonden! +${d.xp} XP.` + addXp(pl, d.xp);
      if (d.unlocks !== undefined) text += " Er is een geheime verdieping ontgrendeld in de lift!";
      const gift = grantItem(pl.acc);
      save();
      send(ws, { t: "me", me: meOf(pl.acc) });
      send(ws, { t: "toast", text, item: gift });
    } else if (m.t === "petClaim") {
      const def = PETS.find(x => x.id === String(m.id));
      const a = pl.acc;
      if (!def || a.pets.includes(def.id)) return;
      if (level(a) < def.minLevel || (def.needs && !a.discoveries.includes(def.needs))) return err("Dit huisdier is nog vergrendeld.");
      a.pets.push(def.id);
      if (!a.petActive) a.petActive = def.id;
      const lv = addXp(pl, 25);
      send(ws, { t: "me", me: meOf(a) });
      send(ws, { t: "toast", text: `🐾 Nieuw huisdier! +25 XP.${lv}` });
    } else if (m.t === "petActive") {
      const id = String(m.id);
      if (!pl.acc.pets.includes(id)) return;
      pl.acc.petActive = id;
      save();
      send(ws, { t: "me", me: meOf(pl.acc) });
    } else if (m.t === "petCustom") {
      const a = pl.acc;
      const id = String(m.id);
      if (!a.pets.includes(id)) return;
      if (m.name !== undefined) {
        const n = cleanPetName(String(m.name));
        if (n === null) return err("Gebruik 1-12 letters, cijfers, spatie, - of _ (geen scheldwoorden).");
        if (n === "") delete a.petNames[id]; else a.petNames[id] = n;
      }
      if (m.skin !== undefined) {
        const sk = Number(m.skin);
        if (!Number.isInteger(sk) || sk < 0 || sk >= SKIN_LEVELS.length || level(a) < SKIN_LEVELS[sk]) return err("Deze skin is nog vergrendeld.");
        a.petSkin[id] = sk;
      }
      if (m.acc !== undefined) {
        const ac = String(m.acc);
        if (ac === "") delete a.petAcc[id];
        else {
          const d = ACCS[ac];
          if (!d || level(a) < d.minLevel || (d.vip && !a.vipSeen.includes(d.vip)) || (d.pass && !a.passClaimed.includes(d.pass))) return err("Dit accessoire is nog vergrendeld.");
          a.petAcc[id] = ac;
        }
      }
      save();
      send(ws, { t: "me", me: meOf(a) });
    } else if (m.t === "vipEnter") {
      const v = VIPS.find(x => x.id === String(m.id));
      const a = pl.acc;
      if (!v || !vipOk(v, a)) return err("Deze VIP-ruimte is nog vergrendeld.");
      if (a.vipSeen.includes(v.id)) return;
      a.vipSeen.push(v.id);
      const lv = addXp(pl, v.xp);
      const gift = grantItem(a, 1);
      save();
      send(ws, { t: "me", me: meOf(a) });
      send(ws, { t: "toast", text: `✨ Welkom in de VIP-ruimte! +${v.xp} XP en een nieuw accessoire.${lv}`, item: gift });
    } else if (m.t === "passClaim") {
      const a = pl.acc;
      const tier = Number(m.tier);
      if (!Number.isInteger(tier) || !PASS_KIND[tier]) return;
      if (tier > passTier(a)) return err("Deze tier heb je nog niet bereikt.");
      if (a.passClaimed.includes(tier)) return;
      a.passClaimed.push(tier);
      save();
      send(ws, { t: "me", me: meOf(a) });
      send(ws, { t: "toast", text: `🎟️ Battle Pass-beloning van tier ${tier} opgehaald!` });
    } else if (m.t === "passEquip") {
      const a = pl.acc;
      const tier = Number(m.tier);
      const kind = String(m.kind);
      if (kind !== "title" && kind !== "bg") return;
      if (!Number.isInteger(tier)) return;
      if (tier !== 0 && (!a.passClaimed.includes(tier) || PASS_KIND[tier] !== kind)) return;
      if (kind === "title") a.title = tier; else a.bg = tier;
      save();
      send(ws, { t: "me", me: meOf(a) });
    } else if (m.t === "daily") {
      const today = new Date().toISOString().slice(0, 10);
      if (pl.acc.lastDaily === today) return err("Je hebt vandaag al je beloning gehad.");
      pl.acc.lastDaily = today;
      const lv = addXp(pl, 50);
      const gift = grantItem(pl.acc);
      save();
      send(ws, { t: "me", me: meOf(pl.acc) });
      send(ws, { t: "toast", text: `🎁 Dagelijkse beloning: +50 XP!${lv}`, item: gift });
    } else {
      handleSocial(pl, m, err);
    }
  });

  ws.on("close", () => {
    if (!p) return;
    const key = p.acc.name.toLowerCase();
    if (players.get(key)?.ws === ws) { players.delete(key); hub.disconnect(key); }
  });
});

// 10x per seconde: stuur iedere speler wie er nog meer op dezelfde verdieping is
setInterval(() => {
  const byFloor: Record<number, Player[]> = {};
  for (const p of players.values()) (byFloor[p.floor] ||= []).push(p);
  for (const list of Object.values(byFloor)) {
    for (const p of list) {
      const others = list.filter(o => o !== p).map(o => ({ id: o.id, name: o.acc.name, x: Math.round(o.x), pet: petLook(o.acc) }));
      if (others.length > 0 || p.hadOthers) { send(p.ws, { t: "players", list: others }); p.hadOthers = others.length > 0; }
    }
  }
}, 100);

// verbroken verbindingen opruimen
setInterval(() => {
  for (const p of players.values()) {
    if (!p.alive) { p.ws.terminate(); continue; }
    p.alive = false; p.ws.ping();
  }
}, 30000);

server.listen(PORT, () => console.log("Casino Club server draait op poort " + PORT));
