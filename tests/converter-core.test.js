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
    375,
    2,
    true,
    true
  );

  assert.equal(result.text, "width: 4.27vw; margin: -2.13vw 0;");
  assert.equal(result.count, 3);
});

test("VW 값을 PX로 변환한다", () => {
  const result = core.scanAndTransformUnits(
    "width: 4.27vw; gap: 6.4vw;",
    directionConfig("vw-px"),
    375,
    2,
    true,
    true
  );

  assert.equal(result.text, "width: 16.01px; gap: 24px;");
  assert.equal(result.count, 2);
});

test("주석, 문자열, URL 안의 값은 변환하지 않는다", () => {
  const source = '/* 16px */ .icon { content: "16px"; background: url("icon-16px.png"); width: 16px; }';
  const result = core.scanAndTransformUnits(
    source,
    directionConfig("px-vw"),
    375,
    2,
    true,
    true
  );

  assert.match(result.text, /\/\* 16px \*\//);
  assert.match(result.text, /content: "16px"/);
  assert.match(result.text, /url\("icon-16px\.png"\)/);
  assert.match(result.text, /width: 4\.27vw/);
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
    "@media (min-width: 768px) {",
    "  .card {",
    "    padding: 24px 16px;",
    "    display: grid;",
    "  }",
    "}"
  ].join("\n");

  const filtered = core.filterMatchingDeclarations(source, "px");

  assert.match(filtered.text, /\.card \{/);
  assert.match(filtered.text, /width: 320px;/);
  assert.match(filtered.text, /@media \(min-width: 768px\)/);
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
    375,
    2,
    true,
    true
  );

  assert.match(converted.text, /&:hover/);
  assert.match(converted.text, /translateX\(2\.13vw\)/);
  assert.match(converted.text, /@keyframes slide/);
  assert.match(converted.text, /translateX\(0\)/);
  assert.match(converted.text, /translateX\(26\.67vw\)/);
  assert.doesNotMatch(converted.text, /color:/);
});
