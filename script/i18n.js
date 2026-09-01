/*
 * Loader i18n — vanilla JS, zero dipendenze.
 *
 * - Sceglie la lingua: ?lang=xx  ->  localStorage  ->  lingua del browser  ->  'it'
 * - Carica l'elenco lingue da  i18n/languages.json  e popola il menu a tendina
 * - Carica i testi da  i18n/<lang>.json  e li inietta negli elementi [data-i18n]
 * - Se qualcosa fallisce, resta il testo italiano già presente nell'HTML
 *
 * Aggiungere una lingua = creare  i18n/<code>.json  + una riga in  i18n/languages.json
 */
(function () {
  'use strict';

  var FALLBACK = 'it';
  var cfg = window.SITE_CONFIG || {};

  function fmtPhone(intl) {
    // "+393474300269" -> "+39 347 4300269"
    var rest = intl.replace(/^\+39/, '');
    return '+39 ' + rest.slice(0, 3) + ' ' + rest.slice(3);
  }

  // Token condivisi disponibili in tutte le stringhe di traduzione
  var TOKENS = {
    '{wa1}': '<a href="https://wa.me/' + (cfg.wa1 || '') + '">' + fmtPhone(cfg.wa1 || '') + '</a>',
    '{wa2}': '<a href="https://wa.me/' + (cfg.wa2 || '') + '">' + fmtPhone(cfg.wa2 || '') + '</a>',
    '{maps}': cfg.mapsUrl || '',
    '{address}': cfg.address || '',
  };

  function expand(str) {
    return String(str).replace(/\{wa1\}|\{wa2\}|\{maps\}|\{address\}/g, function (m) {
      return TOKENS[m] != null ? TOKENS[m] : m;
    });
  }

  function pickLang(available) {
    var qs = new URLSearchParams(window.location.search).get('lang');
    var stored;
    try { stored = localStorage.getItem('lang'); } catch (e) { stored = null; }
    var browser = (navigator.language || '').slice(0, 2).toLowerCase();
    var candidates = [qs, stored, browser, FALLBACK];
    for (var i = 0; i < candidates.length; i++) {
      if (candidates[i] && available.indexOf(candidates[i]) !== -1) return candidates[i];
    }
    return FALLBACK;
  }

  function getJSON(url) {
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error(url + ' -> ' + r.status);
      return r.json();
    });
  }

  function buildSelect(languages, current) {
    var select = document.querySelector('.lang-select');
    if (!select) return;
    select.innerHTML = '';
    languages.forEach(function (l) {
      var opt = document.createElement('option');
      opt.value = l.code;
      opt.textContent = l.label;
      if (l.code === current) opt.selected = true;
      select.appendChild(opt);
    });
    select.addEventListener('change', function () {
      var lang = select.value;
      try { localStorage.setItem('lang', lang); } catch (e) {}
      var url = new URL(window.location.href);
      url.searchParams.set('lang', lang);
      window.location.href = url.toString();
    });
    // Tornando indietro (tasto "back") la pagina può essere ripristinata dalla
    // bfcache: il browser reimposta il <select> sull'ultima scelta dell'utente,
    // ma il contenuto è quello della lingua originale. Risincronizziamo il menu
    // con la lingua effettivamente mostrata.
    window.addEventListener('pageshow', function (e) {
      if (e.persisted) select.value = document.documentElement.lang || current;
    });
  }

  function apply(dict) {
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var key = el.getAttribute('data-i18n');
      if (dict[key] != null) el.innerHTML = expand(dict[key]);
    });
    document.querySelectorAll('[data-i18n-alt]').forEach(function (el) {
      var key = el.getAttribute('data-i18n-alt');
      if (dict[key] != null) el.setAttribute('alt', expand(dict[key]));
    });
    if (dict.page_title != null) document.title = dict.page_title;
  }

  function reveal() {
    var main = document.querySelector('main');
    if (main) main.hidden = false;
  }

  getJSON('i18n/languages.json')
    .then(function (languages) {
      var codes = languages.map(function (l) { return l.code; });
      var lang = pickLang(codes);
      document.documentElement.lang = lang;
      buildSelect(languages, lang);

      return getJSON('i18n/' + lang + '.json').catch(function (err) {
        console.warn('i18n: fallback a ' + FALLBACK, err);
        if (lang === FALLBACK) return null;
        document.documentElement.lang = FALLBACK;
        return getJSON('i18n/' + FALLBACK + '.json');
      });
    })
    .then(function (dict) {
      if (dict) apply(dict);
    })
    .catch(function (err) {
      console.error('i18n:', err);
    })
    .then(reveal, reveal);
})();
