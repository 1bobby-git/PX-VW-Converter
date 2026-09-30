"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

global.window = global;
require("../converter-core.js");

const core = global.PXVWCore;

function pxToVwConfig() {
  return { direction: "px-vw", sourceUnit: "px", targetUnit: "vw" };
}

function vwToPxConfig() {
  return { direction: "vw-px", sourceUnit: "vw", targetUnit: "px" };
}

test("@media 조건식의 px 브레이크포인트는 변환하지 않고 블록 내부만 변환한다", () => {
  const source = "@media (min-width: 800px) { .card { width: 16px; } }";
  const result = core.scanAndTransformUnits(source, pxToVwConfig(), 320, 2, true, true);

  assert.match(result.text, /@media \(min-width: 800px\)/);
  assert.match(result.text, /width: 5vw;/);
  assert.equal(result.count, 1);
});

test("@container와 @supports 조건식도 원문을 유지한다", () => {
  const container = core.scanAndTransformUnits(
    "@container (min-width: 400px) { .card { gap: 8px; } }",
    pxToVwConfig(),
    320,
    2,
    true,
    true
  );
  assert.match(container.text, /@container \(min-width: 400px\)/);
  assert.match(container.text, /gap: 2\.5vw;/);
  assert.equal(container.count, 1);

  const supports = core.scanAndTransformUnits(
    "@supports (width: 16px) { .card { width: 16px; } }",
    pxToVwConfig(),
    320,
    2,
    true,
    true
  );
  assert.match(supports.text, /@supports \(width: 16px\)/);
  assert.match(supports.text, /width: 5vw;/);
  assert.equal(supports.count, 1);
});

test("복합 @media 조건과 주석, 연속 규칙에서 조건식만 보존한다", () => {
  const source = [
    "@media screen and (min-width: 640px) and (max-width: 1024px) {",
    "  .a { width: 16px; }",
    "}",
    "@media /* 800px */ (max-width: 400px) {",
    "  .b { gap: 8px; }",
    "}"
  ].join("\n");
  const result = core.scanAndTransformUnits(source, pxToVwConfig(), 320, 2, true, true);

  assert.match(result.text, /min-width: 640px\) and \(max-width: 1024px\)/);
  assert.match(result.text, /\/\* 800px \*\/ \(max-width: 400px\)/);
  assert.match(result.text, /width: 5vw;/);
  assert.match(result.text, /gap: 2\.5vw;/);
  assert.equal(result.count, 2);
});

test("중첩 @media 안의 @media 조건식도 각각 보존한다", () => {
  const source = "@media (min-width: 800px) { @supports (gap: 1px) { .a { gap: 32px; } } }";
  const result = core.scanAndTransformUnits(source, pxToVwConfig(), 320, 2, true, true);

  assert.match(result.text, /@media \(min-width: 800px\)/);
  assert.match(result.text, /@supports \(gap: 1px\)/);
  assert.match(result.text, /gap: 10vw;/);
  assert.equal(result.count, 1);
});

test("VW → PX 변환에서도 @media 조건식은 그대로 둔다", () => {
  const source = "@media (min-width: 50vw) { .card { width: 50vw; } }";
  const result = core.scanAndTransformUnits(source, vwToPxConfig(), 320, 2, true, true);

  assert.match(result.text, /@media \(min-width: 50vw\)/);
  assert.match(result.text, /width: 160px;/);
  assert.equal(result.count, 1);
});

test("@keyframes와 @page 등 그룹 외 규칙은 실제 px 값을 계속 변환한다", () => {
  const keyframes = core.scanAndTransformUnits(
    "@keyframes slide { from { left: 0px; } to { left: 100px; } }",
    pxToVwConfig(),
    320,
    2,
    true,
    true
  );
  assert.match(keyframes.text, /left: 0;/);
  assert.match(keyframes.text, /left: 31\.25vw;/);
  assert.equal(keyframes.count, 2);

  const page = core.scanAndTransformUnits("@page { margin: 16px; }", pxToVwConfig(), 320, 2, true, true);
  assert.match(page.text, /margin: 5vw;/);
  assert.equal(page.count, 1);
});
