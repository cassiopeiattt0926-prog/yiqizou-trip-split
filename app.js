const rates = { CNY: 1, JPY: 0.049, KRW: 0.0053, SGD: 5.58, MYR: 1.68, THB: 0.22, GBP: 9.18, USD: 7.18, HKD: 0.92, EUR: 7.85 };
const RatePolicy = window.HAOYOUJI_RATE_POLICY;
const symbols = { CNY: "¥", JPY: "¥", KRW: "₩", SGD: "S$", MYR: "RM", THB: "฿", GBP: "£", USD: "$", HKD: "HK$", EUR: "€" };
const APP_URL = "https://cassiopeiattt0926-prog.github.io/yiqizou-trip-split/";
// 固定官网地址的二维码矩阵（M 级纠错）。内置后生成分享图不依赖网络或第三方二维码服务。
const APP_QR = [
  "111111101110010010010001001111111",
  "100000101101010011001001101000001",
  "101110100001000100011000001011101",
  "101110101010001001101011101011101",
  "101110100010001001010110101011101",
  "100000100010001000011100101000001",
  "111111101010101010101010101111111",
  "000000001111100111001011000000000",
  "101101110110000111001100001001011",
  "110100010000000011011011001101111",
  "010110111101101001101101100111011",
  "110011010011011110111011000101000",
  "111101110010100101000010010111001",
  "101101000011010100110000100100010",
  "111111111000001010010010101000000",
  "010010000000010110010100111011100",
  "011000100111011010000110111011100",
  "101001011010000100101111111011011",
  "100000111001100101100010011110110",
  "101110000000100001100010010010010",
  "011110111110110001111100010001100",
  "101011011100011010011111001100001",
  "000100111000100010001011101011011",
  "010011011111111010011000001011010",
  "100001111010110011101011111111011",
  "000000001110010111110000100011000",
  "111111101100001000011001101010000",
  "100000101101110110100111100011101",
  "101110100001000100100101111110110",
  "101110101101100100001111000101001",
  "101110101101011101001100101101100",
  "100000100000101011000010110110001",
  "111111101110100111000101001010100"
];
const typeOptions = [
  ["酒店", "🛏️"],
  ["机票", "✈️"],
  ["门票", "🎫"],
  ["打车", "🚕"],
  ["公共交通", "🚇"],
  ["餐饮", "🍜"],
  ["便利店", "🏪"],
  ["购物", "🛍️"],
  ["娱乐", "🎡"],
  ["借用", "💸"],
  ["寄存", "🧳"],
  ["伴手礼", "🎁"]
];
const icons = Object.fromEntries(typeOptions);
const palette = ["#ff704d", "#487bff", "#a06be8", "#16825b", "#d18a00", "#2b9aa0", "#d65c8f", "#6b7c59"];
const avatarCount = 20;
const avatarBase = "assets/avatars";
const legacyPeople = [
  { id: "tt", name: "TT", color: "#ff704d", avatarIndex: 1 },
  { id: "bb", name: "BB", color: "#487bff", avatarIndex: 2 },
  { id: "qq", name: "QQ", color: "#a06be8", avatarIndex: 3 }
];
const legacySeed = [
  ["BB借钱给TT", "借用", 200, "CNY", 1, "bb", ["tt"]],
  ["机场去酒店", "打车", 12870, "JPY", 0.049, "tt", ["tt", "bb", "qq"]],
  ["鳗鱼饭", "餐饮", 13800, "JPY", 0.049, "bb", ["tt", "bb", "qq"]],
  ["森美术馆", "门票", 4000, "JPY", 0.049, "tt", ["tt", "bb"]]
].map((x, i) => ({ id: String(i), title: x[0], category: x[1], amount: x[2], currency: x[3], rate: x[4], payer: x[5], participants: x[6] }));
const $ = (s) => document.querySelector(s);
const finiteNumber = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const money = (n) => "¥" + Math.abs(finiteNumber(n)).toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const today = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
};
let trips = loadTrips();
let activeTripId = localStorage.getItem("yiqizou-active-trip") || trips[0]?.id;
let selected = [];
let participantMode = "all";
let editingTripId = null;
let editingExpenseId = null;
let draftAvatarMap = {};
let calendarCursor = new Date(today().slice(0, 7) + "-01");
let selectingDatePart = "start";

function loadTrips() {
  let saved = null;
  let oldExpenses = null;
  try {
    saved = JSON.parse(localStorage.getItem("yiqizou-trips") || "null");
    oldExpenses = JSON.parse(localStorage.getItem("yiqizou-expenses") || "null");
  } catch (_) {
    saved = null;
  }
  // 空数组也代表用户已经初始化并删除了全部项目，不能再次生成示例数据。
  if (Array.isArray(saved)) return saved;
  oldExpenses = Array.isArray(oldExpenses) ? oldExpenses : legacySeed;
  return [{
    id: crypto.randomUUID(),
    name: "东京朋友旅行",
    demo: true,
    destination: "",
    startDate: "2026-08-12",
    endDate: "2026-08-17",
    peopleCount: legacyPeople.length,
    people: legacyPeople,
    expenses: oldExpenses
  }];
}

function saveTrips() {
  localStorage.setItem("yiqizou-trips", JSON.stringify(trips));
  if (activeTripId) localStorage.setItem("yiqizou-active-trip", activeTripId);
  else localStorage.removeItem("yiqizou-active-trip");
}

function migrateTrip(trip) {
  RatePolicy.ensureRateSettings(trip);
  trip.people = (trip.people || []).map((p, i) => ({ ...p, avatarIndex: p.avatarIndex || (i % avatarCount) + 1 }));
  const ids = new Set(trip.people.map((p) => p.id));
  trip.expenses = (trip.expenses || []).map((e) => {
    const currency = rates[e.currency] ? e.currency : "CNY";
    const participants = [...new Set((e.participants || []).filter((id) => ids.has(id)))];
    const payer = ids.has(e.payer) ? e.payer : trip.people[0]?.id;
    const eligible = trip.people.map((p) => p.id).filter((id) => e.category !== "借用" || id !== payer);
    const normalizedParticipants = e.category === "借用" ? participants.filter((id) => id !== payer) : participants;
    return {
      ...e,
      currency,
      amount: finiteNumber(e.amount),
      rate: currency === "CNY" ? 1 : Math.max(finiteNumber(e.rate, rates[currency] || 1), 0.000001),
      payer,
      participants: normalizedParticipants.length ? normalizedParticipants : eligible
    };
  }).filter((e) => e.payer && e.participants.length);
  return trip;
}

function activeTrip() {
  const trip = trips.find((t) => t.id === activeTripId) || trips[0];
  return trip ? migrateTrip(trip) : trip;
}

function person(trip, id) {
  return trip.people.find((p) => p.id === id) || { id, name: id, color: "#888" };
}

function dateRange(trip) {
  if (!trip.startDate && !trip.endDate) return "日期待定";
  if (trip.startDate && trip.endDate) return `${trip.startDate}～${trip.endDate}`;
  return trip.startDate || trip.endDate;
}

function renderHome() {
  if ($("#tripCount")) $("#tripCount").textContent = `${trips.length} 个`;
  $("#tripList").innerHTML = trips.map((trip) => {
    const total = trip.expenses.reduce((s, e) => s + cnyAmount(e), 0);
    const isDemo = trip.demo || (trip.name === "东京朋友旅行" && trip.expenses?.some((e) => e.title === "BB借钱给TT"));
    return `<article class="swipe-row" data-trip-id="${escapeHtml(trip.id)}">
      <div class="swipe-content trip-card">
        <div><b>${escapeHtml(trip.name)}${isDemo ? `<span class="demo-badge">示例</span>` : ""}</b><span>${escapeHtml(dateRange(trip))} · ${trip.people.length}人${isDemo ? " · 示例数据，可删除" : ""}</span><div class="trip-members">${trip.people.map(avatar).join("")}</div></div>
        <strong>${money(total)}</strong>
      </div>
      <button class="delete-action" type="button" data-delete-trip="${escapeHtml(trip.id)}">删除</button>
    </article>`;
  }).join("");
  setupSwipeRows("#tripList");
  document.querySelectorAll("[data-trip-id] .swipe-content").forEach((card) => {
    card.onclick = (event) => {
      const swipeRow = card.closest(".swipe-row");
      if (swipeRow?.classList.contains("open") || swipeRow?.dataset.suppressClick === "1") {
        swipeRow.classList.remove("open");
        event.preventDefault();
        return;
      }
      activeTripId = card.closest("[data-trip-id]").dataset.tripId;
      saveTrips();
      showDetail();
    };
  });
  document.querySelectorAll("[data-delete-trip]").forEach((button) => {
    button.onclick = (event) => {
      event.stopPropagation();
      deleteTrip(button.dataset.deleteTrip);
    };
  });
}

