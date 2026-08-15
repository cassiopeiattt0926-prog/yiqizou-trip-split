(() => {
  document.documentElement.dataset.yiqizouUiFixes = "safe-v19";

  const extraRates = { SGD: 5.58, MYR: 1.68, THB: 0.22, GBP: 9.18 };
  const extraSymbols = { SGD: "S$", MYR: "RM", THB: "฿", GBP: "£" };

  try {
    Object.assign(rates, extraRates);
    Object.assign(symbols, extraSymbols);
  } catch {}

  injectStyleGuard();
  requestAnimationFrame(enhance);
  window.addEventListener("load", enhance);
  document.addEventListener("click", (event) => {
    if (event.target.closest(".swipe-row")) return;
    closeRows();
  });

  function enhance() {
    try {
      Object.assign(rates, extraRates);
      Object.assign(symbols, extraSymbols);
    } catch {}
    enhanceStatTotals();
    hardenSwipeRows();
  }

  function enhanceStatTotals() {
    document.querySelectorAll(".stat-card summary").forEach((summary) => {
      const total = summary.querySelector(".stat-total");
      if (total) return;
      const label = summary.querySelector("span");
      const amount = label?.textContent.match(/¥[\d,.]+/)?.[0];
      const action = summary.querySelector("strong");
      if (!amount || !action) return;
      label.textContent = "个人消费金额总计";
      const totalNode = document.createElement("strong");
      totalNode.className = "stat-total";
      totalNode.textContent = amount;
      action.className = "stat-action";
      action.textContent = "明细";
      summary.insertBefore(totalNode, action);
    });
  }

  function hardenSwipeRows() {
    document.querySelectorAll(".swipe-row").forEach((row) => {
      if (row.dataset.safeSwipeBound === "1") return;
      row.dataset.safeSwipeBound = "1";
      const content = row.querySelector(".swipe-content");
      if (!content) return;
      let sx = 0;
      let sy = 0;
      let lx = 0;
      let active = false;
      row.addEventListener("touchstart", (event) => {
        const touch = event.touches[0];
        sx = lx = touch.clientX;
        sy = touch.clientY;
        active = true;
      }, { passive: true });
      row.addEventListener("touchmove", (event) => {
        if (!active) return;
        const touch = event.touches[0];
        lx = touch.clientX;
        const dx = lx - sx;
        const dy = touch.clientY - sy;
        if (Math.abs(dx) < 10 || Math.abs(dx) < Math.abs(dy)) return;
        if (dx < 0) openRow(row);
        else row.classList.remove("open");
        active = false;
      }, { passive: true });
      row.addEventListener("touchend", () => {
        if (!active) return;
        const dx = lx - sx;
        if (dx < -10) openRow(row);
        if (dx > 8) row.classList.remove("open");
        active = false;
      }, { passive: true });
    });
  }

  function openRow(row) {
    closeRows(row);
    row.classList.add("open");
  }

  function closeRows(except) {
    document.querySelectorAll(".swipe-row.open").forEach((row) => {
      if (row !== except) row.classList.remove("open");
    });
  }

  function injectStyleGuard() {
    if (document.getElementById("yiqizou-safe-v19")) return;
    const style = document.createElement("style");
    style.id = "yiqizou-safe-v19";
    style.textContent = `
      .trip-list,.list{background:#fff!important;border:1px solid #e8eae4!important;border-radius:20px!important;overflow:hidden!important}
      .trip-list>.swipe-row,.list>.swipe-row{position:relative!important;overflow:hidden!important;border-bottom:1px solid #edf0ea!important;background:#fff!important}
      .trip-list>.swipe-row:last-child,.list>.swipe-row:last-child{border-bottom:0!important}
      .trip-list>.swipe-row.open,.list>.swipe-row.open{background:#e85c42!important}
      .swipe-content{position:relative!important;z-index:2!important;background:#fff!important;transition:transform .16s ease!important;touch-action:pan-y!important}
      .swipe-row.open>.swipe-content{transform:translateX(-86px)!important}
      .delete-action{position:absolute!important;top:0!important;right:0!important;bottom:0!important;width:86px!important;border:0!important;background:#e85c42!important;color:#fff!important;font-weight:900!important;z-index:1!important;visibility:hidden!important}
      .swipe-row.open>.delete-action{visibility:visible!important}
      .stat-card summary{display:grid!important;grid-template-columns:auto minmax(0,1fr) auto auto!important;align-items:center!important;gap:10px!important}
      .stat-card summary div{min-width:0!important}
      .stat-card summary .stat-total{font-size:24px!important;color:var(--green)!important;font-weight:900!important;white-space:nowrap!important;justify-self:end!important}
      .stat-card summary .stat-action{font-size:12px!important;color:var(--green)!important;font-weight:900!important}
      #sheet #expenseDate{height:44px!important;min-height:44px!important;padding:10px 12px!important;text-align:center!important}
    `;
    document.head.appendChild(style);
  }
})();