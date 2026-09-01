(function () {
  "use strict";

  var currentScript = document.currentScript;
  var baseUrl = currentScript && currentScript.src
    ? new URL("./", currentScript.src)
    : new URL("./", document.baseURI);

  function loadScript(fileName) {
    return new Promise(function (resolve, reject) {
      var script = document.createElement("script");
      script.src = new URL(fileName, baseUrl).href;
      script.onload = resolve;
      script.onerror = function () {
        reject(new Error(fileName + " 파일을 불러오지 못했습니다."));
      };
      document.head.appendChild(script);
    });
  }

  loadScript("converter-core.js")
    .then(function () {
      return loadScript("app-ui.js");
    })
    .catch(function (error) {
      console.error(error);
      document.body.insertAdjacentHTML(
        "beforeend",
        '<div class="noscript-message" role="alert">앱 파일을 불러오지 못했습니다. 페이지를 새로고침해 주세요.</div>'
      );
    });
}());