function showHome() {
  $("#tripHome").classList.remove("hidden");
  $("#tripDetail").classList.add("hidden");
  renderHome();
}

function showDetail() {
  $("#tripHome").classList.add("hidden");
  $("#tripDetail").classList.remove("hidden");
  renderDetail();
}

function avatar(p) {
  const idx = ((Number(p.avatarIndex) || 1) - 1) % avatarCount + 1;
  const src = window.CAT_AVATARS?.[idx - 1] || `${avatarBase}/cat-${String(idx).padStart(2, "0")}.png`;
  return `<span class="avatar"><img alt="${escapeHtml(p.name)}" src="${escapeHtml(src)}"></span>`;
}

function rateOf(expense) {
  return Math.max(finiteNumber(expense.rate, rates[expense.currency] || 1), 0.000001);
}

function preferredTripRate(trip, currency) {
  return RatePolicy.preferredRate(trip, currency, rates);
}

function cnyAmount(expense) {
  return Math.max(finiteNumber(expense.amount), 0) * rateOf(expense);
}

function calc(trip) {
  return Object.fromEntries(trip.people.map((p) => [p.id, trip.expenses.reduce((s, e) => {
    const paid = e.payer === p.id ? cnyAmount(e) : 0;
    const owed = e.participants.includes(p.id) && e.participants.length ? cnyAmount(e) / e.participants.length : 0;
    return s + paid - owed;
  }, 0)]));
}

function settle(trip, balances) {
  const debtors = trip.people.map((p) => ({ id: p.id, n: -balances[p.id] })).filter((x) => x.n > 0.01);
  const creditors = trip.people.map((p) => ({ id: p.id, n: balances[p.id] })).filter((x) => x.n > 0.01);
  const out = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const n = Math.min(debtors[i].n, creditors[j].n);
    out.push({ from: debtors[i].id, to: creditors[j].id, n });
    debtors[i].n -= n;
    creditors[j].n -= n;
    if (debtors[i].n < 0.01) i++;
    if (creditors[j].n < 0.01) j++;
  }
  return out;
}

function settlementShareText(trip, transfers) {
  const lines = transfers.length
    ? transfers.map((x) => `${person(trip, x.from).name} → ${person(trip, x.to).name} ${money(x.n)}`)
    : ["已结清"];
  return ["好友记 · 旅行结算单", trip.name, ...lines, "金额均按人民币结算"].join("\n");
}

function roundedRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function drawShareLogo(ctx, x, y, scale = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.strokeStyle = "#073f30";
  ctx.lineWidth = 10;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(12, 18); ctx.lineTo(50, 18);
  ctx.moveTo(28, 8); ctx.lineTo(28, 39); ctx.bezierCurveTo(28, 46, 32, 49, 39, 49); ctx.bezierCurveTo(43, 49, 46, 48, 49, 45);
  ctx.moveTo(64, 18); ctx.lineTo(84, 18);
  ctx.moveTo(70, 18); ctx.lineTo(70, 39); ctx.bezierCurveTo(70, 46, 74, 49, 80, 49); ctx.bezierCurveTo(83, 49, 85, 48, 87, 46);
  ctx.stroke();
  ctx.fillStyle = "#ff6848";
  roundedRect(ctx, 52, 13, 10, 10, 3);
  ctx.fill();
  ctx.restore();
}

function fitCanvasText(ctx, text, maxWidth) {
  const source = String(text || "");
  if (ctx.measureText(source).width <= maxWidth) return source;
  let value = source;
  while (value.length > 1 && ctx.measureText(`${value}…`).width > maxWidth) value = value.slice(0, -1);
  return `${value}…`;
}

function drawQrCode(ctx, x, y, size) {
  const quiet = 4;
  const modules = APP_QR.length + quiet * 2;
  const cell = Math.floor(size / modules);
  const actual = cell * modules;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(x, y, actual, actual);
  ctx.fillStyle = "#073f30";
  APP_QR.forEach((row, rowIndex) => {
    [...row].forEach((value, colIndex) => {
      if (value === "1") ctx.fillRect(x + (colIndex + quiet) * cell, y + (rowIndex + quiet) * cell, cell, cell);
    });
  });
  return actual;
}

function drawQrFooter(ctx, width, top) {
  const qrTargetSize = 176;
  const qrModules = APP_QR.length + 8;
  const qrActualSize = Math.floor(qrTargetSize / qrModules) * qrModules;
  const verticalPadding = 22;
  const cardHeight = qrActualSize + verticalPadding * 2;
  ctx.fillStyle = "#ffffff";
  roundedRect(ctx, 60, top, width - 120, cardHeight, 32);
  ctx.fill();
  ctx.strokeStyle = "#e1e5dc";
  ctx.lineWidth = 2;
  ctx.stroke();
  drawQrCode(ctx, 88, top + verticalPadding, qrTargetSize);
  ctx.textAlign = "left";
  ctx.fillStyle = "#073f30";
  ctx.font = '700 31px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif';
  ctx.fillText("微信长按识别/扫描二维码，开始使用好友记", 300, top + 82);
  ctx.fillStyle = "#718078";
  ctx.font = '23px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif';
  ctx.fillText("好友出游，记账分摊更省心", 300, top + 128);
}

function canvasFile(canvas, name) {
  // JPEG 在 iOS 的微信、小红书等分享扩展中兼容性比 Canvas PNG 更稳定。
  const mimeType = "image/jpeg";
  const fileName = String(name || "好友记清单.jpg").replace(/\.png$/i, ".jpg");
  const dataUrl = canvas.toDataURL(mimeType, 0.94);
  const binary = atob(dataUrl.split(",")[1]);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new File([bytes], fileName, { type: mimeType, lastModified: Date.now() });
}

