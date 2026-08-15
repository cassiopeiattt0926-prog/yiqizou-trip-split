(function attachRatePolicy(root) {
  const positiveRate = (value, fallback = 0) => {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? number : fallback;
  };

  function ensureRateSettings(trip) {
    if (!trip || typeof trip !== "object") return {};
    const source = trip.rateSettings && typeof trip.rateSettings === "object" ? trip.rateSettings : {};
    const normalized = {};
    Object.entries(source).forEach(([currency, value]) => {
      const setting = value && typeof value === "object" ? value : {};
      const batchRate = positiveRate(setting.batchRate);
      const singleRate = positiveRate(setting.singleRate);
      normalized[currency] = {
        ...(batchRate ? { batchRate } : {}),
        ...(singleRate ? { singleRate } : {}),
        batchUpdatedAt: Number(setting.batchUpdatedAt) || 0,
        singleUpdatedAt: Number(setting.singleUpdatedAt) || 0
      };
    });
    trip.rateSettings = normalized;
    return normalized;
  }

  function latestExpenseRate(trip, currency) {
    const rows = (trip?.expenses || []).filter((expense) => expense.currency === currency && positiveRate(expense.rate));
    if (!rows.length) return 0;
    const dated = rows.filter((expense) => Number(expense.rateUpdatedAt) > 0)
      .sort((a, b) => Number(b.rateUpdatedAt) - Number(a.rateUpdatedAt));
    return positiveRate((dated[0] || rows[0]).rate);
  }

  function preferredRate(trip, currency, defaults = {}) {
    if (currency === "CNY") return 1;
    const setting = ensureRateSettings(trip)[currency] || {};
    return positiveRate(setting.batchRate)
      || positiveRate(setting.singleRate)
      || latestExpenseRate(trip, currency)
      || positiveRate(defaults[currency], 1);
  }

  function recordSingleRate(trip, currency, rate, updatedAt = Date.now()) {
    if (!trip || !currency || currency === "CNY") return;
    const settings = ensureRateSettings(trip);
    settings[currency] = {
      ...(settings[currency] || {}),
      singleRate: positiveRate(rate, 1),
      singleUpdatedAt: Number(updatedAt) || Date.now()
    };
  }

  function recordBatchRate(trip, currency, rate, updatedAt = Date.now()) {
    if (!trip || !currency || currency === "CNY") return;
    const settings = ensureRateSettings(trip);
    settings[currency] = {
      ...(settings[currency] || {}),
      batchRate: positiveRate(rate, 1),
      batchUpdatedAt: Number(updatedAt) || Date.now()
    };
  }

  root.HAOYOUJI_RATE_POLICY = {
    ensureRateSettings,
    latestExpenseRate,
    preferredRate,
    recordSingleRate,
    recordBatchRate
  };
})(typeof globalThis !== "undefined" ? globalThis : window);
