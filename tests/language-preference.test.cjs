'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const source = fs.readFileSync(path.join(__dirname, '../assets/js/language-preference.js'), 'utf8');
const KEY = 'crisslab.language';
function run(options = {}) {
  const redirects = [], navigations = [], handlers = {};
  const links = options.links || [];
  const current = options.current || 'en';
  const location = {
    href: options.url || 'https://criss-lab.com/',
    replace(url) { redirects.push(url); },
    assign(url) { navigations.push(url); }
  };
  const values = {local: options.local || {}, session: options.session || {}};
  function storage(type) {
    return {
      getItem(k) { if (options.blockStorage) throw new Error('Blocked'); return values[type][k] || null; },
      setItem(k, value) { if (options.blockStorage) throw new Error('Blocked'); values[type][k] = value; }
    };
  }
  const config = options.config === undefined ? JSON.stringify({
    currentLanguage: current,
    translations: options.translations || {en: '/', es: '/es/'}
  }) : options.config;
  const document = {
    readyState: options.readyState || 'loading',
    getElementById() { return config === null ? null : {textContent: config}; },
    querySelectorAll() { return links; },
    addEventListener(name, fn) { handlers[name] = fn; }
  };
  const window = {
    URL, location,
    history: {state: null, replaceState(_, __, url) { location.href = url; }},
    localStorage: storage('local'), sessionStorage: storage('session')
  };
  if (options.blockGetters) for (const name of ['localStorage', 'sessionStorage']) {
    Object.defineProperty(window, name, {get() { throw new Error('SecurityError'); }});
  }
  const navigator = {languages: options.languages === undefined ? ['en-US'] : options.languages,
    language: options.language || 'en-US'};
  vm.runInNewContext(source, {window, document, navigator, URL});
  return {redirects, navigations, handlers, values, location};
}
function anchor(href) {
  const attrs = {href, 'data-target': href};
  return {attrs, getAttribute(k) { return attrs[k] || null; },
    setAttribute(k, v) { attrs[k] = v; }, removeAttribute(k) { delete attrs[k]; },
    closest() { return this; }};
}

test('Spanish browser opens Spanish home', () => assert.deepEqual(run({languages:['es-CL']}).redirects, ['https://criss-lab.com/es/']));
test('English browser remains in English', () => assert.equal(run().redirects.length, 0));
test('First compatible language wins', () => {
  assert.equal(run({languages:['pt-BR','en-GB','es-CL']}).redirects.length, 0);
  assert.equal(run({languages:['pt-BR','es-MX','en']}).redirects.length, 1);
});
test('Unsupported languages fall back to English', () => assert.equal(run({languages:['ja','fr']}).redirects.length, 0));
test('navigator.language fallback', () => assert.equal(run({languages:[],language:'es-ES'}).redirects.length, 1));
test('Locale normalization', () => assert.equal(run({languages:['ES_cl']}).redirects.length, 1));
test('Saved manual English overrides Spanish browser', () => assert.equal(run({languages:['es'],local:{[KEY]:'en'}}).redirects.length, 0));
test('Saved manual Spanish overrides English browser', () => assert.equal(run({local:{[KEY]:'es'}}).redirects.length, 1));
test('Explicit Spanish URLs are respected on first visit', () => assert.equal(run({current:'es',url:'https://criss-lab.com/es/'}).redirects.length, 0));
test('Manual English preference also works from Spanish URL', () => assert.deepEqual(run({current:'es',url:'https://criss-lab.com/es/',local:{[KEY]:'en'}}).redirects, ['https://criss-lab.com/']));
test('Deep-link path, query and fragment survive redirect', () => assert.deepEqual(run({url:'https://criss-lab.com/event/talk/?utm_source=email#zoom',languages:['es'],translations:{en:'/event/talk/',es:'/es/event/talk/'}}).redirects, ['https://criss-lab.com/es/event/talk/?utm_source=email#zoom']));
test('Missing translation never redirects to a guessed URL', () => assert.equal(run({languages:['es'],translations:{en:'/'}}).redirects.length, 0));
test('Invalid storage is ignored', () => assert.equal(run({languages:['es'],local:{[KEY]:'xx'}}).redirects.length, 0 + 1));
test('Blocked storage does not disable browser detection', () => assert.equal(run({languages:['es'],blockStorage:true}).redirects.length, 1));
test('Storage access SecurityError is contained', () => assert.equal(run({languages:['es'],blockGetters:true}).redirects.length, 1));
test('Explicit lang override persists and cleans its query parameter', () => {
  const r = run({url:'https://criss-lab.com/?utm_source=email&lang=en#talks',languages:['es']});
  assert.equal(r.redirects.length,0);
  assert.equal(r.values.local[KEY],'en');
  assert.equal(r.location.href,'https://criss-lab.com/?utm_source=email#talks');
});
test('Explicit language remains usable without storage', () => {
  const r=run({url:'https://criss-lab.com/?lang=en',languages:['es'],blockStorage:true});
  assert.equal(r.redirects.length,0);
  assert.equal(r.location.href,'https://criss-lab.com/?lang=en');
});
test('Explicit request redirects once, retaining marker when storage is unavailable', () => assert.deepEqual(run({url:'https://criss-lab.com/?lang=es',blockStorage:true}).redirects,['https://criss-lab.com/es/?lang=es']));
test('A redirect destination does not bounce back', () => assert.equal(run({url:'https://criss-lab.com/es/',current:'es',languages:['es']}).redirects.length,0));
test('External translations cannot redirect off-site', () => assert.equal(run({languages:['es'],translations:{es:'https://example.org/'}}).redirects.length,0));
test('Missing or malformed config is safe', () => {
  assert.equal(run({config:null}).redirects.length,0);
  assert.equal(run({config:'not-json'}).redirects.length,0);
});
test('Manual switch links preserve context and disable smooth scrolling', () => {
  const link=anchor('/es/event/talk/');
  const r=run({url:'https://criss-lab.com/event/talk/?utm_source=mail#zoom',links:[link]});
  r.handlers.DOMContentLoaded();
  assert.equal(link.attrs.href,'https://criss-lab.com/es/event/talk/?utm_source=mail&lang=es#zoom');
  assert.equal(link.attrs['data-target'],undefined);
});
test('Manual switch navigates and records the choice', () => {
  const link=anchor('/es/');
  const r=run({links:[link]});
  let prevented=false,stopped=false;
  r.handlers.click({target:link,button:0,preventDefault(){prevented=true;},stopPropagation(){stopped=true;}});
  assert.equal(r.values.local[KEY],'es');
  assert.deepEqual(r.navigations,['https://criss-lab.com/es/?lang=es']);
  assert.ok(prevented && stopped);
});
test('Modified clicks retain native new-tab behavior', () => {
  const link=anchor('/es/'); const r=run({links:[link]});
  r.handlers.click({target:link,button:0,ctrlKey:true,preventDefault(){throw Error('Unexpected');}});
  assert.equal(r.navigations.length,0);
  assert.equal(link.attrs.href,'https://criss-lab.com/es/?lang=es');
});
test('Dropdown toggle and external links are not intercepted', () => {
  const links=[anchor('#'),anchor('https://example.org/')];
  const r=run({links}); r.handlers.DOMContentLoaded();
  assert.equal(links[0].attrs.href,'#'); assert.equal(links[1].attrs.href,'https://example.org/');
});
test('Script also prepares an already loaded DOM', () => {
  const link=anchor('/es/');run({links:[link],readyState:'complete'});
  assert.equal(link.attrs['data-crisslab-language'],'es');
});
