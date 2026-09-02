"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

global.window = global;
require("../converter-core.js");

const core = global.PXVWCore;
const root = path.join(__dirname, "..");

test("필터가 출력에서 제외한 선언의 원본 위치를 반환한다", () => {
  const source = [
    ".card {",
    "  width: 320px;",
    "  color: red;",
    "  display: block;",
    "}",
    "@media (min-width: 800px) {",
    "  .card { padding: 24px; display: grid; }",
    "}"
  ].join("\n");

  const result = core.filterMatchingDeclarations(source, "px");
  const removed = result.removedRanges.map((range) => source.slice(range.start, range.end));

  assert.deepEqual(removed, ["color: red;", "display: block;", "display: grid;"]);
  assert.equal(result.stats.removedDeclarations, removed.length);
});

test("한 줄 CSS와 세미콜론이 없는 마지막 선언도 정확한 범위만 반환한다", () => {
  const inlineSource = ".card{width:320px;color:red;height:160px}";
  const inlineResult = core.filterMatchingDeclarations(inlineSource, "px");
  const trailingSource = ".card {\n  width: 10px;\n  color: red   \n}";
  const trailingResult = core.filterMatchingDeclarations(trailingSource, "px");

  assert.deepEqual(
    inlineResult.removedRanges.map((range) => inlineSource.slice(range.start, range.end)),
    ["color:red;"]
  );
  assert.deepEqual(
    trailingResult.removedRanges.map((range) => trailingSource.slice(range.start, range.end)),
    ["color: red"]
  );
});

test("CRLF와 탭을 사용한 원본에서도 강조 범위가 선언 본문과 일치한다", () => {
  const source = "\r\n.card\r\n{\r\n\twidth : 320px ;\r\n\tcolor : red;\r\n\r\n\tpadding:16px\r\n}\r\n";
  const result = core.filterMatchingDeclarations(source, "px");

  assert.deepEqual(
    result.removedRanges.map((range) => source.slice(range.start, range.end)),
    ["color : red;"]
  );
});

test("입력 편집기가 안전한 미러 레이어와 출력 제외 범례를 제공한다", () => {
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const app = fs.readFileSync(path.join(root, "app-ui.js"), "utf8");
  const styles = fs.readFileSync(path.join(root, "styles-3.css"), "utf8");

  assert.match(html, /id="cssInputEditor"/);
  assert.match(html, /id="cssInputHighlight"[^>]*aria-hidden="true"/);
  assert.match(html, /id="unconvertedLegend"/);
  assert.match(app, /filtered \? filtered\.removedRanges : \[\]/);
  assert.match(app, /document\.createTextNode/);
  assert.match(app, /className = "is-unconverted"/);
  assert.match(app, /addEventListener\("scroll", syncInputHighlightGeometry\)/);
  assert.doesNotMatch(app, /cssInputHighlight\.innerHTML/);
  assert.match(styles, /\.code-editor-highlight \.is-unconverted/);
  assert.match(styles, /color: var\(--danger\)/);
});
