const rates = { CNY: 1, JPY: 0.049, KRW: 0.0053, USD: 7.18, EUR: 7.85 };
const symbols = { CNY: "¥", JPY: "¥", KRW: "₩", USD: "$", EUR: "€" };
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
const legacyPeople = [
  { id: "tt", name: "TT", color: "#ff704d" },
  { id: "bb", name: "BB", color: "#487bff" },
  { id: "qq", name: "QQ", color: "#a06be8" }
];
const legacySeed = [
  ["BB借钱给TT", "借用", 200, "CNY", 1, "bb", ["tt"]],
  ["机场去酒店", "打车", 12870, "JPY", 0.049, "tt", ["tt", "bb", "qq"]],
  ["鳗鱼饭", "餐饮", 13800, "JPY", 0.049, "bb", ["tt", "bb", "qq"]],
  ["森美术馆", "门票", 4000, "JPY", 0.049, "tt", ["tt", "bb"]]
].map((x, i) => ({ id: String(i), title: x[0], category: x[1], amount: x[2], currency: x[3], rate: x[4], payer: x[5], participants: x[6] }));
const $ = (s) => document.querySelector(s);
const money = (n) => "¥" + Math.abs(n).toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
let calendarCursor = new Date(today().slice(0, 7) + "-01");
let selectingDatePart = "start";

