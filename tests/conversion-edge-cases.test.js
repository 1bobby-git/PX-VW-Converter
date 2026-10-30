"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

global.window = global;
require("../converter-core.js");

const core = global.PXVWCore;
const PX_TO_VW = { direction: "px-vw", sourceUnit: "px", targetUnit: "vw" };
const VW_TO_PX = { direction: "vw-px", sourceUnit: "vw", targetUnit: "px" };

function convert(source, config, viewport, precision, stripZeroUnit) {
  return core.scanAndTransformUnits(source, config, viewport, precision, stripZeroUnit, true);
}

test("decimal ties round half away from zero regardless of binary floating point error", () => {
  assert.equal(core.formatNumber(1.005, 2), "1.01");
  assert.equal(core.formatNumber(-1.005, 2), "-1.01");
  assert.equal(core.formatNumber(2.675, 2), "2.68");
  assert.equal(core.formatNumber(1.0005, 3), "1.001");
  assert.equal(core.formatNumber(2.5, 0), "3");
  assert.equal(core.formatNumber(4.2666666667, 2), "4.27");
  assert.equal(core.formatNumber(0.0000004, 6), "0");
  assert.equal(core.formatNumber(-0.00001, 2), "0");
  assert.equal(core.formatNumber(1e21, 2), "1e+21");

  assert.equal(convert("width: 3.216px;", PX_TO_VW, 320, 2, true).text, "width: 1.01vw;");
  assert.equal(convert("width: 1.005vw;", VW_TO_PX, 100, 2, true).text, "width: 1.01px;");
});

test("zero-unit cleanup keeps the unit inside CSS math functions", () => {
  const source = [
    "width: calc(0px + 10px);",
    "height: min(0px, 10px); top: max(0px, 1px); left: clamp(0px, 1px, 2px);",
    "margin: calc(10px + (0px * 2)) -webkit-calc(0px + 1px);",
    "padding: calc(var(--x, 0px) + 1px);"
  ].join("\n");
  const result = convert(source, PX_TO_VW, 320, 2, true);

  assert.equal(result.text, [
    "width: calc(0vw + 3.13vw);",
    "height: min(0vw, 3.13vw); top: max(0vw, 0.31vw); left: clamp(0vw, 0.31vw, 0.63vw);",
    "margin: calc(3.13vw + (0vw * 2)) -webkit-calc(0vw + 0.31vw);",
    "padding: calc(var(--x, 0vw) + 0.31vw);"
  ].join("\n"));
  assert.equal(result.count, 15);

  assert.equal(convert("width: calc(0vw + 10px);", VW_TO_PX, 320, 2, true).text, "width: calc(0px + 10px);");
});

test("zero-unit cleanup keeps units for custom properties and the flex shorthand", () => {
  const source = ".a { --gap: 0px; flex: 1 0px; -webkit-flex: 0px; flex-basis: 0px; }";
  const result = convert(source, PX_TO_VW, 320, 2, true);

  assert.equal(result.text, ".a { --gap: 0vw; flex: 1 0vw; -webkit-flex: 0vw; flex-basis: 0; }");
  assert.equal(result.count, 4);
});

test("zero-unit cleanup still strips plain zero lengths outside math functions", () => {
  const source = ".a { margin: 0px; transform: translate(0px, -0px); padding: calc(1px + 1px) 0px; }\n.b { top: 0px; }";
  const result = convert(source, PX_TO_VW, 320, 2, true);

  assert.equal(result.text, ".a { margin: 0; transform: translate(0, 0); padding: calc(0.31vw + 0.31vw) 0; }\n.b { top: 0; }");
  assert.equal(result.count, 7);
});

test("@import media query conditions keep their breakpoints", () => {
  const source = [
    "@import url(base.css) screen and (min-width: 800px);",
    "@import \"print.css\" print and (max-width: 640px);",
    ".a { width: 16px; }"
  ].join("\n");
  const result = convert(source, PX_TO_VW, 320, 2, true);

  assert.match(result.text, /@import url\(base\.css\) screen and \(min-width: 800px\);/);
  assert.match(result.text, /@import "print\.css" print and \(max-width: 640px\);/);
  assert.match(result.text, /width: 5vw;/);
  assert.equal(result.count, 1);
});

test("zero-unit exceptions still apply after a comment before the declaration", () => {
  const source = ".a {\n  color: red; /* brand */\n  flex: 1 0px;\n  --gap: 0px; /* spacing */\n  --pad: 0px;\n  /* note */ margin: 0px;\n}";
  const result = convert(source, PX_TO_VW, 320, 2, true);

  assert.equal(result.text, ".a {\n  color: red; /* brand */\n  flex: 1 0vw;\n  --gap: 0vw; /* spacing */\n  --pad: 0vw;\n  /* note */ margin: 0;\n}");
});

test("zero-unit cleanup covers uppercase functions, -ms-flex, progress() and unclosed calc", () => {
  assert.equal(convert("width: CALC(0PX + 10PX);", PX_TO_VW, 320, 2, true).text, "width: CALC(0vw + 3.13vw);");
  assert.equal(convert("-ms-flex: 1 0px;", PX_TO_VW, 320, 2, true).text, "-ms-flex: 1 0vw;");
  assert.equal(
    convert("opacity: progress(0px, 0px, 100px);", PX_TO_VW, 320, 2, true).text,
    "opacity: progress(0vw, 0vw, 31.25vw);"
  );
  // An unclosed calc( must not keep later declarations in math context.
  assert.equal(
    convert(".a { width: calc(0px + 1px; } .b { margin: 0px; }", PX_TO_VW, 320, 2, true).text,
    ".a { width: calc(0vw + 0.31vw; } .b { margin: 0; }"
  );
});

test("@import conditions survive a semicolon inside an unquoted data: URL", () => {
  const source = "@import url(data:text/css;base64,LmF7fQ==) (min-width: 800px);\n.a { width: 16px; }";
  const result = convert(source, PX_TO_VW, 320, 2, true);

  assert.match(result.text, /\(min-width: 800px\);/);
  assert.match(result.text, /width: 5vw;/);
  assert.equal(result.count, 1);
});

test("rounding keeps integer digits between 1e15 and 2^53", () => {
  assert.equal(core.formatNumber(4503599627370497, 0), "4503599627370497");
  assert.equal(core.formatNumber(1234567890.1234567, 6), "1234567890.123457");
  assert.equal(core.formatNumber(1.005, 2), "1.01");
});
