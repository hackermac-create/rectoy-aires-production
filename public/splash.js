/* RECTOY-AIRES — splash screen vidéo
   Chargé dans <head> (sans defer) pour éviter tout flash du site avant l'intro.
   - Affiché une fois par session (sessionStorage) ; « Passer » / Échap / clic pour l'ignorer.
   - Vidéo paysage ou portrait selon l'écran ; repli animé si la vidéo ne peut pas être lue.
   - « Réduire les animations » activé : intro très courte, sans vidéo. */
(function () {
  var KEY = "ra_splash_seen";
  var root = document.documentElement;
  var seen = false;
  try { seen = sessionStorage.getItem(KEY) === "1"; } catch (e) {}
  if (seen) { root.classList.add("splash-done"); return; }
  root.classList.add("splash-active");

  function ready(fn) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn);
    else fn();
  }

  ready(function () {
    var el = document.getElementById("splash");
    if (!el) { root.classList.remove("splash-active"); root.classList.add("splash-done"); return; }

    var video = document.getElementById("splashVideo");
    var skip = document.getElementById("splashSkip");
    var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
    var finished = false, safety, fallbackTimer;

    function finish() {
      if (finished) return;
      finished = true;
      clearTimeout(safety); clearTimeout(fallbackTimer);
      try { sessionStorage.setItem(KEY, "1"); } catch (e) {}
      el.classList.add("is-leaving");
      document.removeEventListener("keydown", onKey);
      setTimeout(function () {
        root.classList.remove("splash-active");
        root.classList.add("splash-done");
        if (video) { try { video.pause(); video.removeAttribute("src"); video.load(); } catch (e) {} }
      }, 650);
    }

    function useFallback(duration) {
      el.classList.add("use-fallback");
      clearTimeout(fallbackTimer);
      fallbackTimer = setTimeout(finish, duration);
    }

    function onKey(e) { if (e.key === "Escape" || e.key === "Enter") finish(); }
    document.addEventListener("keydown", onKey);
    if (skip) { skip.addEventListener("click", function (e) { e.stopPropagation(); finish(); }); }
    el.addEventListener("click", finish);

    if (reduce || !video) { useFallback(1500); return; }

    var portrait = window.innerHeight > window.innerWidth;
    video.poster = portrait ? "src/splash-mobile-poster.jpg" : "src/splash-poster.jpg";
    video.src = portrait ? "src/splash-mobile.mp4" : "src/splash.mp4";
    video.muted = true; video.setAttribute("playsinline", "");

    video.addEventListener("ended", finish);
    video.addEventListener("error", function () { useFallback(3600); });
    video.addEventListener("playing", function () { el.classList.add("is-playing"); });

    var p = video.play();
    if (p && p.catch) p.catch(function () { useFallback(3600); });

    safety = setTimeout(finish, 8000); // filet de sécurité : le site n'est jamais bloqué
  });
})();
