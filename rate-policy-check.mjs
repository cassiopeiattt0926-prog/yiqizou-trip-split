import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const source = readFileSync(new URL("./rate-policy.js", import.meta.url), "utf8");
const context = {};
vm.createContext(context);
vm.runInContext(source, context);
const policy = context.HAOYOUJI_RATE_POLICY;
const defaults = { CNY: 1, USD: 7.18, JPY: 0.049, EUR: 7.85 };

const trip = { expenses: [] };
assert.equal(policy.preferredRate(trip, "USD", defaults), 7.18, "未记录币种应使用系统默认值");

trip.expenses.unshift({ currency: "USD", rate: 7.2 });
assert.equal(policy.preferredRate(trip, "USD", defaults), 7.2, "有历史账单时应使用最近一笔汇率");
trip.expenses.unshift({ currency: "USD", rate: 7.26 });
assert.equal(policy.preferredRate(trip, "USD", defaults), 7.26, "新账单汇率应覆盖较旧历史值");

policy.recordSingleRate(trip, "USD", 7.31, 100);
assert.equal(policy.preferredRate(trip, "USD", defaults), 7.31, "最新单笔修改应成为默认值");

policy.recordBatchRate(trip, "USD", 7.4, 200);
assert.equal(policy.preferredRate(trip, "USD", defaults), 7.4, "批量调整值应优先于单笔值");
policy.recordSingleRate(trip, "USD", 7.5, 300);
assert.equal(policy.preferredRate(trip, "USD", defaults), 7.4, "批量调整后再改单笔，不得改变后续默认值");
policy.recordBatchRate(trip, "USD", 7.6, 400);
assert.equal(policy.preferredRate(trip, "USD", defaults), 7.6, "再次批量调整应使用最新批量值");

const legacyTrip = {
  expenses: [
    { currency: "JPY", rate: 0.048, rateUpdatedAt: 100 },
    { currency: "JPY", rate: 0.051, rateUpdatedAt: 500 }
  ]
};
assert.equal(policy.preferredRate(legacyTrip, "JPY", defaults), 0.051, "有编辑时间时应按最后编辑时间取值");

const otherTrip = { expenses: [{ currency: "USD", rate: 6.9 }] };
assert.equal(policy.preferredRate(otherTrip, "USD", defaults), 6.9, "不同旅行项目的汇率状态必须隔离");
assert.equal(policy.preferredRate(otherTrip, "CNY", defaults), 1, "人民币汇率始终为 1");

console.log("好友记汇率优先级场景检查通过");
