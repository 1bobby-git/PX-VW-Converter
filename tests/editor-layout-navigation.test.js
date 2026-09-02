"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const app = fs.readFileSync(path.join(root, "app-ui.js"), "utf8");
const styles1 = fs.readFileSync(path.join(root, "styles-1.css"), "utf8");
const styles2 = fs.readFileSync(path.join(root, "styles-2.css"), "utf8");
const styles3 = fs.readFileSync(path.join(root, "styles-3.css"), "utf8");

test("검증 요약을 버튼으로 제공하고 첫 오류·경고 위치로 이동한다", () => {
  assert.match(html, /<button class="validation-head validation-jump" id="validationJump" type="button" disabled/);
  assert.match(app, /validationJump: byId\("validationJump"\)/);
  assert.match(app, /elements\.validationJump\.disabled = !primaryIssue/);
  assert.match(app, /elements\.validationJump\.addEventListener\("click"/);
  assert.match(app, /focusValidationIssue\(elements\.validationJump\)/);
  assert.match(app, /클릭하면 첫 경고 위치로 이동합니다/);
});

test("페이지와 CSS 편집기가 전체 폭의 세로 레이아웃을 사용한다", () => {
  assert.match(styles1, /\.app-shell \{\s*width: 100%;\s*max-width: none;/s);
  assert.match(styles2, /\.editor-grid \{\s*display: grid;\s*grid-template-columns: minmax\(0, 1fr\);/s);
  assert.doesNotMatch(styles2, /\.editor-grid \{[^}]*repeat\(2, minmax\(0, 1fr\)\)/s);
});

test("입력과 출력은 긴 줄을 자동 개행하지 않고 가로 스크롤한다", () => {
  assert.match(html, /<textarea id="cssInput" wrap="off"/);
  assert.match(html, /<textarea id="cssOutput" wrap="off"/);
  assert.match(styles3, /textarea \{[^}]*white-space: pre;[^}]*overflow-wrap: normal;/s);
  assert.match(styles3, /\.code-editor-highlight \{[^}]*white-space: pre;[^}]*overflow-wrap: normal;/s);
  assert.match(app, /Math\.max\(elements\.cssInput\.scrollWidth, elements\.cssInput\.clientWidth\)/);
});

test("편집기 가독성과 행·열 위치 안내를 제공한다", () => {
  assert.match(html, /id="cursorPosition">1행 1열</);
  assert.match(app, /function updateCursorPosition\(\)/);
  assert.match(app, /elements\.cursorPosition\.textContent = line \+ "행 " \+ column \+ "열"/);
  assert.match(app, /elements\.cssInput\.scrollLeft = Math\.max/);
  assert.match(styles3, /font-size: 14px;/);
  assert.match(styles3, /\.cursor-position \{/);
});
