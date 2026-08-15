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
    if (!trip || !confirm(`删除旅行「${trip.name}」？里面的账单也会一起删除。`)) return;
    const next = trips.filter((t) => t.id !== id);
    writeTrips(next);
    if (localStorage.getItem(activeKey) === id) localStorage.setItem(activeKey, next[0]?.id || "");
    location.reload();
  }

  function deleteExpense(id) {
    const trips = readTrips();
    const activeId = localStorage.getItem(activeKey) || trips[0]?.id;
    const trip = trips.find((t) => t.id === activeId);
    const expense = trip?.expenses?.find((e) => e.id === id);
    if (!trip || !expense || !confirm(`删除这条账单「${expense.title}」？`)) return;
    trip.expenses = trip.expenses.filter((e) => e.id !== id);
    writeTrips(trips);
    location.reload();
  }

  function enhance() {
    addDemoMarks();
    enhanceSwipeDelete();
  }

  new MutationObserver(enhance).observe(document.body, { childList: true, subtree: true });
  enhance();
})();
