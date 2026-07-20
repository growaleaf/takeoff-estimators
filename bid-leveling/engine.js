/* Bid-Leveling Gut-Check — UI controller
 * Depends on game.js (SCENARIOS, levelScenario). Vanilla JS, no deps.
 */
(function () {
  "use strict";

  var STORE = "blgc-v1";
  var money = function (n) {
    var neg = n < 0; n = Math.abs(n);
    return (neg ? "−$" : "$") + n.toLocaleString("en-US");
  };
  var el = function (id) { return document.getElementById(id); };

  /* ---- deterministic day + seeded shuffle ---- */
  function dayNumber() {
    var d = new Date();
    return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
  }
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function shuffle(arr, rnd) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(rnd() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  /* ---- persisted state ---- */
  function load() {
    try { return JSON.parse(localStorage.getItem(STORE)) || {}; }
    catch (e) { return {}; }
  }
  function save(s) {
    try { localStorage.setItem(STORE, JSON.stringify(s)); } catch (e) {}
  }

  /* ---- session state ---- */
  var mode = "daily";           // 'daily' | 'unlimited'
  var scn = null;               // current scenario
  var lev = null;               // leveled result
  var step = 1;
  var gap1Correct = null;       // step 1 result
  var lastUnlimited = -1;
  var sessionPlayed = 0, sessionCaught = 0;

  function persist() { return load(); }

  /* ---- streak (daily only) ---- */
  function streakInfo() {
    var s = persist();
    return {
      streak: s.streak || 0,
      best: s.best || 0,
      lastDay: (typeof s.lastDay === "number") ? s.lastDay : null,
      todayDone: s.lastDay === dayNumber(),
      todayCaught: (s.lastDay === dayNumber()) ? !!s.todayCaught : false
    };
  }
  function recordDaily(caught) {
    var s = persist();
    var day = dayNumber();
    if (s.lastDay === day) return; // already counted today
    if (caught) {
      // continue streak if yesterday, else reset to 1
      s.streak = (s.lastDay === day - 1 && s.streakCaught) ? (s.streak || 0) + 1 : 1;
      s.streakCaught = true;
    } else {
      s.streak = 0;
      s.streakCaught = false;
    }
    s.best = Math.max(s.best || 0, s.streak || 0);
    s.lastDay = day;
    s.todayCaught = caught;
    save(s);
  }

  function renderStreak() {
    var info = streakInfo();
    el("streakVal").textContent = info.streak;
    el("bestVal").textContent = info.best;
    var sess = el("sessionStat");
    if (mode === "unlimited") {
      sess.style.display = "";
      sess.textContent = "This session: " + sessionCaught + " / " + sessionPlayed + " caught";
    } else {
      sess.style.display = "none";
    }
  }

  /* ---- scenario selection ---- */
  function pickScenario() {
    if (mode === "daily") {
      return dayNumber() % SCENARIOS.length;
    }
    var i;
    do { i = Math.floor(Math.random() * SCENARIOS.length); }
    while (SCENARIOS.length > 1 && i === lastUnlimited);
    lastUnlimited = i;
    return i;
  }

  /* ---- rendering ---- */
  function bidCardHTML(b) {
    var inc = b.inc.map(function (x) { return '<li class="inc">' + esc(x) + "</li>"; }).join("");
    var exc = b.exc.length
      ? b.exc.map(function (x) { return '<li class="exc">' + esc(x) + "</li>"; }).join("")
      : '<li class="exc none">No exclusions noted</li>';
    return '<div class="bid" data-bid="' + b.id + '">' +
      '<div class="bid-head"><span class="bid-name">Bid ' + b.id + '</span>' +
      '<span class="bid-base">' + money(b.base) + '</span></div>' +
      '<div class="bid-lists"><div class="col"><h4>Includes</h4><ul>' + inc + "</ul></div>" +
      '<div class="col"><h4>Excludes / by others</h4><ul>' + exc + "</ul></div></div></div>";
  }
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  function startScenario() {
    step = 1; gap1Correct = null;
    var idx = pickScenario();
    scn = SCENARIOS[idx];
    lev = levelScenario(scn);

    el("reveal").style.display = "none";
    el("reveal").innerHTML = "";
    var actions = el("actions"); actions.style.display = "none";

    el("scnTrade").textContent = scn.trade;
    el("scnProject").textContent = scn.project;
    el("scnScope").textContent = scn.scope;
    el("dayTag").textContent = (mode === "daily")
      ? ("Daily #" + (dayNumber() % SCENARIOS.length + 1))
      : "Unlimited";

    var bidsBox = el("bids");
    bidsBox.className = "bids " + (scn.bids.length === 3 ? "three" : "multi");
    bidsBox.innerHTML = scn.bids.map(bidCardHTML).join("");

    renderStep1();
    renderStreak();
  }

  function renderStep1() {
    step = 1;
    el("promptLabel").textContent = "Step 1 of 2";
    el("promptText").innerHTML = "<strong>Spot the decisive gap.</strong> Which statement actually moves the ranking once you level the bids?";
    var seed = (mode === "daily") ? dayNumber() * 131 + 7 : (Math.random() * 1e9) | 0;
    var opts = shuffle(scn.gapOptions, mulberry32(seed));
    var box = el("choices");
    box.className = "choices stack";
    box.innerHTML = "";
    opts.forEach(function (o) {
      var btn = document.createElement("button");
      btn.className = "choice";
      btn.type = "button";
      btn.textContent = o.t;
      btn.onclick = function () { answerStep1(o, btn, box); };
      box.appendChild(btn);
    });
  }

  function answerStep1(opt, btn, box) {
    gap1Correct = !!opt.ok;
    Array.prototype.forEach.call(box.querySelectorAll("button"), function (b) {
      b.disabled = true;
      b.classList.add("locked");
    });
    btn.classList.add(opt.ok ? "correct" : "wrong");
    // reveal the correct one if they missed
    if (!opt.ok) {
      Array.prototype.forEach.call(box.querySelectorAll("button"), function (b) {
        var match = scn.gapOptions.filter(function (g) { return g.t === b.textContent; })[0];
        if (match && match.ok) b.classList.add("correct");
      });
    }
    setTimeout(renderStep2, 520);
  }

  function renderStep2() {
    step = 2;
    el("promptLabel").textContent = "Step 2 of 2";
    el("promptText").innerHTML = "<strong>Now pick the true low bid</strong> — the lowest number after you level every bid to the same scope.";
    var box = el("choices");
    box.className = "choices row";
    box.innerHTML = "";
    scn.bids.forEach(function (b) {
      var btn = document.createElement("button");
      btn.className = "choice bidpick";
      btn.type = "button";
      btn.innerHTML = "Bid " + b.id + "<span>" + money(b.base) + "</span>";
      btn.onclick = function () { answerStep2(b.id, btn, box); };
      box.appendChild(btn);
    });
  }

  function answerStep2(bidId, btn, box) {
    Array.prototype.forEach.call(box.querySelectorAll("button"), function (b) {
      b.disabled = true; b.classList.add("locked");
    });
    var right = (bidId === lev.trueLow.id);
    btn.classList.add(right ? "correct" : "wrong");
    if (!right) {
      Array.prototype.forEach.call(box.querySelectorAll("button"), function (b) {
        if (b.textContent.indexOf("Bid " + lev.trueLow.id) === 0) b.classList.add("correct");
      });
    }
    var caught = gap1Correct && right;
    finish(caught, right);
  }

  function finish(caught, step2Right) {
    sessionPlayed++;
    if (caught) sessionCaught++;
    if (mode === "daily") recordDaily(caught);
    renderStreak();
    renderReveal(caught, step2Right);
  }

  function levTable() {
    var head = "<tr><th>Bid</th><th>Base</th><th>Leveling adders</th><th>Leveled</th></tr>";
    var rows = lev.rows.map(function (r) {
      var cls = "";
      if (r.id === lev.trueLow.id) cls = "true-low";
      else if (r.id === lev.apparent.id && lev.flipped) cls = "apparent";
      var adders = r.adders.length
        ? r.adders.map(function (a) { return "+ " + money(a.amt) + " " + esc(a.t); }).join("<br>")
        : '<span class="muted">— fully scoped —</span>';
      return "<tr class='" + cls + "'><td><strong>Bid " + r.id + "</strong></td>" +
        "<td>" + money(r.base) + "</td><td class='adders'>" + adders + "</td>" +
        "<td class='lev'>" + money(r.leveled) +
        (r.id === lev.trueLow.id ? " <span class='badge'>TRUE LOW</span>" : "") +
        (r.id === lev.apparent.id && lev.flipped ? " <span class='badge apparent'>apparent low</span>" : "") +
        "</td></tr>";
    }).join("");
    return "<table class='lev-table'>" + head + rows + "</table>";
  }

  function renderReveal(caught, step2Right) {
    var r = el("reveal");
    var verdictClass = caught ? "win" : "miss";
    var verdictText = caught
      ? "Caught it 🎯"
      : (step2Right ? "Right bid, missed the gap" : "Got leveled");

    var impact;
    if (lev.flipped) {
      var diff = lev.apparent.leveled - lev.trueLow.leveled;
      impact = "The apparent low was <strong>Bid " + lev.apparent.id + "</strong> at " + money(lev.apparent.base) +
        ". Once leveled it becomes " + money(lev.apparent.leveled) + " — <strong>Bid " + lev.trueLow.id +
        "</strong> is the true low, " + money(diff) + " under it. The gap you had to catch was " +
        money(lev.gapValue) + ".";
    } else {
      impact = "No flip here. The exclusions didn't carry enough dollars (or weren't the contractor's to buy) to change the ranking. <strong>Bid " +
        lev.trueLow.id + "</strong> is both the apparent and the true low.";
    }

    r.innerHTML =
      "<div class='verdict " + verdictClass + "'>" + verdictText + "</div>" +
      "<div class='impact'>" + impact + "</div>" +
      levTable() +
      "<div class='why'><h4>Why</h4><p>" + esc(scn.why) + "</p></div>" +
      "<p class='illus'>Bids and dollar figures here are illustrative — a practice drill. The leveling logic reflects standard MEP scope practice. " +
      "On a real bid, the <a href='/tools/sub-bid-scope-gap/'>Sub-Bid Scope-Gap Detector</a> surfaces the gaps from the actual documents; " +
      "the dollar impact stays your judgment call.</p>";
    r.style.display = "";

    var actions = el("actions");
    actions.style.display = "";
    el("nextBtn").textContent = (mode === "daily") ? "Play Unlimited →" : "Next bid set →";
    r.scrollIntoView({ behavior: "smooth", block: "start" });

    // stash last result for share card
    lastResult = { caught: caught, gap: lev.gapValue, flipped: lev.flipped, trade: scn.trade,
                   trueLow: lev.trueLow.id, mode: mode };
  }

  var lastResult = null;

  /* ---- share card (canvas) ---- */
  function shareText() {
    var s = streakInfo();
    var streakBit = (mode === "daily" && s.streak > 1) ? (" — " + s.streak + " day streak 🔥") : "";
    if (!lastResult) return "Bid-Leveling Gut-Check — takeoff.buildtodogood.com";
    if (lastResult.caught && lastResult.flipped) {
      return "Leveled today's sub bids and caught the " + money(lastResult.gap) + " gap 🎯" + streakBit +
        "\nBid-Leveling Gut-Check — takeoff.buildtodogood.com/bid-leveling/";
    }
    if (lastResult.caught && !lastResult.flipped) {
      return "Held the line — the low bid actually was low. 🎯" + streakBit +
        "\nBid-Leveling Gut-Check — takeoff.buildtodogood.com/bid-leveling/";
    }
    return "Got leveled today — the apparent low wasn't the true low. Think you'd catch it?" +
      "\nBid-Leveling Gut-Check — takeoff.buildtodogood.com/bid-leveling/";
  }

  function drawCard() {
    var cv = el("shareCanvas");
    var ctx = cv.getContext("2d");
    var W = cv.width, H = cv.height;
    var dark = document.documentElement.getAttribute("data-theme") === "dark";
    var bg = dark ? "#1A1612" : "#FFF8F0";
    var ink = dark ? "#E8E0D4" : "#2C2C2C";
    var sub = dark ? "#A09888" : "#6B6B6B";
    var amber = "#D4A843";
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    // amber top bar
    ctx.fillStyle = amber; ctx.fillRect(0, 0, W, 14);
    // kicker
    ctx.fillStyle = sub;
    ctx.font = "600 30px Nunito, sans-serif";
    ctx.fillText("THE HIVE MAKES  ·  BID-LEVELING GUT-CHECK", 70, 108);

    // headline
    ctx.fillStyle = ink;
    ctx.font = "800 72px Nunito, sans-serif";
    var line1, line2;
    if (lastResult && lastResult.caught && lastResult.flipped) {
      line1 = "Caught the " + money(lastResult.gap) + " scope gap";
      line2 = "and picked the true low bid 🎯";
    } else if (lastResult && lastResult.caught) {
      line1 = "Held the line — the low";
      line2 = "bid actually was low 🎯";
    } else {
      line1 = "The apparent low wasn't";
      line2 = "the true low.";
    }
    ctx.fillText(line1, 70, 250);
    ctx.fillText(line2, 70, 335);

    // trade chip
    if (lastResult) {
      ctx.fillStyle = amber;
      ctx.font = "700 34px Nunito, sans-serif";
      ctx.fillText(lastResult.trade, 70, 430);
    }

    // streak / footer
    var s = streakInfo();
    ctx.fillStyle = sub;
    ctx.font = "600 32px Nunito, sans-serif";
    var foot = "takeoff.buildtodogood.com/bid-leveling";
    ctx.fillText(foot, 70, H - 60);
    if (mode === "daily" && s.streak > 0) {
      ctx.fillStyle = ink;
      ctx.font = "800 40px Nunito, sans-serif";
      var st = s.streak + " day streak 🔥";
      var w = ctx.measureText(st).width;
      ctx.fillText(st, W - w - 70, H - 58);
    }
    return cv;
  }

  function doShare() {
    drawCard();
    var cv = el("shareCanvas");
    var txt = shareText();
    cv.toBlob(function (blob) {
      var file = blob ? new File([blob], "bid-leveling-gut-check.png", { type: "image/png" }) : null;
      if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
        navigator.share({ files: [file], text: txt }).catch(function () {});
      } else {
        // fallback: download image + copy text
        var url = URL.createObjectURL(blob);
        var a = document.createElement("a");
        a.href = url; a.download = "bid-leveling-gut-check.png";
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
        if (navigator.clipboard) navigator.clipboard.writeText(txt).catch(function () {});
        flash("Result card saved — share text copied to clipboard");
      }
    }, "image/png");
  }

  function flash(msg) {
    var f = el("toast");
    f.textContent = msg; f.classList.add("show");
    setTimeout(function () { f.classList.remove("show"); }, 2600);
  }

  /* ---- mode switch ---- */
  function setMode(m) {
    mode = m;
    el("modeDaily").classList.toggle("active", m === "daily");
    el("modeUnlimited").classList.toggle("active", m === "unlimited");
    startScenario();
  }

  /* ---- wire up ---- */
  function init() {
    el("modeDaily").onclick = function () { setMode("daily"); };
    el("modeUnlimited").onclick = function () { setMode("unlimited"); };
    el("nextBtn").onclick = function () {
      if (mode === "daily") setMode("unlimited"); else startScenario();
    };
    el("shareBtn").onclick = doShare;
    setMode("daily");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else { init(); }
})();
