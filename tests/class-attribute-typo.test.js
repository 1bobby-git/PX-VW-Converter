"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

global.window = global;
require("../converter-core.js");

const core = global.PXVWCore;

test("class 속성의 흔한 철자 오타를 경고하고 수정안을 제공한다", () => {
  const sources = [
    '<div calas="card"></div>',
    '[calss="card"] { width: 320px; }',
    'calas="card" { width: 320px; }',
    '<section claas></section>'
  ];

  sources.forEach((source) => {
    const result = core.validateCssSyntax(source);
    const issue = result.issues.find((item) => item.code === "class-attribute-typo");

    assert.ok(issue, source);
    assert.equal(issue.severity, "warning");
    assert.equal(issue.suggestion, "class");
    assert.match(issue.message, /class/);
    assert.ok(issue.line >= 1);
    assert.ok(issue.column >= 1);
  });
});

test("임의 클래스명과 문자열·주석·URL 안의 calas는 오타로 단정하지 않는다", () => {
  const source = [
    '.calas { width: 320px; }',
    '.note::before { content: "calas=card"; }',
    '.icon { background-image: url("/image.svg?calas=card"); }',
    '/* <div calas="card"> */'
  ].join("\n");
  const result = core.validateCssSyntax(source);

  assert.equal(result.issues.some((item) => item.code === "class-attribute-typo"), false);
});
