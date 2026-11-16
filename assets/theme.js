// Runs in <head> before the page paints, so there is no flash of the wrong painting.
(function () {
  var t = null;
  try { t = JSON.parse(localStorage.getItem("ww:theme")); } catch (e) {}
  if (t !== "cubist" && t !== "blueperiod") t = matchMedia("(prefers-color-scheme: dark)").matches ? "blueperiod" : "cubist";
  document.documentElement.dataset.theme = t;
  var m = document.querySelector('meta[name="theme-color"]');
  if (m) m.content = t === "cubist" ? "#d9c7a3" : "#0b1626";
})();
