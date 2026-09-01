(function () {
  "use strict";

  var core = window.PXVWCore;
  if (!core) {
    throw new Error("PXVWCore가 로드되지 않았습니다.");
  }

  var STORAGE_KEY = "pxvw-converter-settings-v2";
  var THEME_KEY = "pxvw-theme";
  var MAX_FILE_SIZE = 2 * 1024 * 1024;
  var autoConvertTimer = null;
  var toastTimer = null;
  var currentFileName = "";

  function byId(id) {
    return document.getElementById(id);
  }

  var elements = {
    themeColor: byId("themeColor"),
    themeToggle: byId("themeToggle"),
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
    autoConvert: byId("autoConvert"),
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
    outputDirection: byId("outputDirection"),
    outputCharCount: byId("outputCharCount"),
    convertedCount: byId("convertedCount"),
    removedCount: byId("removedCount"),
    outputSize: byId("outputSize"),
    toast: byId("toast")
  };

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

    if (!source.trim()) {
      elements.cssOutput.value = "";
      updateWorkspaceMeta(null);
      return;
    }

    if (!viewport) {
      elements.cssOutput.value = "";
      updateWorkspaceMeta(null);
      return;
    }

    var preparedSource = source;
    var removedDeclarations = 0;

    if (elements.onlyMatchingDeclarations.checked) {
      var filtered = core.filterMatchingDeclarations(source, config.sourceUnit);
      preparedSource = filtered.text;
      removedDeclarations = filtered.stats.removedDeclarations;
    }

    var converted = core.scanAndTransformUnits(
      preparedSource,
      config,
      viewport,
      precision,
      elements.stripZeroUnit.checked,
      true
    );

    elements.cssOutput.value = converted.text.trim();
    updateWorkspaceMeta({
      convertedCount: converted.count,
      removedDeclarations: removedDeclarations
    });
  }

  function scheduleCssConversion() {
    window.clearTimeout(autoConvertTimer);
    updateWorkspaceMeta(null);

    if (!elements.autoConvert.checked) {
      return;
    }

    autoConvertTimer = window.setTimeout(function () {
      convertCss(false);
    }, 220);
  }

  function updateDirectionUi(convertAfterUpdate) {
    var config = getDirectionConfig();
    elements.convertCssLabel.textContent = config.label;
    elements.outputDirection.textContent = config.shortLabel;

    if (config.direction === "px-vw") {
      elements.cssInput.placeholder = ".card {\n  width: 320px;\n  padding: 24px 16px;\n  border-radius: 12px;\n}";
    } else {
      elements.cssInput.placeholder = ".card {\n  width: 85.33vw;\n  padding: 6.4vw 4.27vw;\n  border-radius: 3.2vw;\n}";
    }

    saveSettings();
    if (convertAfterUpdate && elements.cssInput.value.trim()) {
      convertCss(false);
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
      stripZeroUnit: elements.stripZeroUnit.checked,
      autoConvert: elements.autoConvert.checked
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
      if (typeof settings.autoConvert === "boolean") {
        elements.autoConvert.checked = settings.autoConvert;
      }
    } catch (error) {
      // 손상된 저장값은 기본값으로 무시합니다.
    }
  }

  function setTheme(theme, persist) {
    var normalizedTheme = theme === "dark" ? "dark" : "light";
    document.documentElement.dataset.theme = normalizedTheme;
    elements.themeColor.setAttribute("content", normalizedTheme === "dark" ? "#0b1020" : "#f4f7fb");
    elements.themeToggle.setAttribute("aria-label", normalizedTheme === "dark" ? "라이트 모드로 변경" : "다크 모드로 변경");

    if (persist) {
      try {
        localStorage.setItem(THEME_KEY, normalizedTheme);
      } catch (error) {
        // 테마 저장 실패는 UI 동작에 영향을 주지 않습니다.
      }
    }
  }

  function toggleTheme() {
    setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark", true);
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
      return ".card {\n  width: 85.33vw;\n  max-width: 170.67vw;\n  padding: 6.4vw 4.27vw;\n  border-radius: 3.2vw;\n  color: #334155;\n}\n\n@media (min-width: 204.8vw) {\n  .card {\n    width: 170.67vw;\n    margin-top: 8.53vw;\n  }\n}\n\n.note::before {\n  content: \"4vw는 문자열이므로 유지\";\n}";
    }

    return ".card {\n  width: 320px;\n  max-width: 640px;\n  padding: 24px 16px;\n  border-radius: 12px;\n  color: #334155;\n}\n\n@media (min-width: 768px) {\n  .card {\n    width: 640px;\n    margin-top: 32px;\n  }\n}\n\n.note::before {\n  content: \"16px는 문자열이므로 유지\";\n}";
  }

  function clearCssWorkspace() {
    window.clearTimeout(autoConvertTimer);
    elements.cssInput.value = "";
    elements.cssOutput.value = "";
    elements.cssFileInput.value = "";
    currentFileName = "";
    elements.inputFileName.textContent = "직접 입력";
    updateWorkspaceMeta(null);
    elements.cssInput.focus();
  }

  function setCssSource(text, fileName) {
    elements.cssInput.value = text;
    currentFileName = fileName || "";
    elements.inputFileName.textContent = currentFileName || "직접 입력";
    updateWorkspaceMeta(null);
    convertCss(false);
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

    if (elements.autoConvert.checked && elements.cssInput.value.trim()) {
      scheduleCssConversion();
    }
  }

  function handleDrop(event) {
    event.preventDefault();
    elements.inputPane.classList.remove("is-dragover");
    var files = event.dataTransfer && event.dataTransfer.files;
    if (files && files.length) {
      readCssFile(files[0]);
    }
  }

  function bindEvents() {
    elements.themeToggle.addEventListener("click", toggleTheme);

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

    [elements.onlyMatchingDeclarations, elements.stripZeroUnit, elements.autoConvert].forEach(function (checkbox) {
      checkbox.addEventListener("change", function () {
        saveSettings();
        if (checkbox === elements.autoConvert && !checkbox.checked) {
          window.clearTimeout(autoConvertTimer);
        }
        if (elements.cssInput.value.trim()) {
          convertCss(false);
        }
      });
    });

    elements.cssInput.addEventListener("input", scheduleCssConversion);
    elements.cssInput.addEventListener("keydown", function (event) {
      if (event.key === "Tab") {
        event.preventDefault();
        var start = elements.cssInput.selectionStart;
        var end = elements.cssInput.selectionEnd;
        elements.cssInput.setRangeText("  ", start, end, "end");
        elements.cssInput.dispatchEvent(new Event("input", { bubbles: true }));
      }
    });

    elements.btnConvertCss.addEventListener("click", function () {
      convertCss(true);
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

    window.addEventListener("keydown", function (event) {
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter" && document.activeElement === elements.cssInput) {
        event.preventDefault();
        convertCss(true);
      }
    });
  }

  function initialize() {
    loadSettings();
    setTheme(document.documentElement.dataset.theme || "light", false);
    updateDirectionUi(false);
    updatePresetState();
    updateSingleConversions(false);
    updateWorkspaceMeta(null);
    bindEvents();
  }

  initialize();
}());
