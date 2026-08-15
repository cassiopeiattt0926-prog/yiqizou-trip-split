(() => {
  const tripKey = "yiqizou-trips";
  const activeKey = "yiqizou-active-trip";
  const readTrips = () => JSON.parse(localStorage.getItem(tripKey) || "[]");
  const writeTrips = (trips) => localStorage.setItem(tripKey, JSON.stringify(trips));
  const isDemoTrip = (trip) => trip?.demo || (trip?.name === "东京朋友旅行" && trip?.expenses?.some((e) => e.title === "BB借钱给TT"));
  const extraCurrencies = ["SGD", "MYR", "THB", "GBP"];
  const extraRates = { SGD: 5.58, MYR: 1.68, THB: 0.22, GBP: 9.18 };
  const extraSymbols = { SGD: "S$", MYR: "RM", THB: "฿", GBP: "£" };

  function addDemoMarks() {
    const trips = readTrips();
    document.querySelectorAll(".trip-card").forEach((card) => {
      const id = card.dataset.id || card.closest("[data-trip-id]")?.dataset.tripId;
      const trip = trips.find((t) => t.id === id);
      if (!isDemoTrip(trip) || card.querySelector(".demo-badge")) return;
      const title = card.querySelector("b");
      const meta = card.querySelector("span");
      title?.insertAdjacentHTML("beforeend", '<span class="demo-badge">示例</span>');
      if (meta && !meta.textContent.includes("示例数据")) meta.textContent += " · 示例数据，可删除";
    });
  }

  function wrapSwipe(row, kind, id) {
    if (!row || row.closest(".swipe-row") || row.dataset.swipeReady) return;
    row.dataset.swipeReady = "1";
    const wrapper = document.createElement("article");
    wrapper.className = "swipe-row";
    wrapper.dataset[`${kind}Row`] = id;
    row.parentNode.insertBefore(wrapper, row);
    row.classList.add("swipe-content");
    wrapper.appendChild(row);
    const button = document.createElement("button");
    button.className = "delete-action";
    button.type = "button";
    button.textContent = "删除";
    button.onclick = (event) => {
      event.preventDefault();
      event.stopPropagation();
      kind === "trip" ? deleteTrip(id) : deleteExpense(id);
    };
    wrapper.appendChild(button);
    bindSwipe(wrapper);
  }

  function closeSwipeRows(except) {
    document.querySelectorAll(".swipe-row.open").forEach((row) => {
      if (row !== except) row.classList.remove("open");
    });
  }

  function bindSwipe(row) {
    let startX = 0;
    let startY = 0;
    let tracking = false;
    row.addEventListener("touchstart", (event) => {
      const touch = event.touches[0];
      startX = touch.clientX;
      startY = touch.clientY;
      tracking = true;
    }, { passive: true });
    row.addEventListener("touchmove", (event) => {
      if (!tracking) return;
      const touch = event.touches[0];
      const dx = touch.clientX - startX;
      const dy = touch.clientY - startY;
      if (Math.abs(dx) > 28 && Math.abs(dx) > Math.abs(dy) * 1.4) {
        if (dx < 0) {
          closeSwipeRows(row);
          row.classList.add("open");
        } else {
          row.classList.remove("open");
        }
        tracking = false;
      }
    }, { passive: true });
  }

  function enhanceSwipeDelete() {
    document.querySelectorAll(".trip-card[data-id]").forEach((row) => wrapSwipe(row, "trip", row.dataset.id));
    document.querySelectorAll(".expense[data-expense-id]").forEach((row) => wrapSwipe(row, "expense", row.dataset.expenseId));
    document.querySelectorAll(".swipe-row:not([data-bound])").forEach((row) => {
      row.dataset.bound = "1";
      bindSwipe(row);
    });
  }

  function deleteTrip(id) {
    const trips = readTrips();
    const trip = trips.find((t) => t.id === id);
    if (!trip) return;
    showConfirm({
      title: "请您确认是否删除",
      message: `「${trip.name}」和里面的账单都会删除。`,
      confirmText: "确认删除",
      onConfirm: () => {
        const next = trips.filter((t) => t.id !== id);
        writeTrips(next);
        if (localStorage.getItem(activeKey) === id) localStorage.setItem(activeKey, next[0]?.id || "");
        location.reload();
      }
    });
  }

  function deleteExpense(id) {
    const trips = readTrips();
    const activeId = localStorage.getItem(activeKey) || trips[0]?.id;
    const trip = trips.find((t) => t.id === activeId);
    const expense = trip?.expenses?.find((e) => e.id === id);
    if (!trip || !expense) return;
    showConfirm({
      title: "请您确认是否删除",
      message: `删除这条账单「${expense.title}」？`,
      confirmText: "确认删除",
      onConfirm: () => {
        trip.expenses = trip.expenses.filter((e) => e.id !== id);
        writeTrips(trips);
        location.reload();
      }
    });
  }

  function showConfirm({ title, message, confirmText, onConfirm }) {
    injectConfirmStyles();
    document.querySelector(".app-confirm-mask")?.remove();
    const mask = document.createElement("div");
    mask.className = "app-confirm-mask";
    mask.innerHTML = `
      <div class="app-confirm" role="dialog" aria-modal="true">
        <h3>${escapeHtml(title)}</h3>
        <p>${escapeHtml(message)}</p>
        <div class="app-confirm-actions">
          <button type="button" class="app-confirm-cancel">取消</button>
          <button type="button" class="app-confirm-delete">${escapeHtml(confirmText || "确认删除")}</button>
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

  function injectConfirmStyles() {
    if (document.getElementById("yiqizou-confirm-styles")) return;
    const style = document.createElement("style");
    style.id = "yiqizou-confirm-styles";
    style.textContent = `
      .app-confirm-mask{position:fixed;inset:0;z-index:80;display:grid;place-items:center;padding:24px;background:rgba(18,28,24,.42);backdrop-filter:blur(8px)}
      .app-confirm{width:min(320px,calc(100vw - 48px));border-radius:26px;background:rgba(255,255,252,.96);box-shadow:0 24px 70px rgba(0,0,0,.22);padding:24px;text-align:center}
      .app-confirm h3{font-size:22px;margin:0 0 10px}
      .app-confirm p{margin:0;color:#68746f;line-height:1.5}
      .app-confirm-actions{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:22px}
      .app-confirm button{height:48px;border:0;border-radius:18px;font-weight:900;font-size:16px}
      .app-confirm-cancel{background:#eef2ed;color:#0d5b42}
      .app-confirm-delete{background:#e85c42;color:#fff}
    `;
    document.head.appendChild(style);
  }

  function enhance() {
    enhanceExchangeCopyAndLayout();
    enhanceCurrencies();
    enhanceFloatingButtons();
    enhanceTripValidation();
    normalizeCurrencySymbols();
    addDemoMarks();
    enhanceSwipeDelete();
  }

  function enhanceExchangeCopyAndLayout() {
    injectExchangeLayoutStyles();
    const rateLabel = document.getElementById("rateField");
    if (rateLabel && !rateLabel.dataset.copyReady) {
      rateLabel.dataset.copyReady = "1";
      [...rateLabel.childNodes].forEach((node) => {
        if (node.nodeType === Node.TEXT_NODE && node.textContent.includes("历史兑人民币汇率")) {
          node.textContent = node.textContent.replace("历史兑人民币汇率", "兑人民币汇率");
        }
      });
      if (!rateLabel.querySelector(".field-tip")) {
        rateLabel.insertAdjacentHTML("beforeend", '<small class="field-tip">该汇率与实际有误差，您可在旅行结束后依据实际消费汇率进行单笔或批量的汇率调整</small>');
      }
    }

    const billsHint = document.querySelector("#bills .hint");
    if (billsHint) billsHint.textContent = "外币支付的人民币金额按录入时汇率估算，您可在旅行结束后依据实际消费汇率进行单笔或批量的汇率调整，调整后为您更新准确的人民币金额。";

    const settle = document.getElementById("settle");
    const balances = document.getElementById("balances");
    const transfers = document.getElementById("transfers");
    if (settle && balances && transfers && !settle.dataset.orderReady) {
      settle.dataset.orderReady = "1";
      const divider = settle.querySelector(".divider") || document.createElement("div");
      divider.className = "divider";
      divider.innerHTML = "<span>应收应付明细</span>";
      settle.insertBefore(transfers, balances);
      settle.insertBefore(divider, balances);
    } else {
      const dividerText = settle?.querySelector(".divider span");
      if (dividerText) dividerText.textContent = "应收应付明细";
    }

    document.querySelectorAll(".stat-card summary").forEach((summary) => {
      if (summary.dataset.totalReady) return;
      const info = summary.querySelector("div");
      const text = info?.querySelector("span");
      const match = text?.textContent.match(/个人消费\s*(¥[\d,.]+)/);
      if (!match) return;
      summary.dataset.totalReady = "1";
      text.textContent = "个人消费金额总计";
      const action = summary.querySelector("strong");
      action?.classList.add("stat-action");
      action?.insertAdjacentHTML("beforebegin", `<strong class="stat-total">${match[1]}</strong>`);
    });
  }

  function injectExchangeLayoutStyles() {
    if (document.getElementById("yiqizou-exchange-layout-styles")) return;
    const style = document.createElement("style");
    style.id = "yiqizou-exchange-layout-styles";
    style.textContent = `
      dialog{max-height:calc(100dvh - 10px);overflow-y:auto;padding-bottom:calc(22px + env(safe-area-inset-bottom))}
      dialog label,.date-group{margin-top:12px}
      dialog input,dialog select{min-height:44px;padding:10px 12px;line-height:1.25}
      .date-range-button{min-height:44px;padding:10px 12px}
      .wide{margin-top:16px;padding-top:14px;padding-bottom:14px}
      #sheet label{margin-top:10px}
      #sheet .amount-row input{font-size:36px}
      #sheet #expenseDate{height:42px;text-align:center}
      .field-tip{display:block;margin-top:6px;color:#98a49d;font-size:10px;line-height:1.45}
      .stat-card summary strong.stat-total{font-size:19px;color:#174f3a;white-space:nowrap}
      .stat-card summary strong.stat-action{font-size:11px;color:#174f3a}
    `;
    document.head.appendChild(style);
  }

  function enhanceCurrencies() {
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
      }
    });
    if (extraRates[select.value]) {
      const rateInput = document.getElementById("rateInput");
      if (rateInput && (!rateInput.value || Number(rateInput.value) === 1)) rateInput.value = extraRates[select.value];
    }
    normalizeCurrencySymbols();
  }

  function normalizeCurrencySymbols() {
    document.querySelectorAll(".amt span").forEach((span) => {
      Object.entries(extraSymbols).forEach(([currency, symbol]) => {
        if (span.textContent.includes(currency)) span.textContent = span.textContent.replace("undefined", symbol);
      });
    });
  }

  function enhanceFloatingButtons() {
    document.querySelectorAll(".fab").forEach((button) => {
      button.style.zIndex = "75";
      button.style.bottom = "calc(28px + env(safe-area-inset-bottom))";
    });
  }

  function enhanceTripValidation() {
    ["tripPeopleCount", "tripNicknames", "tripName"].forEach((id) => {
      const input = document.getElementById(id);
      if (!input || input.dataset.clearInvalidReady) return;
      input.dataset.clearInvalidReady = "1";
      input.addEventListener("input", () => input.classList.remove("invalid"));
    });
  }

  new MutationObserver(enhance).observe(document.body, { childList: true, subtree: true });
  enhance();
})();
