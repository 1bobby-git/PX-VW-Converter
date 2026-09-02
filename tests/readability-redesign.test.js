"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const app = fs.readFileSync(path.join(root, "app-ui.js"), "utf8");
const styles = fs.readFileSync(path.join(root, "styles-4.css"), "utf8");

test("SUIT 가변 웹폰트와 가벼운 굵기 체계를 사용한다", () => {
  assert.match(html, /sun-typeface\/SUIT@2\/fonts\/variable\/woff2\/SUIT-Variable\.css/);
  assert.match(html, /href="\.\/styles-4\.css"/);
  assert.match(styles, /font-family:\s*"SUIT Variable"/);
  assert.match(styles, /font-weight:\s*650/);
  assert.doesNotMatch(styles, /font-weight:\s*900/);
});

test("그림자·그라데이션·라운드를 줄인 평면 디자인을 적용한다", () => {
  assert.match(styles, /--shadow-sm:\s*0 1px 2px/);
  assert.match(styles, /\.panel,\s*\.converter-card\s*\{[^}]*box-shadow:\s*none/s);
  assert.match(styles, /\.brand-mark\s*\{[^}]*background:\s*var\(--primary\)[^}]*box-shadow:\s*none/s);
  assert.match(styles, /\.button\.primary\s*\{[^}]*background:\s*var\(--primary\)[^}]*box-shadow:\s*none/s);
  assert.match(styles, /--radius-lg:\s*12px/);
  assert.doesNotMatch(styles, /(?:linear|radial)-gradient/);
});

test("INPUT과 OUTPUT을 붙여 배치하고 편집기 높이를 비교하기 좋게 줄인다", () => {
  assert.match(styles, /\.editor-grid\s*\{[^}]*gap:\s*0[^}]*border:\s*1px solid var\(--line-strong\)/s);
  assert.match(styles, /\.editor-pane \+ \.editor-pane\s*\{[^}]*border-top:/s);
  assert.match(styles, /min-height:\s*clamp\(290px,\s*34vh,\s*440px\)/);
  assert.match(styles, /\.validation-list\s*\{[^}]*max-height:\s*150px/s);
});

test("INPUT과 OUTPUT에 동기화된 빠른 뷰포트 선택기를 제공한다", () => {
  const groups = [...html.matchAll(/data-editor-viewport-group="(input|output)"/g)].map((match) => match[1]);
  const buttons = [...html.matchAll(/data-editor-viewport="(\d+)"/g)].map((match) => Number(match[1]));

  assert.deepEqual(groups, ["input", "output"]);
  assert.deepEqual(buttons, [
    320, 360, 800, 801, 1100, 1440, 1920,
    320, 360, 800, 801, 1100, 1440, 1920
  ]);
  assert.equal((html.match(/data-editor-viewport-current/g) || []).length, 2);
  assert.match(app, /editorViewportButtons:/);
  assert.match(app, /editorViewportCurrent:/);
  assert.match(app, /button\.dataset\.editorViewport/);
  assert.match(app, /elements\.editorViewportButtons\.forEach/);
  assert.match(app, /elements\.editorViewportCurrent\.forEach/);
  assert.match(styles, /\.editor-viewport-chip\[aria-pressed="true"\]/);
});
