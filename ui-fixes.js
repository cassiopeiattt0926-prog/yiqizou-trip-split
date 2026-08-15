(() => {
  const tripKey = "yiqizou-trips";
  const activeKey = "yiqizou-active-trip";
  const readTrips = () => JSON.parse(localStorage.getItem(tripKey) || "[]");
  const writeTrips = (trips) => localStorage.setItem(tripKey, JSON.stringify(trips));
  const extraCurrencies = ["SGD", "MYR", "THB", "GBP"];
  const extraRates = { SGD: 5.58, MYR: 1.68, THB: 0.22, GBP: 9.18 };

  function injectStyles() {
    if (document.getElementById("yiqizou-safe-ui-fixes")) return;
    const style = document.createElement("style");
    style.id = "yiqizou-safe-ui-fixes";
    style.textContent = `
      html{-webkit-text-size-adjust:100%;touch-action:pan-y}
      dialog{max-height:calc(100dvh - 10px);overflow-y:auto;padding-bottom:calc(22px + env(safe-area-inset-bottom))}
      dialog label,.date-group{margin-top:10px}
      dialog input,dialog select,dialog textarea{font-size:16px!important;box-sizing:border-box}
      dialog input,dialog select{height:44px!important;min-height:44px!important;padding:8px 12px!important;line-height:1.2!important}
      .date-range-button,#sheet #expenseDate{height:44px!important;min-height:44px!important;padding:8px 12px!important;line-height:1.2!important;text-align:center;display:flex;align-items:center;justify-content:center;box-sizing:border-box}
      .wide{margin-top:14px;padding-top:14px;padding-bottom:14px}
      #sheet label{margin-top:9px}
      #sheet .amount-row input{font-size:36px!important}
      .field-tip{display:block;margin-top:6px;color:#98a49d;font-size:10px;line-height:1.45}
      .stat-card summary{gap:10px}
      .stat-card summary strong.stat-total{font-size:22px!important;color:#174f3a!important;font-weight:900!important;white-space:nowrap;margin-left:auto}
      .stat-card summary strong.stat-action{font-size:13px!important;color:#174f3a!important;font-weight:900!important;margin-left:8px}
      .fab{z-index:75!important;bottom:calc(28px + env(safe-area-inset-bottom))!important}
      .demo-badge{display:inline-flex;margin-left:8px;padding:2px 7px;border-radius:999px;background:#fff1ed;color:#f36b50;font-size:12px;vertical-align:middle}
      .swipe-wrap{position:relative;overflow:hidden;background:#d83b2d;border-radius:28px;touch-action:pan-y;margin:0}
      .swipe-wrap+.swipe-wrap{border-top:1px solid rgba(24,43,34,.08)}
      .swipe-wrap>.swipe-card{position:relative;z-index:1;width:100%;transition:transform .18s ease;background:#fff;will-change:transform}
      .swipe-wrap.open>.swipe-card{transform:translateX(-86px)}
      .swipe-wrap>.delete-action{position:absolute;right:0;top:0;bottom:0;width:86px;border:0;background:#d83b2d;color:#fff;font-weight:900;font-size:16px;display:grid;place-items:center;z-index:0}
      .swipe-wrap:not(.open)>.delete-action{pointer-events:none}
      .app-confirm-mask{position:fixed;inset:0;z-index:80;display:grid;place-items:center;padding:24px;background:rgba(18,28,24,.42);backdrop-filter:blur(8px)}
      .app-confirm{width:min(320px,calc(100vw - 48px));border-radius:26px;background:rgba(255,255,252,.96);box-shadow:0 24px 70px rgba(0,0,0,.22);padding:24px;text-align:center}
      .app-confirm h3{font-size:22px;margin:0 0 10px}.app-confirm p{margin:0;color:#68746f;line-height:1.5}
      .app-confirm-actions{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:22px}.app-confirm button{height:48px;border:0;border-radius:18px;font-weight:900;font-size:16px}
      .app-confirm-cancel{background:#eef2ed;color:#0d5b42}.app-confirm-delete{background:#e85c42;color:#fff}
    `;
    document.head.appendChild(style);
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (ch) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[ch]));
  }

  function showConfirm({ title, message, confirmText, onConfirm }) {
    document.querySelector(".app-confirm-mask")?.remove();
    const mask = document.createElement("div");
    mask.className = "app-confirm-mask";
    mask.innerHTML = `<div class="app-confirm" role="dialog" aria-modal="true"><h3>${escapeHtml(title)}</h3><p>${escapeHtml(message)}</p><div class="app-confirm-actions"><button type="button" class="app-confirm-cancel">取消</button><button type="button" class="app-confirm-delete">${escapeHtml(confirmText || "确认删除")}</button></div></div>`;
    document.body.appendChild(mask);
    const close = () => mask.remove();
    mask.addEventListener("click", (event) => { if (event.target === mask) close(); });
    mask.querySelector(".app-confirm-cancel").onclick = close;
    mask.querySelector(".app-confirm-delete").onclick = () => { close(); onConfirm?.(); };
  }

  function addCurrencies() {
    const select = document.getElementById("currency");
    if (!select || select.dataset.extraCurrenciesReady) return;
    select.dataset.extraCurrenciesReady = "1";
    const existing = new Set([...select.options].map((option) => option.value));
    const eur = [...select.options].find((option) => option.value === "EUR");
    extraCurrencies.forEach((currency) => {
      if (existing.has(currency)) return;
      const option = document.createElement("option");
      option.value = currency;
      option.textContent = currency;
      select.insertBefore(option, eur || null);
    });
    select.addEventListener("change", () => {
      const rateInput = document.getElementById("rateInput");
      if (rateInput && extraRates[select.value]) {
        rateInput.value = extraRates[select.value];
        rateInput.dispatchEvent(new Event("input", { bubbles: true }));
        rateInput.dispatchEvent(new Event("change", { bubbles: true }));
      }
    });
  }

  function fixCopyAndLayout() {
    const rateLabel = document.getElementById("rateField");
    if (rateLabel) {
      [...rateLabel.childNodes].forEach((node) => {
        if (node.nodeType === Node.TEXT_NODE && node.textContent.includes("历史兑人民币汇率")) node.textContent = node.textContent.replace("历史兑人民币汇率", "兑人民币汇率");
      });
      if (!rateLabel.querySelector(".field-tip")) rateLabel.insertAdjacentHTML("beforeend", '<small class="field-tip">该汇率与实际有误差，您可在旅行结束后依据实际消费汇率进行单笔或批量的汇率调整</small>');
    }
    const billsHint = document.querySelector("#bills .hint");
    if (billsHint) billsHint.textContent = "外币支付的人民币金额按录入时汇率估算，您可在旅行结束后依据实际消费汇率进行单笔或批量的汇率调整，调整后为您更新准确的人民币金额。";

    const settle = document.getElementById("settle");
    const balances = document.getElementById("balances");
    const transfers = document.getElementById("transfers");
    if (settle && balances && transfers) {
      const head = settle.querySelector(".section-head") || settle.querySelector("h2")?.parentElement;
      let divider = settle.querySelector(".divider[data-auto-detail]") || settle.querySelector(".divider");
      if (!divider) divider = document.createElement("div");
      divider.className = "divider";
      divider.dataset.autoDetail = "1";
      divider.innerHTML = "<span>应收应付明细</span>";
      if (head) {
        if (head.nextSibling !== transfers) settle.insertBefore(transfers, head.nextSibling);
        if (transfers.nextSibling !== divider) settle.insertBefore(divider, transfers.nextSibling);
        if (divider.nextSibling !== balances) settle.insertBefore(balances, divider.nextSibling);
      }
    }

    document.querySelectorAll(".stat-card summary").forEach((summary) => {
      const text = summary.querySelector("div span");
      const match = text?.textContent.match(/个人消费\s*(¥[\d,.]+)/);
      if (!match) return;
      text.textContent = "个人消费金额总计";
      let total = summary.querySelector(".stat-total");
      if (!total) {
        total = document.createElement("strong");
        total.className = "stat-total";
        const action = [...summary.querySelectorAll("strong")].find((el) => el.textContent.includes("明细"));
        if (action) {
          action.classList.add("stat-action");
          summary.insertBefore(total, action);
        } else {
          summary.appendChild(total);
        }
      }
      total.textContent = match[1];
    });
  }

  function addDemoMarks() {
    const trips = readTrips();
    document.querySelectorAll(".trip-card[data-id]").forEach((card) => {
      const trip = trips.find((t) => t.id === card.dataset.id);
      const demo = trip?.demo || (trip?.name === "东京朋友旅行" && trip?.expenses?.length);
      if (!demo || card.querySelector(".demo-badge")) return;
      card.querySelector("b")?.insertAdjacentHTML("beforeend", '<span class="demo-badge">示例 · 示例数据，可删除</span>');
    });
  }

  function removeBrokenSwipeMarkup() {
    document.querySelectorAll(".trip-card.swipe-row,.expense.swipe-row,.trip-card.swipe-content,.expense.swipe-content").forEach((row) => {
      row.querySelectorAll(":scope > .delete-action").forEach((btn) => btn.remove());
      row.classList.remove("swipe-row", "swipe-content", "open");
      delete row.dataset.swipeReady;
    });
  }

  function wrapSwipeCard(card, kind, id) {
    if (!card || card.closest(".swipe-wrap")) return;
    const wrap = document.createElement("div");
    wrap.className = "swipe-wrap";
    card.parentNode.insertBefore(wrap, card);
    wrap.appendChild(card);
    card.classList.add("swipe-card");
    const button = document.createElement("button");
    button.className = "delete-action";
    button.type = "button";
    button.textContent = "删除";
    wrap.appendChild(button);

    let startX = 0;
    let startY = 0;
    wrap.addEventListener("touchstart", (e) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    }, { passive: true });
    wrap.addEventListener("touchend", (e) => {
      const dx = e.changedTouches[0].clientX - startX;
      const dy = e.changedTouches[0].clientY - startY;
      if (Math.abs(dx) < 28 || Math.abs(dx) < Math.abs(dy) * 1.25) return;
      document.querySelectorAll(".swipe-wrap.open").forEach((open) => { if (open !== wrap) open.classList.remove("open"); });
      wrap.classList.toggle("open", dx < 0);
    }, { passive: true });
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const trips = readTrips();
      if (kind === "trip") {
        const trip = trips.find((t) => t.id === id);
        if (!trip) return;
        showConfirm({ title:"请您确认是否删除", message:`「${trip.name}」和里面的账单都会删除。`, confirmText:"确认删除", onConfirm:()=>{ const next=trips.filter((t)=>t.id!==id); writeTrips(next); if(localStorage.getItem(activeKey)===id)localStorage.setItem(activeKey,next[0]?.id||""); location.reload(); } });
      } else {
        const activeId = localStorage.getItem(activeKey) || trips[0]?.id;
        const trip = trips.find((t) => t.id === activeId);
        const expense = trip?.expenses?.find((e) => e.id === id);
        if (!trip || !expense) return;
        showConfirm({ title:"请您确认是否删除", message:`删除这条账单「${expense.title}」？`, confirmText:"确认删除", onConfirm:()=>{ trip.expenses = trip.expenses.filter((e)=>e.id!==id); writeTrips(trips); location.reload(); } });
      }
    });
  }

  function addSwipeDelete() {
    removeBrokenSwipeMarkup();
    document.querySelectorAll(".trip-card[data-id]").forEach((card) => wrapSwipeCard(card, "trip", card.dataset.id));
    document.querySelectorAll(".expense[data-expense-id]").forEach((card) => wrapSwipeCard(card, "expense", card.dataset.expenseId));
  }

  function clearTripInvalid() {
    ["tripPeopleCount", "tripNicknames", "tripName"].forEach((id) => {
      const input = document.getElementById(id);
      if (!input || input.dataset.clearInvalidReady) return;
      input.dataset.clearInvalidReady = "1";
      input.addEventListener("input", () => input.classList.remove("invalid"));
      input.addEventListener("change", () => input.classList.remove("invalid"));
    });
  }

  function enhance() {
    injectStyles();
    addCurrencies();
    fixCopyAndLayout();
    addDemoMarks();
    addSwipeDelete();
    clearTripInvalid();
  }

  document.addEventListener("DOMContentLoaded", enhance);
  window.addEventListener("load", enhance);
  document.addEventListener("click", (event) => {
    if (!event.target.closest(".swipe-wrap")) document.querySelectorAll(".swipe-wrap.open").forEach((row) => row.classList.remove("open"));
    if (event.target.closest("button,[role='tab']")) setTimeout(enhance, 80);
  }, true);
  let tries = 0;
  const timer = setInterval(() => {
    enhance();
    tries += 1;
    if (tries >= 12) clearInterval(timer);
  }, 450);
})();
