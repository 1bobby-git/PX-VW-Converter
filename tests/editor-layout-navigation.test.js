"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const app = fs.readFileSync(path.join(root, "app-ui.js"), "utf8");
const coreSrc = fs.readFileSync(path.join(root, "converter-core.js"), "utf8");
const styles1 = fs.readFileSync(path.join(root, "styles-1.css"), "utf8");
const styles2 = fs.readFileSync(path.join(root, "styles-2.css"), "utf8");
const styles3 = fs.readFileSync(path.join(root, "styles-3.css"), "utf8");
const styles4 = fs.readFileSync(path.join(root, "styles-4.css"), "utf8");

test("검증 요약을 버튼으로 제공하고 첫 오류·경고 위치로 이동한다", () => {
  assert.match(html, /<button class="validation-head validation-jump" id="validationJump" type="button" disabled/);
  assert.match(app, /validationJump: byId\("validationJump"\)/);
  assert.match(app, /elements\.validationJump\.disabled = !primaryIssue/);
  assert.match(app, /elements\.validationJump\.addEventListener\("click"/);
  assert.match(app, /focusValidationIssue\(elements\.validationJump\)/);
  assert.match(app, /클릭하면 첫 경고 위치로 이동합니다/);
});

test("페이지와 CSS 편집기는 기본 세로·와이드 2열 레이아웃을 사용한다", () => {
  assert.match(styles1, /\.app-shell \{\s*width: 100%;\s*max-width: none;/s);
  assert.match(styles2, /\.editor-grid \{\s*display: grid;\s*grid-template-columns: minmax\(0, 1fr\);/s);
  assert.doesNotMatch(styles2, /\.editor-grid \{[^}]*repeat\(2, minmax\(0, 1fr\)\)/s);
  assert.match(styles4, /@media \(min-width: 1100px\)/);
  assert.match(styles4, /@media \(min-width: 1100px\) \{\s*\.editor-grid \{\s*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);/s);
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

test("탭 문자를 시각 열 기준으로 계산해 커서와 점프 위치를 맞춘다", () => {
  assert.match(coreSrc, /function normalizeTabSize\(tabSize\)/);
  assert.match(coreSrc, /function countVisualColumns\(text, tabSize\)/);
  assert.match(coreSrc, /column \+= size - \(column % size\)/);
  assert.match(coreSrc, /countVisualColumns: countVisualColumns/);
  assert.match(coreSrc, /normalizeTabSize: normalizeTabSize/);
  assert.match(app, /function getEditorTabSize\(\)/);
  assert.match(app, /function measureEditorCharWidth\(\)/);
  assert.match(app, /core\.countVisualColumns\(before\.slice\(lineStart\), getEditorTabSize\(\)\) \+ 1/);
  assert.match(app, /core\.countVisualColumns\(textBefore\.slice\(lineStart\), getEditorTabSize\(\)\)/);
  assert.match(app, /tabSize: getEditorTabSize\(\)/);
  assert.doesNotMatch(app, /before\.slice\(lineStart\)\.replace\(\\t/g);
});

test("탭 정지 기반 시각 열 계산이 정확하다", () => {
  global.window = global;
  delete require.cache[require.resolve("../converter-core.js")];
  require("../converter-core.js");
  const core = global.PXVWCore;

  assert.equal(core.normalizeTabSize(undefined), 2);
  assert.equal(core.normalizeTabSize(0), 2);
  assert.equal(core.normalizeTabSize(4), 4);
  assert.equal(core.normalizeTabSize(99), 16);
  assert.equal(core.countVisualColumns("", 2), 0);
  assert.equal(core.countVisualColumns("ab", 2), 2);
  assert.equal(core.countVisualColumns("\t", 2), 2);
  assert.equal(core.countVisualColumns("a\t", 2), 2);
  assert.equal(core.countVisualColumns("ab\t", 2), 4);
  assert.equal(core.countVisualColumns("abc\t", 2), 4);
  assert.equal(core.countVisualColumns("\t\t", 2), 4);
  assert.equal(core.countVisualColumns("a\tb", 4), 5);
});
