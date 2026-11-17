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
          host: r.host, isHost: r.host === pid, me: indexOf(r, pid), hostName: hostName(r),
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
      if (game !== "show" && game !== "boss" && game !== "board") return env.send(pid, { t: "error", text: "Onbekend spel." });
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
      var r = { code: newCode(), game: game, boss: boss, theme: theme, size: size, bots: msg.bots !== false, host: pid, members: [], phase: "lobby", created: hubNow, roundIdx: -1 };
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
        if (!found && r.phase === "lobby" && r.game === game && r.boss === boss && r.bots &&
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
