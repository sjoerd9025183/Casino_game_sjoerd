/* Casino Club Online - spel-engine voor Fase 4 (Game Show, Boss Challenges, Board Game).
   Draait op de server (Node) en, voor solo-modus, ook in de app (JavaScriptCore).
   Geen timers en geen afhankelijkheden: de host roept tick(now) aan. */
var CCHub = (function () {
  var COLORS = ["Rood", "Blauw", "Groen", "Geel"];
  var QUIZ = [
    { q: "Wat is de hoofdstad van Frankrijk?", o: ["Parijs", "Lyon", "Nice", "Lille"], a: 0 },
    { q: "Hoeveel dagen heeft een schrikkeljaar?", o: ["364", "365", "366", "367"], a: 2 },
    { q: "Welke planeet staat het dichtst bij de zon?", o: ["Venus", "Mercurius", "Mars", "Aarde"], a: 1 },
    { q: "Hoeveel kaarten zitten er in een pak (zonder jokers)?", o: ["48", "52", "54", "56"], a: 1 },
    { q: "Wat is 12 x 12?", o: ["124", "132", "144", "154"], a: 2 },
    { q: "Welk dier is het grootst?", o: ["Olifant", "Giraffe", "Blauwe vinvis", "Nijlpaard"], a: 2 },
    { q: "Hoeveel kleuren heeft een regenboog?", o: ["5", "6", "7", "8"], a: 2 },
    { q: "Wat is de hoofdstad van Nederland?", o: ["Rotterdam", "Den Haag", "Utrecht", "Amsterdam"], a: 3 },
    { q: "Welk gas ademen we in om te leven?", o: ["Zuurstof", "Stikstof", "Helium", "Waterstof"], a: 0 },
    { q: "Hoeveel minuten zijn 2 uur?", o: ["100", "110", "120", "130"], a: 2 },
    { q: "Welke kleur krijg je van blauw en geel?", o: ["Paars", "Groen", "Oranje", "Roze"], a: 1 },
    { q: "Hoeveel poten heeft een spin?", o: ["6", "8", "10", "12"], a: 1 },
    { q: "Wat is de grootste oceaan?", o: ["Atlantische", "Indische", "Stille Oceaan", "Noordelijke IJszee"], a: 2 },
    { q: "Welk getal komt na 99?", o: ["90", "100", "101", "110"], a: 1 },
    { q: "Wat is het kleinste priemgetal?", o: ["0", "1", "2", "3"], a: 2 },
    { q: "Hoeveel continenten zijn er?", o: ["5", "6", "7", "8"], a: 2 },
    { q: "Wat is de hoogste kaart in poker?", o: ["Koning", "Aas", "Dame", "Boer"], a: 1 },
    { q: "Welk getal is de grootste kans met twee dobbelstenen?", o: ["6", "7", "8", "9"], a: 1 },
    { q: "Hoeveel vakjes heeft een Europees roulettewiel?", o: ["36", "37", "38", "40"], a: 1 },
    { q: "Wat is 15 + 27?", o: ["41", "42", "43", "44"], a: 1 },
    { q: "Welke vogel kan niet vliegen?", o: ["Pinguïn", "Duif", "Uil", "Zwaluw"], a: 0 },
    { q: "In welke maand begint de zomer op het noordelijk halfrond?", o: ["Mei", "Juni", "Juli", "Augustus"], a: 1 },
    { q: "Wat is de helft van 250?", o: ["100", "115", "125", "150"], a: 2 },
    { q: "Welk lichaamsdeel pompt het bloed rond?", o: ["Long", "Lever", "Hart", "Nier"], a: 2 },
    { q: "Hoeveel zijden heeft een zeshoek?", o: ["5", "6", "7", "8"], a: 1 },
    { q: "Welke planeet heeft ringen die goed te zien zijn?", o: ["Mars", "Jupiter", "Saturnus", "Neptunus"], a: 2 },
    { q: "Wat is 9 x 7?", o: ["56", "63", "64", "72"], a: 1 },
    { q: "Welk dier geeft melk en legt eieren?", o: ["Koe", "Vleermuis", "Vogelbekdier", "Walvis"], a: 2 },
    { q: "Hoeveel seconden heeft een minuut?", o: ["50", "60", "90", "100"], a: 1 },
    { q: "Welke kleur heeft het getal nul op een roulettewiel?", o: ["Rood", "Zwart", "Groen", "Blauw"], a: 2 }
  ];
  var KINDS = ["quiz", "memory", "reaction", "number", "color", "logic", "arcade"];
  var BOSSES = {
    dealer: { name: "The Golden Dealer", emoji: "🎩", coop: false, max: 1, minLevel: 1, rounds: ["quiz", "logic", "quiz", "number"], ratio: 0.5, tm: 1.0,
              reward: { xp: 150, trophy: "boss_dealer", petKey: "boss_dealer", itemMin: 1 } },
    cardmaster: { name: "The Card Master", emoji: "🃏", coop: false, max: 1, minLevel: 2, rounds: ["memory", "color", "quiz", "memory", "logic"], ratio: 0.55, tm: 0.9,
              reward: { xp: 200, trophy: "boss_cardmaster", itemMin: 1 } },
    robot: { name: "The Lucky Robot", emoji: "🤖", coop: true, max: 4, minLevel: 3, rounds: ["reaction", "number", "arcade", "quiz", "reaction"], ratio: 0.55, tm: 0.9,
              reward: { xp: 250, trophy: "boss_robot", itemMin: 2 } },
    king: { name: "The Casino King", emoji: "👑", coop: true, max: 8, minLevel: 5, rounds: ["quiz", "memory", "reaction", "color", "logic", "arcade", "number"], ratio: 0.6, tm: 0.8,
              reward: { xp: 350, trophy: "boss_king", itemMin: 2 } },
    mystery: { name: "The Mystery Host", emoji: "🎭", coop: true, max: 8, minLevel: 7, rounds: null, ratio: 0.62, tm: 0.7,
              reward: { xp: 500, trophy: "boss_mystery", petKey: "boss_mystery", itemMin: 3 } }
  };
  var THEMES = { show: { classic: 1, neon: 3, gold: 5, galaxy: 8 }, board: { casino: 1, space: 2, jungle: 4 } };
  var TIMES = { quiz: 15000, color: 10000, logic: 20000, number: 15000, arcade: 10000 };
  var REVEAL_MS = 5000, PAUSE_MS = 1800, DONE_KEEP_MS = 120000, BOARD_LEN = 40;

  function createHub(env) {
    var rand = env.rand || Math.random;
    var rooms = {}, where = {}, people = {};
    var hubNow = 0;

    function ri(a, b) { return a + Math.floor(rand() * (b - a + 1)); }
    function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rand() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
    function newCode() { var c, L = "ABCDEFGHJKLMNPQRSTUVWXYZ"; do { c = ""; for (var i = 0; i < 4; i++) c += L.charAt(ri(0, L.length - 1)); } while (rooms[c]); return c; }
    function humans(r) { return r.members.filter(function (m) { return !m.bot && !m.left; }); }
    function indexOf(r, pid) { for (var i = 0; i < r.members.length; i++) if (r.members[i].pid === pid && !r.members[i].left) return i; return -1; }

    // ---------- snapshots
    function hostName(r) { for (var i = 0; i < r.members.length; i++) if (r.members[i].pid === r.host) return r.members[i].name; return ""; }
    function snap(r, pid) {
      var s = {
        t: "room", room: {
          code: r.code, game: r.game, boss: r.boss || "", theme: r.theme, size: r.size, bots: r.bots, phase: r.phase, now: hubNow,
          pub: r.pub, mode: r.mode, rounds: r.rounds, startChips: r.chips, host: r.host, isHost: r.host === pid, me: indexOf(r, pid), hostName: hostName(r),
          members: r.members.map(function (m) {
            return { n: m.name, bot: m.bot, on: m.bot ? true : (m.connected && !m.left), left: !!m.left, score: m.score, ans: !!m.ans, pos: m.pos, coins: m.coins, fin: !!m.fin, me: m.pid === pid };
          })
        }
      };
      var o = s.room;
      if (r.game === "boss" || r.game === "show") {
        o.roundNo = r.roundIdx + 1; o.roundTotal = r.plan ? r.plan.length : 0; o.final = !!r.inFinal;
        if (r.round && (r.phase === "round")) o.round = publicRound(r);
        if (r.reveal) o.reveal = r.reveal;
        if (r.game === "boss") { var b = BOSSES[r.boss]; o.boss = { name: b.name, emoji: b.emoji, coop: b.coop, target: r.target, damage: r.damage }; }
      }
      if (r.game === "board") o.board = boardPublic(r);
      if (r.game === "casino" && r.cs) { o.cs = csPublic(r); o.members.forEach(function (x, i) { csMember(r, r.members[i], x, pid); }); }
      if (r.result) o.result = r.result;
      return s;
    }
    function send(r) {
      r.members.forEach(function (m) { if (!m.bot && !m.left && m.connected) env.send(m.pid, snap(r, m.pid)); });
    }
    function sendOne(r, pid) { env.send(pid, snap(r, pid)); }

    // ---------- kamers
    function createRoom(pid, msg) {
      var p = people[pid]; if (!p) return;
      var game = String(msg.game);
      if (game !== "show" && game !== "boss" && game !== "board" && game !== "casino") return env.send(pid, { t: "error", text: "Onbekend spel." });
      var boss = "", size = Math.max(2, Math.min(8, parseInt(msg.size, 10) || 8));
      if (game === "boss") {
        var b = BOSSES[msg.boss];
        if (!b) return env.send(pid, { t: "error", text: "Onbekende baas." });
        if ((p.level || 1) < b.minLevel) return env.send(pid, { t: "error", text: "Je hebt niveau " + b.minLevel + " nodig voor deze baas." });
        boss = msg.boss; size = b.coop ? Math.min(size, b.max) : 1;
      }
      var theme = String(msg.theme || (game === "board" ? "casino" : "classic"));
      var tl = THEMES[game];
      if (tl) { if (tl[theme] === undefined) theme = game === "board" ? "casino" : "classic"; if ((p.level || 1) < tl[theme]) return env.send(pid, { t: "error", text: "Dit thema is nog vergrendeld." }); }
      leave(pid, true);
      var mode = "";
      if (game === "casino") { mode = String(msg.mode || "roulette"); if (["roulette", "blackjack", "slots", "dice", "poker", "race"].indexOf(mode) < 0) mode = "roulette"; }
      var clampN = function (v, lo, hi, d) { v = parseInt(v, 10); if (!(v >= lo)) v = d; return Math.min(hi, Math.max(lo, v)); };
      var r = { code: newCode(), game: game, boss: boss, theme: theme, size: size, bots: msg.bots !== false, host: pid, members: [], phase: "lobby", created: hubNow, roundIdx: -1,
                mode: mode, pub: msg.public === true, rounds: clampN(msg.rounds, 1, 20, 5), chips: clampN(msg.chips, 200, 10000, 1000) };
      rooms[r.code] = r;
      addMember(r, pid);
      send(r);
    }
    function addMember(r, pid) {
      var p = people[pid];
      r.members.push({ pid: pid, name: p.name, bot: false, connected: true, score: 0, pos: 0, coins: 0 });
      where[pid] = r.code;
    }
    function join(pid, code) {
      var r = rooms[String(code || "").toUpperCase()];
      if (!r) return env.send(pid, { t: "error", text: "Kamer niet gevonden." });
      if (where[pid] === r.code) return sendOne(r, pid);
      if (r.phase !== "lobby") return env.send(pid, { t: "error", text: "Dit spel is al begonnen." });
      if (r.members.filter(function (m) { return !m.left; }).length >= r.size) return env.send(pid, { t: "error", text: "Deze kamer is vol." });
      leave(pid, true);
      addMember(r, pid);
      send(r);
    }
    function quick(pid, msg) {
      var game = String(msg.game), boss = String(msg.boss || "");
      var found = null;
      Object.keys(rooms).forEach(function (c) {
        var r = rooms[c];
        if (!found && r.phase === "lobby" && r.pub && r.game === game && r.boss === boss && r.bots &&
            r.members.filter(function (m) { return !m.left; }).length < r.size && (game !== "boss" || BOSSES[boss].coop)) found = r;
      });
      if (found) join(pid, found.code); else createRoom(pid, msg);
    }
    function leave(pid, silent) {
      var code = where[pid]; if (!code) return;
      var r = rooms[code]; delete where[pid];
      if (!r) return;
      var i = indexOf(r, pid);
      if (i >= 0) {
        if (r.phase === "lobby") r.members.splice(i, 1);
        else { r.members[i].left = true; r.members[i].connected = false; }
      }
      if (humans(r).length === 0) { delete rooms[code]; }
      else {
        if (r.host === pid) { var h = humans(r)[0]; r.host = h.pid; }
        send(r);
      }
      if (!silent) env.send(pid, { t: "room", room: null });
    }

    // ---------- start
    function start(pid, now) {
      var r = rooms[where[pid]];
      if (!r || r.host !== pid || r.phase !== "lobby") return;
      var cur = r.members.filter(function (m) { return !m.left; });
      if (r.bots) {
        var target = (r.game === "boss" && !BOSSES[r.boss].coop) ? 1 : r.size;
        var names = shuffle(["Ace", "Luna", "Rex", "Nova", "Max", "Zara", "Bolt", "Kai", "Mila", "Finn", "Sky", "Jet"]);
        var k = 0;
        while (cur.length < target) {
          var bm = { pid: null, name: "🤖 " + names[k++ % names.length], bot: true, connected: true, score: 0, pos: 0, coins: 0, skill: 0.5 + rand() * 0.4 };
          r.members.push(bm); cur.push(bm);
        }
      }
      if (r.game !== "boss" && cur.length < 2) return env.send(pid, { t: "error", text: "Je hebt minimaal 2 spelers nodig (of zet bots aan)." });
      r.members = cur;
      r.members.forEach(function (m) { m.score = 0; m.pos = 0; m.coins = 0; });
      if (r.game === "casino") return csStart(r, now);
      if (r.game === "board") return startBoard(r, now);
      startArena(r, now);
    }

    // ---------- Arena (Game Show en Boss Challenges)
    function startArena(r, now) {
      r.quizUsed = {};
      r.inFinal = false;
      if (r.game === "show") r.plan = shuffle(KINDS).slice(0, 6);
      else {
        var b = BOSSES[r.boss];
        r.plan = b.rounds ? b.rounds.slice() : shuffle(KINDS).concat(shuffle(KINDS)).slice(0, 8);
        r.target = Math.round(r.plan.length * 150 * r.members.length * b.ratio);
        r.damage = 0;
      }
      r.roundIdx = -1;
      nextRound(r, now);
    }
    function tmul(r) { return r.game === "boss" ? BOSSES[r.boss].tm : 1; }
    function nextRound(r, now) {
      r.roundIdx++;
      if (r.roundIdx >= r.plan.length) {
        if (r.game === "show" && !r.inFinal && r.members.length > 2) {
          var order = r.members.slice().sort(function (a, b) { return b.score - a.score; });
          var n = Math.min(3, order.length - 1);
          r.members.forEach(function (m) { m.fin = false; });
          order.slice(0, n).forEach(function (m) { m.fin = true; });
          r.inFinal = true;
          r.plan = r.plan.concat(["quiz", "logic"]);
          return beginRound(r, r.plan[r.roundIdx], now);
        }
        return finishArena(r, now);
      }
      beginRound(r, r.plan[r.roundIdx], now);
    }
    function pickQuiz(r) {
      var avail = []; for (var i = 0; i < QUIZ.length; i++) if (!r.quizUsed[i]) avail.push(i);
      if (avail.length === 0) { r.quizUsed = {}; for (var j = 0; j < QUIZ.length; j++) avail.push(j); }
      var k = avail[ri(0, avail.length - 1)]; r.quizUsed[k] = true; return QUIZ[k];
    }
    function logicPuzzle() {
      var type = ri(0, 3), seq = [], ans = 0;
      if (type === 0) { var a = ri(1, 9), d = ri(2, 7); for (var i = 0; i < 4; i++) seq.push(a + d * i); ans = a + d * 4; }
      else if (type === 1) { var s = ri(1, 3), q = ri(2, 3); var v = s; for (var j = 0; j < 4; j++) { seq.push(v); v *= q; } ans = v; }
      else if (type === 2) { var b = ri(1, 5); for (var k = 1; k <= 4; k++) seq.push(k * k + b); ans = 25 + b; }
      else { var c = ri(1, 6); var cur = c, step = 1; for (var m = 0; m < 4; m++) { seq.push(cur); cur += step; step++; } ans = cur; }
      var opts = [ans]; var guard = 0;
      while (opts.length < 4 && guard++ < 50) { var x = ans + ri(-6, 6); if (x > 0 && opts.indexOf(x) < 0) opts.push(x); }
      while (opts.length < 4) opts.push(ans + opts.length * 7);
      opts = shuffle(opts);
      return { seq: seq, options: opts, answer: opts.indexOf(ans) };
    }
    function beginRound(r, kind, now) {
      r.phase = "round"; r.reveal = null;
      r.members.forEach(function (m) { m.ans = false; m.val = undefined; m.at = 0; m.detail = ""; m.gain = 0; });
      var tm = tmul(r), rd = { kind: kind, start: now, data: {}, secret: {} };
      var dur;
      if (kind === "quiz") { var q = pickQuiz(r); rd.data = { q: q.q, options: q.o }; rd.secret.answer = q.a; dur = TIMES.quiz * tm; }
      else if (kind === "color") {
        var word = ri(0, 3), ink = ri(0, 3); if (ink === word) ink = (ink + 1 + ri(0, 2)) % 4;
        rd.data = { word: COLORS[word].toUpperCase(), ink: ink, options: COLORS }; rd.secret.answer = ink; dur = TIMES.color * tm;
      }
      else if (kind === "logic") { var lp = logicPuzzle(); rd.data = { seq: lp.seq, options: lp.options }; rd.secret.answer = lp.answer; dur = TIMES.logic * tm; }
      else if (kind === "number") { rd.data = { min: 1, max: 100 }; rd.secret.answer = ri(1, 100); dur = TIMES.number * tm; }
      else if (kind === "arcade") { rd.data = {}; dur = TIMES.arcade; }
      else if (kind === "memory") {
        var len = Math.min(7, 3 + Math.floor(Math.max(0, r.roundIdx) / 2) + (r.game === "boss" ? 1 : 0));
        var seq = []; for (var i = 0; i < len; i++) seq.push(ri(0, 3));
        var showMs = len * 700 + 1000;
        rd.data = { seq: seq, showUntil: now + showMs, colors: COLORS }; rd.secret.answer = seq; dur = showMs + len * 1800 + 3000;
      }
      else if (kind === "reaction") { rd.secret.goAt = now + 2000 + ri(0, 4000); rd.data = {}; dur = (rd.secret.goAt - now) + 3000; }
      rd.endsAt = now + Math.round(dur);
      r.round = rd;
      // bots plannen hun antwoord
      r.botQ = [];
      r.members.forEach(function (m, mi) {
        if (!m.bot || (r.inFinal && !m.fin)) return;
        var sk = m.skill, at, val;
        if (kind === "quiz" || kind === "color" || kind === "logic") {
          at = now + 2000 + rand() * 7000 * tm; val = rand() < sk ? rd.secret.answer : ri(0, 3);
        } else if (kind === "number") { at = now + 2000 + rand() * 8000; val = ri(1, 100); }
        else if (kind === "arcade") { at = rd.endsAt - 300; val = Math.round(18 + sk * 22 + rand() * 8); }
        else if (kind === "memory") {
          at = rd.data.showUntil + rd.secret.answer.length * 900 + rand() * 3000;
          val = rd.secret.answer.map(function (c) { return rand() < Math.pow(sk, 0.6) ? c : (c + 1) % 4; });
        } else { at = rd.secret.goAt + 250 + rand() * 450 / sk; val = (rand() < 0.05) ? "early" : "go"; if (val === "early") at = now + 1500; }
        r.botQ.push({ at: at, mi: mi, val: val });
      });
      send(r);
    }
    function publicRound(r) {
      var rd = r.round, d = {}; for (var k in rd.data) d[k] = rd.data[k];
      var o = { kind: rd.kind, start: rd.start, endsAt: rd.endsAt, data: d };
      if (rd.kind === "reaction") o.go = hubNow >= rd.secret.goAt;
      return o;
    }
    function canAnswer(r, m) { return r.phase === "round" && !m.left && !(r.inFinal && !m.fin); }
    function submit(r, mi, value, now) {
      var m = r.members[mi]; if (!m || !canAnswer(r, m)) return;
      var rd = r.round, kind = rd.kind;
      if (now > rd.endsAt + 400) return;
      if (kind === "arcade") {
        var c = Math.max(0, Math.min(150, Math.floor(Number(value) || 0)));
        if (m.val === undefined || c >= m.val) { m.val = c; m.at = now; }
        return; // eindigt met de ronde
      }
      if (m.ans) return;
      if (kind === "quiz" || kind === "color" || kind === "logic") {
        var v = parseInt(value, 10); if (!(v >= 0 && v <= 3)) return; m.val = v;
      } else if (kind === "number") {
        var g = parseInt(value, 10); if (!(g >= 1 && g <= 100)) return; m.val = g;
      } else if (kind === "memory") {
        if (!Array.isArray(value)) return;
        m.val = value.slice(0, 10).map(function (x) { return parseInt(x, 10); });
      } else if (kind === "reaction") {
        m.val = now < rd.secret.goAt ? "early" : "go";
      }
      m.ans = true; m.at = now;
      if (allAnswered(r)) rd.endsAt = Math.min(rd.endsAt, now + 600);
      send(r);
    }
    function allAnswered(r) {
      if (r.round.kind === "arcade") return false;
      return r.members.every(function (m) { return m.left || m.ans || (r.inFinal && !m.fin) || (!m.bot && !m.connected); });
    }
    function endRound(r, now) {
      var rd = r.round, kind = rd.kind, results = [], correct = null;
      var mult = r.inFinal ? 2 : 1;
      var active = r.members.filter(function (m) { return !m.left && !(r.inFinal && !m.fin); });
      if (kind === "number") {
        correct = rd.secret.answer;
        var ranked = active.filter(function (m) { return m.ans; }).sort(function (a, b) { return Math.abs(a.val - correct) - Math.abs(b.val - correct); });
        var table = [150, 100, 60], lastDist = -1, rk = -1;
        ranked.forEach(function (m, i) {
          var d = Math.abs(m.val - correct); if (d !== lastDist) { rk = i; lastDist = d; }
          m.gain = (rk < 3 ? table[rk] : 20); m.detail = "Gok " + m.val + (d === 0 ? " - precies!" : " (" + d + " ernaast)");
        });
      }
      active.forEach(function (m) {
        if (kind === "number") { if (!m.ans) { m.gain = 0; m.detail = "Geen gok"; } }
        else if (kind === "quiz" || kind === "color" || kind === "logic") {
          correct = rd.secret.answer;
          if (m.ans && m.val === correct) {
            var frac = Math.max(0, (rd.endsAt - m.at)) / Math.max(1, rd.endsAt - rd.start);
            m.gain = 100 + Math.round(50 * Math.min(1, frac)); m.detail = "Goed!";
          } else { m.gain = 0; m.detail = m.ans ? "Fout" : "Geen antwoord"; }
        } else if (kind === "memory") {
          correct = rd.secret.answer;
          if (m.ans) {
            var okc = 0; for (var i = 0; i < correct.length && i < m.val.length; i++) { if (m.val[i] === correct[i]) okc++; else break; }
            m.gain = Math.min(150, okc * 25 + (okc === correct.length ? 50 : 0)); m.detail = okc + " van " + correct.length + " goed";
          } else { m.gain = 0; m.detail = "Geen antwoord"; }
        } else if (kind === "reaction") {
          if (m.ans && m.val === "go") {
            var ms = Math.max(0, m.at - rd.secret.goAt); m.gain = Math.min(150, Math.max(0, Math.round(200 - ms / 6))); m.detail = ms + " ms";
          } else { m.gain = 0; m.detail = m.ans ? "Te vroeg!" : "Te laat"; }
        } else if (kind === "arcade") {
          var c = m.val === undefined ? 0 : m.val; m.gain = Math.min(150, c * 5); m.detail = c + " tikken";
        }
        m.gain *= mult;
        m.score += m.gain;
        results.push({ n: m.name, gain: m.gain, detail: m.detail });
      });
      if (r.game === "boss") r.damage += active.reduce(function (s, m) { return s + m.gain; }, 0);
      var answerText = "";
      if (kind === "quiz" || kind === "logic") answerText = String(rd.data.options[rd.secret.answer]);
      else if (kind === "color") answerText = COLORS[rd.secret.answer];
      else if (kind === "number") answerText = String(rd.secret.answer);
      else if (kind === "memory") answerText = rd.secret.answer.map(function (c) { return COLORS[c]; }).join(" - ");
      r.reveal = { kind: kind, correct: correct, answerText: answerText, results: results, until: now + REVEAL_MS };
      r.phase = "reveal";
      send(r);
    }
    function finishArena(r, now) {
      r.phase = "done"; r.round = null;
      var hs = humans(r), hc = hs.length;
      var ranking = r.members.slice().sort(function (a, b) { return b.score - a.score; });
      if (r.game === "show") {
        r.result = { ranking: ranking.map(function (m) { return { n: m.name, score: m.score }; }), winner: ranking[0].name };
        ranking.forEach(function (m, i) {
          if (m.bot || m.left) return;
          var xp = [120, 80, 60][i] || 40; xp += 20;
          var rw = { kind: "show", xp: hc >= 2 ? xp : Math.round(xp * 0.4), win: i === 0, humans: hc };
          if (i === 0 && hc >= 2) { rw.trophy = "show_win"; rw.itemMin = 1; }
          env.reward(m.pid, rw);
        });
      } else {
        var b = BOSSES[r.boss], win = r.damage >= r.target;
        r.result = { win: win, damage: r.damage, target: r.target, ranking: ranking.map(function (m) { return { n: m.name, score: m.score }; }) };
        hs.forEach(function (m) {
          if (win) env.reward(m.pid, { kind: "boss", boss: r.boss, xp: b.reward.xp, trophy: b.reward.trophy, petKey: b.reward.petKey, itemMin: b.reward.itemMin, win: true, humans: hc });
          else env.reward(m.pid, { kind: "boss", boss: r.boss, xp: 20, win: false, humans: hc });
        });
      }
      r.doneAt = now;
      send(r);
    }

    // ---------- Board game
    function tileType(i) {
      if (i === 0) return "start"; if (i >= BOARD_LEN) return "finish";
      if (i % 10 === 0) return "quest"; if (i % 7 === 0) return "trap"; if (i % 5 === 0) return "bonus";
      if (i % 4 === 0) return "mini"; if (i % 9 === 0) return "shortcut"; return "coin";
    }
    function startBoard(r, now) {
      r.turn = 0; r.turnNo = 0; r.phase = "roll"; r.event = "Het spel begint! " + r.members[0].name + " mag gooien."; r.dice = 0; r.pending = null;
      r.deadline = now + 15000; r.nextAt = 0; r.botAt = now + 1200;
      send(r);
    }
    function boardPublic(r) {
      return { turn: r.turn, turnNo: r.turnNo, dice: r.dice, event: r.event, deadline: r.deadline, len: BOARD_LEN,
               pending: r.pending ? { type: r.pending.type, q: r.pending.q, options: r.pending.options, who: r.pending.who, targets: r.pending.targets, dice: r.pending.dice } : null };
    }
    function curMember(r) { return r.members[r.turn]; }
    function autoDelay(r, m) { return m.bot ? 1000 + rand() * 800 : (m.connected ? 15000 : 1500); }
    function roll(r, mi, now) {
      if (r.phase !== "roll" || r.turn !== mi) return;
      var m = r.members[mi], d = ri(1, 6); r.dice = d;
      var np = Math.min(BOARD_LEN, m.pos + d); m.pos = np;
      var t = tileType(np), ev = m.name + " gooit " + d + ". ";
      if (np >= BOARD_LEN) { m.pos = BOARD_LEN; r.event = ev + "En bereikt de finish! 🏁"; return finishBoard(r, now, mi); }
      var again = false;
      if (t === "coin") { m.coins += 10; ev += "💰 +10 munten."; }
      else if (t === "bonus") { ev += "⭐ Bonus: nog een keer gooien!"; again = true; }
      else if (t === "trap") { m.pos = Math.max(0, np - 3); ev += "🕳️ Valstrik: 3 vakjes terug."; }
      else if (t === "shortcut") { m.pos = Math.min(BOARD_LEN - 1, np + 3); ev += "🚀 Sneltrein: 3 vakjes vooruit!"; }
      else if (t === "mini") {
        var q = QUIZ[ri(0, QUIZ.length - 1)];
        r.pending = { type: "mini", q: q.q, options: q.o, answer: q.a, who: mi };
        r.phase = "mini"; r.event = ev + "🎯 Minigame: beantwoord de vraag!"; r.deadline = now + (m.bot ? 2500 : (m.connected ? 15000 : 1500)); r.botAt = now + 1500 + rand() * 2500;
        return send(r);
      }
      else if (t === "quest") {
        var others = []; r.members.forEach(function (o, oi) { if (oi !== mi && !o.left) others.push(oi); });
        if (others.length === 0) { m.coins += 15; r.event = ev + "💰 +15 munten."; return endTurn(r, now, false); }
        r.pending = { type: "duel", who: mi, targets: others };
        r.phase = "duel"; r.event = ev + "⚔️ Speciale opdracht: kies een tegenstander voor een dobbelduel!"; r.deadline = now + (m.bot ? 2000 : (m.connected ? 12000 : 1500)); r.botAt = now + 1500;
        return send(r);
      }
      r.event = ev;
      endTurn(r, now, again);
    }
    function answerMini(r, mi, v, now) {
      if (r.phase !== "mini" || r.pending.who !== mi) return;
      var m = r.members[mi], ok = parseInt(v, 10) === r.pending.answer, ev = m.name + ": ";
      if (ok) { m.coins += 25; ev += "goed! 💰 +25 munten."; } else { m.coins = Math.max(0, m.coins - 10); ev += "fout. -10 munten."; }
      r.event = ev; r.pending = null; endTurn(r, now, false);
    }
    function pickDuel(r, mi, v, now) {
      if (r.phase !== "duel" || r.pending.who !== mi) return;
      var t = parseInt(v, 10);
      if (r.pending.targets.indexOf(t) < 0) return;
      var a = r.members[mi], b = r.members[t], da = ri(1, 6), db = ri(1, 6), ev = a.name + " 🎲" + da + " tegen " + b.name + " 🎲" + db + ". ";
      if (da > db) { var s = Math.min(20, b.coins); a.coins += s; b.coins -= s; ev += a.name + " wint " + s + " munten!"; }
      else if (db > da) { var s2 = Math.min(20, a.coins); b.coins += s2; a.coins -= s2; ev += b.name + " wint " + s2 + " munten!"; }
      else ev += "Gelijkspel.";
      r.event = ev; r.pending = null; endTurn(r, now, false);
    }
    function endTurn(r, now, again) {
      r.phase = "pause"; r.nextAt = now + PAUSE_MS; r.again = again; r.pending = null;
      send(r);
    }
    function nextTurn(r, now) {
      if (!r.again) {
        var n = r.members.length, tries = 0;
        do { r.turn = (r.turn + 1) % n; tries++; } while (r.members[r.turn].left && tries <= n);
        r.turnNo++;
      }
      if (r.turnNo > 120) return finishBoard(r, now, -1);
      var m = curMember(r);
      r.phase = "roll"; r.deadline = now + (m.bot ? 2200 : (m.connected ? 15000 : 1500)); r.botAt = now + 900 + rand() * 700;
      r.event = m.name + " is aan de beurt."; send(r);
    }
    function finishBoard(r, now, winnerIdx) {
      r.phase = "done"; r.pending = null; r.doneAt = now;
      var order = r.members.map(function (m, i) { return { m: m, i: i }; }).sort(function (a, b) {
        if (a.i === winnerIdx) return -1; if (b.i === winnerIdx) return 1;
        return (b.m.pos + b.m.coins / 10) - (a.m.pos + a.m.coins / 10);
      });
      var hs = humans(r), hc = hs.length;
      r.result = { winner: order[0].m.name, ranking: order.map(function (o) { return { n: o.m.name, score: o.m.pos, coins: o.m.coins }; }) };
      order.forEach(function (o, idx) {
        var m = o.m; if (m.bot || m.left) return;
        var xp = (idx === 0 ? 100 : 30) + Math.min(20, Math.floor(m.coins / 10));
        var rw = { kind: "board", xp: hc >= 2 ? xp : Math.round(xp * 0.4), win: idx === 0, humans: hc };
        if (idx === 0 && hc >= 2) { rw.trophy = "board_win"; rw.itemMin = 1; }
        env.reward(m.pid, rw);
      });
      send(r);
    }
    function boardTick(r, now) {
      if (r.phase === "pause") { if (now >= r.nextAt) nextTurn(r, now); return; }
      var m = curMember(r);
      if (r.phase === "roll") {
        if ((m.bot && now >= r.botAt) || now >= r.deadline) roll(r, r.turn, now);
      } else if (r.phase === "mini") {
        if ((m.bot && now >= r.botAt) || now >= r.deadline) answerMini(r, r.turn, m.bot && rand() < m.skill ? r.pending.answer : ri(0, 3), now);
      } else if (r.phase === "duel") {
        if ((m.bot && now >= r.botAt) || now >= r.deadline) {
          var t = r.pending.targets; pickDuel(r, r.turn, t[ri(0, t.length - 1)], now);
        }
      }
    }


    // ---------- Casino-lobby's: alle gokspellen met elkaar, iedereen ziet elkaars inzet en kaarten
    var CS_GAMES = ["roulette", "blackjack", "slots", "dice", "poker"];
    var SL_W = [30, 25, 20, 12, 7, 4, 1.5, 0.5], SL_PAY = [5, 8, 10, 15, 25, 50, 100, 250];
    var RL_RED = { 1: 1, 3: 1, 5: 1, 7: 1, 9: 1, 12: 1, 14: 1, 16: 1, 18: 1, 19: 1, 21: 1, 23: 1, 25: 1, 27: 1, 30: 1, 32: 1, 34: 1, 36: 1 };
    function rlValid(k) { return /^(n([0-9]|[12][0-9]|3[0-6])|red|black|even|odd|low|high|d[123]|c[123])$/.test(k); }
    function rlMult(k, n) {
      if (k.charAt(0) === "n") return Number(k.slice(1)) === n ? 36 : 0;
      if (n === 0) return 0;
      var red = !!RL_RED[n];
      switch (k) {
        case "red": return red ? 2 : 0; case "black": return red ? 0 : 2; case "even": return n % 2 === 0 ? 2 : 0; case "odd": return n % 2 === 1 ? 2 : 0;
        case "low": return n <= 18 ? 2 : 0; case "high": return n >= 19 ? 2 : 0;
        case "d1": return n <= 12 ? 3 : 0; case "d2": return n >= 13 && n <= 24 ? 3 : 0; case "d3": return n >= 25 ? 3 : 0;
        case "c1": return n % 3 === 1 ? 3 : 0; case "c2": return n % 3 === 2 ? 3 : 0; case "c3": return n % 3 === 0 ? 3 : 0;
      }
      return 0;
    }
    function slSym() { var x = rand() * 100; for (var i = 0; i < 8; i++) { x -= SL_W[i]; if (x < 0) return i; } return 0; }
    function alive(r) { return r.members.filter(function (m) { return !m.left && !m.out; }); }
    function committed(m) { var s = m.bet || 0; for (var k in m.bets) s += m.bets[k]; return s; }
    function bjDraw() { return [2 + Math.floor(rand() * 13), Math.floor(rand() * 4)]; }
    function bjTot(h) { var t = 0, a = 0; h.forEach(function (c) { if (c[0] === 14) { a++; t += 11; } else t += Math.min(c[0], 10); }); while (t > 21 && a > 0) { t -= 10; a--; } return t; }
    // poker: handwaardering
    function pkEval5(c) {
      var ranks = c.map(function (x) { return x[0]; }).sort(function (a, b) { return b - a; });
      var suits = {}; c.forEach(function (x) { suits[x[1]] = 1; });
      var flush = Object.keys(suits).length === 1, uniq = ranks.filter(function (v, i) { return ranks.indexOf(v) === i; }), sh = 0;
      if (uniq.length === 5) { if (uniq[0] - uniq[4] === 4) sh = uniq[0]; else if (uniq.join() === "14,5,4,3,2") sh = 5; }
      var cnt = {}; ranks.forEach(function (v) { cnt[v] = (cnt[v] || 0) + 1; });
      var g = Object.keys(cnt).map(function (k) { return [cnt[k], Number(k)]; }).sort(function (a, b) { return b[0] - a[0] || b[1] - a[1]; });
      var shape = g.map(function (x) { return x[0]; }).join(""), order = g.map(function (x) { return x[1]; });
      if (sh && flush) return [8, sh]; if (shape === "41") return [7].concat(order); if (shape === "32") return [6].concat(order);
      if (flush) return [5].concat(ranks); if (sh) return [4, sh]; if (shape === "311") return [3].concat(order);
      if (shape === "221") return [2].concat(order); if (shape === "2111") return [1].concat(order); return [0].concat(ranks);
    }
    function cmpArr(a, b) { for (var i = 0; i < Math.max(a.length, b.length); i++) { var d = (a[i] || 0) - (b[i] || 0); if (d) return d; } return 0; }
    function pkBest(cs) {
      var best = [-1], n = cs.length;
      for (var i = 0; i < n; i++) for (var j = i + 1; j < n; j++) for (var k = j + 1; k < n; k++) for (var l = k + 1; l < n; l++) for (var m = l + 1; m < n; m++) {
        var h = pkEval5([cs[i], cs[j], cs[k], cs[l], cs[m]]); if (cmpArr(h, best) > 0) best = h;
      }
      return best;
    }
    var HAND_NAMES = ["Hoge kaart", "Een paar", "Twee paar", "Drie gelijke", "Straat", "Flush", "Full house", "Vier gelijke", "Straatflush"];

    function csStart(r, now) {
      r.cs = { game: null, roundNo: 0, stage: 0, stageRound: 0, elimNo: 0, dealerI: -1 };
      r.members.forEach(function (m) { m.chips = r.chips; m.out = false; m.elimNo = 0; });
      csNext(r, now);
    }
    function csNext(r, now) {
      var cs = r.cs, act = alive(r);
      cs.game = r.mode === "race" ? CS_GAMES[cs.stage % CS_GAMES.length] : r.mode;
      cs.roundNo++; cs.msg = ""; cs.result = null; cs.dealer = null; cs.board = null;
      act.forEach(function (m) { m.ready = false; m.bets = {}; m.bet = 0; m.pick = ""; m.hand = null; m.stand = false; m.bust = false; m.doubled = false; m.res = ""; m.delta = 0; m.reels = null; m.hole = null; m.fold = false; m.allin = false; m.pbet = 0; m.act = ""; m.botAt = now + 1500 + rand() * 4500; });
      if (cs.game === "poker") return pkStart(r, now);
      r.phase = "cbet"; cs.endsAt = now + (cs.game === "roulette" ? 22000 : 16000);
      send(r);
    }
    function csPublic(r) {
      var cs = r.cs, o = { game: cs.game, roundNo: cs.roundNo, stage: cs.stage, stageRound: cs.stageRound, endsAt: cs.endsAt, msg: cs.msg || "", result: cs.result || null };
      if (cs.dealer) { var hide = r.phase === "cplay" && cs.game === "blackjack"; o.dealer = hide ? [cs.dealer[0], [0, 0]] : cs.dealer; o.dealerHidden = hide; }
      if (cs.game === "poker") { o.pot = cs.pot; o.board = cs.board || []; o.sub = cs.sub; o.currentBet = cs.currentBet; o.showdown = !!cs.showdown; o.turn = cs.need && cs.need.length ? r.members.indexOf(cs.need[0]) : -1; o.dealerI = cs.dealerM ? r.members.indexOf(cs.dealerM) : -1; }
      if (r.mode === "race") o.nextGame = CS_GAMES[cs.stage % CS_GAMES.length];
      return o;
    }
    function csMember(r, m, x, pid) {
      x.chips = m.chips; x.out = !!m.out; x.ready = !!m.ready; x.bets = m.bets || {}; x.bet = m.bet || 0; x.pick = m.pick || ""; x.hand = m.hand || null; x.stand = !!m.stand; x.bust = !!m.bust;
      x.res = m.res || ""; x.delta = m.delta || 0; x.reels = m.reels || null; x.fold = !!m.fold; x.allin = !!m.allin; x.pbet = m.pbet || 0; x.act = m.act || "";
      var showAll = r.cs && r.cs.showdown && !m.fold;
      x.hole = m.hole && (m.pid === pid || showAll) ? m.hole : null; x.hasHole = !!m.hole;
    }
    function bots(r) { return alive(r).filter(function (m) { return m.bot; }); }
    function botBet(r, m, now) {
      var g = r.cs.game, free = m.chips - committed(m);
      if (free < 5) { m.ready = true; return; }
      if (g === "roulette") {
        var keys = ["red", "black", "even", "odd", "low", "high", "d1", "d2", "d3", "n" + Math.floor(rand() * 37)], k = Math.floor(rand() * 3) + 1;
        while (k-- > 0) { var key = keys[Math.floor(rand() * keys.length)], amt = Math.min(free, 10 + Math.floor(rand() * 8) * 10); if (amt >= 5 && committed(m) + amt <= m.chips) m.bets[key] = (m.bets[key] || 0) + amt; }
      } else {
        m.bet = Math.min(free, 10 + Math.floor(rand() * 8) * 10);
        if (g === "dice") m.pick = ["under", "seven", "over"][Math.floor(rand() * 3)];
      }
      m.ready = true;
    }
    function csResolveBets(r, now) {
      var cs = r.cs, g = cs.game, act = alive(r), any = false;
      if (g === "roulette") {
        var n = Math.floor(rand() * 37); cs.result = { n: n };
        act.forEach(function (m) {
          var stake = committed(m); if (!stake) return; any = true; var win = 0;
          for (var k in m.bets) win += m.bets[k] * rlMult(k, n);
          m.delta = win - stake; m.chips += m.delta; m.res = win > 0 ? "wint " + win : "verliest " + stake;
        });
        cs.msg = "Uitgekomen: " + n; cs.endsAt = now + 9000;
      } else if (g === "slots") {
        act.forEach(function (m) {
          var bet = Math.min(m.bet || 0, m.chips); if (bet < 1) return; any = true;
          var rr = [slSym(), slSym(), slSym()], mult = 0;
          if (rr[0] === rr[1] && rr[1] === rr[2]) mult = SL_PAY[rr[0]]; else { var c = rr.filter(function (x) { return x === 0; }).length; mult = c === 2 ? 2 : c === 1 ? 0.5 : 0; }
          var win = Math.floor(bet * mult); m.reels = rr; m.bet = bet; m.delta = win - bet; m.chips += m.delta; m.res = win > 0 ? "wint " + win : "verliest " + bet;
        });
        cs.endsAt = now + 7000;
      } else if (g === "dice") {
        var a = 1 + Math.floor(rand() * 6), b = 1 + Math.floor(rand() * 6), s = a + b, out = s < 7 ? "under" : s > 7 ? "over" : "seven";
        cs.result = { dice: [a, b] }; cs.msg = "Som " + s;
        act.forEach(function (m) {
          var bet = Math.min(m.bet || 0, m.chips); if (bet < 1) return; any = true;
          var win = out === m.pick ? bet * (out === "seven" ? 5 : 2) : 0; m.bet = bet; m.delta = win - bet; m.chips += m.delta; m.res = win > 0 ? "wint " + (win - bet) : "verliest " + bet;
        });
        cs.endsAt = now + 7000;
      } else if (g === "blackjack") {
        var players = act.filter(function (m) { return Math.min(m.bet || 0, m.chips) >= 1; });
        if (players.length) {
          cs.dealer = [bjDraw(), bjDraw()];
          players.forEach(function (m) { m.bet = Math.min(m.bet, m.chips); m.hand = [bjDraw(), bjDraw()]; m.stand = bjTot(m.hand) === 21; m.botAt = now + 1500 + rand() * 1500; });
          r.phase = "cplay"; cs.endsAt = now + 25000; cs.msg = "Speel je hand!";
          if (players.every(function (m) { return m.stand; })) return bjFinish(r, now);
          return send(r);
        }
      }
      if (!any) { cs.msg = "Niemand zette in deze ronde."; cs.endsAt = now + 3000; }
      r.phase = "cres"; send(r);
    }
    function bjPlayers(r) { return alive(r).filter(function (m) { return m.hand; }); }
    function bjFinish(r, now) {
      var cs = r.cs;
      while (bjTot(cs.dealer) < 17) cs.dealer.push(bjDraw());
      var dt = bjTot(cs.dealer), dNat = cs.dealer.length === 2 && dt === 21;
      bjPlayers(r).forEach(function (m) {
        var pt = bjTot(m.hand), nat = m.hand.length === 2 && pt === 21 && !m.doubled, d;
        if (pt > 21) d = -m.bet; else if (nat && !dNat) d = Math.floor(m.bet * 1.5); else if (nat && dNat) d = 0;
        else if (dt > 21 || pt > dt) d = m.bet; else if (pt === dt) d = 0; else d = -m.bet;
        m.delta = d; m.chips += d; m.res = d > 0 ? "wint " + d : d < 0 ? "verliest " + (-d) : "gelijkspel";
      });
      cs.msg = "Deler: " + dt + (dt > 21 ? " (bust)" : ""); r.phase = "cres"; cs.endsAt = now + 7000; send(r);
    }
    function bjAct(r, m, kind, now) {
      if (r.phase !== "cplay" || r.cs.game !== "blackjack" || !m.hand || m.stand) return;
      if (kind === "hit") { m.hand.push(bjDraw()); var t = bjTot(m.hand); if (t > 21) { m.stand = true; m.bust = true; } else if (t === 21) m.stand = true; }
      else if (kind === "double") { if (m.hand.length !== 2 || m.chips < m.bet * 2) return; m.bet *= 2; m.doubled = true; m.hand.push(bjDraw()); m.stand = true; m.bust = bjTot(m.hand) > 21; }
      else m.stand = true;
      if (bjPlayers(r).every(function (x) { return x.stand; })) return bjFinish(r, now);
      send(r);
    }
    // ----- poker
    function pkOrder(r, fromM) {
      var act = alive(r), i = act.indexOf(fromM), out = [];
      for (var k = 0; k < act.length; k++) { var m = act[(i + k) % act.length]; if (!m.fold && !m.allin) out.push(m); }
      return out;
    }
    function pkPay(r, m, amt) { var a = Math.max(0, Math.min(amt, m.chips)); m.chips -= a; m.pbet += a; m.tot += a; r.cs.pot += a; if (m.chips === 0) m.allin = true; }
    function pkStart(r, now) {
      var cs = r.cs, act = alive(r);
      if (act.length < 2) return csFinish(r, now);
      var deck = []; for (var s = 0; s < 4; s++) for (var v = 2; v <= 14; v++) deck.push([v, s]);
      cs.deck = shuffle(deck); cs.board = []; cs.pot = 0; cs.sub = "preflop"; cs.currentBet = 0; cs.showdown = false;
      cs.dealerI = (cs.dealerI + 1) % act.length; var di = cs.dealerI; cs.dealerM = act[di];
      act.forEach(function (m) { m.hole = [cs.deck.pop(), cs.deck.pop()]; m.fold = false; m.allin = false; m.pbet = 0; m.tot = 0; m.act = ""; });
      var sb = act[(di + 1) % act.length], bb = act[(di + 2) % act.length];
      pkPay(r, sb, 10); sb.act = "small blind"; pkPay(r, bb, 20); bb.act = "big blind"; cs.currentBet = 20;
      cs.need = pkOrder(r, act[(di + 3) % act.length]); cs.msg = "Poker: nieuwe hand";
      r.phase = "cplay"; cs.endsAt = now + 20000; cs.runAt = 0;
      if (!cs.need.length) cs.runAt = now + 800;
      cs.need.forEach(function (m) { m.botAt = now + 1200 + rand() * 1500; });
      send(r);
    }
    function pkAct(r, m, kind, amt, now) {
      var cs = r.cs; if (r.phase !== "cplay" || cs.game !== "poker" || !cs.need || cs.need[0] !== m) return;
      cs.need.shift();
      var toCall = cs.currentBet - m.pbet;
      if (kind === "fold") { m.fold = true; m.act = "pas"; }
      else if (kind === "raise" || kind === "allin") {
        var by = kind === "allin" ? m.chips : Math.max(20, Math.floor(Number(amt) || 20)), target = cs.currentBet + by, need = target - m.pbet;
        if (kind === "allin" || need >= m.chips) { pkPay(r, m, m.chips); m.act = "all-in"; if (m.pbet > cs.currentBet) { cs.currentBet = m.pbet; cs.need = pkOrder(r, m).filter(function (x) { return x !== m; }); } }
        else { pkPay(r, m, need); cs.currentBet = target; m.act = "raise " + target; cs.need = pkOrder(r, m).filter(function (x) { return x !== m; }); }
      } else { if (toCall > 0) { pkPay(r, m, toCall); m.act = m.allin ? "all-in" : "call " + toCall; } else m.act = "check"; }
      var rest = alive(r).filter(function (x) { return !x.fold; });
      if (rest.length === 1) return pkWinSolo(r, rest[0], now);
      if (!cs.need.length) return pkNext(r, now);
      cs.endsAt = now + 20000; cs.need[0].botAt = now + 1200 + rand() * 1500; send(r);
    }
    function pkNext(r, now) {
      var cs = r.cs, act = alive(r);
      act.forEach(function (m) { m.pbet = 0; if (!m.fold && !m.allin) m.act = ""; });
      cs.currentBet = 0;
      if (cs.sub === "preflop") { cs.sub = "flop"; cs.board.push(cs.deck.pop(), cs.deck.pop(), cs.deck.pop()); }
      else if (cs.sub === "flop") { cs.sub = "turn"; cs.board.push(cs.deck.pop()); }
      else if (cs.sub === "turn") { cs.sub = "river"; cs.board.push(cs.deck.pop()); }
      else return pkShow(r, now);
      cs.need = pkOrder(r, act[(cs.dealerI + 1) % act.length]);
      cs.endsAt = now + 20000; cs.runAt = 0;
      if (cs.need.length <= 1) { cs.need = []; cs.runAt = now + 1200; }
      else cs.need[0].botAt = now + 1200 + rand() * 1500;
      send(r);
    }
    function pkWinSolo(r, w, now) {
      var cs = r.cs, all = alive(r); w.chips += cs.pot;
      all.forEach(function (m) { m.delta = (m === w ? cs.pot : 0) - m.tot; m.res = m === w ? "wint " + (cs.pot - m.tot) : "verliest " + m.tot; });
      cs.msg = w.name + " wint " + cs.pot + " (iedereen paste)"; cs.pot = 0; cs.need = []; r.phase = "cres"; cs.endsAt = now + 5000; send(r);
    }
    function pkShow(r, now) {
      var cs = r.cs, all = alive(r), live = all.filter(function (m) { return !m.fold; }), score = {}, won = {};
      cs.showdown = true; cs.sub = "show";
      live.forEach(function (m, i) { m._s = pkBest(m.hole.concat(cs.board)); });
      var levels = []; all.forEach(function (m) { if (m.tot > 0 && levels.indexOf(m.tot) < 0) levels.push(m.tot); }); levels.sort(function (a, b) { return a - b; });
      var prev = 0;
      levels.forEach(function (lv) {
        var contrib = all.filter(function (m) { return m.tot >= lv; }), part = (lv - prev) * contrib.length; prev = lv;
        var elig = contrib.filter(function (m) { return !m.fold; }); if (!elig.length) elig = live; if (!elig.length) return;
        var best = elig[0]._s; elig.forEach(function (m) { if (cmpArr(m._s, best) > 0) best = m._s; });
        var ws = elig.filter(function (m) { return cmpArr(m._s, best) === 0; }), share = Math.floor(part / ws.length), rest = part - share * ws.length;
        ws.forEach(function (m) { var amt = share + (rest > 0 ? 1 : 0); if (rest > 0) rest--; won[m.name] = (won[m.name] || 0) + amt; });
      });
      var top = null;
      all.forEach(function (m) { var w = won[m.name] || 0; m.chips += w; m.delta = w - m.tot; m.res = m.fold ? "pas" : (HAND_NAMES[m._s[0]] + (w ? " · wint " + w : "")); if (w && (!top || w > won[top.name])) top = m; });
      cs.msg = top ? top.name + " wint met " + HAND_NAMES[top._s[0]] : "Showdown"; cs.pot = 0; cs.need = []; r.phase = "cres"; cs.endsAt = now + 8000; send(r);
    }
    function pkStrength(r, m) {
      var cs = r.cs, h = m.hole, hi = Math.max(h[0][0], h[1][0]), lo = Math.min(h[0][0], h[1][0]);
      if (!cs.board.length) { var s = 0.12 + (hi - 2) / 12 * 0.3 + (lo - 2) / 12 * 0.2; if (hi === lo) s += 0.3 + hi / 14 * 0.15; if (h[0][1] === h[1][1]) s += 0.05; return Math.min(s, 1); }
      var e = pkBest(h.concat(cs.board)), c = e[0];
      return c === 0 ? 0.15 + e[1] / 14 * 0.15 : c === 1 ? 0.45 + e[1] / 14 * 0.12 : c === 2 ? 0.7 : c === 3 ? 0.8 : c === 4 ? 0.86 : c === 5 ? 0.9 : c === 6 ? 0.95 : 1;
    }
    function pkBot(r, m, now) {
      var cs = r.cs, toCall = cs.currentBet - m.pbet, s = pkStrength(r, m) + (rand() - 0.5) * 0.16;
      if (toCall <= 0) return s > 0.72 && rand() < 0.6 ? pkAct(r, m, "raise", 20 * (2 + Math.floor(rand() * 3)), now) : pkAct(r, m, "call", 0, now);
      var price = toCall / (cs.pot + toCall);
      if (toCall >= m.chips && s < 0.55) return pkAct(r, m, "fold", 0, now);
      if (s < price * 0.9 + 0.05) return pkAct(r, m, "fold", 0, now);
      if (s > 0.85 && rand() < 0.35) return pkAct(r, m, "raise", 20 * (2 + Math.floor(rand() * 4)), now);
      return pkAct(r, m, "call", 0, now);
    }
    // ----- ronde-einde, afvalrace en einde spel
    function csEndRound(r, now) {
      var cs = r.cs, act = alive(r), broke = act.filter(function (m) { return m.chips <= 0; });
      if (r.mode !== "race") {
        if (broke.length || cs.roundNo >= 30) return csFinish(r, now);
        return csNext(r, now);
      }
      broke.forEach(function (m) { m.out = true; m.elimNo = ++cs.elimNo; });
      cs.stageRound++;
      var left = alive(r);
      if (left.length > 1 && cs.stageRound >= r.rounds) {
        var low = left.slice().sort(function (a, b) { return a.chips - b.chips; })[0];
        low.out = true; low.elimNo = ++cs.elimNo; cs.stage++; cs.stageRound = 0; left = alive(r);
        cs.msg = low.name + " valt af!";
      }
      if (left.length <= 1 || cs.stage >= 15) return csFinish(r, now);
      csNext(r, now);
    }
    function csFinish(r, now) {
      var cs = r.cs; r.phase = "done"; r.doneAt = now;
      var ms = r.members.filter(function (m) { return !m.left || m.chips > 0; });
      ms.sort(function (a, b) { if (!!a.out !== !!b.out) return a.out ? 1 : -1; if (a.out && b.out) return b.elimNo - a.elimNo; return b.chips - a.chips; });
      var loser = r.mode === "race" ? ms[ms.length - 1] : ms.slice().sort(function (a, b) { return a.chips - b.chips; })[0];
      r.result = { winner: ms[0].name, loser: loser ? loser.name : "", mode: r.mode, ranking: ms.map(function (m) { return { n: m.name, chips: m.chips, out: !!m.out }; }) };
      var hs = humans(r), hc = hs.length;
      ms.forEach(function (m, i) {
        if (m.bot || m.left) return;
        var xp = (i === 0 ? 100 : 40) + Math.max(0, 20 - i * 5), rw = { kind: "casino", xp: hc >= 2 ? xp : Math.round(xp * 0.4), win: i === 0, humans: hc };
        if (i === 0 && hc >= 2) { rw.trophy = "casino_win"; rw.itemMin = 1; }
        env.reward(m.pid, rw);
      });
      send(r);
    }
    function csTick(r, now) {
      var cs = r.cs;
      if (r.phase === "cbet") {
        var changed = false;
        bots(r).forEach(function (m) { if (!m.ready && now >= m.botAt) { botBet(r, m, now); changed = true; } });
        var act = alive(r);
        if (now >= cs.endsAt || act.every(function (m) { return m.ready; })) return csResolveBets(r, now);
        if (changed) send(r);
      } else if (r.phase === "cplay") {
        if (cs.game === "blackjack") {
          bjPlayers(r).forEach(function (m) { if (m.bot && !m.stand && now >= m.botAt) { bjAct(r, m, bjTot(m.hand) < 16 ? "hit" : "stand", now); m.botAt = now + 1300; } });
          if (r.phase === "cplay" && now >= cs.endsAt) { bjPlayers(r).forEach(function (m) { m.stand = true; }); bjFinish(r, now); }
        } else {
          if (cs.need && cs.need.length) {
            var t = cs.need[0];
            if (t.bot && now >= t.botAt) return pkBot(r, t, now);
            if (now >= cs.endsAt) return pkAct(r, t, cs.currentBet - t.pbet > 0 ? "fold" : "call", 0, now);
          } else if (cs.runAt && now >= cs.runAt) { cs.runAt = 0; pkNext(r, now); }
        }
      } else if (r.phase === "cres") { if (now >= cs.endsAt) csEndRound(r, now); }
    }
    function csMsg(pid, msg, now) {
      var r = rooms[where[pid]]; if (!r || r.game !== "casino" || !r.cs) return;
      var mi = indexOf(r, pid), m = r.members[mi]; if (!m || m.out) return;
      var cs = r.cs, g = cs.game;
      if (msg.t === "c.bet" && r.phase === "cbet") {
        var amt = Math.floor(Number(msg.amt)); if (!(amt >= 0 && amt <= 5000)) return;
        if (g === "roulette") {
          if (!rlValid(String(msg.key)) || amt < 1) return;
          if (committed(m) + amt > m.chips) return env.send(pid, { t: "error", text: "Te weinig fiches." });
          m.bets[msg.key] = (m.bets[msg.key] || 0) + amt;
        } else {
          if (amt > m.chips) return env.send(pid, { t: "error", text: "Te weinig fiches." });
          m.bet = amt; if (g === "dice" && ["under", "seven", "over"].indexOf(msg.pick) >= 0) m.pick = msg.pick;
        }
        send(r);
      } else if (msg.t === "c.clear" && r.phase === "cbet") { m.bets = {}; m.bet = 0; m.ready = false; send(r); }
      else if (msg.t === "c.ready" && r.phase === "cbet") { if (g === "dice" && !m.pick && m.bet) m.pick = "seven"; m.ready = true; send(r); }
      else if (msg.t === "c.hit") bjAct(r, m, "hit", now);
      else if (msg.t === "c.stand") bjAct(r, m, "stand", now);
      else if (msg.t === "c.double") bjAct(r, m, "double", now);
      else if (msg.t === "c.pk") pkAct(r, m, String(msg.a), msg.amt, now);
    }
    function listPublic() {
      return Object.keys(rooms).map(function (c) { return rooms[c]; }).filter(function (r) { return r.pub && r.phase === "lobby" && r.members.filter(function (m) { return !m.left; }).length < r.size; })
        .map(function (r) { return { code: r.code, host: hostName(r), game: r.game, mode: r.mode, boss: r.boss, players: r.members.length, size: r.size, rounds: r.rounds }; });
    }

    // ---------- tick en berichten
    function tick(now) {
      hubNow = now;
      Object.keys(rooms).forEach(function (c) {
        var r = rooms[c]; if (!r) return;
        if (r.phase === "lobby") { if (humans(r).filter(function (m) { return m.connected; }).length === 0 && now - r.created > 600000) delete rooms[c]; return; }
        if (r.phase === "done") { if (now - r.doneAt > DONE_KEEP_MS) { r.members.forEach(function (m) { if (!m.bot && where[m.pid] === c) delete where[m.pid]; }); delete rooms[c]; } return; }
        if (humans(r).filter(function (m) { return m.connected; }).length === 0) {
          r.emptySince = r.emptySince || now;
          if (now - r.emptySince > 90000) { r.members.forEach(function (m) { if (!m.bot && where[m.pid] === c) delete where[m.pid]; }); delete rooms[c]; return; }
        } else r.emptySince = 0;
        if (r.game === "casino") return csTick(r, now);
        if (r.game === "board") return boardTick(r, now);
        if (r.phase === "round") {
          var rd = r.round, rem = [];
          r.botQ.forEach(function (b) { if (now >= b.at) submit(r, b.mi, b.val, now); else rem.push(b); });
          r.botQ = rem;
          if (rd.kind === "reaction" && !r.goSent && now >= rd.secret.goAt) { r.goSent = true; send(r); }
          if (now >= rd.endsAt) { r.goSent = false; endRound(r, now); }
        } else if (r.phase === "reveal") {
          if (now >= r.reveal.until) nextRound(r, now);
        }
      });
    }
    function message(pid, msg, now) {
      hubNow = now;
      if (!msg || typeof msg.t !== "string" || !people[pid]) return;
      var r = rooms[where[pid]], mi = r ? indexOf(r, pid) : -1;
      switch (msg.t) {
        case "room.create": return createRoom(pid, msg);
        case "room.join": return join(pid, msg.code);
        case "room.quick": return quick(pid, msg);
        case "room.leave": return leave(pid, false);
        case "room.start": return start(pid, now);
        case "room.list": env.send(pid, { t: "rooms", list: listPublic() }); return;
        case "c.bet": case "c.clear": case "c.ready": case "c.hit": case "c.stand": case "c.double": case "c.pk": csMsg(pid, msg, now); return;
        case "room.sync": if (r) sendOne(r, pid); else env.send(pid, { t: "room", room: null }); return;
        case "ans": if (r && (r.game === "show" || r.game === "boss") && mi >= 0) submit(r, mi, msg.value, now); return;
        case "roll": if (r && r.game === "board" && mi >= 0) roll(r, mi, now); return;
        case "pick":
          if (r && r.game === "board" && mi >= 0) { if (r.phase === "mini") answerMini(r, mi, msg.value, now); else if (r.phase === "duel") pickDuel(r, mi, msg.value, now); }
          return;
      }
    }
    function connect(pid, meta, now) {
      hubNow = now;
      people[pid] = { name: meta.name || pid, level: meta.level || 1 };
      var r = rooms[where[pid]];
      if (r) { var i = indexOf(r, pid); if (i >= 0) { r.members[i].connected = true; r.members[i].name = people[pid].name; send(r); return; } }
      env.send(pid, { t: "room", room: null });
    }
    function disconnect(pid) {
      var r = rooms[where[pid]];
      if (r) {
        var i = indexOf(r, pid);
        if (i >= 0) {
          if (r.phase === "lobby") { leave(pid, true); } else { r.members[i].connected = false; send(r); }
        }
      }
      delete people[pid];
    }
    return {
      connect: connect, disconnect: disconnect, tick: tick, message: message,
      setLevel: function (pid, lv) { if (people[pid]) people[pid].level = lv; },
      messageJSON: function (pid, json, now) { var m; try { m = JSON.parse(json); } catch (e) { return; } message(pid, m, now); },
      connectJSON: function (pid, json, now) { var meta; try { meta = JSON.parse(json); } catch (e) { meta = {}; } connect(pid, meta, now); },
      _rooms: rooms
    };
  }
  return { createHub: createHub, BOSSES: BOSSES, THEMES: THEMES };
})();
if (typeof module !== "undefined" && module.exports) { module.exports = CCHub; }
