(() => {
  const tripKey = "yiqizou-trips";
  const activeKey = "yiqizou-active-trip";
  const readTrips = () => JSON.parse(localStorage.getItem(tripKey) || "[]");
  const writeTrips = (trips) => localStorage.setItem(tripKey, JSON.stringify(trips));
  const isDemoTrip = (trip) => trip?.demo || (trip?.name === "东京朋友旅行" && trip?.expenses?.some((e) => e.title === "BB借钱给TT"));

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
    addDemoMarks();
    enhanceSwipeDelete();
  }

  new MutationObserver(enhance).observe(document.body, { childList: true, subtree: true });
  enhance();
})();
