(() => {
  document.documentElement.dataset.yiqizouUiFixes = "safe-v18";

  document.addEventListener("click", (event) => {
    if (event.target.closest(".swipe-row")) return;
    document.querySelectorAll(".swipe-row.open").forEach((row) => row.classList.remove("open"));
  });
})();
