"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

global.window = global;
require("../converter-core.js");

const core = global.PXVWCore;

function directionConfig(direction) {
  if (direction === "vw-px") {
    return {
      direction: "vw-px",
      sourceUnit: "vw",
      targetUnit: "px"
    };
  }

  return {
    direction: "px-vw",
    sourceUnit: "px",
    targetUnit: "vw"
  };
}

test("숫자 형식은 불필요한 0과 음수 0을 제거한다", () => {
  assert.equal(core.formatNumber(4.2666666667, 2), "4.27");
  assert.equal(core.formatNumber(6.4, 4), "6.4");
  assert.equal(core.formatNumber(-0.00001, 2), "0");
});

test("PX 값을 VW로 변환한다", () => {
  const result = core.scanAndTransformUnits(
    "width: 16px; margin: -8px 0px;",
    directionConfig("px-vw"),
    320,
    2,
    true,
    true
  );

  assert.equal(result.text, "width: 5vw; margin: -2.5vw 0;");
  assert.equal(result.count, 3);
});

test("VW 값을 PX로 변환한다", () => {
  const result = core.scanAndTransformUnits(
    "width: 5vw; gap: 7.5vw;",
    directionConfig("vw-px"),
    320,
    2,
    true,
    true
  );

  assert.equal(result.text, "width: 16px; gap: 24px;");
  assert.equal(result.count, 2);
});

test("주석, 문자열, URL 안의 값은 변환하지 않는다", () => {
  const source = '/* 16px */ .icon { content: "16px"; background: url("icon-16px.png"); width: 16px; }';
  const result = core.scanAndTransformUnits(
    source,
    directionConfig("px-vw"),
    320,
    2,
    true,
    true
  );

  assert.match(result.text, /\/\* 16px \*\//);
  assert.match(result.text, /content: "16px"/);
  assert.match(result.text, /url\("icon-16px\.png"\)/);
  assert.match(result.text, /width: 5vw/);
  assert.equal(result.count, 1);
});

test("대상 단위가 없는 선언과 빈 규칙을 제거한다", () => {
  const source = [
    ".card {",
    "  width: 320px;",
    "  color: #334155;",
    "}",
    ".empty {",
    "  display: block;",
    "}",
    "@media (min-width: 800px) {",
    "  .card {",
    "    padding: 24px 16px;",
    "    display: grid;",
    "  }",
    "}"
  ].join("\n");

  const filtered = core.filterMatchingDeclarations(source, "px");

  assert.match(filtered.text, /\.card \{/);
  assert.match(filtered.text, /width: 320px;/);
  assert.match(filtered.text, /@media \(min-width: 800px\)/);
  assert.match(filtered.text, /padding: 24px 16px;/);
  assert.doesNotMatch(filtered.text, /color:/);
  assert.doesNotMatch(filtered.text, /display:/);
  assert.doesNotMatch(filtered.text, /\.empty/);
  assert.equal(filtered.stats.removedDeclarations, 3);
  assert.equal(filtered.stats.removedRules, 1);
});

test("중첩 규칙과 keyframes 안의 대상 단위를 유지하고 변환한다", () => {
  const source = [
    ".card {",
    "  width: 320px;",
    "  &:hover {",
    "    transform: translateX(8px);",
    "    color: red;",
    "  }",
    "}",
    "@keyframes slide {",
    "  from { transform: translateX(0px); }",
    "  to { transform: translateX(100px); }",
    "}"
  ].join("\n");

  const filtered = core.filterMatchingDeclarations(source, "px");
  const converted = core.scanAndTransformUnits(
    filtered.text,
    directionConfig("px-vw"),
    320,
    2,
    true,
    true
  );

  assert.match(converted.text, /&:hover/);
  assert.match(converted.text, /translateX\(2\.5vw\)/);
  assert.match(converted.text, /@keyframes slide/);
  assert.match(converted.text, /translateX\(0\)/);
  assert.match(converted.text, /translateX\(31\.25vw\)/);
  assert.doesNotMatch(converted.text, /color:/);
});

test("정상 CSS는 문법 오류 없이 통과한다", () => {
  const source = [
    ".card {",
    "  width: 320px;",
    "  padding: calc(100% - 16px);",
    "  &:hover { transform: translateX(8px); }",
    "}",
    "@media (min-width: 801px) {",
    "  .card { width: 640px; }",
    "}"
  ].join("\n");

  const result = core.validateCssSyntax(source);

  assert.equal(result.valid, true);
  assert.equal(result.errors, 0);
  assert.equal(result.warnings, 0);
  assert.equal(result.declarations.length, 4);
});

test("닫히지 않은 중괄호와 문자열의 위치를 검출한다", () => {
  const source = '.card {\n  width: 320px;\n  content: "text\n';
  const result = core.validateCssSyntax(source);

  assert.equal(result.valid, false);
  assert.ok(result.errors >= 2);
  assert.ok(result.issues.some((issue) => issue.code === "newline-in-string" || issue.code === "unclosed-string"));
  assert.ok(result.issues.some((issue) => issue.code === "unclosed-token"));
  assert.ok(result.issues.every((issue) => issue.line >= 1 && issue.column >= 1));
});

test("콜론과 세미콜론이 빠진 선언을 검출한다", () => {
  const source = [
    ".card {",
    "  width 320px;",
    "  height: 100px",
    "  margin: 10px;",
    "}"
  ].join("\n");
  const result = core.validateCssSyntax(source);

  assert.ok(result.issues.some((issue) => issue.code === "missing-colon"));
  assert.ok(result.issues.some((issue) => issue.code === "missing-semicolon"));
});

test("선언 검증 콜백으로 속성 오타 경고를 추가한다", () => {
  const source = ".card { widht: 320px; display: gird; }";
  const result = core.validateCssSyntax(source, {
    declarationValidator(declaration) {
      if (declaration.property === "widht") {
        return [{ severity: "warning", code: "unknown-property", target: "property", message: "width 오타 가능", suggestion: "width" }];
      }
      if (declaration.value === "gird") {
        return [{ severity: "warning", code: "unsupported-value", target: "value", message: "grid 오타 가능", suggestion: "grid" }];
      }
      return [];
    }
  });

  assert.equal(result.errors, 0);
  assert.equal(result.warnings, 2);
  assert.ok(result.issues.some((issue) => issue.suggestion === "width"));
  assert.ok(result.issues.some((issue) => issue.suggestion === "grid"));
});

test("!important 철자 오타를 오류와 수정 제안으로 검출한다", () => {
  const result = core.validateCssSyntax(".card { margin: 0 !imporant; }");
  const issue = result.issues.find((item) => item.code === "important-typo");

  assert.ok(issue);
  assert.equal(issue.severity, "error");
  assert.equal(issue.suggestion, "!important");
  assert.equal(issue.line, 1);
  assert.ok(issue.column > 1);
});

test("알 수 없는 @ 규칙은 오류가 아닌 경고로 안내한다", () => {
  const result = core.validateCssSyntax("@medai (min-width: 800px) { .card { width: 320px; } }");

  assert.equal(result.errors, 0);
  assert.equal(result.warnings, 1);
  assert.equal(result.issues[0].code, "unknown-at-rule");
});
