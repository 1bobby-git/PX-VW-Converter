from pathlib import Path

CORE_PATH = Path("converter-core.js")
README_PATH = Path("README.md")
TEST_PATH = Path("tests/class-attribute-typo.test.js")

core = CORE_PATH.read_text(encoding="utf-8")

constant_anchor = "  var KNOWN_AT_RULES = {\n"
constant_block = """  var CLASS_ATTRIBUTE_TYPO_PATTERN = /\\b(calas|calss|claas|clas|clss|classs|cass)\\b/gi;

  var KNOWN_AT_RULES = {
"""
if constant_anchor not in core:
    raise SystemExit("converter-core.js: KNOWN_AT_RULES anchor not found")
core = core.replace(constant_anchor, constant_block, 1)

function_anchor = "  function buildLineStarts(text) {\n"
function_block = """  function maskNonCodeRanges(text) {
    var characters = text.split(\"\");
    var index = 0;

    function maskRange(start, end) {
      var cursor;
      for (cursor = start; cursor < end; cursor += 1) {
        if (characters[cursor] !== \"\\n\" && characters[cursor] !== \"\\r\") {
          characters[cursor] = \" \";
        }
      }
    }

    while (index < text.length) {
      var character = text.charAt(index);

      if (character === \"/\" && text.charAt(index + 1) === \"*\") {
        var commentEnd = readComment(text, index);
        maskRange(index, commentEnd);
        index = commentEnd;
        continue;
      }

      if (character === \"\\\"\" || character === \"'\") {
        var stringEnd = readString(text, index);
        maskRange(index, stringEnd);
        index = stringEnd;
        continue;
      }

      if (startsUrlFunction(text, index)) {
        var urlEnd = readUrlFunction(text, index);
        maskRange(index, urlEnd);
        index = urlEnd;
        continue;
      }

      index += 1;
    }

    return characters.join(\"\");
  }

  function isInsideOpenRange(text, offset, openCharacter, closeCharacter) {
    return text.lastIndexOf(openCharacter, offset) > text.lastIndexOf(closeCharacter, offset);
  }

  function validateClassAttributeTypos(text, collector) {
    var masked = maskNonCodeRanges(text);
    var match;

    CLASS_ATTRIBUTE_TYPO_PATTERN.lastIndex = 0;

    while ((match = CLASS_ATTRIBUTE_TYPO_PATTERN.exec(masked)) && collector.issues.length < collector.limit) {
      var typo = match[1];
      var cursor = match.index + typo.length;
      while (/\\s/.test(masked.charAt(cursor))) {
        cursor += 1;
      }

      var nextCharacter = masked.charAt(cursor);
      var insideAttributeSelector = isInsideOpenRange(masked, match.index, \"[\", \"]\");
      var insideHtmlTag = isInsideOpenRange(masked, match.index, \"<\", \">\");
      var looksLikeAttribute = nextCharacter === \"=\" || ((insideAttributeSelector || insideHtmlTag) && (nextCharacter === \"]\" || nextCharacter === \">\" || nextCharacter === \"/\"));

      if (!looksLikeAttribute) {
        continue;
      }

      collector.add(
        \"warning\",
        \"class-attribute-typo\",
        \"속성명 '\" + typo + \"'는 'class' 오타로 보입니다. HTML에서는 'class=\\\"...\\\"', CSS 클래스 선택자는 '.이름' 형식을 사용하세요.\",
        match.index,
        typo.length,
        \"class\"
      );
    }
  }

  function buildLineStarts(text) {
"""
if function_anchor not in core:
    raise SystemExit("converter-core.js: buildLineStarts anchor not found")
core = core.replace(function_anchor, function_block, 1)

validation_anchor = """    validateLexicalStructure(source, collector);
    validateContainerSyntax(source, hasTopLevelBlock(source) ? \"stylesheet\" : \"rule\", 0, collector, declarations);
"""
validation_block = """    validateLexicalStructure(source, collector);
    validateClassAttributeTypos(source, collector);
    validateContainerSyntax(source, hasTopLevelBlock(source) ? \"stylesheet\" : \"rule\", 0, collector, declarations);
"""
if validation_anchor not in core:
    raise SystemExit("converter-core.js: validation anchor not found")
core = core.replace(validation_anchor, validation_block, 1)
CORE_PATH.write_text(core, encoding="utf-8")

readme = README_PATH.read_text(encoding="utf-8")
readme_anchor = "- `widht → width`, `gird → grid` 같은 인접 문자 순서 오타 제안\n"
readme_line = "- `calas`, `calss`, `claas` 등 `class` HTML 속성 철자 오타 경고 (`.calas` 같은 임의 클래스명은 제외)\n"
if readme_anchor not in readme:
    raise SystemExit("README.md: typo list anchor not found")
if readme_line not in readme:
    readme = readme.replace(readme_anchor, readme_anchor + readme_line, 1)
README_PATH.write_text(readme, encoding="utf-8")

TEST_PATH.parent.mkdir(parents=True, exist_ok=True)
TEST_PATH.write_text('''"use strict";

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
  ].join("\\n");
  const result = core.validateCssSyntax(source);

  assert.equal(result.issues.some((item) => item.code === "class-attribute-typo"), false);
});
''', encoding="utf-8")
