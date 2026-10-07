"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const styles2 = fs.readFileSync(path.join(root, "styles-2.css"), "utf8");
const styles3 = fs.readFileSync(path.join(root, "styles-3.css"), "utf8");
const app = fs.readFileSync(path.join(root, "app-ui.js"), "utf8");

test("옵션은 한 줄 선택기로 배치하고 폭이 좁을 때만 줄바꿈한다", () => {
  const options = html.match(/<fieldset class="declaration-options">([\s\S]*?)<\/fieldset>/)[1];
  assert.match(styles2, /\.option-bar\s*\{[^}]*display: flex;[^}]*flex-wrap: wrap;/);
  assert.match(styles2, /\.declaration-options\s*\{[^}]*display: inline-flex;/);
  for (const id of ["preserveAllDeclarations", "onlyMatchingDeclarations"]) {
    assert.match(options, new RegExp(`id="${id}"[^>]*>\\s*<label for="${id}"`));
  }
  assert.doesNotMatch(options, /<small|class="check-box"/);
  assert.match(html, /id="realtimeStatus" class="sr-only"/);
});

test("전체 속성 유지 시 출력 제외 범례의 hidden 속성을 CSS가 덮지 않는다", () => {
  assert.match(styles3, /\.unconverted-legend\[hidden\]\s*\{\s*display: none;/);
  assert.match(app, /elements\.unconvertedLegend\.hidden = normalized\.length === 0/);
  assert.match(app, /control\.addEventListener\("change", function \(\) \{\s*saveSettings\(\);\s*runLivePipeline\(false\);/);
});

test("네이티브 가로 스크롤바를 기본 크기로 표시하고 입력·출력의 Shift+휠을 연결한다", () => {
  assert.match(styles3, /textarea\s*\{[^}]*overflow-x: scroll;[^}]*scrollbar-width: auto;/);
  assert.match(styles3, /\.code-editor\s*\{[^}]*overflow: hidden;\s*overflow: clip;/);
  assert.match(app, /\[elements\.cssInput, elements\.cssOutput\]\.forEach/);
  assert.match(app, /addEventListener\("wheel", handleEditorWheel, \{ passive: false \}\)/);
});

test("변경된 UI 자산에는 같은 버전을 붙여 이전 브라우저 캐시와 섞이지 않게 한다", () => {
  const versions = ["app-ui.js", "styles-2.css", "styles-3.css"].map(file => {
    const asset = html.match(new RegExp(`(?:src|href)="\\./${file.replaceAll(".", "\\.")}\\?v=([^"&]+)"`));
    assert.ok(asset, file);
    return asset[1];
  });
  assert.equal(new Set(versions).size, 1);
});