function loadTrips() {
  const saved = JSON.parse(localStorage.getItem("yiqizou-trips") || "null");
  if (saved?.length) return saved;
  const oldExpenses = JSON.parse(localStorage.getItem("yiqizou-expenses") || "null") || legacySeed;
  return [{
    id: crypto.randomUUID(),
    name: "东京朋友旅行",
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
}

function activeTrip() {
  return trips.find((t) => t.id === activeTripId) || trips[0];
}

function person(trip, id) {
  return trip.people.find((p) => p.id === id) || { id, name: id, color: "#888" };
}

function dateRange(trip) {
  if (!trip.startDate && !trip.endDate) return "日期待定";
  if (trip.startDate && trip.endDate) return `${trip.startDate} — ${trip.endDate}`;
  return trip.startDate || trip.endDate;
}

function renderHome() {
  $("#tripCount").textContent = `${trips.length} 个`;
  $("#tripList").innerHTML = trips.map((trip) => {
    const total = trip.expenses.reduce((s, e) => s + e.amount * e.rate, 0);
    return `<article class="trip-card" data-id="${trip.id}">
      <div><b>${trip.name}</b><span>${dateRange(trip)} · ${trip.people.length}人</span><div class="trip-members">${trip.people.map(avatar).join("")}</div></div>
      <strong>${money(total)}</strong>
    </article>`;
  }).join("");
  document.querySelectorAll(".trip-card").forEach((card) => {
    card.onclick = () => {
      activeTripId = card.dataset.id;
      saveTrips();
      showDetail();
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
  const seed = encodeURIComponent(`${p.id}-${p.name}`);
  return `<span class="avatar"><img alt="${p.name}" src="https://robohash.org/${seed}.png?set=set4&size=96x96"></span>`;
}

function calc(trip) {
  return Object.fromEntries(trip.people.map((p) => [p.id, trip.expenses.reduce((s, e) => {
    const paid = e.payer === p.id ? e.amount * e.rate : 0;
    const owed = e.participants.includes(p.id) ? e.amount * e.rate / e.participants.length : 0;
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

function renderDetail() {
  const trip = activeTrip();
  if (!trip) return showHome();
  const total = trip.expenses.reduce((s, e) => s + e.amount * e.rate, 0);
  $("#tripTitle").textContent = trip.name;
  $("#tripMeta").textContent = dateRange(trip);
  $("#total").textContent = money(total);
  $("#summary").textContent = `${trip.expenses.length} 笔 · ${trip.people.length} 位朋友 · 人民币结算`;
  $("#avatars").innerHTML = trip.people.map(avatar).join("");
  $("#list").innerHTML = trip.expenses.length ? trip.expenses.map((e) => {
    const payer = person(trip, e.payer);
    const dateText = e.date ? `${e.date} · ` : "";
    return `<article class="expense" data-expense-id="${e.id}"><span class="icon">${icons[e.category] || "✦"}</span><div class="main"><b>${e.title}</b><span>${dateText}${e.category} · ${payer.name} 先付 · ${e.participants.length}人参与</span></div><div class="amt"><b>${money(e.amount * e.rate)}</b><span>${symbols[e.currency]}${Number(e.amount).toLocaleString()} ${e.currency}</span></div></article>`;
  }).join("") : `<p class="empty">还没有记录，点下方“记一笔”。</p>`;
  document.querySelectorAll("[data-expense-id]").forEach((row) => {
    row.onclick = () => openExpenseSheet(row.dataset.expenseId);
  });
  const balances = calc(trip);
  const transfers = settle(trip, balances);
  $("#balances").innerHTML = trip.people.map((p) => `<div class="balance">${avatar(p)}<div><b>${p.name}</b><small>${balances[p.id] >= 0 ? "应收" : "应付"}</small></div><strong class="${balances[p.id] >= 0 ? "receive" : "pay"}">${balances[p.id] >= 0 ? "+" : "−"}${money(balances[p.id])}</strong></div>`).join("");
  $("#settleCount").textContent = `${transfers.length} 笔即可结清`;
  $("#transfers").innerHTML = transfers.length ? transfers.map((x) => `<article>${avatar(person(trip, x.from))}<div><b>${person(trip, x.from).name} 支付给 ${person(trip, x.to).name}</b></div><strong>${money(x.n)}</strong></article>`).join("") : `<p class="empty">现在已经结清。</p>`;
  $("#share").onclick = () => navigator.share?.({ title: `${trip.name}结算`, text: transfers.map((x) => `${person(trip, x.from).name} → ${person(trip, x.to).name} ${money(x.n)}`).join("\n") || "已结清" });
  renderStats(trip);
}

function statsFor(trip, personId) {
  const rows = trip.expenses.filter((e) => e.participants.includes(personId)).map((e) => ({ ...e, share: e.amount * e.rate / e.participants.length }));
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
    return `<details class="stat-card">
      <summary>${avatar(p)}<div><b>${p.name}</b><span>个人消费 ${money(stat.total)}</span></div><strong>明细</strong></summary>
      <div class="cat-list">${cats.length ? cats.map(([cat, n]) => `<div><span>${icons[cat] || "✦"} ${cat}</span><b>${money(n)}</b><em>${stat.total ? Math.round(n / stat.total * 100) : 0}%</em></div>`).join("") : `<p class="empty">暂无消费</p>`}</div>
      <div class="mini-list">${stat.rows.map((e) => `<article><span>${icons[e.category] || "✦"}</span><div><b>${e.title}</b><small>${e.date ? `${e.date} · ` : ""}${e.category}</small></div><strong>${money(e.share)}</strong></article>`).join("")}</div>
    </details>`;
  }).join("");
}

function openTripSheet(id = null) {
  editingTripId = id;
  const trip = id ? trips.find((t) => t.id === id) : null;
  $("#tripSheetTitle").textContent = trip ? "编辑旅行" : "新建旅行";
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
  $("#tripSheet").showModal();
}

function parsePeople(raw, count, existing = []) {
  const names = raw.split(/[,\s，、]+/).map((x) => x.trim()).filter(Boolean);
  const finalNames = Array.from({ length: count }, (_, i) => names[i] || `朋友${i + 1}`);
  return finalNames.map((name, i) => ({
    id: existing[i]?.id || `${name.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-") || "p"}-${i + 1}`,
    name,
    color: existing[i]?.color || palette[i % palette.length]
  }));
}

function saveTrip() {
  clearErrors();
  const name = $("#tripName").value.trim();
  const peopleCount = Number($("#tripPeopleCount").value);
  const nicknames = $("#tripNicknames").value.trim();
  const firstInvalid = !name ? $("#tripName") : !peopleCount || peopleCount < 1 ? $("#tripPeopleCount") : !nicknames ? $("#tripNicknames") : null;
  if (firstInvalid) return focusInvalid(firstInvalid);
  const currentTrip = editingTripId ? trips.find((t) => t.id === editingTripId) : null;
  const people = parsePeople($("#tripNicknames").value, peopleCount, currentTrip?.people || []);
  if (editingTripId) {
    Object.assign(currentTrip, { name, destination: "", startDate: $("#tripStart").value, endDate: $("#tripEnd").value, peopleCount, people });
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
  $("#tripDateRangeButton").textContent = start && end ? `${start} — ${end}` : start ? `${start} — 选择结束日期` : "选择开始和结束日期";
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
  $("#calendarHint").textContent = start && end ? `${start} 到 ${end}` : start ? "请选择结束日期" : "先选择开始日期";
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
  $("#payer").innerHTML = trip.people.map((p) => `<option value="${p.id}">${p.name}</option>`).join("");
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
  $("#payer").value = expense?.payer || $("#payer").value;
  updateConversion();
  renderPeoplePick();
}

function openExpenseSheet(id = null) {
  const trip = activeTrip();
  const expense = id ? trip.expenses.find((e) => e.id === id) : null;
  resetExpenseForm(expense);
  $("#sheet").showModal();
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
    return `<button type="button" data-id="${p.id}" class="${isOn ? "on" : ""}" ${disabled ? "disabled" : ""}>${p.name}</button>`;
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
  const validParticipants = selected.filter((id) => trip.people.some((p) => p.id === id));
  const invalidAmount = rawAmount === "" || Number.isNaN(amount) || amount <= 0;
  const firstInvalid = invalidAmount ? $("#amount") : !category ? $("#category") : !$("#payer").value ? $("#payer") : !validParticipants.length ? $("#peoplePick") : !title ? $("#item") : null;
  if (firstInvalid) return focusInvalid(firstInvalid);
  const nextExpense = { id: editingExpenseId || crypto.randomUUID(), title, category, amount, currency, rate: rates[currency], payer: $("#payer").value, participants: [...validParticipants], date: $("#expenseDate").value };
  if (editingExpenseId) {
    trip.expenses = trip.expenses.map((e) => e.id === editingExpenseId ? nextExpense : e);
  } else {
    trip.expenses.unshift(nextExpense);
  }
  editingExpenseId = null;
  saveTrips();
  $("#sheet").close();
  renderDetail();
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

function updateExpenseSaveState() {
  const trip = activeTrip();
  const rawAmount = $("#amount").value.trim();
  const amount = Number(rawAmount);
  const title = $("#item").value.trim();
  const hasPeople = selected.some((id) => trip?.people.some((p) => p.id === id));
  const invalidAmount = rawAmount === "" || Number.isNaN(amount) || amount <= 0;
  const disabled = invalidAmount || !title || !$("#category").value || !$("#payer").value || !hasPeople;
  $("#save").classList.toggle("soft-disabled", disabled);
  $("#saveTop").classList.toggle("soft-disabled", disabled);
}

function updateConversion() {
  const rawAmount = $("#amount").value.trim();
  const amount = Number(rawAmount || 0);
  const currency = $("#currency").value;
  $("#conversion").textContent = currency === "CNY" ? "" : `约 ${money((Number.isNaN(amount) ? 0 : amount) * rates[currency])}`;
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
$("#save").onclick = $("#saveTop").onclick = saveExpense;
$("#category").onchange = () => {
  if ($("#category").value === "借用") selected = [];
  renderPeoplePick();
  updateExpenseSaveState();
};
$("#payer").onchange = () => {
  renderPeoplePick();
  updateExpenseSaveState();
};
$("#item").oninput = updateExpenseSaveState;
$("#amount").oninput = () => {
  updateConversion();
  updateExpenseSaveState();
};
$("#currency").onchange = () => {
  updateConversion();
  updateExpenseSaveState();
};
$("#peoplePick").addEventListener("pointerup", (event) => {
  const button = event.target.closest("button");
  if (button) toggleParticipant(button);
});
$("#peoplePick").addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (button) {
    event.preventDefault();
    event.stopPropagation();
  }
});
saveTrips();
showHome();
if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js");
