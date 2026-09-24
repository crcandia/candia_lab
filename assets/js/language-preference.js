(function () {
  'use strict';
  var element = document.getElementById('crisslab-language-config');
  if (!element || !window.URL) return;
  var config;
  try { config = JSON.parse(element.textContent); } catch (error) { return; }
  var translations = config.translations || {};
  var current = config.currentLanguage;
  var key = 'crisslab.language';
  var stores = ['sessionStorage', 'localStorage'];

  function supported(value) {
    return value === 'en' || value === 'es';
  }
  function readPreference() {
    for (var i = 0; i < stores.length; i++) {
      try {
        var value = window[stores[i]].getItem(key);
        if (supported(value)) return value;
      } catch (error) { /* Storage may be blocked by the browser. */ }
    }
    return '';
  }
  function savePreference(value) {
    var saved = false;
    for (var i = 0; i < stores.length; i++) {
      try {
        window[stores[i]].setItem(key, value);
        saved = true;
      } catch (error) { /* The explicit language URL still works. */ }
    }
    return saved;
  }
  function browserPreference() {
    var languages = navigator.languages;
    if (!languages || !languages.length) languages = [navigator.language || 'en'];
    for (var i = 0; i < languages.length; i++) {
      var language = String(languages[i]).toLowerCase().split(/[-_]/)[0];
      if (supported(language)) return language;
    }
    return 'en';
  }

  var pageURL = new URL(window.location.href);
  var requested = pageURL.searchParams.get('lang');
  var preferred = readPreference();
  if (supported(requested)) {
    preferred = requested;
    if (savePreference(requested)) {
      pageURL.searchParams.delete('lang');
      try {
        window.history.replaceState(window.history.state, '', pageURL.href);
      } catch (error) { /* URL cleanup is optional. */ }
    }
  }

  // English URLs are the unprefixed entry points. Explicit /es/ links are
  // respected unless the visitor has deliberately selected another language.
  if (!preferred && current === 'en') preferred = browserPreference();
  if (preferred && preferred !== current && translations[preferred]) {
    var destination = new URL(translations[preferred], pageURL.origin);
    if (destination.origin === pageURL.origin && destination.pathname !== pageURL.pathname) {
      destination.search = pageURL.search;
      destination.hash = pageURL.hash;
      window.location.replace(destination.href);
      return;
    }
  }

  function prepareLanguageLink(link) {
    var href = link.getAttribute('href');
    if (!href || href.charAt(0) === '#') return null;
    var target;
    try { target = new URL(href, window.location.href); } catch (error) { return null; }
    if (target.origin !== pageURL.origin) return null;
    var language = /^\/es(?:\/|$)/.test(target.pathname) ? 'es' : 'en';
    pageURL.searchParams.forEach(function (value, name) {
      if (name !== 'lang' && !target.searchParams.has(name)) target.searchParams.set(name, value);
    });
    target.searchParams.set('lang', language);
    if (!target.hash) target.hash = pageURL.hash;
    link.setAttribute('href', target.href);
    link.setAttribute('data-crisslab-language', language);
    // A translation is navigation, not an in-page smooth-scroll target.
    link.removeAttribute('data-target');
    return {language: language, url: target.href};
  }
  function prepareSwitcher() {
    var links = document.querySelectorAll('.i18n-dropdown .dropdown-menu a[href]');
    for (var i = 0; i < links.length; i++) prepareLanguageLink(links[i]);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', prepareSwitcher);
  } else {
    prepareSwitcher();
  }
  document.addEventListener('click', function (event) {
    var target = event.target;
    var link = target && target.closest ? target.closest('.i18n-dropdown .dropdown-menu a[href]') : null;
    if (!link) return;
    var choice = prepareLanguageLink(link);
    if (!choice || event.defaultPrevented || event.button > 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    savePreference(choice.language);
    event.preventDefault();
    event.stopPropagation();
    window.location.assign(choice.url);
  }, true);
}());
