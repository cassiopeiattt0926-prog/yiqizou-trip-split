const rates = { CNY: 1, JPY: 0.049, KRW: 0.0053, SGD: 5.58, MYR: 1.68, THB: 0.22, GBP: 9.18, USD: 7.18, EUR: 7.85 };
const symbols = { CNY: "¥", JPY: "¥", KRW: "₩", SGD: "S$", MYR: "RM", THB: "฿", GBP: "£", USD: "$", EUR: "€" };
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
  if (trip.startDate && trip.endDate) return `${trip.startDate} — ${trip.endDate}`;
  return trip.startDate || trip.endDate;
}

function renderHome() {
  $("#tripCount").textContent = `${trips.length} 个`;
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
    const text = transfers.map((x) => `${person(trip, x.from).name} → ${person(trip, x.to).name} ${money(x.n)}`).join("\n") || "已结清";
    try {
      if (navigator.share) await navigator.share({ title: `${trip.name}结算`, text });
      else if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        showToast("结算方案已复制");
      } else showToast("当前浏览器暂不支持分享");
    } catch (error) {
      if (error?.name !== "AbortError") showToast("分享未完成，请稍后再试");
    }
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
  return [...new Set(trip.expenses.filter((e) => e.currency === currency).map((e) => String(rateOf(e))))];
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
    return `<details class="stat-card">
      <summary>${avatar(p)}<div><b>${escapeHtml(p.name)}</b><span>个人消费金额总计</span></div><strong class="stat-total">${money(stat.total)}</strong></summary>
      <div class="cat-list">${cats.length ? cats.map(([cat, n]) => `<div><span>${icons[cat] || "✦"} ${escapeHtml(cat)}</span><b>${money(n)}</b><em>${stat.total ? Math.round(n / stat.total * 100) : 0}%</em></div>`).join("") : `<p class="empty">暂无消费</p>`}</div>
      <div class="mini-list">${stat.rows.map((e) => `<article><span>${icons[e.category] || "✦"}</span><div><b>${escapeHtml(e.title)}</b><small>${escapeHtml(e.date ? `${e.date} · ` : "")}${escapeHtml(e.category)}</small></div><strong>${money(e.share)}</strong></article>`).join("")}</div>
    </details>`;
  }).join("");
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
  $("#rateInput").value = expense?.rate || rates[$("#currency").value] || 1;
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
  const nextExpense = { id: editingExpenseId || crypto.randomUUID(), title, category, amount, currency, rate, payer: $("#payer").value, participants: [...validParticipants], date: $("#expenseDate").value };
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
    $("#rateInput").value = rates[currency] || 1;
  }
  updateConversion();
  updateExpenseSaveState();
}

function openRateSheet() {
  const trip = activeTrip();
  const currencies = usedForeignCurrencies(trip);
  $("#rateList").innerHTML = currencies.length ? currencies.map((currency) => {
    const history = rateHistory(trip, currency);
    const latest = history[history.length - 1] || rates[currency] || 1;
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
    trip.expenses.forEach((e) => {
      if (e.currency === currency) e.rate = rate;
    });
  });
  saveTrips();
  $("#rateSheet").close();
  renderDetail();
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
  $("#tripName").classList.remove("invalid");
  updateTripSaveState();
};
$("#tripPeopleCount").oninput = () => {
  $("#tripPeopleCount").classList.remove("invalid");
  syncAvatarDrafts();
  updateTripSaveState();
};
$("#tripNicknames").oninput = () => {
  $("#tripNicknames").classList.remove("invalid");
  syncAvatarDrafts();
  updateTripSaveState();
};
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
$("#item").oninput = updateExpenseSaveState;
$("#amount").oninput = () => {
  updateConversion();
  updateExpenseSaveState();
};
$("#currency").onchange = () => {
  $("#rateInput").value = rates[$("#currency").value] || 1;
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
saveTrips();
showHome();
if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js");
