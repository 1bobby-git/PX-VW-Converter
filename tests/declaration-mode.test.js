"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

global.window = global;
require("../converter-core.js");

const core = global.PXVWCore;
const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const app = fs.readFileSync(path.join(root, "app-ui.js"), "utf8");

function appFunction(name, context) {
  const source = app.match(new RegExp("  function " + name + "\\([^]*?\\n  \\}"));
  assert.ok(source, `${name} 함수를 찾을 수 있어야 한다`);
  return vm.runInNewContext("(" + source[0] + ")", context);
}

test("속성 유지와 제거를 하나의 라디오 그룹으로 제공하고 기존 기본값을 유지한다", () => {
  assert.match(html, /<legend[^>]*>CSS 속성 처리<\/legend>/);
  assert.match(html, /id="preserveAllDeclarations" type="radio" name="declarationMode" value="all">/);
  assert.match(html, /id="onlyMatchingDeclarations" type="radio" name="declarationMode" value="matching" checked>/);
  assert.match(html, /<strong>전체 속성 유지<\/strong>/);
  assert.match(html, /<strong>대상 단위 속성만 유지<\/strong>/);
  assert.match(app, /\[elements\.preserveAllDeclarations, elements\.onlyMatchingDeclarations, elements\.stripZeroUnit\]\.forEach/);
});

for (const direction of ["px-vw", "vw-px"]) {
  test(`${direction}: 모드를 반복 변경해도 원본에서 전체 속성 또는 대상 속성만 출력한다`, () => {
    const [sourceUnit, targetUnit] = direction.split("-");
    const amount = sourceUnit === "px" ? 160 : 50;
    const convertedAmount = sourceUnit === "px" ? 50 : 160;
    const source = `\n.card { width: ${amount}${sourceUnit}; color: red; display: grid; --theme: blue; }\n` +
      `.note::before { content: "16${sourceUnit}"; background: url("icon-16${sourceUnit}.svg"); }\n` +
      `@media (min-width: 800px) { .inner { padding: ${amount}${sourceUnit}; opacity: .5; } }\n`;
    const expected = source.replace(`width: ${amount}${sourceUnit}`, `width: ${convertedAmount}${targetUnit}`)
      .replace(`padding: ${amount}${sourceUnit}`, `padding: ${convertedAmount}${targetUnit}`);
    const elements = {
      cssInput: { value: source },
      cssOutput: { value: "" },
      onlyMatchingDeclarations: { checked: false },
      stripZeroUnit: { checked: true }
    };
    let ranges;
    let stats;
    const convert = appFunction("convertCss", {
      core, elements,
      getViewportWidth: () => 320,
      getDirectionConfig: () => ({ direction, sourceUnit, targetUnit }),
      getPrecision: () => 2,
      renderInputHighlight: (text, removed) => { ranges = removed; },
      updateWorkspaceMeta: (result) => { stats = result; }
    });

    convert(false);
    assert.equal(elements.cssOutput.value, expected);
    assert.equal(stats.convertedCount, 2);
    assert.equal(stats.removedDeclarations, 0);
    assert.equal(ranges.length, 0);

    elements.onlyMatchingDeclarations.checked = true;
    convert(false);
    assert.doesNotMatch(elements.cssOutput.value, /color:|display:|--theme:|\.note|opacity:/);
    assert.match(elements.cssOutput.value, /@media \(min-width: 800px\)/);
    assert.equal(stats.convertedCount, 2);
    assert.equal(stats.removedDeclarations, 6);
    assert.equal(ranges.length, 6);

    elements.onlyMatchingDeclarations.checked = false;
    convert(false);
    assert.equal(elements.cssOutput.value, expected);
    assert.equal(elements.cssInput.value, source);
    assert.equal(stats.removedDeclarations, 0);
    assert.equal(ranges.length, 0);
  });
}

test("기존 저장 설정의 true와 false를 각각 제거와 전체 유지 모드로 복원한다", () => {
  const storageKey = app.match(/var STORAGE_KEY = "([^"]+)"/)[1];
  for (const saved of [true, false, undefined, "invalid"]) {
    const elements = {
      viewportWidth: { value: "320" }, precision: { value: "2" },
      directionPxVw: { checked: true }, directionVwPx: { checked: false },
      onlyMatchingDeclarations: { checked: true },
      preserveAllDeclarations: { checked: false }, stripZeroUnit: { checked: true }
    };
    const context = {
      core, elements, STORAGE_KEY: storageKey,
      localStorage: {
        getItem: (key) => {
          assert.equal(key, storageKey);
          return saved === "invalid" ? "not JSON" : JSON.stringify({ onlyMatchingDeclarations: saved });
        }
      }
    };
    appFunction("loadSettings", context)();
    assert.equal(elements.onlyMatchingDeclarations.checked, saved !== false);
    assert.equal(elements.preserveAllDeclarations.checked, saved === false);
  }
});

test("속성 처리 모드는 기존 저장 키와 불리언 형식을 계속 사용한다", () => {
  for (const onlyMatching of [true, false]) {
    const settings = appFunction("getSettings", {
      elements: {
        viewportWidth: { value: "320" }, precision: { value: "2" },
        onlyMatchingDeclarations: { checked: onlyMatching }, stripZeroUnit: { checked: true }
      },
      getDirection: () => "px-vw"
    })();
    let persisted;
    appFunction("saveSettings", {
      STORAGE_KEY: "pxvw-converter-settings-v3",
      getSettings: () => settings,
      localStorage: { setItem: (key, value) => { persisted = { key, value }; } }
    })();
    assert.equal(persisted.key, "pxvw-converter-settings-v3");
    assert.equal(JSON.parse(persisted.value).onlyMatchingDeclarations, onlyMatching);
  }
});
