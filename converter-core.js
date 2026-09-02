(function (global) {
  "use strict";

  function parseFiniteNumber(value) {
    if (typeof value === "number") {
      return Number.isFinite(value) ? value : null;
    }

    if (typeof value !== "string" || value.trim() === "") {
      return null;
    }

    var parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function normalizeNegativeZero(value, precision) {
    var threshold = 0.5 * Math.pow(10, -precision);
    return Math.abs(value) < threshold ? 0 : value;
  }

  function formatNumber(value, precision) {
    if (!Number.isFinite(value)) {
      return "";
    }

    var normalized = normalizeNegativeZero(value, precision);
    var fixed = normalized.toFixed(precision);

    if (precision === 0) {
      return fixed;
    }

    return fixed.replace(/(\.\d*?[1-9])0+$/, "$1").replace(/\.0+$/, "");
  }

  function convertUnitValue(value, config, viewport) {
    return config.direction === "px-vw" ? (value / viewport) * 100 : (value / 100) * viewport;
  }

  function isIdentifierCharacter(character) {
    return Boolean(character && /[a-zA-Z0-9_.-]/.test(character));
  }

  function isUnitBoundary(character) {
    return !character || !/[a-zA-Z0-9_-]/.test(character);
  }

  function isNumberStart(text, index) {
    var current = text.charAt(index);
    var next = text.charAt(index + 1);

    if (/\d/.test(current)) {
      return true;
    }

    if (current === "." && /\d/.test(next)) {
      return true;
    }

    return (current === "-" || current === "+") && (/\d/.test(next) || (next === "." && /\d/.test(text.charAt(index + 2))));
  }

  function readString(text, startIndex) {
    var quote = text.charAt(startIndex);
    var index = startIndex + 1;

    while (index < text.length) {
      var character = text.charAt(index);
      if (character === "\\") {
        index += 2;
        continue;
      }
      index += 1;
      if (character === quote) {
        break;
      }
    }

    return index;
  }

  function readComment(text, startIndex) {
    var endIndex = text.indexOf("*/", startIndex + 2);
    return endIndex === -1 ? text.length : endIndex + 2;
  }

  function startsUrlFunction(text, index) {
    if (text.slice(index, index + 3).toLowerCase() !== "url") {
      return false;
    }

    var previous = text.charAt(index - 1);
    if (isIdentifierCharacter(previous)) {
      return false;
    }

    var cursor = index + 3;
    while (/\s/.test(text.charAt(cursor))) {
      cursor += 1;
    }

    return text.charAt(cursor) === "(";
  }

  function readUrlFunction(text, startIndex) {
    var cursor = startIndex + 3;
    while (/\s/.test(text.charAt(cursor))) {
      cursor += 1;
    }

    if (text.charAt(cursor) !== "(") {
      return startIndex + 1;
    }

    var depth = 0;
    var index = cursor;

    while (index < text.length) {
      var character = text.charAt(index);

      if (character === "\"" || character === "'") {
        index = readString(text, index);
        continue;
      }

      if (character === "/" && text.charAt(index + 1) === "*") {
        index = readComment(text, index);
        continue;
      }

      if (character === "(") {
        depth += 1;
      } else if (character === ")") {
        depth -= 1;
        if (depth === 0) {
          return index + 1;
        }
      }

      if (character === "\\") {
        index += 2;
      } else {
        index += 1;
      }
    }

    return text.length;
  }

  function readNumberToken(text, startIndex) {
    var match = text.slice(startIndex).match(/^[+-]?(?:\d+\.?\d*|\.\d+)/);
    return match ? match[0] : "";
  }

  function scanAndTransformUnits(text, config, viewport, precision, stripZeroUnit, transform) {
    var output = "";
    var index = 0;
    var convertedCount = 0;

    while (index < text.length) {
      var character = text.charAt(index);

      if (character === "/" && text.charAt(index + 1) === "*") {
        var commentEnd = readComment(text, index);
        output += text.slice(index, commentEnd);
        index = commentEnd;
        continue;
      }

      if (character === "\"" || character === "'") {
        var stringEnd = readString(text, index);
        output += text.slice(index, stringEnd);
        index = stringEnd;
        continue;
      }

      if (startsUrlFunction(text, index)) {
        var urlEnd = readUrlFunction(text, index);
        output += text.slice(index, urlEnd);
        index = urlEnd;
        continue;
      }

      if (isNumberStart(text, index) && !isIdentifierCharacter(text.charAt(index - 1))) {
        var numberToken = readNumberToken(text, index);
        var unitStart = index + numberToken.length;
        var candidateUnit = text.slice(unitStart, unitStart + config.sourceUnit.length);

        if (candidateUnit.toLowerCase() === config.sourceUnit && isUnitBoundary(text.charAt(unitStart + config.sourceUnit.length))) {
          var numericValue = Number(numberToken);
          var replacement;

          if (stripZeroUnit && numericValue === 0) {
            replacement = "0";
          } else {
            replacement = formatNumber(convertUnitValue(numericValue, config, viewport), precision) + config.targetUnit;
          }

          output += transform === false ? text.slice(index, unitStart + config.sourceUnit.length) : replacement;
          index = unitStart + config.sourceUnit.length;
          convertedCount += 1;
          continue;
        }
      }

      output += character;
      index += 1;
    }

    return { text: output, count: convertedCount };
  }

  function hasConvertibleUnit(text, sourceUnit) {
    var config = {
      direction: sourceUnit === "px" ? "px-vw" : "vw-px",
      sourceUnit: sourceUnit,
      targetUnit: sourceUnit === "px" ? "vw" : "px"
    };

    return scanAndTransformUnits(text, config, 100, 2, false, false).count > 0;
  }

  function findMatchingBrace(text, openIndex) {
    var depth = 0;
    var index = openIndex;

    while (index < text.length) {
      var character = text.charAt(index);

      if (character === "/" && text.charAt(index + 1) === "*") {
        index = readComment(text, index);
        continue;
      }

      if (character === "\"" || character === "'") {
        index = readString(text, index);
        continue;
      }

      if (character === "{") {
        depth += 1;
      } else if (character === "}") {
        depth -= 1;
        if (depth === 0) {
          return index;
        }
      }

      index += 1;
    }

    return -1;
  }

  function findNextTopLevelToken(text, startIndex) {
    var parenthesisDepth = 0;
    var bracketDepth = 0;
    var index = startIndex;

    while (index < text.length) {
      var character = text.charAt(index);

      if (character === "/" && text.charAt(index + 1) === "*") {
        index = readComment(text, index);
        continue;
      }

      if (character === "\"" || character === "'") {
        index = readString(text, index);
        continue;
      }

      if (character === "(") {
        parenthesisDepth += 1;
      } else if (character === ")") {
        parenthesisDepth = Math.max(0, parenthesisDepth - 1);
      } else if (character === "[") {
        bracketDepth += 1;
      } else if (character === "]") {
        bracketDepth = Math.max(0, bracketDepth - 1);
      } else if (parenthesisDepth === 0 && bracketDepth === 0 && (character === ";" || character === "{")) {
        return { index: index, token: character };
      }

      index += 1;
    }

    return null;
  }

  function hasTopLevelBlock(text) {
    var token = findNextTopLevelToken(text, 0);

    while (token) {
      if (token.token === "{") {
        return true;
      }
      token = findNextTopLevelToken(text, token.index + 1);
    }

    return false;
  }

  function isGroupingAtRule(prelude, body) {
    var normalized = prelude.replace(/\/\*[\s\S]*?\*\//g, "").trim().toLowerCase();

    if (!normalized.startsWith("@")) {
      return false;
    }

    if (/^@(?:media|supports|container|layer|scope|document|starting-style|(?:-[a-z]+-)?keyframes)\b/.test(normalized)) {
      return true;
    }

    if (/^@(?:font-face|page|property|counter-style|font-feature-values)\b/.test(normalized)) {
      return false;
    }

    return hasTopLevelBlock(body);
  }

  function createFilterStats() {
    return {
      totalDeclarations: 0,
      keptDeclarations: 0,
      removedDeclarations: 0,
      removedRules: 0
    };
  }

  function mergeFilterStats(target, source) {
    target.totalDeclarations += source.totalDeclarations;
    target.keptDeclarations += source.keptDeclarations;
    target.removedDeclarations += source.removedDeclarations;
    target.removedRules += source.removedRules;
  }

  function firstMeaningfulIndex(text) {
    var index = 0;

    while (index < text.length) {
      var character = text.charAt(index);

      if (/\s/.test(character)) {
        index += 1;
        continue;
      }

      if (character === "/" && text.charAt(index + 1) === "*") {
        index = readComment(text, index);
        continue;
      }

      return index;
    }

    return -1;
  }

  function isAtRuleStatement(text) {
    var index = firstMeaningfulIndex(text);
    return index !== -1 && text.charAt(index) === "@";
  }

  function trailingWhitespace(text) {
    var match = text.match(/\s*$/);
    return match ? match[0] : "";
  }

  function trailingContentEnd(text) {
    var match = text.match(/\s*$/);
    return match ? text.length - match[0].length : text.length;
  }

  function addRemovedRange(ranges, baseOffset, start, end) {
    if (end <= start) {
      return;
    }

    ranges.push({
      start: baseOffset + start,
      end: baseOffset + end
    });
  }

  function filterContainer(text, sourceUnit, context, baseOffset) {
    var cursor = 0;
    var output = "";
    var keptContent = false;
    var stats = createFilterStats();
    var removedRanges = [];
    var absoluteBase = Number.isFinite(baseOffset) ? baseOffset : 0;

    while (cursor < text.length) {
      var token = findNextTopLevelToken(text, cursor);

      if (!token) {
        var trailing = text.slice(cursor);
        var meaningfulIndex = firstMeaningfulIndex(trailing);

        if (meaningfulIndex === -1) {
          if (keptContent) {
            output += trailing;
          }
        } else if (context === "stylesheet" && isAtRuleStatement(trailing)) {
          output += trailing;
          keptContent = true;
        } else if (context === "rule") {
          stats.totalDeclarations += 1;
          if (hasConvertibleUnit(trailing, sourceUnit)) {
            stats.keptDeclarations += 1;
            output += trailing;
            keptContent = true;
          } else {
            stats.removedDeclarations += 1;
            addRemovedRange(
              removedRanges,
              absoluteBase,
              cursor + meaningfulIndex,
              cursor + trailingContentEnd(trailing)
            );
            if (keptContent) {
              output += trailingWhitespace(trailing);
            }
          }
        } else {
          output += trailing;
          keptContent = true;
        }
        break;
      }

      if (token.token === ";") {
        var statementStart = cursor;
        var statement = text.slice(cursor, token.index + 1);
        var statementMeaningfulIndex = firstMeaningfulIndex(statement);
        cursor = token.index + 1;

        if (statementMeaningfulIndex === -1) {
          if (keptContent) {
            output += statement;
          }
          continue;
        }

        if (context === "stylesheet" && isAtRuleStatement(statement)) {
          output += statement;
          keptContent = true;
          continue;
        }

        stats.totalDeclarations += 1;
        if (hasConvertibleUnit(statement, sourceUnit)) {
          stats.keptDeclarations += 1;
          output += statement;
          keptContent = true;
        } else {
          stats.removedDeclarations += 1;
          addRemovedRange(
            removedRanges,
            absoluteBase,
            statementStart + statementMeaningfulIndex,
            token.index + 1
          );
        }
        continue;
      }

      var closeIndex = findMatchingBrace(text, token.index);
      if (closeIndex === -1) {
        var malformed = text.slice(cursor);

        if (hasConvertibleUnit(malformed, sourceUnit) || context === "stylesheet") {
          output += malformed;
          keptContent = true;
        }
        break;
      }

      var prelude = text.slice(cursor, token.index);
      var body = text.slice(token.index + 1, closeIndex);
      var childContext = isGroupingAtRule(prelude, body) ? "stylesheet" : "rule";
      var childResult = filterContainer(body, sourceUnit, childContext, absoluteBase + token.index + 1);

      mergeFilterStats(stats, childResult.stats);
      childResult.removedRanges.forEach(function (range) {
        removedRanges.push(range);
      });

      if (childResult.kept) {
        output += prelude + "{" + childResult.text + "}";
        keptContent = true;
      } else if (firstMeaningfulIndex(prelude) !== -1) {
        stats.removedRules += 1;
      }

      cursor = closeIndex + 1;
    }

    return {
      text: output,
      stats: stats,
      kept: keptContent,
      removedRanges: removedRanges
    };
  }

  function filterMatchingDeclarations(text, sourceUnit) {
    var context = hasTopLevelBlock(text) ? "stylesheet" : "rule";
    var result = filterContainer(text, sourceUnit, context, 0);

    return {
      text: result.text,
      stats: result.stats,
      removedRanges: result.removedRanges
    };
  }

  function byteSize(text) {
    if (global.TextEncoder) {
      return new global.TextEncoder().encode(text).length;
    }
    return unescape(encodeURIComponent(text)).length;
  }

  function formatBytes(bytes) {
    if (bytes < 1024) {
      return bytes + " B";
    }
    if (bytes < 1024 * 1024) {
      return formatNumber(bytes / 1024, 1) + " KB";
    }
    return formatNumber(bytes / (1024 * 1024), 1) + " MB";
  }

  var CLASS_ATTRIBUTE_TYPO_PATTERN = /\b(calas|calss|claas|clas|clss|classs|cass)\b/gi;

  var KNOWN_AT_RULES = {
    charset: true,
    import: true,
    namespace: true,
    layer: true,
    media: true,
    supports: true,
    container: true,
    scope: true,
    document: true,
    "starting-style": true,
    keyframes: true,
    "-webkit-keyframes": true,
    "-moz-keyframes": true,
    "font-face": true,
    page: true,
    property: true,
    "counter-style": true,
    "font-feature-values": true,
    "font-palette-values": true,
    viewport: true,
    "-ms-viewport": true
  };

  function maskNonCodeRanges(text) {
    var characters = text.split("");
    var index = 0;

    function maskRange(start, end) {
      var cursor;
      for (cursor = start; cursor < end; cursor += 1) {
        if (characters[cursor] !== "\n" && characters[cursor] !== "\r") {
          characters[cursor] = " ";
        }
      }
    }

    while (index < text.length) {
      var character = text.charAt(index);

      if (character === "/" && text.charAt(index + 1) === "*") {
        var commentEnd = readComment(text, index);
        maskRange(index, commentEnd);
        index = commentEnd;
        continue;
      }

      if (character === "\"" || character === "'") {
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

    return characters.join("");
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
      while (/\s/.test(masked.charAt(cursor))) {
        cursor += 1;
      }

      var nextCharacter = masked.charAt(cursor);
      var insideAttributeSelector = isInsideOpenRange(masked, match.index, "[", "]");
      var insideHtmlTag = isInsideOpenRange(masked, match.index, "<", ">");
      var looksLikeAttribute = nextCharacter === "=" || ((insideAttributeSelector || insideHtmlTag) && (nextCharacter === "]" || nextCharacter === ">" || nextCharacter === "/"));

      if (!looksLikeAttribute) {
        continue;
      }

      collector.add(
        "warning",
        "class-attribute-typo",
        "속성명 '" + typo + "'는 'class' 오타로 보입니다. HTML에서는 'class=\"...\"', CSS 클래스 선택자는 '.이름' 형식을 사용하세요.",
        match.index,
        typo.length,
        "class"
      );
    }
  }

  function buildLineStarts(text) {
    var starts = [0];
    var index;

    for (index = 0; index < text.length; index += 1) {
      if (text.charAt(index) === "\n") {
        starts.push(index + 1);
      }
    }

    return starts;
  }

  function locateOffset(lineStarts, offset) {
    var low = 0;
    var high = lineStarts.length - 1;

    while (low <= high) {
      var middle = Math.floor((low + high) / 2);
      if (lineStarts[middle] <= offset) {
        low = middle + 1;
      } else {
        high = middle - 1;
      }
    }

    var lineIndex = Math.max(0, high);
    return {
      line: lineIndex + 1,
      column: offset - lineStarts[lineIndex] + 1
    };
  }

  function trimRange(text, start, end) {
    while (start < end && /\s/.test(text.charAt(start))) {
      start += 1;
    }
    while (end > start && /\s/.test(text.charAt(end - 1))) {
      end -= 1;
    }
    return { start: start, end: end };
  }

  function createIssueCollector(text, maxIssues) {
    var issues = [];
    var keys = Object.create(null);
    var limit = Number.isFinite(maxIssues) ? Math.max(1, maxIssues) : 100;

    function add(severity, code, message, offset, length, suggestion) {
      if (issues.length >= limit) {
        return;
      }

      var safeOffset = Math.max(0, Math.min(text.length, Number(offset) || 0));
      var safeLength = Math.max(1, Number(length) || 1);
      var key = severity + "|" + code + "|" + safeOffset + "|" + message;
      if (keys[key]) {
        return;
      }
      keys[key] = true;

      issues.push({
        severity: severity === "warning" ? "warning" : "error",
        code: code,
        message: message,
        offset: safeOffset,
        length: safeLength,
        suggestion: suggestion || ""
      });
    }

    return { issues: issues, add: add, limit: limit };
  }

  function validateLexicalStructure(text, collector) {
    var stack = [];
    var pairs = { ")": "(", "]": "[", "}": "{" };
    var names = { "(": "괄호", "[": "대괄호", "{": "중괄호" };
    var index = 0;

    while (index < text.length) {
      var character = text.charAt(index);

      if (character === "/" && text.charAt(index + 1) === "*") {
        var commentEnd = text.indexOf("*/", index + 2);
        if (commentEnd === -1) {
          collector.add("error", "unclosed-comment", "CSS 주석이 닫히지 않았습니다. '*/'를 추가하세요.", index, 2, "*/");
          return;
        }
        index = commentEnd + 2;
        continue;
      }

      if (character === "\"" || character === "'") {
        var quote = character;
        var stringStart = index;
        var closed = false;
        index += 1;

        while (index < text.length) {
          var stringCharacter = text.charAt(index);
          if (stringCharacter === "\\") {
            index += 2;
            continue;
          }
          if (stringCharacter === quote) {
            closed = true;
            index += 1;
            break;
          }
          if (stringCharacter === "\n" || stringCharacter === "\r") {
            collector.add("error", "newline-in-string", "문자열이 줄바꿈 전에 닫히지 않았습니다.", stringStart, Math.max(1, index - stringStart), quote);
            break;
          }
          index += 1;
        }

        if (!closed && index >= text.length) {
          collector.add("error", "unclosed-string", "따옴표 문자열이 닫히지 않았습니다.", stringStart, Math.max(1, text.length - stringStart), quote);
        }
        continue;
      }

      if (character === "(" || character === "[" || character === "{") {
        stack.push({ character: character, offset: index });
      } else if (character === ")" || character === "]" || character === "}") {
        if (!stack.length) {
          collector.add("error", "unexpected-closing-token", "짝이 없는 닫는 기호 '" + character + "'가 있습니다.", index, 1);
        } else {
          var open = stack[stack.length - 1];
          if (open.character === pairs[character]) {
            stack.pop();
          } else {
            collector.add("error", "mismatched-closing-token", "'" + open.character + "'와 '" + character + "'의 짝이 맞지 않습니다.", index, 1, open.character === "(" ? ")" : open.character === "[" ? "]" : "}");
            stack.pop();
          }
        }
      }

      index += 1;
    }

    stack.slice(-20).forEach(function (open) {
      var close = open.character === "(" ? ")" : open.character === "[" ? "]" : "}";
      collector.add("error", "unclosed-token", names[open.character] + " '" + open.character + "'가 닫히지 않았습니다.", open.offset, 1, close);
    });
  }

  function findTopLevelCharacter(text, target, startIndex) {
    var parenthesisDepth = 0;
    var bracketDepth = 0;
    var index = startIndex || 0;

    while (index < text.length) {
      var character = text.charAt(index);

      if (character === "/" && text.charAt(index + 1) === "*") {
        index = readComment(text, index);
        continue;
      }
      if (character === "\"" || character === "'") {
        index = readString(text, index);
        continue;
      }
      if (character === "(") {
        parenthesisDepth += 1;
      } else if (character === ")") {
        parenthesisDepth = Math.max(0, parenthesisDepth - 1);
      } else if (character === "[") {
        bracketDepth += 1;
      } else if (character === "]") {
        bracketDepth = Math.max(0, bracketDepth - 1);
      } else if (parenthesisDepth === 0 && bracketDepth === 0 && character === target) {
        return index;
      }
      index += 1;
    }

    return -1;
  }

  function propertyNameLooksValid(property) {
    if (/^--[^\s:;{}]+$/.test(property)) {
      return true;
    }
    return /^-?(?:[a-zA-Z_]|[^\x00-\x7F])[^\s:;{}]*$/.test(property);
  }

  function atRuleName(prelude) {
    var match = prelude.match(/^\s*@(-?[a-zA-Z][a-zA-Z0-9-]*)/);
    return match ? match[1].toLowerCase() : "";
  }

  function validateAtRule(prelude, absoluteOffset, collector) {
    var name = atRuleName(prelude);
    if (!name) {
      collector.add("error", "invalid-at-rule", "@ 규칙 이름을 확인하세요.", absoluteOffset, Math.max(1, prelude.length));
      return;
    }

    if (!KNOWN_AT_RULES[name] && name.charAt(0) !== "-") {
      collector.add("warning", "unknown-at-rule", "알 수 없는 @ 규칙 '@" + name + "'입니다. 오타인지 확인하세요.", absoluteOffset, name.length + 1);
    }
  }

  function probablePropertyBeforeColon(statement, colonIndex, valueStart) {
    var end = colonIndex;
    var start = end;

    while (start > valueStart && /[a-zA-Z0-9_-]/.test(statement.charAt(start - 1))) {
      start -= 1;
    }

    var property = statement.slice(start, end);
    var before = statement.slice(valueStart, start);
    if (!property || !/\s/.test(statement.charAt(start - 1)) || !before.trim()) {
      return null;
    }

    return propertyNameLooksValid(property) ? { property: property, start: start } : null;
  }

  function validateDeclarationStatement(statement, absoluteOffset, collector, declarations) {
    var range = trimRange(statement, 0, statement.length);
    if (range.start >= range.end) {
      return;
    }

    var content = statement.slice(range.start, range.end);
    var contentOffset = absoluteOffset + range.start;

    if (content.charAt(content.length - 1) === ";") {
      content = content.slice(0, -1);
    }

    var cleaned = content.replace(/\/\*[\s\S]*?\*\//g, function (comment) {
      return new Array(comment.length + 1).join(" ");
    });
    var cleanedRange = trimRange(cleaned, 0, cleaned.length);
    if (cleanedRange.start >= cleanedRange.end) {
      return;
    }

    if (cleaned.slice(cleanedRange.start).charAt(0) === "@") {
      validateAtRule(cleaned.slice(cleanedRange.start, cleanedRange.end), contentOffset + cleanedRange.start, collector);
      return;
    }

    var colonIndex = findTopLevelCharacter(cleaned, ":", cleanedRange.start);
    if (colonIndex === -1 || colonIndex >= cleanedRange.end) {
      collector.add("error", "missing-colon", "속성명과 값 사이에 ':'가 없습니다.", contentOffset + cleanedRange.start, Math.max(1, cleanedRange.end - cleanedRange.start), ":");
      return;
    }

    var propertyRange = trimRange(cleaned, cleanedRange.start, colonIndex);
    var valueRange = trimRange(cleaned, colonIndex + 1, cleanedRange.end);
    var property = cleaned.slice(propertyRange.start, propertyRange.end);
    var value = content.slice(valueRange.start, valueRange.end).trim();

    if (!property) {
      collector.add("error", "missing-property", "CSS 속성명이 비어 있습니다.", contentOffset + colonIndex, 1);
      return;
    }

    if (!propertyNameLooksValid(property)) {
      collector.add("error", "invalid-property-name", "CSS 속성명 '" + property + "'의 형식이 올바르지 않습니다.", contentOffset + propertyRange.start, Math.max(1, property.length));
    }

    if (!value) {
      collector.add("error", "missing-value", "'" + property + "' 속성값이 비어 있습니다.", contentOffset + colonIndex + 1, 1);
    }

    var importantMatch = value.match(/!\s*([a-zA-Z-]+)\s*$/);
    if (importantMatch && importantMatch[1].toLowerCase() !== "important") {
      var importantOffset = Math.max(0, value.lastIndexOf("!"));
      collector.add(
        "error",
        "important-typo",
        "'!important' 철자가 올바르지 않습니다.",
        contentOffset + valueRange.start + importantOffset,
        Math.max(1, importantMatch[0].length),
        "!important"
      );
    }

    var nextColon = findTopLevelCharacter(cleaned, ":", colonIndex + 1);
    if (nextColon !== -1 && nextColon < cleanedRange.end) {
      var probable = probablePropertyBeforeColon(cleaned, nextColon, colonIndex + 1);
      if (probable) {
        collector.add("error", "missing-semicolon", "'" + probable.property + "' 앞 선언 끝에 ';'가 빠졌을 수 있습니다.", contentOffset + probable.start, probable.property.length, ";");
      }
    }

    declarations.push({
      property: property,
      value: value.replace(/\s*!\s*[a-zA-Z-]+\s*$/i, "").trim(),
      propertyOffset: contentOffset + propertyRange.start,
      propertyLength: Math.max(1, property.length),
      valueOffset: contentOffset + valueRange.start,
      valueLength: Math.max(1, valueRange.end - valueRange.start)
    });
  }

  function validateContainerSyntax(text, context, baseOffset, collector, declarations) {
    var cursor = 0;

    while (cursor < text.length && collector.issues.length < collector.limit) {
      var token = findNextTopLevelToken(text, cursor);

      if (!token) {
        var trailingRange = trimRange(text, cursor, text.length);
        if (trailingRange.start < trailingRange.end) {
          var trailing = text.slice(trailingRange.start, trailingRange.end);
          if (context === "rule") {
            validateDeclarationStatement(trailing, baseOffset + trailingRange.start, collector, declarations);
          } else if (trailing.charAt(0) === "@") {
            validateAtRule(trailing, baseOffset + trailingRange.start, collector);
          } else {
            collector.add("error", "missing-rule-block", "선택자 뒤에 '{ ... }' 규칙 블록이 필요합니다.", baseOffset + trailingRange.start, Math.max(1, trailing.length), "{}");
          }
        }
        break;
      }

      if (token.token === ";") {
        var statement = text.slice(cursor, token.index + 1);
        var statementRange = trimRange(statement, 0, statement.length);
        if (statementRange.start < statementRange.end) {
          var normalized = statement.slice(statementRange.start, statementRange.end);
          if (context === "stylesheet" && normalized.replace(/^\/\*[\s\S]*?\*\/\s*/, "").charAt(0) !== "@") {
            collector.add("error", "declaration-outside-rule", "CSS 선언이 선택자 블록 밖에 있습니다.", baseOffset + cursor + statementRange.start, Math.max(1, normalized.length));
          } else {
            validateDeclarationStatement(statement, baseOffset + cursor, collector, declarations);
          }
        }
        cursor = token.index + 1;
        continue;
      }

      var closeIndex = findMatchingBrace(text, token.index);
      var preludeRange = trimRange(text, cursor, token.index);
      var prelude = text.slice(preludeRange.start, preludeRange.end);

      if (!prelude) {
        collector.add("error", "missing-rule-prelude", "'{' 앞에 선택자 또는 @ 규칙이 없습니다.", baseOffset + token.index, 1);
      } else if (prelude.charAt(0) === "@") {
        validateAtRule(prelude, baseOffset + preludeRange.start, collector);
      }

      if (closeIndex === -1) {
        break;
      }

      var body = text.slice(token.index + 1, closeIndex);
      var childContext = isGroupingAtRule(prelude, body) ? "stylesheet" : "rule";
      validateContainerSyntax(body, childContext, baseOffset + token.index + 1, collector, declarations);
      cursor = closeIndex + 1;
    }
  }

  function validateCssSyntax(text, options) {
    var source = typeof text === "string" ? text : "";
    var settings = options || {};
    var collector = createIssueCollector(source, settings.maxIssues);
    var declarations = [];

    if (!source.trim()) {
      return {
        valid: true,
        errors: 0,
        warnings: 0,
        issues: [],
        declarations: []
      };
    }

    validateLexicalStructure(source, collector);
    validateClassAttributeTypos(source, collector);
    validateContainerSyntax(source, hasTopLevelBlock(source) ? "stylesheet" : "rule", 0, collector, declarations);

    if (typeof settings.declarationValidator === "function") {
      declarations.forEach(function (declaration) {
        var extraIssues;
        try {
          extraIssues = settings.declarationValidator(declaration) || [];
        } catch (error) {
          extraIssues = [];
        }

        if (!Array.isArray(extraIssues)) {
          extraIssues = [extraIssues];
        }

        extraIssues.forEach(function (issue) {
          if (!issue || !issue.message) {
            return;
          }
          var target = issue.target === "value" ? "value" : "property";
          collector.add(
            issue.severity === "error" ? "error" : "warning",
            issue.code || "declaration-warning",
            issue.message,
            target === "value" ? declaration.valueOffset : declaration.propertyOffset,
            target === "value" ? declaration.valueLength : declaration.propertyLength,
            issue.suggestion || ""
          );
        });
      });
    }

    var lineStarts = buildLineStarts(source);
    collector.issues.sort(function (left, right) {
      if (left.offset !== right.offset) {
        return left.offset - right.offset;
      }
      return left.severity === right.severity ? 0 : left.severity === "error" ? -1 : 1;
    });

    collector.issues.forEach(function (issue) {
      var location = locateOffset(lineStarts, issue.offset);
      issue.line = location.line;
      issue.column = location.column;
    });

    var errors = collector.issues.filter(function (issue) {
      return issue.severity === "error";
    }).length;
    var warnings = collector.issues.length - errors;

    return {
      valid: errors === 0,
      errors: errors,
      warnings: warnings,
      issues: collector.issues,
      declarations: declarations
    };
  }

  global.PXVWCore = {
    parseFiniteNumber: parseFiniteNumber,
    formatNumber: formatNumber,
    scanAndTransformUnits: scanAndTransformUnits,
    filterMatchingDeclarations: filterMatchingDeclarations,
    byteSize: byteSize,
    formatBytes: formatBytes,
    validateCssSyntax: validateCssSyntax
  };
}(window));
