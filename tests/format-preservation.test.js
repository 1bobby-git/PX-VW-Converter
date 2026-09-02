"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

global.window = global;
require("../converter-core.js");

const core = global.PXVWCore;

function pxToVwConfig() {
  return { direction: "px-vw", sourceUnit: "px", targetUnit: "vw" };
}

test("필터링해도 선택자, 중괄호, 탭, CRLF와 기존 빈 줄을 재정렬하지 않는다", () => {
  const source = "\r\n.card\r\n{\r\n\twidth : 320px ;\r\n\tcolor : red;\r\n\r\n\tpadding:16px\r\n}\r\n";
  const expected = "\r\n.card\r\n{\r\n\twidth : 320px ;\r\n\r\n\tpadding:16px\r\n}\r\n";

  const filtered = core.filterMatchingDeclarations(source, "px");

  assert.equal(filtered.text, expected);
  assert.equal(filtered.stats.keptDeclarations, 2);
  assert.equal(filtered.stats.removedDeclarations, 1);
});

test("한 줄 CSS는 줄바꿈을 새로 만들지 않고 대상 선언만 제거한다", () => {
  const source = ".card{width:320px;color:red;height:160px}";
  const filtered = core.filterMatchingDeclarations(source, "px");

  assert.equal(filtered.text, ".card{width:320px;height:160px}");
  assert.doesNotMatch(filtered.text, /\n/);
});

test("중첩 규칙과 사용자 지정 중괄호 배치를 원문 그대로 유지한다", () => {
  const source = [
    ".card {",
    "  width: 320px;",
    "  color: red;",
    "}",
    "@media (min-width: 800px) {",
    "  .card",
    "  { padding: 24px; display: grid; }",
    "}"
  ].join("\n");
  const expected = [
    ".card {",
    "  width: 320px;",
    "}",
    "@media (min-width: 800px) {",
    "  .card",
    "  { padding: 24px; }",
    "}"
  ].join("\n");

  assert.equal(core.filterMatchingDeclarations(source, "px").text, expected);
});

test("문법 오류가 있는 CSS는 필터가 임의로 재조립하지 않고 원문을 보존한다", () => {
  const source = ".card {\n  width: 320px;\n  color: red;\n";
  const validation = core.validateCssSyntax(source);
  const filtered = core.filterMatchingDeclarations(source, "px");

  assert.equal(validation.valid, false);
  assert.ok(validation.issues.some((issue) => issue.code === "unclosed-token"));
  assert.equal(filtered.text, source);
});

test("단위 치환은 필터 없이도 원문의 앞뒤 공백과 줄바꿈을 보존한다", () => {
  const source = "\r\n\t.card { width : 320px; }\r\n\r\n";
  const converted = core.scanAndTransformUnits(source, pxToVwConfig(), 320, 2, true, true);

  assert.equal(converted.text, "\r\n\t.card { width : 100vw; }\r\n\r\n");
});

test("주석, 문자열과 URL을 보존하면서 실제 수치만 변환한다", () => {
  const source = "/* 16px */\n.icon{content:'16px';background:url(icon-16px.svg);width:16px}";
  const converted = core.scanAndTransformUnits(source, pxToVwConfig(), 320, 2, true, true);

  assert.equal(converted.text, "/* 16px */\n.icon{content:'16px';background:url(icon-16px.svg);width:5vw}");
});

test("UI 결과도 앞뒤 공백과 마지막 줄바꿈을 임의로 제거하지 않는다", () => {
  const app = fs.readFileSync(path.join(__dirname, "..", "app-ui.js"), "utf8");

  assert.match(app, /cssOutput\.value = converted\.text;/);
  assert.doesNotMatch(app, /cssOutput\.value = converted\.text\.trim\(\)/);
});
