"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const styles = fs.readFileSync(path.join(root, "styles-4.css"), "utf8");
const styles3 = fs.readFileSync(path.join(root, "styles-3.css"), "utf8");
const styles2 = fs.readFileSync(path.join(root, "styles-2.css"), "utf8");

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

test("INPUT과 OUTPUT을 붙여 배치하고 와이드에서는 2열로 비교한다", () => {
  assert.match(styles, /\.editor-grid\s*\{[^}]*gap:\s*0[^}]*border:\s*1px solid var\(--line-strong\)/s);
  assert.match(styles, /\.editor-pane \+ \.editor-pane\s*\{[^}]*border-top:/s);
  assert.match(styles, /--editor-height:\s*clamp\(290px,\s*34vh,\s*440px\)/);
  assert.match(styles, /min-height:\s*var\(--editor-height\)/);
  assert.doesNotMatch(styles3, /min-height:\s*clamp\(400px/);
  assert.match(styles, /\.validation-list\s*\{[^}]*max-height:\s*150px/s);
  assert.match(styles, /@media \(min-width: 1100px\) \{\s*\.editor-grid \{\s*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);/s);
  assert.match(styles, /\.editor-pane \+ \.editor-pane\s*\{[^}]*border-left:/s);
});

test("헤더에 빠른 뷰포트 선택기를 두지 않고 기준 설정에 프리셋만 사용한다", () => {
  assert.doesNotMatch(html, /data-editor-viewport/);
  assert.doesNotMatch(html, /editor-viewport-bar/);
  assert.doesNotMatch(styles, /editor-viewport/);
  assert.equal((html.match(/data-viewport=/g) || []).length, 7);
  assert.equal((html.match(/class="preset-chip"/g) || []).length, 7);
});

test("에디터 헤더에 제목·도구를 가로 한 줄로 병합한다", () => {
  assert.match(html, /class="editor-head-titles"/);
  assert.equal((html.match(/class="editor-head-titles"/g) || []).length, 2);
  assert.match(html, /<header class="editor-head">/);
  const inputHead = html.slice(html.indexOf('id="inputPane"'), html.indexOf('class="code-editor"'));
  assert.ok(inputHead.indexOf("editor-viewport-bar") === -1, "INPUT 헤더에 뷰포트 바가 없어야 한다");
  assert.ok(inputHead.indexOf("editor-tools") !== -1, "INPUT 헤더에 도구가 포함되어야 한다");
  assert.match(styles, /\.editor-pane \.editor-head \{\s*display: flex;\s*flex-wrap: wrap;/s);
  assert.match(styles, /\.editor-head-titles \{/);
  assert.match(styles, /\.editor-head \.editor-tools \{/);
});

test("서체 크기는 10px 이상을 유지한다", () => {
  const fontSizes = [...styles.matchAll(/font-size:\s*(\d+)px/g), ...styles3.matchAll(/font-size:\s*(\d+)px/g), ...styles2.matchAll(/font-size:\s*(\d+)px/g)]
    .map((match) => Number(match[1]));
  assert.ok(fontSizes.length > 0);
  for (const size of fontSizes) {
    assert.ok(size >= 10, `font-size ${size}px is below 10px`);
  }
});