function settlementShareFile(trip, transfers) {
  const width = 1080;
  const rowCount = Math.max(transfers.length, 1);
  const height = 980 + rowCount * 150;
  const total = trip.expenses.reduce((sum, expense) => sum + cnyAmount(expense), 0);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");

  ctx.fillStyle = "#f7f8f3";
  ctx.fillRect(0, 0, width, height);

  drawShareLogo(ctx, 70, 54, 1.35);
  ctx.fillStyle = "#073f30";
  ctx.font = '700 54px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif';
  ctx.fillText("好友记", 225, 112);
  ctx.fillStyle = "#718078";
  ctx.font = '28px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif';
  ctx.fillText("好友记 好游记 游玩算账更轻易", 225, 158);

  ctx.fillStyle = "#174f3a";
  roundedRect(ctx, 60, 205, 960, 245, 42);
  ctx.fill();
  ctx.fillStyle = "#c7dfd2";
  ctx.font = '30px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif';
  ctx.fillText("旅行结算单", 110, 270);
  ctx.fillStyle = "#ffffff";
  ctx.font = '700 56px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif';
  const tripName = String(trip.name || "旅行");
  ctx.fillText(fitCanvasText(ctx, tripName, 500), 110, 345);
  ctx.textAlign = "right";
  ctx.font = "56px Georgia, serif";
  ctx.fillText(money(total), 970, 345);
  ctx.textAlign = "left";
  ctx.fillStyle = "#c7dfd2";
  ctx.font = '28px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif';
  ctx.fillText(`${dateRange(trip)} · ${trip.people.length} 位朋友`, 110, 402);

  ctx.fillStyle = "#17211d";
  ctx.font = '700 42px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif';
  ctx.fillText("最小结清方案", 70, 535);
  ctx.textAlign = "right";
  ctx.fillStyle = "#718078";
  ctx.font = '28px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif';
  ctx.fillText(transfers.length ? `${transfers.length} 笔即可结清` : "当前已结清", 1010, 535);

  const rows = transfers.length ? transfers : [{ settled: true }];
  rows.forEach((transfer, index) => {
    const y = 575 + index * 150;
    ctx.fillStyle = "#ffffff";
    roundedRect(ctx, 60, y, 960, 118, 28);
    ctx.fill();
    ctx.strokeStyle = "#e1e5dc";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.textAlign = "left";
    ctx.fillStyle = "#17211d";
    ctx.font = '700 35px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif';
    if (transfer.settled) {
      ctx.fillText("大家已经结清", 100, y + 72);
      return;
    }
    const from = person(trip, transfer.from).name;
    const to = person(trip, transfer.to).name;
    ctx.fillText(fitCanvasText(ctx, `${from} 支付给 ${to}`, 650), 100, y + 72);
    ctx.textAlign = "right";
    ctx.fillStyle = "#174f3a";
    ctx.fillText(money(transfer.n), 980, y + 72);
  });

  drawQrFooter(ctx, width, height - 238);
  const safeName = tripName.replace(/[\\/:*?"<>|]/g, "-").slice(0, 30) || "旅行";
  return canvasFile(canvas, `好友记-${safeName}-结算单.png`);
}

function personalShareText(trip, p, stat) {
  const categories = Object.entries(stat.cats).sort((a, b) => b[1] - a[1]);
  const categoryLines = categories.map(([category, amount]) => `${category} ${money(amount)}（${stat.total ? Math.round(amount / stat.total * 100) : 0}%）`);
  const detailLines = stat.rows.map((expense) => `${expense.date || "日期未填"} ${expense.title} ${money(expense.share)}`);
  return [
    "好友记 · 个人消费清单",
    `${trip.name} · ${p.name}`,
    `个人消费金额总计 ${money(stat.total)}`,
    ...categoryLines,
    ...detailLines
  ].join("\n");
}

function personalShareFile(trip, p, stat) {
  const width = 1080;
  const categories = Object.entries(stat.cats).sort((a, b) => b[1] - a[1]);
  const shownRows = stat.rows.slice(0, 18);
  const categoryCount = Math.max(categories.length, 1);
  const detailCount = Math.max(shownRows.length, 1);
  const height = 980 + categoryCount * 82 + detailCount * 96;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");

  ctx.fillStyle = "#f7f8f3";
  ctx.fillRect(0, 0, width, height);
  drawShareLogo(ctx, 70, 54, 1.35);
  ctx.fillStyle = "#073f30";
  ctx.font = '700 54px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif';
  ctx.fillText("好友记", 225, 112);
  ctx.fillStyle = "#718078";
  ctx.font = '28px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif';
  ctx.fillText("好友记 好游记 游玩算账更轻易", 225, 158);

  ctx.fillStyle = "#174f3a";
  roundedRect(ctx, 60, 205, 960, 230, 42);
  ctx.fill();
  ctx.fillStyle = "#c7dfd2";
  ctx.font = '30px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif';
  ctx.fillText("个人消费清单", 110, 270);
  ctx.fillStyle = "#ffffff";
  ctx.font = '700 52px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif';
  ctx.fillText(fitCanvasText(ctx, `${p.name} · ${trip.name}`, 610), 110, 345);
  ctx.textAlign = "right";
  ctx.font = "56px Georgia, serif";
  ctx.fillText(money(stat.total), 970, 345);
  ctx.textAlign = "left";
  ctx.fillStyle = "#c7dfd2";
  ctx.font = '26px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif';
  ctx.fillText(`${dateRange(trip)} · 按实际分摊`, 110, 397);

  let y = 515;
  ctx.fillStyle = "#17211d";
  ctx.font = '700 40px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif';
  ctx.fillText("分类消费", 70, y);
  y += 36;
  if (!categories.length) categories.push(["暂无消费", 0]);
  categories.forEach(([category, amount]) => {
    ctx.fillStyle = "#ffffff";
    roundedRect(ctx, 60, y, 960, 66, 20);
    ctx.fill();
    ctx.fillStyle = "#17211d";
    ctx.font = '28px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif';
    ctx.fillText(`${icons[category] || "✦"} ${category}`, 95, y + 43);
    ctx.textAlign = "right";
    ctx.fillStyle = "#174f3a";
    ctx.fillText(`${money(amount)}  ·  ${stat.total ? Math.round(amount / stat.total * 100) : 0}%`, 980, y + 43);
    ctx.textAlign = "left";
    y += 82;
  });

  y += 64;
  ctx.fillStyle = "#17211d";
  ctx.font = '700 40px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif';
  ctx.fillText("消费明细", 70, y);
  y += 28;
  const detailRows = shownRows.length ? shownRows : [{ title: "暂无消费", category: "", date: "", share: 0 }];
  detailRows.forEach((expense) => {
    ctx.fillStyle = "#ffffff";
    roundedRect(ctx, 60, y, 960, 80, 20);
    ctx.fill();
    ctx.fillStyle = "#17211d";
    ctx.font = '700 27px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif';
    ctx.fillText(fitCanvasText(ctx, expense.title, 560), 95, y + 35);
    ctx.fillStyle = "#718078";
    ctx.font = '21px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif';
    ctx.fillText(`${expense.date || "日期未填"}${expense.category ? ` · ${expense.category}` : ""}`, 95, y + 64);
    ctx.textAlign = "right";
    ctx.fillStyle = "#174f3a";
    ctx.font = '700 28px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif';
    ctx.fillText(money(expense.share), 980, y + 50);
    ctx.textAlign = "left";
    y += 96;
  });
  if (stat.rows.length > shownRows.length) {
    ctx.fillStyle = "#718078";
    ctx.font = '22px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif';
    ctx.fillText(`另有 ${stat.rows.length - shownRows.length} 笔明细，请在好友记中查看`, 80, y + 10);
  }
  drawQrFooter(ctx, width, height - 238);
  const safeTrip = String(trip.name || "旅行").replace(/[\\/:*?"<>|]/g, "-").slice(0, 24);
  const safePerson = String(p.name || "朋友").replace(/[\\/:*?"<>|]/g, "-").slice(0, 16);
  return canvasFile(canvas, `好友记-${safeTrip}-${safePerson}-个人消费清单.png`);
}

async function copySettlementText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand?.("copy");
  textarea.remove();
  if (!copied) throw new Error("Clipboard unavailable");
}

async function shareGeneratedImage(file, fallbackText, copiedMessage) {
  try {
    const shareData = { files: [file] };
    const canShareFiles = navigator.share && (!navigator.canShare || navigator.canShare(shareData));
    if (canShareFiles && file?.size > 0 && /^image\/(jpeg|png)$/.test(file.type)) {
      // 只传图片文件，避免微信 iOS 分享扩展拒绝“图片 + 文字”混合类型。
      await navigator.share(shareData);
      return;
    }
    await copySettlementText(fallbackText);
    showToast(copiedMessage);
  } catch (error) {
    if (error?.name === "AbortError") return;
    try {
      await copySettlementText(fallbackText);
      showToast("图片分享不可用，清单文字已复制");
    } catch (_) {
      showToast("分享未完成，请稍后再试");
    }
  }
}

function renderDetail() {
  const trip = activeTrip();
  if (!trip) return showHome();
  const total = trip.expenses.reduce((s, e) => s + cnyAmount(e), 0);
  $("#tripTitle").textContent = trip.name;
  $("#tripMeta").textContent = dateRange(trip);
  const isDemo = trip.demo || (trip.name === "东京朋友旅行" && trip.expenses?.some((e) => e.title === "BB借钱给TT"));
  $("#detailDemoBanner").classList.toggle("hidden", !isDemo);
  $("#total").textContent = money(total);
  $("#summary").textContent = `${trip.expenses.length} 笔 · ${trip.people.length} 位朋友 · 人民币结算`;
  $("#avatars").innerHTML = trip.people.map(avatar).join("");
  renderRateTools(trip);
  $("#list").innerHTML = trip.expenses.length ? trip.expenses.map((e) => {
    const payer = person(trip, e.payer);
    const dateText = e.date ? `${e.date} · ` : "";
    const rateText = e.currency === "CNY" ? "" : ` · 汇率 ${rateOf(e)}`;
    return `<article class="swipe-row" data-expense-row="${escapeHtml(e.id)}">
      <div class="swipe-content expense" data-expense-id="${escapeHtml(e.id)}"><span class="icon">${icons[e.category] || "✦"}</span><div class="main"><b>${escapeHtml(e.title)}</b><span>${escapeHtml(dateText)}${escapeHtml(e.category)} · ${escapeHtml(payer.name)} 先付 · ${e.participants.length}人参与${escapeHtml(rateText)}</span></div><div class="amt"><b>${money(cnyAmount(e))}</b><span>${escapeHtml(symbols[e.currency] || "")}${finiteNumber(e.amount).toLocaleString()} ${escapeHtml(e.currency)}</span></div></div>
      <button class="delete-action" type="button" data-delete-expense="${escapeHtml(e.id)}">删除</button>
    </article>`;
  }).join("") : `<p class="empty">还没有记录，点下方“记一笔”。</p>`;
  setupSwipeRows("#list");
  document.querySelectorAll("[data-expense-id]").forEach((row) => {
    row.onclick = (event) => {
      const swipeRow = row.closest(".swipe-row");
      if (swipeRow?.classList.contains("open") || swipeRow?.dataset.suppressClick === "1") {
        swipeRow.classList.remove("open");
        event.preventDefault();
        return;
      }
      openExpenseSheet(row.dataset.expenseId);
    };
  });
  document.querySelectorAll("[data-delete-expense]").forEach((button) => {
    button.onclick = (event) => {
      event.stopPropagation();
      deleteExpense(button.dataset.deleteExpense);
    };
  });
  const balances = calc(trip);
  const transfers = settle(trip, balances);
  $("#balances").innerHTML = trip.people.map((p) => `<div class="balance">${avatar(p)}<div><b>${escapeHtml(p.name)}</b><small>${balances[p.id] >= 0 ? "应收" : "应付"}</small></div><strong class="${balances[p.id] >= 0 ? "receive" : "pay"}">${balances[p.id] >= 0 ? "+" : "−"}${money(balances[p.id])}</strong></div>`).join("");
  $("#settleCount").textContent = `${transfers.length} 笔即可结清`;
  $("#transfers").innerHTML = transfers.length ? transfers.map((x) => `<article>${avatar(person(trip, x.from))}<div><b>${escapeHtml(person(trip, x.from).name)} 支付给 ${escapeHtml(person(trip, x.to).name)}</b></div><strong>${money(x.n)}</strong></article>`).join("") : `<p class="empty">现在已经结清。</p>`;
  $("#share").onclick = async () => {
    const text = settlementShareText(trip, transfers);
    await shareGeneratedImage(settlementShareFile(trip, transfers), text, "结算方案已复制，请粘贴到微信");
  };
  renderStats(trip);
}

function closeSwipeRows(except = null) {
  document.querySelectorAll(".swipe-row.open").forEach((row) => {
    if (row !== except) row.classList.remove("open");
  });
}

function setupSwipeRows(scope) {
  document.querySelectorAll(`${scope} .swipe-row`).forEach((row) => {
    if (row.dataset.swipeBound === "1") return;
    row.dataset.swipeBound = "1";
    const content = row.querySelector(".swipe-content");
    let startX = 0;
    let startY = 0;
    let currentX = 0;
    let dragging = false;
    let horizontal = false;
    row.addEventListener("touchstart", (event) => {
      const touch = event.touches[0];
      startX = touch.clientX;
      startY = touch.clientY;
      currentX = row.classList.contains("open") ? -82 : 0;
      dragging = true;
      horizontal = false;
      row.dataset.suppressClick = "0";
      row.classList.add("dragging");
      closeSwipeRows(row);
    }, { passive: true });
    row.addEventListener("touchmove", (event) => {
      if (!dragging) return;
      const touch = event.touches[0];
      const dx = touch.clientX - startX;
      const dy = touch.clientY - startY;
      if (!horizontal && Math.abs(dx) > 6 && Math.abs(dx) > Math.abs(dy) * 1.15) horizontal = true;
      if (!horizontal) return;
      event.preventDefault();
      currentX = Math.max(-82, Math.min(0, dx + (row.classList.contains("open") ? -82 : 0)));
      if (content) content.style.transform = `translateX(${currentX}px)`;
    }, { passive: false });
    row.addEventListener("touchend", () => {
      if (!dragging) return;
      row.classList.remove("dragging");
      if (content) content.style.transform = "";
      if (horizontal) {
        row.dataset.suppressClick = "1";
        if (currentX < -22) {
          closeSwipeRows(row);
          row.classList.add("open");
        } else {
          row.classList.remove("open");
        }
      }
      dragging = false;
      horizontal = false;
      setTimeout(() => row.dataset.suppressClick = "0", 320);
    }, { passive: true });
    row.addEventListener("click", (event) => {
      if (row.classList.contains("open") && !event.target.closest(".delete-action")) {
        row.classList.remove("open");
        event.preventDefault();
        event.stopPropagation();
      }
    });
  });
}

function closeStatShareSwipeRows(except = null) {
  document.querySelectorAll(".stat-swipe-row.open").forEach((row) => {
    if (row !== except) row.classList.remove("open");
  });
}

function setupStatShareSwipeRows() {
  document.querySelectorAll("#statsList .stat-swipe-row").forEach((row) => {
    if (row.dataset.statSwipeBound === "1") return;
    row.dataset.statSwipeBound = "1";
    const content = row.querySelector(".stat-swipe-content");
    const details = row.querySelector("details");
    let startX = 0;
    let startY = 0;
    let currentX = 0;
    let dragging = false;
    let horizontal = false;
    row.addEventListener("touchstart", (event) => {
      if (details?.open || event.target.closest("button")) return;
      const touch = event.touches[0];
      startX = touch.clientX;
      startY = touch.clientY;
      currentX = row.classList.contains("open") ? -104 : 0;
      dragging = true;
      horizontal = false;
      row.dataset.suppressClick = "0";
      row.classList.add("dragging");
      closeStatShareSwipeRows(row);
    }, { passive: true });
    row.addEventListener("touchmove", (event) => {
      if (!dragging) return;
      const touch = event.touches[0];
      const dx = touch.clientX - startX;
      const dy = touch.clientY - startY;
      if (!horizontal && Math.abs(dx) > 5 && Math.abs(dx) > Math.abs(dy) * 1.1) horizontal = true;
      if (!horizontal) return;
      event.preventDefault();
      currentX = Math.max(-104, Math.min(0, dx + (row.classList.contains("open") ? -104 : 0)));
      if (content) content.style.transform = `translateX(${currentX}px)`;
    }, { passive: false });
    row.addEventListener("touchend", () => {
      if (!dragging) return;
      row.classList.remove("dragging");
      if (content) content.style.transform = "";
      if (horizontal) {
        row.dataset.suppressClick = "1";
        if (currentX < -18) {
          closeStatShareSwipeRows(row);
          row.classList.add("open");
        } else {
          row.classList.remove("open");
        }
      }
      dragging = false;
      horizontal = false;
      setTimeout(() => row.dataset.suppressClick = "0", 320);
    }, { passive: true });
    row.addEventListener("touchcancel", () => {
      dragging = false;
      horizontal = false;
      row.classList.remove("dragging");
      if (content) content.style.transform = "";
    }, { passive: true });
    row.addEventListener("click", (event) => {
      if (row.classList.contains("open") && !event.target.closest(".stat-share-action")) {
        row.classList.remove("open");
        event.preventDefault();
        event.stopPropagation();
      }
    });
  });
}

function showToast(message) {
  document.querySelector(".app-toast")?.remove();
  const toast = document.createElement("div");
  toast.className = "app-toast";
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2200);
}

function deleteTrip(id) {
  const trip = trips.find((t) => t.id === id);
  if (!trip) return;
  showConfirm({
    title: "请您确认是否删除",
    message: `删除旅行「${trip.name}」？里面的账单也会一起删除。`,
    onConfirm: () => {
      trips = trips.filter((t) => t.id !== id);
      if (activeTripId === id) activeTripId = trips[0]?.id || "";
      saveTrips();
      renderHome();
    }
  });
}

function deleteExpense(id) {
  const trip = activeTrip();
  const expense = trip?.expenses.find((e) => e.id === id);
  if (!trip || !expense) return;
  showConfirm({
    title: "请您确认是否删除",
    message: `删除这条账单「${expense.title}」？`,
    onConfirm: () => {
      trip.expenses = trip.expenses.filter((e) => e.id === id ? false : true);
      saveTrips();
      renderDetail();
    }
  });
}

function usedForeignCurrencies(trip) {
  return [...new Set(trip.expenses.filter((e) => e.currency && e.currency !== "CNY").map((e) => e.currency))];
}

function rateHistory(trip, currency) {
  const setting = RatePolicy.ensureRateSettings(trip)[currency] || {};
  const expenses = trip.expenses.filter((e) => e.currency === currency)
    .map((e, index) => ({ e, index }))
    .sort((a, b) => (Number(b.e.rateUpdatedAt) || 0) - (Number(a.e.rateUpdatedAt) || 0) || a.index - b.index)
    .map(({ e }) => String(rateOf(e)));
  return [...new Set([
    setting.batchRate ? String(setting.batchRate) : "",
    setting.singleRate ? String(setting.singleRate) : "",
    ...expenses
  ].filter(Boolean))];
}

function renderRateTools(trip) {
  const currencies = usedForeignCurrencies(trip);
  $("#rateTools").innerHTML = currencies.length ? `<button id="batchRates" type="button">批量更新汇率</button><span>${currencies.join(" / ")}</span>` : "";
  const button = $("#batchRates");
  if (button) button.onclick = openRateSheet;
}

function statsFor(trip, personId) {
  const rows = trip.expenses.filter((e) => e.participants.includes(personId) && e.participants.length).map((e) => ({ ...e, share: cnyAmount(e) / e.participants.length }));
  const total = rows.reduce((s, e) => s + e.share, 0);
  const cats = {};
  rows.forEach((e) => {
    cats[e.category] = (cats[e.category] || 0) + e.share;
  });
  return { rows, total, cats };
}

function renderStats(trip) {
  $("#statsList").innerHTML = trip.people.map((p) => {
    const stat = statsFor(trip, p.id);
    const cats = Object.entries(stat.cats).sort((a, b) => b[1] - a[1]);
    return `<article class="stat-swipe-row" data-stat-person="${escapeHtml(p.id)}">
      <details class="stat-card stat-swipe-content">
        <summary>${avatar(p)}<div class="stat-person"><b>${escapeHtml(p.name)}</b><span>个人消费金额总计</span></div><div class="stat-summary-end"><strong class="stat-total">${money(stat.total)}</strong><span class="stat-toggle" data-stat-toggle-text>查看明细</span></div></summary>
        <div class="cat-list">${cats.length ? cats.map(([cat, n]) => `<div><span>${icons[cat] || "✦"} ${escapeHtml(cat)}</span><b>${money(n)}</b><em>${stat.total ? Math.round(n / stat.total * 100) : 0}%</em></div>`).join("") : `<p class="empty">暂无消费</p>`}</div>
        <div class="mini-list">${stat.rows.length ? stat.rows.map((e) => `<article><span>${icons[e.category] || "✦"}</span><div><b>${escapeHtml(e.title)}</b><small>${escapeHtml(e.date ? `${e.date} · ` : "")}${escapeHtml(e.category)}</small></div><strong>${money(e.share)}</strong></article>`).join("") : `<p class="empty">暂无消费明细</p>`}</div>
        <button class="wide personal-share" type="button" data-personal-share="${escapeHtml(p.id)}">生成${escapeHtml(p.name)}的个人消费清单</button>
      </details>
      <button class="stat-share-action" type="button" data-personal-swipe-share="${escapeHtml(p.id)}">生成清单</button>
    </article>`;
  }).join("");
  setupStatShareSwipeRows();
  document.querySelectorAll("#statsList details.stat-card").forEach((details) => {
    const update = () => {
      details.closest(".stat-swipe-row")?.classList.remove("open");
      const text = details.querySelector("[data-stat-toggle-text]");
      if (text) text.textContent = details.open ? "收起" : "查看明细";
    };
    details.addEventListener("toggle", update);
    update();
  });
  document.querySelectorAll("[data-personal-share],[data-personal-swipe-share]").forEach((button) => {
    button.onclick = async (event) => {
      event.preventDefault();
      event.stopPropagation();
      const personId = button.dataset.personalShare || button.dataset.personalSwipeShare;
      const p = person(trip, personId);
      const stat = statsFor(trip, personId);
      button.closest(".stat-swipe-row")?.classList.remove("open");
      await shareGeneratedImage(personalShareFile(trip, p, stat), personalShareText(trip, p, stat), `${p.name}的消费清单已复制`);
    };
  });
}

function openTripSheet(id = null) {
  editingTripId = id;
  const trip = id ? trips.find((t) => t.id === id) : null;
  $("#tripSheetTitle").textContent = trip ? "编辑旅行" : "新建旅行";
  draftAvatarMap = {};
  (trip?.people || []).forEach((p, i) => draftAvatarMap[i] = p.avatarIndex || (i % avatarCount) + 1);
  $("#tripName").value = trip?.name || "";
  $("#tripStart").value = trip?.startDate || "";
  $("#tripEnd").value = trip?.endDate || "";
  selectingDatePart = trip?.startDate && !trip?.endDate ? "end" : "start";
  calendarCursor = new Date((trip?.startDate || today()).slice(0, 7) + "-01");
  updateTripDateRangeButton();
  renderCalendar();
  $("#tripDateRangePanel").classList.add("hidden");
  $("#tripPeopleCount").value = trip?.peopleCount || trip?.people.length || "";
  $("#tripNicknames").value = trip?.people.map((p) => p.name).join(", ") || "";
  syncAvatarDrafts();
  updateTripSaveState();
  clearErrors();
  $("#tripSheet").showModal();
  $("#tripSheet").scrollTop = 0;
  if (!trip) focusForTyping($("#tripName"));
}

function splitNames(raw) {
  return raw.split(/[,\s，、]+/).map((x) => x.trim()).filter(Boolean);
}

function parsePeople(raw, count, existing = []) {
  const names = splitNames(raw);
  const finalNames = Array.from({ length: count }, (_, i) => names[i] || `朋友${i + 1}`);
  return finalNames.map((name, i) => ({
    id: existing[i]?.id || `${name.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-") || "p"}-${i + 1}`,
    name,
    color: existing[i]?.color || palette[i % palette.length],
    avatarIndex: draftAvatarMap[i] || existing[i]?.avatarIndex || (i % avatarCount) + 1
  }));
}

function syncAvatarDrafts() {
  const count = Number($("#tripPeopleCount").value) || splitNames($("#tripNicknames").value).length;
  const names = splitNames($("#tripNicknames").value);
  const currentTrip = editingTripId ? trips.find((t) => t.id === editingTripId) : null;
  const total = Math.max(0, count || names.length);
  for (let i = 0; i < total; i++) {
    if (!draftAvatarMap[i]) {
      const preferred = currentTrip?.people?.[i]?.avatarIndex || (i % avatarCount) + 1;
      const used = new Set(Object.entries(draftAvatarMap).filter(([key]) => Number(key) !== i).map(([, value]) => value));
      draftAvatarMap[i] = used.has(preferred) ? firstUnusedAvatar(used) : preferred;
    }
  }
  renderAvatarChooser(total, names);
}

function renderAvatarChooser(count, names = splitNames($("#tripNicknames").value)) {
  if (!count) {
    $("#avatarChooser").innerHTML = "";
    return;
  }
  $("#avatarChooser").innerHTML = `<p>昵称头像 <em>点头像切换</em></p><div class="avatar-edit-list">${Array.from({ length: count }, (_, i) => {
    const name = names[i] || `朋友${i + 1}`;
    const idx = draftAvatarMap[i] || (i % avatarCount) + 1;
    const src = window.CAT_AVATARS?.[idx - 1] || `${avatarBase}/cat-${String(idx).padStart(2, "0")}.png`;
    return `<button type="button" data-avatar-person="${i}"><img alt="${escapeHtml(name)}" src="${escapeHtml(src)}"><span>${escapeHtml(name)}</span></button>`;
  }).join("")}</div>`;
}

function firstUnusedAvatar(used, after = 0) {
  for (let offset = 1; offset <= avatarCount; offset++) {
    const candidate = ((after + offset - 1) % avatarCount) + 1;
    if (!used.has(candidate)) return candidate;
  }
  return ((after || 1) % avatarCount) + 1;
}

function updateTripSaveState() {
  const name = $("#tripName").value.trim();
  const peopleCount = Number($("#tripPeopleCount").value);
  const names = splitNames($("#tripNicknames").value);
  const disabled = !name || !Number.isInteger(peopleCount) || peopleCount < 1 || names.length !== peopleCount;
  $("#saveTrip").classList.toggle("soft-disabled", disabled);
  $("#saveTripTop").classList.toggle("soft-disabled", disabled);
  $("#saveTrip").setAttribute("aria-disabled", String(disabled));
  $("#saveTripTop").setAttribute("aria-disabled", String(disabled));
}

function saveTrip() {
  clearErrors();
  const name = $("#tripName").value.trim();
  const peopleCount = Number($("#tripPeopleCount").value);
  const names = splitNames($("#tripNicknames").value);
  const firstInvalid = !name ? $("#tripName") : !Number.isInteger(peopleCount) || peopleCount < 1 ? $("#tripPeopleCount") : names.length !== peopleCount ? $("#tripNicknames") : null;
  if (firstInvalid) return focusInvalid(firstInvalid);
  const currentTrip = editingTripId ? trips.find((t) => t.id === editingTripId) : null;
  const people = parsePeople($("#tripNicknames").value, peopleCount, currentTrip?.people || []);
  if (editingTripId) {
    Object.assign(currentTrip, { name, destination: "", startDate: $("#tripStart").value, endDate: $("#tripEnd").value, peopleCount, people });
    migrateTrip(currentTrip);
  } else {
    const trip = { id: crypto.randomUUID(), name, destination: "", startDate: $("#tripStart").value, endDate: $("#tripEnd").value, peopleCount, people, expenses: [] };
    trips.unshift(trip);
    activeTripId = trip.id;
  }
  saveTrips();
  $("#tripSheet").close();
  showDetail();
}

function updateTripDateRangeButton() {
  const start = $("#tripStart").value;
  const end = $("#tripEnd").value;
  $("#tripDateRangeButton").textContent = start && end ? `${start}～${end}` : start ? `${start}～选择结束日期` : "选择开始和结束日期";
}

function formatDate(d) {
  const x = new Date(d);
  x.setMinutes(x.getMinutes() - x.getTimezoneOffset());
  return x.toISOString().slice(0, 10);
}

function renderCalendar() {
  const start = $("#tripStart").value;
  const end = $("#tripEnd").value;
  const y = calendarCursor.getFullYear();
  const m = calendarCursor.getMonth();
  $("#calendarTitle").textContent = selectingDatePart === "start" ? "开始日期" : "结束日期";
  $("#calendarMonth").innerHTML = `<button type="button" data-cal-prev>‹</button><span>${y}年${m + 1}月</span><button type="button" data-cal-next>›</button>`;
  const first = new Date(y, m, 1);
  const days = new Date(y, m + 1, 0).getDate();
  const blanks = Array.from({ length: first.getDay() }, () => `<span></span>`).join("");
  const cells = Array.from({ length: days }, (_, i) => {
    const n = i + 1;
    const iso = formatDate(new Date(y, m, n));
    const isStart = iso === start;
    const isEnd = iso === end;
    const inRange = start && end && iso > start && iso < end;
    const isToday = iso === today();
    return `<button type="button" data-date="${iso}" class="${isStart ? "start" : ""} ${isEnd ? "end" : ""} ${inRange ? "range" : ""} ${isToday ? "today" : ""}"><span>${n}</span>${isToday ? "<small>today</small>" : ""}</button>`;
  }).join("");
  $("#calendarGrid").innerHTML = blanks + cells;
  $("#calendarHint").textContent = start && end ? `${start}～${end}` : start ? "请选择结束日期" : "先选择开始日期";
}

function pickTripDate(iso) {
  const start = $("#tripStart").value;
  if (selectingDatePart === "start" || !start || (start && $("#tripEnd").value)) {
    $("#tripStart").value = iso;
    $("#tripEnd").value = "";
    selectingDatePart = "end";
  } else if (iso < start) {
    $("#tripStart").value = iso;
    $("#tripEnd").value = "";
    selectingDatePart = "end";
  } else {
    $("#tripEnd").value = iso;
    selectingDatePart = "start";
  }
  updateTripDateRangeButton();
  renderCalendar();
}

function setParticipantModeFromSelection(trip, expense) {
  const sameAsAll = trip.people.length === expense.participants.length && trip.people.every((p) => expense.participants.includes(p.id)) && expense.category !== "借用";
  participantMode = sameAsAll ? "all" : "partial";
}

function resetExpenseForm(expense = null) {
  const trip = activeTrip();
  $("#payer").innerHTML = trip.people.map((p) => `<option value="${escapeHtml(p.id)}">${escapeHtml(p.name)}</option>`).join("");
  $("#category").innerHTML = typeOptions.map(([name, icon]) => `<option value="${name}">${icon} ${name}</option>`).join("");
  editingExpenseId = expense?.id || null;
  selected = expense ? [...expense.participants] : trip.people.map((p) => p.id);
  if (expense) setParticipantModeFromSelection(trip, expense);
  else participantMode = "all";
  $("#amount").value = expense?.amount ?? "";
  $("#item").value = expense?.title || "";
  $("#expenseDate").value = expense?.date || today();
  $("#currency").value = expense?.currency || "CNY";
  $("#category").value = expense?.category || $("#category").value;
  $("#category").dataset.previousCategory = $("#category").value;
  $("#payer").value = expense?.payer || $("#payer").value;
  // 编辑既有账单时保留该笔历史值；新建或之后切换币种时采用项目级汇率策略。
  $("#rateInput").value = expense ? rateOf(expense) : preferredTripRate(trip, $("#currency").value);
  updateConversion();
  updateRateField();
  renderPeoplePick();
  clearErrors();
  $("#sheetTitle").textContent = expense ? "编辑账单" : "记一笔";
}

function openExpenseSheet(id = null) {
  const trip = activeTrip();
  const expense = id ? trip.expenses.find((e) => e.id === id) : null;
  resetExpenseForm(expense);
  $("#sheet").showModal();
  $("#sheet").scrollTop = 0;
  if (!expense) focusForTyping($("#amount"), { liftSheet: true });
}

function renderPeoplePick() {
  const trip = activeTrip();
  const isBorrow = $("#category").value === "借用";
  const payerId = $("#payer").value;
  if (isBorrow) {
    participantMode = "partial";
    selected = selected.filter((id) => id !== payerId);
  } else if (participantMode === "all") {
    selected = trip.people.map((p) => p.id);
  } else {
    selected = [...new Set([payerId, ...selected])];
  }
  const isAll = participantMode === "all" && !isBorrow;
  $("#peoplePick").innerHTML = `<button type="button" data-all class="${isAll ? "on" : ""}" ${isBorrow ? "disabled" : ""}>全部</button>` + trip.people.map((p) => {
    const disabled = isBorrow && p.id === payerId;
    const isOn = participantMode === "partial" && selected.includes(p.id);
    return `<button type="button" data-id="${escapeHtml(p.id)}" class="${isOn ? "on" : ""}" ${disabled ? "disabled" : ""}>${escapeHtml(p.name)}</button>`;
  }).join("");
  updateExpenseSaveState();
}

function toggleParticipant(target) {
  const trip = activeTrip();
  const isBorrow = $("#category").value === "借用";
  const payerId = $("#payer").value;
  if (target.matches("[data-all]")) {
    if (isBorrow) return;
    participantMode = "all";
    selected = trip.people.map((p) => p.id);
    renderPeoplePick();
    return;
  }
  const id = target.dataset.id;
  if (!id || target.disabled) return;
  if (participantMode === "all") {
    participantMode = "partial";
    selected = isBorrow ? [id] : [...new Set([payerId, id])];
  } else {
    selected = selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id];
    if (!isBorrow) selected = [...new Set([payerId, ...selected])];
  }
  if (isBorrow) selected = selected.filter((x) => x !== payerId);
  renderPeoplePick();
}

function saveExpense() {
  clearErrors();
  const trip = activeTrip();
  const rawAmount = $("#amount").value.trim();
  const amount = Number(rawAmount);
  const title = $("#item").value.trim();
  const category = $("#category").value;
  const currency = $("#currency").value;
  const rate = currency === "CNY" ? 1 : Number($("#rateInput").value);
  const validParticipants = selected.filter((id) => trip.people.some((p) => p.id === id));
  const invalidAmount = rawAmount === "" || Number.isNaN(amount) || amount <= 0;
  const invalidRate = currency !== "CNY" && (Number.isNaN(rate) || rate <= 0);
  const firstInvalid = invalidAmount ? $("#amount") : invalidRate ? $("#rateInput") : !category ? $("#category") : !$("#payer").value ? $("#payer") : !validParticipants.length ? $("#peoplePick") : !title ? $("#item") : null;
  if (firstInvalid) return focusInvalid(firstInvalid);
  const previousExpense = editingExpenseId ? trip.expenses.find((e) => e.id === editingExpenseId) : null;
  const rateChanged = currency !== "CNY" && (!previousExpense
    || previousExpense.currency !== currency
    || Math.abs(rateOf(previousExpense) - rate) > 0.000000001);
  const rateUpdatedAt = rateChanged ? Date.now() : previousExpense?.rateUpdatedAt;
  const nextExpense = { id: editingExpenseId || crypto.randomUUID(), title, category, amount, currency, rate, payer: $("#payer").value, participants: [...validParticipants], date: $("#expenseDate").value, ...(rateUpdatedAt ? { rateUpdatedAt } : {}) };
  if (editingExpenseId) {
    trip.expenses = trip.expenses.map((e) => e.id === editingExpenseId ? nextExpense : e);
  } else {
    trip.expenses.unshift(nextExpense);
  }
  if (rateChanged) RatePolicy.recordSingleRate(trip, currency, rate, rateUpdatedAt);
  editingExpenseId = null;
  saveTrips();
  $("#sheet").close();
  renderDetail();
}

function showConfirm({ title, message, onConfirm }) {
  document.querySelector(".app-confirm-mask")?.remove();
  const mask = document.createElement("div");
  mask.className = "app-confirm-mask";
  mask.innerHTML = `
    <div class="app-confirm" role="dialog" aria-modal="true">
      <h3>${escapeHtml(title)}</h3>
      <p>${escapeHtml(message)}</p>
      <div class="app-confirm-actions">
        <button type="button" class="app-confirm-cancel">取消</button>
        <button type="button" class="app-confirm-delete">确认删除</button>
      </div>
    </div>`;
  document.body.appendChild(mask);
  const close = () => mask.remove();
  mask.addEventListener("click", (event) => {
    if (event.target === mask) close();
  });
  mask.querySelector(".app-confirm-cancel").onclick = close;
  mask.querySelector(".app-confirm-delete").onclick = () => {
    close();
    onConfirm?.();
  };
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[ch]));
}

function clearErrors() {
  document.querySelectorAll(".invalid").forEach((el) => el.classList.remove("invalid"));
}

function focusInvalid(el) {
  el.classList.add("invalid");
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  setTimeout(() => {
    if (el.matches("input,select")) el.focus();
    else el.querySelector("button:not(:disabled)")?.focus();
  }, 250);
}

function keepCaretVisible(el, moveToEnd = false) {
  if (!el || typeof el.setSelectionRange !== "function") return;
  const end = String(el.value || "").length;
  if (moveToEnd) el.setSelectionRange(end, end);
  if (moveToEnd || el.selectionEnd === end) {
    requestAnimationFrame(() => { el.scrollLeft = el.scrollWidth; });
  }
}

let stableViewportHeight = window.visualViewport?.height || window.innerHeight;
function syncKeyboardLift(forceAmountLift = false) {
  const active = document.activeElement;
  document.querySelectorAll("dialog.keyboard-visible").forEach((dialog) => {
    dialog.classList.remove("keyboard-visible");
    dialog.style.removeProperty("--keyboard-lift");
  });
  const dialog = active?.closest?.("dialog[open]");
  const viewport = window.visualViewport;
  if (!dialog || !viewport || !active.matches("input,select")) {
    stableViewportHeight = Math.max(stableViewportHeight, viewport?.height || window.innerHeight);
    return;
  }
  const layoutHeight = Math.max(stableViewportHeight, document.documentElement.clientHeight, window.innerHeight);
  const keyboardHeight = Math.max(0, layoutHeight - viewport.height - viewport.offsetTop);
  const coarsePointer = window.matchMedia?.("(pointer: coarse)").matches;
  if (keyboardHeight < 70 && !(forceAmountLift && coarsePointer)) return;
  if (active.id !== "amount" && keyboardHeight < 110) return;
  const lift = Math.min(260, Math.max(140, keyboardHeight * 0.64));
  dialog.style.setProperty("--keyboard-lift", `${Math.round(lift)}px`);
  dialog.classList.add("keyboard-visible");
  requestAnimationFrame(() => active.scrollIntoView({ behavior: "smooth", block: active.id === "amount" ? "start" : "center" }));
}

function focusForTyping(el, options = {}) {
  if (!el) return;
  const focus = () => {
    try {
      el.focus({ preventScroll: true });
      keepCaretVisible(el, true);
    } catch (_) {
      el.focus();
    }
  };
  focus();
  requestAnimationFrame(() => {
    focus();
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    if (options.liftSheet) setTimeout(() => syncKeyboardLift(true), 120);
  });
}

function focusNextTripInput(current) {
  const fields = [$("#tripName"), $("#tripPeopleCount"), $("#tripNicknames")];
  const index = fields.indexOf(current);
  const after = fields.slice(index + 1).find((field) => !field.value.trim());
  const remaining = fields.find((field) => field !== current && !field.value.trim());
  const next = after || remaining;
  if (next) focusForTyping(next);
  else $("#saveTrip").focus();
}

function updateExpenseSaveState() {
  const trip = activeTrip();
  const rawAmount = $("#amount").value.trim();
  const amount = Number(rawAmount);
  const title = $("#item").value.trim();
  const hasPeople = selected.some((id) => trip?.people.some((p) => p.id === id));
  const invalidAmount = rawAmount === "" || Number.isNaN(amount) || amount <= 0;
  const currency = $("#currency").value;
  const rate = currency === "CNY" ? 1 : Number($("#rateInput").value);
  const invalidRate = currency !== "CNY" && (Number.isNaN(rate) || rate <= 0);
  const disabled = invalidAmount || invalidRate || !title || !$("#category").value || !$("#payer").value || !hasPeople;
  $("#save").classList.toggle("soft-disabled", disabled);
  $("#saveTop").classList.toggle("soft-disabled", disabled);
  $("#save").setAttribute("aria-disabled", String(disabled));
  $("#saveTop").setAttribute("aria-disabled", String(disabled));
}

function updateConversion() {
  const rawAmount = $("#amount").value.trim();
  const amount = Number(rawAmount || 0);
  const currency = $("#currency").value;
  const rate = currency === "CNY" ? 1 : Number($("#rateInput").value || rates[currency] || 1);
  $("#conversion").textContent = currency === "CNY" ? "" : `约 ${money((Number.isNaN(amount) ? 0 : amount) * (Number.isNaN(rate) ? 0 : rate))}`;
}

function updateRateField() {
  const currency = $("#currency").value;
  $("#rateField").classList.toggle("hidden", currency === "CNY");
  if (currency !== "CNY" && (!$("#rateInput").value || Number($("#rateInput").value) <= 0)) {
    $("#rateInput").value = preferredTripRate(activeTrip(), currency);
  }
  updateConversion();
  updateExpenseSaveState();
}

function openRateSheet() {
  const trip = activeTrip();
  const currencies = usedForeignCurrencies(trip);
  $("#rateList").innerHTML = currencies.length ? currencies.map((currency) => {
    const history = rateHistory(trip, currency);
    const latest = preferredTripRate(trip, currency);
    return `<label>${escapeHtml(currency)} 兑人民币汇率 <span class="req">*</span><input data-rate-currency="${escapeHtml(currency)}" type="number" inputmode="decimal" min="0" step="0.0001" value="${escapeHtml(latest)}"><small>历史录入：${escapeHtml(history.join("，"))}</small></label>`;
  }).join("") : `<p class="empty">本旅行还没有外币账单。</p>`;
  $("#rateSheet").showModal();
}

function saveRateBatch() {
  clearErrors();
  const trip = activeTrip();
  const inputs = [...document.querySelectorAll("[data-rate-currency]")];
  const bad = inputs.find((input) => Number.isNaN(Number(input.value)) || Number(input.value) <= 0);
  if (bad) return focusInvalid(bad);
  inputs.forEach((input) => {
    const currency = input.dataset.rateCurrency;
    const rate = Number(input.value);
    RatePolicy.recordBatchRate(trip, currency, rate);
    trip.expenses.forEach((e) => {
      if (e.currency === currency) e.rate = rate;
    });
  });
  saveTrips();
  $("#rateSheet").close();
  renderDetail();
}

function initPromoCarousel() {
  const track = $("#promoTrack");
  const dots = $("#promoDots");
  if (!track || !dots) return;
  const slides = [...track.children];
  if (!slides.length) return;
  let active = 0;
  let timer = null;
  let scrollFrame = 0;
  dots.innerHTML = slides.map((_, index) => `<button type="button" aria-label="查看第 ${index + 1} 个亮点"></button>`).join("");
  const dotButtons = [...dots.children];
  const paintDots = () => dotButtons.forEach((dot, index) => dot.classList.toggle("active", index === active));
  const go = (index, behavior = "smooth") => {
    active = (index + slides.length) % slides.length;
    track.scrollTo({ left: active * track.clientWidth, behavior });
    paintDots();
  };
  const stop = () => {
    if (timer) clearInterval(timer);
    timer = null;
  };
  const start = () => {
    stop();
    timer = setInterval(() => go(active + 1), 4800);
  };
  dots.onclick = (event) => {
    const dot = event.target.closest("button");
    if (!dot) return;
    go(dotButtons.indexOf(dot));
    start();
  };
  track.addEventListener("scroll", () => {
    cancelAnimationFrame(scrollFrame);
    scrollFrame = requestAnimationFrame(() => {
      const next = Math.round(track.scrollLeft / Math.max(1, track.clientWidth));
      if (next !== active) {
        active = Math.max(0, Math.min(slides.length - 1, next));
        paintDots();
      }
    });
  }, { passive: true });
  track.addEventListener("touchstart", stop, { passive: true });
  track.addEventListener("touchend", start, { passive: true });
  document.addEventListener("visibilitychange", () => document.hidden ? stop() : start());
  window.addEventListener("resize", () => go(active, "auto"));
  paintDots();
  start();
}

function initDetailSwipeBack() {
  const detail = $("#tripDetail");
  if (!detail) return;
  let startX = 0;
  let startY = 0;
  let tracking = false;
  let horizontal = false;
  detail.addEventListener("touchstart", (event) => {
    if (detail.classList.contains("hidden") || document.querySelector("dialog[open]")) return;
    // 账单卡片同时支持左滑删除和右滑返回：方向相反，不需要互相禁用。
    if (event.target.closest("button,input,select,textarea,nav,a")) return;
    const touch = event.touches[0];
    startX = touch.clientX;
    startY = touch.clientY;
    tracking = true;
    horizontal = false;
  }, { passive: true });
  detail.addEventListener("touchmove", (event) => {
    if (!tracking) return;
    const touch = event.touches[0];
    const dx = touch.clientX - startX;
    const dy = touch.clientY - startY;
    if (!horizontal && dx > 12 && Math.abs(dx) > Math.abs(dy) * 1.35) horizontal = true;
    if (horizontal && dx > 0) event.preventDefault();
  }, { passive: false });
  detail.addEventListener("touchend", (event) => {
    if (!tracking) return;
    const touch = event.changedTouches[0];
    const dx = touch.clientX - startX;
    const dy = touch.clientY - startY;
    tracking = false;
    if (horizontal && dx > 88 && Math.abs(dx) > Math.abs(dy) * 1.35) showHome();
  }, { passive: true });
  detail.addEventListener("touchcancel", () => {
    tracking = false;
    horizontal = false;
  }, { passive: true });
}

document.querySelectorAll("nav button").forEach((button) => {
  button.onclick = () => {
    document.querySelectorAll("nav button").forEach((x) => x.classList.remove("active"));
    button.classList.add("active");
    $("#bills").classList.toggle("hidden", button.dataset.tab !== "bills");
    $("#settle").classList.toggle("hidden", button.dataset.tab !== "settle");
    $("#stats").classList.toggle("hidden", button.dataset.tab !== "stats");
  };
});
$("#newTrip").onclick = () => openTripSheet();
$("#editTrip").onclick = () => openTripSheet(activeTrip().id);
$("#backHome").onclick = showHome;
$("[data-trip-close]").onclick = () => $("#tripSheet").close();
$("#saveTrip").onclick = $("#saveTripTop").onclick = saveTrip;
$("#tripDateRangeButton").onclick = () => $("#tripDateRangePanel").classList.toggle("hidden");
$("#tripName").oninput = () => {
  keepCaretVisible($("#tripName"));
  $("#tripName").classList.remove("invalid");
  updateTripSaveState();
};
$("#tripPeopleCount").oninput = () => {
  $("#tripPeopleCount").classList.remove("invalid");
  syncAvatarDrafts();
  updateTripSaveState();
};
$("#tripNicknames").oninput = () => {
  keepCaretVisible($("#tripNicknames"));
  $("#tripNicknames").classList.remove("invalid");
  syncAvatarDrafts();
  updateTripSaveState();
};
[$("#tripName"), $("#tripPeopleCount"), $("#tripNicknames")].forEach((field) => {
  field.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" || event.isComposing) return;
    event.preventDefault();
    focusNextTripInput(field);
  });
});
$("#avatarChooser").onclick = (event) => {
  const button = event.target.closest("[data-avatar-person]");
  if (!button) return;
  const i = Number(button.dataset.avatarPerson);
  const used = new Set(Object.entries(draftAvatarMap).filter(([key]) => Number(key) !== i).map(([, value]) => value));
  draftAvatarMap[i] = firstUnusedAvatar(used, draftAvatarMap[i] || i + 1);
  syncAvatarDrafts();
};
$("#calendarMonth").onclick = (event) => {
  if (event.target.closest("[data-cal-prev]")) calendarCursor = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() - 1, 1);
  if (event.target.closest("[data-cal-next]")) calendarCursor = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() + 1, 1);
  renderCalendar();
};
$("#calendarGrid").onclick = (event) => {
  const button = event.target.closest("[data-date]");
  if (button) pickTripDate(button.dataset.date);
};
$("#add").onclick = () => {
  openExpenseSheet();
};
$("[data-close]").onclick = () => $("#sheet").close();
$("[data-rate-close]").onclick = () => $("#rateSheet").close();
$("#saveRates").onclick = $("#saveRatesTop").onclick = saveRateBatch;
$("#save").onclick = $("#saveTop").onclick = saveExpense;
$("#category").onchange = () => {
  const previous = $("#category").dataset.previousCategory;
  if ($("#category").value === "借用") {
    participantMode = "partial";
    selected = [];
  } else if (previous === "借用") {
    participantMode = "all";
    selected = activeTrip().people.map((p) => p.id);
  }
  $("#category").dataset.previousCategory = $("#category").value;
  renderPeoplePick();
  updateExpenseSaveState();
};
$("#payer").onchange = () => {
  renderPeoplePick();
  updateExpenseSaveState();
};
$("#item").oninput = () => {
  keepCaretVisible($("#item"));
  updateExpenseSaveState();
};
$("#amount").oninput = () => {
  updateConversion();
  updateExpenseSaveState();
};
$("#currency").onchange = () => {
  $("#rateInput").value = preferredTripRate(activeTrip(), $("#currency").value);
  updateRateField();
};
$("#rateInput").oninput = () => {
  updateConversion();
  updateExpenseSaveState();
};
$("#peoplePick").addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (button) {
    event.preventDefault();
    event.stopPropagation();
    toggleParticipant(button);
  }
});
document.addEventListener("focusin", () => setTimeout(() => syncKeyboardLift(), 90));
document.addEventListener("focusout", () => setTimeout(() => syncKeyboardLift(), 140));
window.visualViewport?.addEventListener("resize", () => syncKeyboardLift());
window.visualViewport?.addEventListener("scroll", () => syncKeyboardLift());
saveTrips();
initPromoCarousel();
initDetailSwipeBack();
showHome();
if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js?v=31");
