"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
global.window = global;
require("../converter-core.js");
const core = global.PXVWCore;

test("CSS exponent dimensions convert as a complete number in both directions", () => {
  for (const [sourceUnit, targetUnit, direction, source, expected] of [
    ["px", "vw", "px-vw", "margin: 1e+2px -2.5E1PX .32e2px;", "margin: 31.25vw -7.8125vw 10vw;"],
    ["vw", "px", "vw-px", "gap: 1e1vw 5e-1vw;", "gap: 32px 1.6px;"],
  ]) {
    const result = core.scanAndTransformUnits(source, {sourceUnit, targetUnit, direction}, 320, 4, false, true);
    assert.equal(result.text, expected);
    assert.equal(result.count, direction === "px-vw" ? 3 : 2);
  }
});

test("exponent declarations survive matching filters while strings and URLs are preserved", () => {
  const source = '.card { width: 1e2px; color: red; content: "1e2px"; background: url(1e2px.svg); }';
  const filtered = core.filterMatchingDeclarations(source, "px");
  assert.match(filtered.text, /width: 1e2px/);
  assert.doesNotMatch(filtered.text, /color:/);
  const result = core.scanAndTransformUnits(source, {sourceUnit:"px", targetUnit:"vw", direction:"px-vw"}, 320, 2, false, true);
  assert.match(result.text, /width: 31.25vw/);
  assert.match(result.text, /content: "1e2px"/);
  assert.match(result.text, /url\(1e2px.svg\)/);
  assert.equal(result.count, 1);
});

test("non-finite numeric conversions retain the original dimension", () => {
  const source = "width: 1e999px;";
  const result = core.scanAndTransformUnits(source, {sourceUnit:"px", targetUnit:"vw", direction:"px-vw"}, 320, 2, false, true);
  assert.equal(result.text, source);
  assert.equal(result.count, 0);
});
