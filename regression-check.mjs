import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = new URL(".", import.meta.url).pathname;
const read = (name) => readFileSync(join(root, name), "utf8");
const html = read("index.html");
const js = read("app.js");
const css = read("style.css");
const sw = read("sw.js");
const manifest = JSON.parse(read("manifest.webmanifest"));

const has = (source, needle, label = needle) => {
  assert.ok(source.includes(needle), `缺少：${label}`);
};

// 品牌、首页与 PWA。
has(html, "好友记 好游记 游玩算账更轻易", "品牌副标题");
has(html, "assets/brand/tt-transfer.svg", "顶部 Logo");
for (const banner of ["multi-currency", "participants", "borrow", "settlement", "personal-stats"]) {
  has(html, `assets/banners/${banner}.jpg`, `${banner} banner`);
}
has(html, "Add to Home Screen", "Safari 添加到主屏幕提示");
assert.equal(manifest.name, "好友记");
assert.equal(manifest.short_name, "好友记");
has(JSON.stringify(manifest), "assets/brand/app-icon-192.png", "PWA 图标");
has(sw, "haoyouji-v27", "缓存版本");
assert.ok(!`${html}\n${sw}\n${js}`.includes("v=26"), "仍残留旧缓存版本 v26");

// 新建旅行与记一笔的历史交互约束。
has(html, '<button id="newTrip" class="fab">＋ 新建旅行</button>', "固定新建旅行按钮");
has(html, '<button id="add" class="fab">＋ 记一笔</button>', "固定记一笔按钮");
has(html, "选择开始和结束日期", "单组日期范围选择");
has(html, "例如：tt bb qq xw", "空格昵称示例");
has(html, "支持英文逗号和中文逗号", "昵称分隔提示");
has(css, "font-size:16px", "iOS 输入不自动放大");
has(css, "height:44px", "紧凑日期输入高度");
has(js, "amount <= 0", "金额必须大于 0");
has(js, "updateConversion();", "金额输入即时换算");
has(js, "selected = [];", "借用场景默认不选择参与人");
has(js, "[payerId, ...selected]", "非借用自动包含付款人");
has(js, 'target.matches("[data-all]")', "参与人可切回全部");
has(js, "focusInvalid", "首个未填项滚动并聚焦");

// 币种、汇率与统计。
for (const code of ["CNY", "USD", "JPY", "KRW", "SGD", "MYR", "THB", "GBP", "EUR"]) {
  has(html, `<option>${code}</option>`, `${code} 币种`);
}
has(html, "兑人民币汇率", "汇率字段标题");
has(html, "单笔或批量的汇率调整", "汇率说明");
has(js, "saveRateBatch", "批量汇率更新");
has(html, "rate-policy.js?v=27", "独立汇率策略模块");
has(js, "preferredTripRate", "项目级汇率复用");
has(js, "recordSingleRate", "单笔汇率记忆");
has(js, "recordBatchRate", "批量汇率优先记录");
has(js, "expense ? rateOf(expense) : preferredTripRate", "编辑旧账单保留自身历史汇率");
has(js, '$("#currency").onchange', "新建和编辑切换币种统一读取项目汇率");
has(js, "个人消费金额总计", "个人统计总额文案");
has(css, ".stat-card summary strong.stat-total", "个人统计总额强化样式");

// 列表、结算、删除和返回。
assert.ok(html.indexOf('id="transfers"') < html.indexOf('id="balances"'), "最少转账方案必须在应收应付明细上方");
has(js, "请您确认是否删除", "自定义删除确认标题");
has(js, "setupSwipeRows", "左滑删除手势");
has(css, ".delete-action{", "删除按钮默认隐藏样式");
has(css, "pointer-events:none", "删除按钮默认不可点击");
has(js, "initDetailSwipeBack", "详情页右滑返回");
assert.ok(!js.includes('closest(".swipe-row,button'), "右滑返回不能排除账单卡片");
has(js, "showHome();", "右滑返回首页动作");
has(js, "示例数据，可删除", "示例数据标签");
has(js, "好友记 · 旅行结算单", "分享结算单品牌标题");
has(js, "drawShareLogo", "分享图片 Logo");
has(js, "finiteNumber", "历史异常金额兼容");

for (const asset of [
  "assets/brand/tt-transfer.svg",
  "assets/brand/app-icon-180.png",
  "assets/brand/app-icon-192.png",
  "assets/brand/app-icon-512.png",
  "assets/banners/multi-currency.jpg",
  "assets/banners/participants.jpg",
  "assets/banners/borrow.jpg",
  "assets/banners/settlement.jpg",
  "assets/banners/personal-stats.jpg",
  "rate-policy.js",
]) assert.ok(existsSync(join(root, asset)), `资源不存在：${asset}`);

console.log("好友记全量交互契约检查通过");
