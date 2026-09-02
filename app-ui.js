(function () {
  "use strict";

  var core = window.PXVWCore;
  if (!core) {
    throw new Error("PXVWCore가 로드되지 않았습니다.");
  }

  var STORAGE_KEY = "pxvw-converter-settings-v3";
  var MAX_FILE_SIZE = 2 * 1024 * 1024;
  var liveUpdateFrame = null;
  var inputHighlightResizeObserver = null;
  var toastTimer = null;
  var currentFileName = "";

  var COMMON_PROPERTIES = [
    "accent-color", "align-content", "align-items", "align-self", "all", "animation", "animation-composition", "animation-delay", "animation-direction", "animation-duration", "animation-fill-mode", "animation-iteration-count", "animation-name", "animation-play-state", "animation-range", "animation-range-end", "animation-range-start", "animation-timeline", "animation-timing-function", "appearance", "aspect-ratio", "backdrop-filter", "backface-visibility", "background", "background-attachment", "background-blend-mode", "background-clip", "background-color", "background-image", "background-origin", "background-position", "background-position-x", "background-position-y", "background-repeat", "background-size", "block-size", "border", "border-block", "border-block-color", "border-block-end", "border-block-end-color", "border-block-end-style", "border-block-end-width", "border-block-start", "border-block-start-color", "border-block-start-style", "border-block-start-width", "border-block-style", "border-block-width", "border-bottom", "border-bottom-color", "border-bottom-left-radius", "border-bottom-right-radius", "border-bottom-style", "border-bottom-width", "border-collapse", "border-color", "border-end-end-radius", "border-end-start-radius", "border-image", "border-image-outset", "border-image-repeat", "border-image-slice", "border-image-source", "border-image-width", "border-inline", "border-inline-color", "border-inline-end", "border-inline-end-color", "border-inline-end-style", "border-inline-end-width", "border-inline-start", "border-inline-start-color", "border-inline-start-style", "border-inline-start-width", "border-inline-style", "border-inline-width", "border-left", "border-left-color", "border-left-style", "border-left-width", "border-radius", "border-right", "border-right-color", "border-right-style", "border-right-width", "border-spacing", "border-start-end-radius", "border-start-start-radius", "border-style", "border-top", "border-top-color", "border-top-left-radius", "border-top-right-radius", "border-top-style", "border-top-width", "border-width", "bottom", "box-decoration-break", "box-shadow", "box-sizing", "break-after", "break-before", "break-inside", "caption-side", "caret-color", "clear", "clip", "clip-path", "color", "color-scheme", "column-count", "column-fill", "column-gap", "column-rule", "column-rule-color", "column-rule-style", "column-rule-width", "column-span", "column-width", "columns", "contain", "contain-intrinsic-block-size", "contain-intrinsic-height", "contain-intrinsic-inline-size", "contain-intrinsic-size", "contain-intrinsic-width", "container", "container-name", "container-type", "content", "content-visibility", "counter-increment", "counter-reset", "counter-set", "cursor", "direction", "display", "empty-cells", "filter", "flex", "flex-basis", "flex-direction", "flex-flow", "flex-grow", "flex-shrink", "flex-wrap", "float", "font", "font-family", "font-feature-settings", "font-kerning", "font-optical-sizing", "font-palette", "font-size", "font-size-adjust", "font-stretch", "font-style", "font-synthesis", "font-variant", "font-variant-caps", "font-variant-east-asian", "font-variant-ligatures", "font-variant-numeric", "font-weight", "gap", "grid", "grid-area", "grid-auto-columns", "grid-auto-flow", "grid-auto-rows", "grid-column", "grid-column-end", "grid-column-gap", "grid-column-start", "grid-gap", "grid-row", "grid-row-end", "grid-row-gap", "grid-row-start", "grid-template", "grid-template-areas", "grid-template-columns", "grid-template-rows", "height", "hyphens", "image-rendering", "inline-size", "inset", "inset-block", "inset-block-end", "inset-block-start", "inset-inline", "inset-inline-end", "inset-inline-start", "isolation", "justify-content", "justify-items", "justify-self", "left", "letter-spacing", "line-break", "line-height", "list-style", "list-style-image", "list-style-position", "list-style-type", "margin", "margin-block", "margin-block-end", "margin-block-start", "margin-bottom", "margin-inline", "margin-inline-end", "margin-inline-start", "margin-left", "margin-right", "margin-top", "mask", "mask-clip", "mask-composite", "mask-image", "mask-mode", "mask-origin", "mask-position", "mask-repeat", "mask-size", "mask-type", "max-block-size", "max-height", "max-inline-size", "max-width", "min-block-size", "min-height", "min-inline-size", "min-width", "mix-blend-mode", "object-fit", "object-position", "offset", "offset-anchor", "offset-distance", "offset-path", "offset-position", "offset-rotate", "opacity", "order", "orphans", "outline", "outline-color", "outline-offset", "outline-style", "outline-width", "overflow", "overflow-anchor", "overflow-block", "overflow-clip-margin", "overflow-inline", "overflow-wrap", "overflow-x", "overflow-y", "overscroll-behavior", "overscroll-behavior-block", "overscroll-behavior-inline", "overscroll-behavior-x", "overscroll-behavior-y", "padding", "padding-block", "padding-block-end", "padding-block-start", "padding-bottom", "padding-inline", "padding-inline-end", "padding-inline-start", "padding-left", "padding-right", "padding-top", "perspective", "perspective-origin", "place-content", "place-items", "place-self", "pointer-events", "position", "quotes", "resize", "right", "rotate", "row-gap", "scale", "scroll-behavior", "scroll-margin", "scroll-margin-block", "scroll-margin-block-end", "scroll-margin-block-start", "scroll-margin-bottom", "scroll-margin-inline", "scroll-margin-inline-end", "scroll-margin-inline-start", "scroll-margin-left", "scroll-margin-right", "scroll-margin-top", "scroll-padding", "scroll-padding-block", "scroll-padding-block-end", "scroll-padding-block-start", "scroll-padding-bottom", "scroll-padding-inline", "scroll-padding-inline-end", "scroll-padding-inline-start", "scroll-padding-left", "scroll-padding-right", "scroll-padding-top", "scroll-snap-align", "scroll-snap-stop", "scroll-snap-type", "scrollbar-color", "scrollbar-gutter", "scrollbar-width", "shape-outside", "tab-size", "table-layout", "text-align", "text-align-last", "text-combine-upright", "text-decoration", "text-decoration-color", "text-decoration-line", "text-decoration-style", "text-decoration-thickness", "text-emphasis", "text-indent", "text-justify", "text-orientation", "text-overflow", "text-rendering", "text-shadow", "text-transform", "text-underline-offset", "text-underline-position", "top", "touch-action", "transform", "transform-box", "transform-origin", "transform-style", "transition", "transition-behavior", "transition-delay", "transition-duration", "transition-property", "transition-timing-function", "translate", "unicode-bidi", "user-select", "vertical-align", "visibility", "white-space", "white-space-collapse", "widows", "width", "will-change", "word-break", "word-spacing", "word-wrap", "writing-mode", "z-index", "zoom"
  ];

  var VALUE_CANDIDATES = {
    "align-items": ["normal", "stretch", "center", "start", "end", "flex-start", "flex-end", "self-start", "self-end", "baseline"],
    "box-sizing": ["content-box", "border-box"],
    "display": ["none", "contents", "block", "inline", "inline-block", "flow-root", "flex", "inline-flex", "grid", "inline-grid", "table", "table-row", "table-cell", "list-item"],
    "flex-direction": ["row", "row-reverse", "column", "column-reverse"],
    "justify-content": ["normal", "start", "end", "center", "left", "right", "flex-start", "flex-end", "space-between", "space-around", "space-evenly", "stretch"],
    "object-fit": ["fill", "contain", "cover", "none", "scale-down"],
    "overflow": ["visible", "hidden", "clip", "scroll", "auto"],
    "overflow-x": ["visible", "hidden", "clip", "scroll", "auto"],
    "overflow-y": ["visible", "hidden", "clip", "scroll", "auto"],
    "position": ["static", "relative", "absolute", "fixed", "sticky"],
    "text-align": ["start", "end", "left", "right", "center", "justify", "match-parent"],
    "visibility": ["visible", "hidden", "collapse"],
    "white-space": ["normal", "pre", "nowrap", "pre-wrap", "pre-line", "break-spaces"],
    "word-break": ["normal", "break-all", "keep-all", "break-word"]
  };

  function byId(id) {
    return document.getElementById(id);
  }

  var elements = {
    viewportWidth: byId("viewportWidth"),
    viewportError: byId("viewportError"),
    precision: byId("precision"),
    presetButtons: Array.prototype.slice.call(document.querySelectorAll(".preset-chip")),
    pxToVwForm: byId("pxToVwForm"),
    vwToPxForm: byId("vwToPxForm"),
    pxInput: byId("pxInput"),
    vwInput: byId("vwInput"),
    vwOutput: byId("vwOutput"),
    pxOutput: byId("pxOutput"),
    pxFormula: byId("pxFormula"),
    vwFormula: byId("vwFormula"),
    btnCopyVw: byId("btnCopyVw"),
    btnCopyPx: byId("btnCopyPx"),
    btnClearPx: byId("btnClearPx"),
    btnClearVw: byId("btnClearVw"),
    directionPxVw: byId("directionPxVw"),
    directionVwPx: byId("directionVwPx"),
    onlyMatchingDeclarations: byId("onlyMatchingDeclarations"),
    stripZeroUnit: byId("stripZeroUnit"),
    cssInputEditor: byId("cssInputEditor"),
    cssInputHighlight: byId("cssInputHighlight"),
    cssInput: byId("cssInput"),
    cssOutput: byId("cssOutput"),
    inputPane: byId("inputPane"),
    cssFileInput: byId("cssFileInput"),
    btnOpenFile: byId("btnOpenFile"),
    btnInsertSample: byId("btnInsertSample"),
    btnClearCss: byId("btnClearCss"),
    btnCopyCss: byId("btnCopyCss"),
    btnDownloadCss: byId("btnDownloadCss"),
    btnConvertCss: byId("btnConvertCss"),
    convertCssLabel: byId("convertCssLabel"),
    inputFileName: byId("inputFileName"),
    inputCharCount: byId("inputCharCount"),
    unconvertedLegend: byId("unconvertedLegend"),
    outputDirection: byId("outputDirection"),
    outputCharCount: byId("outputCharCount"),
    convertedCount: byId("convertedCount"),
    removedCount: byId("removedCount"),
    outputSize: byId("outputSize"),
    validationPanel: byId("cssValidation"),
    validationSummary: byId("validationSummary"),
    validationCount: byId("validationCount"),
    validationList: byId("validationList"),
    validationMore: byId("validationMore"),
    realtimeStatus: byId("realtimeStatus"),
    toast: byId("toast")
  };

  var propertyCatalog = createPropertyCatalog();
  var propertyNames = Object.keys(propertyCatalog);

  function getViewportWidth(showError) {
    var value = core.parseFiniteNumber(elements.viewportWidth.value);
    var isValid = value !== null && value > 0;

    elements.viewportWidth.setAttribute("aria-invalid", isValid ? "false" : "true");
    elements.viewportError.hidden = isValid || !showError;

    return isValid ? value : null;
  }

  function getPrecision() {
    var value = parseInt(elements.precision.value, 10);
    if (!Number.isFinite(value)) {
      return 2;
    }
    return Math.min(6, Math.max(0, value));
  }

  function setOutput(outputElement, copyButton, value) {
    var hasValue = Boolean(value);
    outputElement.textContent = hasValue ? value : "—";
    copyButton.disabled = !hasValue;
    copyButton.dataset.copyValue = hasValue ? value : "";
  }

  function updateSingleConversions(showViewportError) {
    var viewport = getViewportWidth(Boolean(showViewportError));
    var precision = getPrecision();

    elements.pxFormula.textContent = "PX ÷ " + (viewport || "—") + " × 100";
    elements.vwFormula.textContent = "VW ÷ 100 × " + (viewport || "—");

    if (!viewport) {
      setOutput(elements.vwOutput, elements.btnCopyVw, "");
      setOutput(elements.pxOutput, elements.btnCopyPx, "");
      return;
    }

    var pxValue = core.parseFiniteNumber(elements.pxInput.value);
    var vwValue = core.parseFiniteNumber(elements.vwInput.value);

    setOutput(
      elements.vwOutput,
      elements.btnCopyVw,
      pxValue === null ? "" : core.formatNumber((pxValue / viewport) * 100, precision) + "vw"
    );

    setOutput(
      elements.pxOutput,
      elements.btnCopyPx,
      vwValue === null ? "" : core.formatNumber((vwValue / 100) * viewport, precision) + "px"
    );
  }

  function getDirection() {
    return elements.directionVwPx.checked ? "vw-px" : "px-vw";
  }

  function getDirectionConfig() {
    var direction = getDirection();

    if (direction === "vw-px") {
      return {
        direction: direction,
        sourceUnit: "vw",
        targetUnit: "px",
        label: "VW를 PX로 변환",
        shortLabel: "VW → PX"
      };
    }

    return {
      direction: direction,
      sourceUnit: "px",
      targetUnit: "vw",
      label: "PX를 VW로 변환",
      shortLabel: "PX → VW"
    };
  }

  function normalizeHighlightRanges(ranges, sourceLength) {
    var candidates = [];
    var normalized = [];

    if (!Array.isArray(ranges)) {
      return normalized;
    }

    ranges.forEach(function (range) {
      var start = range ? Number(range.start) : NaN;
      var end = range ? Number(range.end) : NaN;

      if (!Number.isFinite(start) || !Number.isFinite(end)) {
        return;
      }

      start = Math.max(0, Math.min(sourceLength, Math.floor(start)));
      end = Math.max(0, Math.min(sourceLength, Math.ceil(end)));

      if (end > start) {
        candidates.push({ start: start, end: end });
      }
    });

    candidates.sort(function (left, right) {
      return left.start - right.start || left.end - right.end;
    });

    candidates.forEach(function (range) {
      var previous = normalized[normalized.length - 1];

      if (previous && range.start <= previous.end) {
        previous.end = Math.max(previous.end, range.end);
      } else {
        normalized.push(range);
      }
    });

    return normalized;
  }

  function syncInputHighlightGeometry() {
    if (!elements.cssInput || !elements.cssInputHighlight) {
      return;
    }

    var width = elements.cssInput.clientWidth;
    var height = Math.max(elements.cssInput.scrollHeight, elements.cssInput.clientHeight);

    elements.cssInputHighlight.style.width = width + "px";
    elements.cssInputHighlight.style.height = height + "px";
    elements.cssInputHighlight.style.transform = "translate3d(" +
      (-elements.cssInput.scrollLeft) + "px, " +
      (-elements.cssInput.scrollTop) + "px, 0)";
  }

  function renderInputHighlight(source, ranges) {
    var text = typeof source === "string" ? source : "";
    var normalized = normalizeHighlightRanges(ranges, text.length);
    var fragment = document.createDocumentFragment();
    var cursor = 0;

    normalized.forEach(function (range) {
      if (range.start > cursor) {
        fragment.appendChild(document.createTextNode(text.slice(cursor, range.start)));
      }

      var highlight = document.createElement("span");
      highlight.className = "is-unconverted";
      highlight.textContent = text.slice(range.start, range.end);
      fragment.appendChild(highlight);
      cursor = range.end;
    });

    if (cursor < text.length) {
      fragment.appendChild(document.createTextNode(text.slice(cursor)));
    }

    if (text && /(?:\r\n|\r|\n)$/.test(text)) {
      var sentinel = document.createElement("span");
      sentinel.className = "editor-highlight-sentinel";
      sentinel.textContent = "\u200b";
      fragment.appendChild(sentinel);
    }

    elements.cssInputHighlight.textContent = "";
    elements.cssInputHighlight.appendChild(fragment);
    elements.cssInputEditor.classList.add("is-highlight-ready");
    elements.unconvertedLegend.hidden = normalized.length === 0;
    elements.unconvertedLegend.textContent = normalized.length + "개 출력 제외";
    syncInputHighlightGeometry();
  }

  function updateWorkspaceMeta(resultStats) {
    var inputText = elements.cssInput.value || "";
    var outputText = elements.cssOutput.value || "";

    elements.inputCharCount.textContent = inputText.length.toLocaleString("ko-KR") + "자";
    elements.outputCharCount.textContent = outputText.length.toLocaleString("ko-KR") + "자";
    elements.convertedCount.textContent = String(resultStats ? resultStats.convertedCount : 0);
    elements.removedCount.textContent = String(resultStats ? resultStats.removedDeclarations : 0);
    elements.outputSize.textContent = core.formatBytes(core.byteSize(outputText));
    elements.btnCopyCss.disabled = !outputText;
    elements.btnDownloadCss.disabled = !outputText;
  }

  function convertCss(showViewportError) {
    var source = elements.cssInput.value || "";
    var viewport = getViewportWidth(Boolean(showViewportError));
    var config = getDirectionConfig();
    var precision = getPrecision();
    var filtered = null;

    if (source.trim() && elements.onlyMatchingDeclarations.checked) {
      filtered = core.filterMatchingDeclarations(source, config.sourceUnit);
    }

    renderInputHighlight(source, filtered ? filtered.removedRanges : []);

    if (!source.trim() || !viewport) {
      elements.cssOutput.value = "";
      updateWorkspaceMeta(null);
      return;
    }

    var preparedSource = filtered ? filtered.text : source;
    var removedDeclarations = filtered ? filtered.stats.removedDeclarations : 0;

    var converted = core.scanAndTransformUnits(
      preparedSource,
      config,
      viewport,
      precision,
      elements.stripZeroUnit.checked,
      true
    );

    elements.cssOutput.value = converted.text;
    updateWorkspaceMeta({
      convertedCount: converted.count,
      removedDeclarations: removedDeclarations
    });
  }

  function camelToKebab(value) {
    return value
      .replace(/^webkit/i, "-webkit-")
      .replace(/^moz/i, "-moz-")
      .replace(/^ms/i, "-ms-")
      .replace(/^o(?=[A-Z])/i, "-o-")
      .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
      .toLowerCase();
  }

  function kebabToCamel(value) {
    return value.replace(/-([a-z])/g, function (all, letter) {
      return letter.toUpperCase();
    }).replace(/^Ms/, "ms");
  }

  function createPropertyCatalog() {
    var catalog = Object.create(null);
    var style = document.createElement("div").style;

    COMMON_PROPERTIES.forEach(function (property) {
      catalog[property] = true;
    });

    for (var key in style) {
      if (/^[a-zA-Z][a-zA-Z0-9]*$/.test(key) && typeof style[key] !== "function") {
        catalog[camelToKebab(key)] = true;
      }
    }

    return catalog;
  }

  function levenshtein(left, right) {
    if (left === right) {
      return 0;
    }
    if (!left.length) {
      return right.length;
    }
    if (!right.length) {
      return left.length;
    }

    var previous = [];
    var current = [];
    var i;
    var j;

    for (j = 0; j <= right.length; j += 1) {
      previous[j] = j;
    }

    for (i = 1; i <= left.length; i += 1) {
      current[0] = i;
      for (j = 1; j <= right.length; j += 1) {
        current[j] = Math.min(
          current[j - 1] + 1,
          previous[j] + 1,
          previous[j - 1] + (left.charAt(i - 1) === right.charAt(j - 1) ? 0 : 1)
        );
      }
      previous = current.slice();
    }

    return previous[right.length];
  }

  function isAdjacentTransposition(left, right) {
    if (left.length !== right.length) {
      return false;
    }

    var mismatches = [];
    var index;
    for (index = 0; index < left.length; index += 1) {
      if (left.charAt(index) !== right.charAt(index)) {
        mismatches.push(index);
        if (mismatches.length > 2) {
          return false;
        }
      }
    }

    return mismatches.length === 2
      && mismatches[1] === mismatches[0] + 1
      && left.charAt(mismatches[0]) === right.charAt(mismatches[1])
      && left.charAt(mismatches[1]) === right.charAt(mismatches[0]);
  }

  function nearestCandidate(value, candidates) {
    var normalized = String(value || "").toLowerCase();
    var best = "";
    var bestDistance = Infinity;

    candidates.forEach(function (candidate) {
      if (Math.abs(candidate.length - normalized.length) > 3) {
        return;
      }
      if (candidate.charAt(0) !== normalized.charAt(0) && normalized.length > 4) {
        return;
      }
      var distance = isAdjacentTransposition(normalized, candidate) ? 1 : levenshtein(normalized, candidate);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = candidate;
      }
    });

    var threshold = normalized.length <= 5 ? 1 : normalized.length <= 10 ? 2 : 3;
    return bestDistance <= threshold ? best : "";
  }

  function browserKnowsProperty(property) {
    if (!property || property.indexOf("--") === 0 || /^-(?:webkit|moz|ms|o)-/.test(property)) {
      return true;
    }

    if (propertyCatalog[property]) {
      return true;
    }

    var style = document.documentElement.style;
    if (kebabToCamel(property) in style) {
      return true;
    }

    if (window.CSS && typeof window.CSS.supports === "function") {
      try {
        return window.CSS.supports(property, "initial");
      } catch (error) {
        return false;
      }
    }

    return false;
  }

  function shouldSkipValueValidation(value) {
    return !value || /(?:var|env|attr|theme|constant)\s*\(/i.test(value) || /(?:\$[\w-]+|#\{|@\{)/.test(value) || /\\[0-9a-f]+/i.test(value);
  }

  function validateDeclarationInBrowser(declaration) {
    var property = declaration.property.toLowerCase();
    var value = declaration.value;
    var issues = [];
    var propertyKnown = browserKnowsProperty(property);

    if (!propertyKnown) {
      var suggestion = nearestCandidate(property, propertyNames);
      issues.push({
        severity: "warning",
        code: "unknown-property",
        target: "property",
        suggestion: suggestion,
        message: suggestion
          ? "알 수 없는 속성 '" + declaration.property + "'입니다. '" + suggestion + "' 오타인지 확인하세요."
          : "현재 브라우저가 속성 '" + declaration.property + "'을 인식하지 못합니다. 오타인지 확인하세요."
      });
      return issues;
    }

    if (!shouldSkipValueValidation(value) && window.CSS && typeof window.CSS.supports === "function") {
      var isSupported = true;
      try {
        isSupported = window.CSS.supports(property, value);
      } catch (error) {
        isSupported = true;
      }

      if (!isSupported) {
        var plainValue = value.trim().toLowerCase();
        var valueSuggestion = /^[a-z-]+$/.test(plainValue) && VALUE_CANDIDATES[property]
          ? nearestCandidate(plainValue, VALUE_CANDIDATES[property])
          : "";
        issues.push({
          severity: "warning",
          code: "unsupported-value",
          target: "value",
          suggestion: valueSuggestion,
          message: valueSuggestion
            ? "'" + property + "' 값 '" + value + "'을 인식하지 못했습니다. '" + valueSuggestion + "' 오타인지 확인하세요."
            : "현재 브라우저가 '" + property + ": " + value + "' 값을 유효한 CSS로 인식하지 못합니다."
        });
      }
    }

    return issues;
  }

  function renderValidation(result) {
    var source = elements.cssInput.value || "";
    var state = "valid";

    if (!source.trim()) {
      state = "empty";
      elements.validationSummary.textContent = "CSS 입력 대기";
      elements.validationCount.textContent = "입력과 동시에 문법을 검사합니다.";
      elements.realtimeStatus.textContent = "실시간 변환·검증 대기";
    } else if (result.errors > 0) {
      state = "error";
      elements.validationSummary.textContent = "CSS 문법 오류 " + result.errors + "개";
      elements.validationCount.textContent = result.warnings > 0 ? "경고 " + result.warnings + "개 포함" : "오류 위치를 선택해 확인하세요.";
      elements.realtimeStatus.textContent = "문법 오류 " + result.errors + "개";
    } else if (result.warnings > 0) {
      state = "warning";
      elements.validationSummary.textContent = "확인할 항목 " + result.warnings + "개";
      elements.validationCount.textContent = "브라우저 인식 여부와 오타 가능성을 확인하세요.";
      elements.realtimeStatus.textContent = "경고 " + result.warnings + "개";
    } else {
      elements.validationSummary.textContent = "CSS 문법 정상";
      elements.validationCount.textContent = "구조와 선언에서 오류를 찾지 못했습니다.";
      elements.realtimeStatus.textContent = "실시간 변환·검증 중";
    }

    elements.validationPanel.dataset.state = state;
    elements.cssInput.setAttribute("aria-invalid", result.errors > 0 ? "true" : "false");
    elements.inputPane.classList.toggle("has-syntax-error", result.errors > 0);
    elements.inputPane.classList.toggle("has-syntax-warning", result.errors === 0 && result.warnings > 0);
    elements.validationList.textContent = "";

    var visibleIssues = result.issues.slice(0, 8);
    visibleIssues.forEach(function (issue) {
      var item = document.createElement("li");
      var button = document.createElement("button");
      var badge = document.createElement("span");
      var location = document.createElement("span");
      var message = document.createElement("span");

      button.type = "button";
      button.className = "validation-issue validation-issue-" + issue.severity;
      button.dataset.offset = String(issue.offset);
      button.dataset.length = String(issue.length);
      button.setAttribute("aria-label", issue.line + "행 " + issue.column + "열: " + issue.message);

      badge.className = "validation-severity";
      badge.textContent = issue.severity === "error" ? "오류" : "경고";
      location.className = "validation-location";
      location.textContent = issue.line + ":" + issue.column;
      message.className = "validation-message";
      message.textContent = issue.message;

      button.appendChild(badge);
      button.appendChild(location);
      button.appendChild(message);
      item.appendChild(button);
      elements.validationList.appendChild(item);
    });

    elements.validationList.hidden = visibleIssues.length === 0;
    var hiddenCount = Math.max(0, result.issues.length - visibleIssues.length);
    elements.validationMore.hidden = hiddenCount === 0;
    elements.validationMore.textContent = hiddenCount ? "추가 " + hiddenCount + "개 항목이 있습니다." : "";
  }

  function validateCss() {
    var result = core.validateCssSyntax(elements.cssInput.value || "", {
      maxIssues: 100,
      declarationValidator: validateDeclarationInBrowser
    });
    renderValidation(result);
    return result;
  }

  function cancelLivePipeline() {
    if (liveUpdateFrame !== null) {
      window.cancelAnimationFrame(liveUpdateFrame);
      liveUpdateFrame = null;
    }
  }

  function runLivePipeline(showViewportError) {
    cancelLivePipeline();
    validateCss();
    convertCss(Boolean(showViewportError));
  }

  function scheduleLivePipeline() {
    cancelLivePipeline();
    updateWorkspaceMeta(null);
    liveUpdateFrame = window.requestAnimationFrame(function () {
      liveUpdateFrame = null;
      validateCss();
      convertCss(false);
    });
  }

  function updateDirectionUi(convertAfterUpdate) {
    var config = getDirectionConfig();
    elements.convertCssLabel.textContent = config.label;
    elements.outputDirection.textContent = config.shortLabel;

    if (config.direction === "px-vw") {
      elements.cssInput.placeholder = ".card {\n  width: 320px;\n  padding: 24px 16px;\n  border-radius: 12px;\n}";
    } else {
      elements.cssInput.placeholder = ".card {\n  width: 100vw;\n  padding: 7.5vw 5vw;\n  border-radius: 3.75vw;\n}";
    }

    saveSettings();
    if (convertAfterUpdate) {
      runLivePipeline(false);
    }
  }

  function updatePresetState() {
    var viewport = core.parseFiniteNumber(elements.viewportWidth.value);

    elements.presetButtons.forEach(function (button) {
      var isActive = viewport !== null && Number(button.dataset.viewport) === viewport;
      button.setAttribute("aria-pressed", isActive ? "true" : "false");
    });
  }

  function getSettings() {
    return {
      viewportWidth: elements.viewportWidth.value,
      precision: elements.precision.value,
      cssDirection: getDirection(),
      onlyMatchingDeclarations: elements.onlyMatchingDeclarations.checked,
      stripZeroUnit: elements.stripZeroUnit.checked
    };
  }

  function saveSettings() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(getSettings()));
    } catch (error) {
      // 저장소가 차단된 환경에서도 변환 기능은 계속 동작합니다.
    }
  }

  function loadSettings() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return;
      }

      var settings = JSON.parse(raw);

      if (core.parseFiniteNumber(String(settings.viewportWidth)) > 0) {
        elements.viewportWidth.value = String(settings.viewportWidth);
      }

      if (/^[0-6]$/.test(String(settings.precision))) {
        elements.precision.value = String(settings.precision);
      }

      if (settings.cssDirection === "vw-px") {
        elements.directionVwPx.checked = true;
      } else {
        elements.directionPxVw.checked = true;
      }

      if (typeof settings.onlyMatchingDeclarations === "boolean") {
        elements.onlyMatchingDeclarations.checked = settings.onlyMatchingDeclarations;
      }
      if (typeof settings.stripZeroUnit === "boolean") {
        elements.stripZeroUnit.checked = settings.stripZeroUnit;
      }
    } catch (error) {
      // 손상된 저장값은 기본값으로 무시합니다.
    }
  }

  function showToast(message) {
    window.clearTimeout(toastTimer);
    elements.toast.textContent = message;
    elements.toast.hidden = false;

    toastTimer = window.setTimeout(function () {
      elements.toast.hidden = true;
    }, 2200);
  }

  function fallbackCopy(text) {
    var textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();

    var successful = false;
    try {
      successful = document.execCommand("copy");
    } catch (error) {
      successful = false;
    }

    document.body.removeChild(textarea);
    return successful;
  }

  function copyText(text, successMessage) {
    if (!text) {
      return;
    }

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(function () {
        showToast(successMessage);
      }).catch(function () {
        if (fallbackCopy(text)) {
          showToast(successMessage);
        } else {
          showToast("복사하지 못했습니다. 직접 선택해 복사해 주세요.");
        }
      });
      return;
    }

    if (fallbackCopy(text)) {
      showToast(successMessage);
    } else {
      showToast("복사하지 못했습니다. 직접 선택해 복사해 주세요.");
    }
  }

  function sampleCss() {
    if (getDirection() === "vw-px") {
      return ".card {\n  width: 100vw;\n  max-width: 200vw;\n  padding: 7.5vw 5vw;\n  border-radius: 3.75vw;\n  color: #334155;\n}\n\n@media (min-width: 250vw) {\n  .card {\n    width: 200vw;\n    margin-top: 10vw;\n  }\n}\n\n.note::before {\n  content: \"4vw는 문자열이므로 유지\";\n}";
    }

    return ".card {\n  width: 320px;\n  max-width: 640px;\n  padding: 24px 16px;\n  border-radius: 12px;\n  color: #334155;\n}\n\n@media (min-width: 800px) {\n  .card {\n    width: 640px;\n    margin-top: 32px;\n  }\n}\n\n.note::before {\n  content: \"16px는 문자열이므로 유지\";\n}";
  }

  function clearCssWorkspace() {
    cancelLivePipeline();
    elements.cssInput.value = "";
    elements.cssOutput.value = "";
    elements.cssFileInput.value = "";
    currentFileName = "";
    elements.inputFileName.textContent = "직접 입력";
    renderInputHighlight("", []);
    updateWorkspaceMeta(null);
    validateCss();
    elements.cssInput.focus();
  }

  function setCssSource(text, fileName) {
    elements.cssInput.value = text;
    currentFileName = fileName || "";
    elements.inputFileName.textContent = currentFileName || "직접 입력";
    runLivePipeline(false);
  }

  function readCssFile(file) {
    if (!file) {
      return;
    }

    var isCssFile = file.type === "text/css" || /\.css$/i.test(file.name);
    if (!isCssFile) {
      showToast("CSS 파일만 열 수 있습니다.");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      showToast("2MB 이하의 CSS 파일을 선택해 주세요.");
      return;
    }

    var reader = new FileReader();
    reader.onload = function () {
      setCssSource(String(reader.result || ""), file.name);
      showToast(file.name + " 파일을 불러왔습니다.");
    };
    reader.onerror = function () {
      showToast("파일을 읽지 못했습니다.");
    };
    reader.readAsText(file);
  }

  function downloadCss() {
    var text = elements.cssOutput.value;
    if (!text) {
      return;
    }

    var config = getDirectionConfig();
    var baseName = currentFileName ? currentFileName.replace(/\.css$/i, "") : "converted";
    var fileName = baseName + "-" + config.targetUnit + ".css";
    var blob = new Blob([text], { type: "text/css;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
    showToast(fileName + " 파일로 저장했습니다.");
  }

  function handleSettingsChange() {
    updatePresetState();
    updateSingleConversions(false);
    saveSettings();
    runLivePipeline(false);
  }

  function handleDrop(event) {
    event.preventDefault();
    elements.inputPane.classList.remove("is-dragover");
    var files = event.dataTransfer && event.dataTransfer.files;
    if (files && files.length) {
      readCssFile(files[0]);
    }
  }

  function focusValidationIssue(button) {
    var offset = Number(button.dataset.offset) || 0;
    var length = Number(button.dataset.length) || 1;
    elements.cssInput.focus();
    elements.cssInput.setSelectionRange(offset, Math.min(elements.cssInput.value.length, offset + length));
    var lineHeight = parseFloat(window.getComputedStyle(elements.cssInput).lineHeight) || 22;
    var textBefore = elements.cssInput.value.slice(0, offset);
    var line = textBefore.split("\n").length - 1;
    elements.cssInput.scrollTop = Math.max(0, line * lineHeight - elements.cssInput.clientHeight / 3);
    syncInputHighlightGeometry();
  }

  function bindEvents() {
    elements.viewportWidth.addEventListener("input", handleSettingsChange);
    elements.viewportWidth.addEventListener("blur", function () {
      getViewportWidth(true);
    });
    elements.precision.addEventListener("change", handleSettingsChange);

    elements.presetButtons.forEach(function (button) {
      button.addEventListener("click", function () {
        elements.viewportWidth.value = button.dataset.viewport;
        elements.viewportError.hidden = true;
        handleSettingsChange();
        elements.viewportWidth.focus();
      });
    });

    elements.pxToVwForm.addEventListener("submit", function (event) {
      event.preventDefault();
      updateSingleConversions(true);
    });
    elements.vwToPxForm.addEventListener("submit", function (event) {
      event.preventDefault();
      updateSingleConversions(true);
    });
    elements.pxInput.addEventListener("input", function () {
      updateSingleConversions(false);
    });
    elements.vwInput.addEventListener("input", function () {
      updateSingleConversions(false);
    });

    elements.btnCopyVw.addEventListener("click", function () {
      copyText(elements.btnCopyVw.dataset.copyValue, "VW 결과를 복사했습니다.");
    });
    elements.btnCopyPx.addEventListener("click", function () {
      copyText(elements.btnCopyPx.dataset.copyValue, "PX 결과를 복사했습니다.");
    });
    elements.btnClearPx.addEventListener("click", function () {
      elements.pxInput.value = "";
      updateSingleConversions(false);
      elements.pxInput.focus();
    });
    elements.btnClearVw.addEventListener("click", function () {
      elements.vwInput.value = "";
      updateSingleConversions(false);
      elements.vwInput.focus();
    });

    elements.directionPxVw.addEventListener("change", function () {
      updateDirectionUi(true);
    });
    elements.directionVwPx.addEventListener("change", function () {
      updateDirectionUi(true);
    });

    [elements.onlyMatchingDeclarations, elements.stripZeroUnit].forEach(function (checkbox) {
      checkbox.addEventListener("change", function () {
        saveSettings();
        runLivePipeline(false);
      });
    });

    elements.cssInput.addEventListener("input", scheduleLivePipeline);
    elements.cssInput.addEventListener("scroll", syncInputHighlightGeometry);
    elements.cssInput.addEventListener("compositionstart", function () {
      elements.cssInputEditor.classList.add("is-composing");
    });
    elements.cssInput.addEventListener("compositionend", function () {
      elements.cssInputEditor.classList.remove("is-composing");
      scheduleLivePipeline();
    });
    elements.cssInput.addEventListener("keydown", function (event) {
      if (event.key === "Tab") {
        event.preventDefault();
        var start = elements.cssInput.selectionStart;
        var end = elements.cssInput.selectionEnd;
        elements.cssInput.setRangeText("  ", start, end, "end");
        elements.cssInput.dispatchEvent(new Event("input", { bubbles: true }));
      }
    });

    elements.validationList.addEventListener("click", function (event) {
      var button = event.target.closest(".validation-issue");
      if (button) {
        focusValidationIssue(button);
      }
    });

    elements.btnConvertCss.addEventListener("click", function () {
      runLivePipeline(true);
    });
    elements.btnOpenFile.addEventListener("click", function () {
      elements.cssFileInput.click();
    });
    elements.cssFileInput.addEventListener("change", function () {
      readCssFile(elements.cssFileInput.files && elements.cssFileInput.files[0]);
    });
    elements.btnInsertSample.addEventListener("click", function () {
      setCssSource(sampleCss(), "");
      elements.cssInput.focus();
    });
    elements.btnClearCss.addEventListener("click", clearCssWorkspace);
    elements.btnCopyCss.addEventListener("click", function () {
      copyText(elements.cssOutput.value, "변환된 CSS를 복사했습니다.");
    });
    elements.btnDownloadCss.addEventListener("click", downloadCss);

    ["dragenter", "dragover"].forEach(function (eventName) {
      elements.inputPane.addEventListener(eventName, function (event) {
        event.preventDefault();
        elements.inputPane.classList.add("is-dragover");
      });
    });
    ["dragleave", "drop"].forEach(function (eventName) {
      elements.inputPane.addEventListener(eventName, function (event) {
        if (eventName === "dragleave" && elements.inputPane.contains(event.relatedTarget)) {
          return;
        }
        elements.inputPane.classList.remove("is-dragover");
      });
    });
    elements.inputPane.addEventListener("drop", handleDrop);

    window.addEventListener("resize", syncInputHighlightGeometry);
    window.addEventListener("keydown", function (event) {
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter" && document.activeElement === elements.cssInput) {
        event.preventDefault();
        runLivePipeline(true);
      }
    });
  }

  function initialize() {
    loadSettings();
    updateDirectionUi(false);
    updatePresetState();
    updateSingleConversions(false);
    updateWorkspaceMeta(null);
    renderInputHighlight(elements.cssInput.value || "", []);
    validateCss();
    bindEvents();

    if (window.ResizeObserver) {
      inputHighlightResizeObserver = new window.ResizeObserver(syncInputHighlightGeometry);
      inputHighlightResizeObserver.observe(elements.cssInput);
    }
  }

  initialize();
}());
