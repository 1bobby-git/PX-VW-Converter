"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

global.window = global;
require("../converter-core.js");

const app = fs.readFileSync(path.join(__dirname, "..", "app-ui.js"), "utf8");

function editorHarness() {
  const frames = [];
  const value = ".card { " + "color: red; ".repeat(100) + "\n}";
  const textarea = {
    value, selectionStart: value.length,
    scrollLeft: 0, scrollTop: 0,
    scrollWidth: 2000, clientWidth: 300, scrollHeight: 1000, clientHeight: 200,
    getBoundingClientRect: () => ({ left: 0, right: 300 })
  };
  const highlight = { style: {} };
  const context = vm.createContext({
    core: global.PXVWCore,
    elements: { cssInput: textarea, cssInputHighlight: highlight, cursorPosition: {} },
    lastCursorSource: null, lastCursorOffset: null, highlightSyncFrame: null,
    getEditorTabSize: () => 2,
    renderInputSelection: () => {},
    getTextRect: () => ({ left: 18 - textarea.scrollLeft, right: 26 - textarea.scrollLeft }),
    window: {
      getComputedStyle: () => ({ paddingLeft: "18px" }),
      requestAnimationFrame: (callback) => { frames.push(callback); return frames.length; }
    }
  });
  for (const name of ["syncInputHighlightGeometry", "ensureCaretLineVisible", "updateCursorPosition", "scheduleHighlightSync"]) {
    const source = app.match(new RegExp("  function " + name + "\\([^]*?\\n  \\}"));
    assert.ok(source, name);
    context[name] = vm.runInContext("(" + source[0] + ")", context);
  }
  const scrollSource = app.match(/elements\.cssInput\.addEventListener\("scroll", (function \(\) \{[\s\S]*?\n    \})\);/);
  assert.ok(scrollSource);
  const scroll = vm.runInContext("(" + scrollSource[1] + ")", context);
  return {
    textarea, highlight, context, scroll,
    flushFrames: () => { while (frames.length) frames.shift()(); }
  };
}

test("커서가 짧은 마지막 줄에 있어도 수동 가로·세로 스크롤을 되돌리지 않는다", () => {
  const editor = editorHarness();
  editor.context.updateCursorPosition();
  for (const [left, top] of [[350, 112], [850, 240], [0, 80], [0, 0]]) {
    editor.textarea.scrollLeft = left;
    editor.textarea.scrollTop = top;
    editor.scroll();
    editor.flushFrames();
    assert.equal(editor.textarea.scrollLeft, left);
    assert.equal(editor.textarea.scrollTop, top);
    assert.equal(editor.highlight.style.transform,
      left || top ? `translate(${-left}px, ${-top}px)` : "none");
    assert.equal(editor.highlight.style.width, "2000px");
    assert.equal(editor.highlight.style.height, "1000px");
  }
});

test("스크롤바 클릭 등 커서가 그대로인 이벤트는 수동 가로 위치를 보존한다", () => {
  const editor = editorHarness();
  editor.context.updateCursorPosition();
  editor.textarea.scrollLeft = 500;
  editor.context.updateCursorPosition();
  editor.context.scheduleHighlightSync();
  editor.flushFrames();
  assert.equal(editor.textarea.scrollLeft, 500);
  assert.equal(editor.highlight.style.transform, "translate(-500px, 0px)");
});

test("실제로 커서를 짧은 줄로 이동하면 기존 끝줄 보정을 수행한다", () => {
  const editor = editorHarness();
  editor.textarea.selectionStart = 1;
  editor.context.updateCursorPosition();
  editor.textarea.scrollLeft = 500;
  editor.textarea.scrollTop = 120;
  editor.textarea.selectionStart = editor.textarea.value.length;
  editor.context.scheduleHighlightSync();
  editor.flushFrames();
  assert.equal(editor.textarea.scrollLeft, 0);
  assert.equal(editor.textarea.scrollTop, 120);
  assert.equal(editor.highlight.style.transform, "translate(0px, -120px)");
});

test("커서 위치가 같아도 소스가 바뀌면 필요한 가로 보정을 수행한다", () => {
  const editor = editorHarness();
  editor.context.updateCursorPosition();
  editor.textarea.scrollLeft = 500;
  editor.textarea.value = editor.textarea.value.replace(".card", ".note");
  editor.context.updateCursorPosition();
  editor.flushFrames();
  assert.equal(editor.textarea.scrollLeft, 0);
  assert.equal(editor.highlight.style.transform, "none");
});
