"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const app = fs.readFileSync(path.join(root, "app-ui.js"), "utf8");
const styles = ["styles-1.css", "styles-2.css", "styles-3.css"]
  .map((file) => fs.readFileSync(path.join(root, file), "utf8"))
  .join("\n");

test("요청한 뷰포트 프리셋만 순서대로 제공하고 320을 기본값으로 사용한다", () => {
  const presets = [...html.matchAll(/data-viewport="(\d+)"/g)].map((match) => Number(match[1]));
  assert.deepEqual(presets, [320, 360, 800, 801, 1100, 1440, 1920]);
  assert.match(html, /id="viewportWidth"[^>]*value="320"/);
});

test("화이트 모드만 제공하며 테마 전환 코드를 포함하지 않는다", () => {
  assert.match(html, /name="color-scheme" content="light"/);
  assert.doesNotMatch(html, /themeToggle|icon-moon|icon-sun|data-theme/);
  assert.doesNotMatch(app, /toggleTheme|setTheme|THEME_KEY/);
  assert.doesNotMatch(styles, /data-theme\s*=|prefers-color-scheme:\s*dark/);
  assert.match(styles, /color-scheme:\s*light/);
});

test("양쪽 단일 변환 폼 높이를 동일하게 유지한다", () => {
  assert.match(styles, /\.converter-grid\s*\{[^}]*align-items:\s*stretch/s);
  assert.match(styles, /\.converter-card\s*\{[^}]*height:\s*100%/s);
  assert.match(styles, /\.large-control,\s*\.large-control input\s*\{[^}]*height:\s*60px/s);
});

test("CSS 입력은 실시간 처리되고 문법 검사 UI가 제공된다", () => {
  assert.match(app, /cssInput\.addEventListener\("input",\s*scheduleLivePipeline\)/);
  assert.match(app, /requestAnimationFrame/);
  assert.doesNotMatch(app, /LIVE_UPDATE_DELAY|setTimeout\(function \(\) \{\s*runLivePipeline/);
  assert.doesNotMatch(html, /id="autoConvert"/);
  assert.match(html, /id="cssValidation"/);
  assert.match(html, /id="validationList"/);
  assert.match(html, /id="realtimeStatus"/);
  assert.match(app, /validateCssSyntax/);
});

test("HTML이 참조하는 정적 자산이 모두 존재한다", () => {
  const assets = [...html.matchAll(/(?:href|src)="\.\/([^"?#]+)"/g)].map((match) => match[1]);
  assets.forEach((asset) => {
    assert.equal(fs.existsSync(path.join(root, asset)), true, `누락된 자산: ${asset}`);
  });
});
