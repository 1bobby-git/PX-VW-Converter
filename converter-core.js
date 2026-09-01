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

  function indentText(text, spaces) {
    var indentation = new Array(spaces + 1).join(" ");
    return text.split("\n").map(function (line) {
      return line ? indentation + line : line;
    }).join("\n");
  }

  function cleanPrelude(prelude) {
    return prelude.replace(/^\s+|\s+$/g, "");
  }

  function filterContainer(text, sourceUnit, context, depth) {
    var cursor = 0;
    var outputParts = [];
    var stats = {
      totalDeclarations: 0,
      keptDeclarations: 0,
      removedDeclarations: 0,
      removedRules: 0
    };

    while (cursor < text.length) {
      var token = findNextTopLevelToken(text, cursor);

      if (!token) {
        var trailing = text.slice(cursor).trim();
        if (trailing) {
          if (context === "stylesheet" && trailing.charAt(0) === "@") {
            outputParts.push(trailing);
          } else if (context === "rule") {
            stats.totalDeclarations += 1;
            if (hasConvertibleUnit(trailing, sourceUnit)) {
              stats.keptDeclarations += 1;
              outputParts.push(trailing.replace(/;?\s*$/, ";"));
            } else {
              stats.removedDeclarations += 1;
            }
          }
        }
        break;
      }

      if (token.token === ";") {
        var statement = text.slice(cursor, token.index + 1).trim();
        cursor = token.index + 1;

        if (!statement) {
          continue;
        }

        if (context === "stylesheet" && statement.replace(/^\/\*[\s\S]*?\*\/\s*/, "").charAt(0) === "@") {
          outputParts.push(statement);
          continue;
        }

        stats.totalDeclarations += 1;
        if (hasConvertibleUnit(statement, sourceUnit)) {
          stats.keptDeclarations += 1;
          outputParts.push(statement);
        } else {
          stats.removedDeclarations += 1;
        }
        continue;
      }

      var closeIndex = findMatchingBrace(text, token.index);
      if (closeIndex === -1) {
        var fallback = text.slice(cursor).trim();
        if (fallback && hasConvertibleUnit(fallback, sourceUnit)) {
          outputParts.push(fallback);
        }
        break;
      }

      var prelude = cleanPrelude(text.slice(cursor, token.index));
      var body = text.slice(token.index + 1, closeIndex);
      var childContext = isGroupingAtRule(prelude, body) ? "stylesheet" : "rule";
      var childResult = filterContainer(body, sourceUnit, childContext, depth + 1);

      stats.totalDeclarations += childResult.stats.totalDeclarations;
      stats.keptDeclarations += childResult.stats.keptDeclarations;
      stats.removedDeclarations += childResult.stats.removedDeclarations;
      stats.removedRules += childResult.stats.removedRules;

      if (prelude && childResult.text.trim()) {
        outputParts.push(prelude + " {\n" + indentText(childResult.text.trim(), 2) + "\n}");
      } else if (prelude) {
        stats.removedRules += 1;
      }

      cursor = closeIndex + 1;
    }

    return {
      text: outputParts.join(context === "stylesheet" ? "\n\n" : "\n"),
      stats: stats
    };
  }

  function filterMatchingDeclarations(text, sourceUnit) {
    var context = hasTopLevelBlock(text) ? "stylesheet" : "rule";
    return filterContainer(text, sourceUnit, context, 0);
  }

  function byteSize(text) {
    if (window.TextEncoder) {
      return new TextEncoder().encode(text).length;
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

  global.PXVWCore = {
    parseFiniteNumber: parseFiniteNumber,
    formatNumber: formatNumber,
    scanAndTransformUnits: scanAndTransformUnits,
    filterMatchingDeclarations: filterMatchingDeclarations,
    byteSize: byteSize,
    formatBytes: formatBytes
  };
}(window));
