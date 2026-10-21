/* Open Trails Canada: static, no build step.
   Content lives in i18n/<code>.json; facts shared by every language
   (prices, official links, map places) live in data/facts.json. */
(() => {
  "use strict";

  const state = { langs: [], lang: null, t: null, en: null, facts: null, map: null };
  const $ = (sel) => document.querySelector(sel);

  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch { /* private mode */ } },
  };

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // {value_id} -> value from facts.json, **bold** -> <strong>.
  function fmt(text) {
    const values = state.facts.values;
    return esc(text)
      .replace(/\{([a-z0-9_]+)\}/g, (m, k) => (k in values ? `<bdi dir="ltr">${esc(values[k])}</bdi>` : m))
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  }

  function ui(key) {
    return (state.t.ui && state.t.ui[key]) || state.en.ui[key] || key;
  }

  async function getJSON(path) {
    const res = await fetch(path, { cache: "no-cache" });
    if (!res.ok) throw new Error(path + " " + res.status);
    return res.json();
  }

  function pickLang() {
    const codes = state.langs.map((l) => l.code);
    const fromUrl = new URLSearchParams(location.search).get("lang");
    if (fromUrl && codes.includes(fromUrl)) return fromUrl;
    const saved = store.get("lang");
    if (saved && codes.includes(saved)) return saved;
    for (const nav of navigator.languages || [navigator.language || "en"]) {
      const n = nav.toLowerCase();
      const exact = codes.find((c) => c.toLowerCase() === n);
      if (exact) return exact;
      if (n.startsWith("zh")) return /tw|hk|mo|hant/.test(n) ? "zh-Hant" : "zh-Hans";
      const base = codes.find((c) => c.toLowerCase() === n.split("-")[0]);
      if (base) return base;
    }
    return "en";
  }

  async function setLang(code) {
    try {
      state.t = code === "en" ? state.en : await getJSON(`i18n/${code}.json`);
    } catch {
      state.t = state.en;
      code = "en";
    }
    state.lang = code;
    const meta = state.langs.find((l) => l.code === code);
    document.documentElement.lang = code;
    document.documentElement.dir = meta.dir || "ltr";
    $("#lang-select").value = code;
    store.set("lang", code);
    document.querySelectorAll("[data-ui]").forEach((el) => { el.textContent = ui(el.dataset.ui); });
    $("#foot-land").textContent = ui("landAck");
    $("#foot-disclaimer").textContent = ui("disclaimer");
    render();
  }

  function topics() {
    // Fall back to English for any topic a translation has not covered yet.
    const own = new Map((state.t.topics || []).map((x) => [x.id, x]));
    return state.en.topics.map((x) => own.get(x.id) || x);
  }

  function linkList(ids) {
    if (!ids || !ids.length) return "";
    const items = ids.map((id) => {
      const l = state.facts.links[id];
      if (!l) return "";
      return `<li><a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.name)}</a></li>`;
    }).join("");
    return `<ul class="links" aria-label="${esc(ui("officialSources"))}">${items}</ul>`;
  }

  function translationNotice() {
    const meta = state.langs.find((l) => l.code === state.lang);
    if (!meta || state.lang === "en") return "";
    return `<div class="notice" role="note"><strong>${esc(ui("translationTitle"))}</strong>${esc(ui("translationNote"))}</div>`;
  }

  function renderHome() {
    const cards = topics().map((x) => `
      <li><a class="card" href="#/${esc(x.id)}">
        <span class="ico" aria-hidden="true">${esc(x.icon || "•")}</span>
        <h2>${esc(x.title)}</h2>
        <p>${fmt(x.summary)}</p>
      </a></li>`).join("");
    return `
      <section class="hero">
        <h1>${esc(ui("heroTitle"))}</h1>
        <p>${fmt(ui("heroText"))}</p>
        <ul class="chips">
          <li><a href="#/start">${esc(ui("chipStart"))}</a></li>
          <li><a href="#/map">🗺️ ${esc(ui("chipMap"))}</a></li>
          <li><a href="#/safety">⚠️ ${esc(ui("chipSafety"))}</a></li>
        </ul>
      </section>
      ${translationNotice()}
      <div class="notice" role="note"><strong>${esc(ui("emergencyTitle"))}</strong>${fmt(ui("emergencyText"))}</div>
      <ul class="grid">${cards}
        <li><a class="card" href="#/map"><span class="ico" aria-hidden="true">🗺️</span>
          <h2>${esc(ui("mapTitle"))}</h2><p>${esc(ui("mapSummary"))}</p></a></li>
      </ul>`;
  }

  function renderBlock(b) {
    let html = `<section class="block${b.kind ? " " + esc(b.kind) : ""}">`;
    if (b.h) html += `<h2>${esc(b.h)}</h2>`;
    for (const p of [].concat(b.p || [])) html += `<p>${fmt(p)}</p>`;
    if (b.list) html += `<ul>${b.list.map((li) => `<li>${fmt(li)}</li>`).join("")}</ul>`;
    if (b.terms) {
      html += `<dl class="glossary">${b.terms.map((x) => `<dt>${fmt(x.t)}</dt><dd>${fmt(x.d)}</dd>`).join("")}</dl>`;
    }
    html += linkList(b.links) + `</section>`;
    return html;
  }

  function renderTopic(topic) {
    const all = topics();
    const i = all.findIndex((x) => x.id === topic.id);
    const prev = all[i - 1], next = all[i + 1];
    return `
      <article>
        <p class="crumb"><a href="#/">← ${esc(ui("home"))}</a></p>
        <h1><span aria-hidden="true">${esc(topic.icon || "")}</span> ${esc(topic.title)}</h1>
        <p class="lede">${fmt(topic.summary)}</p>
        ${translationNotice()}
        ${(topic.blocks || []).map(renderBlock).join("")}
        <p class="checked">${esc(ui("lastChecked"))}: ${esc(state.facts.checked)}</p>
        <nav class="next">
          ${prev ? `<a href="#/${esc(prev.id)}">← ${esc(prev.title)}</a>` : "<span></span>"}
          ${next ? `<a href="#/${esc(next.id)}">${esc(next.title)} →</a>` : `<a href="#/map">${esc(ui("mapTitle"))} →</a>`}
        </nav>
      </article>`;
  }

  const KIND_COLORS = { city: "#1a5b8f", provincial: "#1f5f4a", national: "#b5452b", town: "#7a5aa6", water: "#1d8fb0" };

  function placeText(p) {
    const own = (state.t.places || {})[p.id];
    const en = state.en.places[p.id] || {};
    return { name: p.name, desc: (own && own.desc) || en.desc || "" };
  }

  function renderMapPage() {
    const kinds = Object.keys(KIND_COLORS);
    const legend = kinds.map((k) => `<li><span class="dot" style="background:${KIND_COLORS[k]}"></span>${esc(ui("kind_" + k))}</li>`).join("");
    const list = state.facts.places.map((p) => {
      const tx = placeText(p);
      return `<li><button type="button" data-place="${esc(p.id)}">${esc(tx.name)}</button>
        <p>${fmt(tx.desc)}</p>${linkList(p.links)}</li>`;
    }).join("");
    return `
      <article>
        <p class="crumb"><a href="#/">← ${esc(ui("home"))}</a></p>
        <h1>🗺️ ${esc(ui("mapTitle"))}</h1>
        <p class="lede">${fmt(ui("mapIntro"))}</p>
        ${translationNotice()}
        <ul class="legend">${legend}</ul>
        <div id="map" role="region" aria-label="${esc(ui("mapTitle"))}"></div>
        <section class="block warn"><h2>${esc(ui("officialMapsTitle"))}</h2>
          <p>${fmt(ui("officialMapsText"))}</p>${linkList(state.facts.officialMaps)}</section>
        <ul class="places">${list}</ul>
      </article>`;
  }

  function mountMap() {
    if (!window.L) { setTimeout(mountMap, 150); return; }
    if (state.map) { state.map.remove(); state.map = null; }
    const map = L.map("map", { scrollWheelZoom: false }).setView([51.05, -114.6], 8);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);
    const markers = {};
    for (const p of state.facts.places) {
      const tx = placeText(p);
      markers[p.id] = L.circleMarker([p.lat, p.lng], {
        radius: 9, color: "#fff", weight: 2, fillColor: KIND_COLORS[p.kind] || "#444", fillOpacity: 0.95,
      }).addTo(map).bindPopup(`<strong>${esc(tx.name)}</strong><br>${fmt(tx.desc)}`);
    }
    document.querySelectorAll("[data-place]").forEach((btn) => btn.addEventListener("click", () => {
      const p = state.facts.places.find((x) => x.id === btn.dataset.place);
      map.setView([p.lat, p.lng], 11);
      markers[p.id].openPopup();
      $("#map").scrollIntoView({ behavior: "smooth", block: "center" });
    }));
    state.map = map;
  }

  function renderAbout() {
    return `<article>
      <p class="crumb"><a href="#/">← ${esc(ui("home"))}</a></p>
      <h1>${esc(ui("aboutTitle"))}</h1>
      ${[].concat(state.t.about || state.en.about).map(renderBlock).join("")}
      ${linkList(["repo", "issues"])}
      <p class="checked">${esc(ui("lastChecked"))}: ${esc(state.facts.checked)}</p>
    </article>`;
  }

  function render() {
    const route = location.hash.replace(/^#\/?/, "");
    const main = $("#main");
    let title = "Open Trails Canada";
    if (!route) {
      main.innerHTML = renderHome();
    } else if (route === "map") {
      main.innerHTML = renderMapPage();
      title = ui("mapTitle") + " · " + title;
      mountMap();
    } else if (route === "about") {
      main.innerHTML = renderAbout();
      title = ui("aboutTitle") + " · " + title;
    } else {
      const topic = topics().find((x) => x.id === route);
      if (!topic) { location.hash = "#/"; return; }
      main.innerHTML = renderTopic(topic);
      title = topic.title + " · " + title;
    }
    document.title = title;
    if (route) { window.scrollTo(0, 0); main.focus({ preventScroll: true }); }
  }

  async function boot() {
    try {
      [state.langs, state.facts, state.en] = await Promise.all([
        getJSON("i18n/languages.json"), getJSON("data/facts.json"), getJSON("i18n/en.json"),
      ]);
      const sel = $("#lang-select");
      sel.innerHTML = state.langs.map((l) => `<option value="${esc(l.code)}">${esc(l.name)}</option>`).join("");
      sel.addEventListener("change", () => setLang(sel.value));
      window.addEventListener("hashchange", render);
      await setLang(pickLang());
    } catch (err) {
      $("#main").innerHTML = `<p>Could not load the guide. Please refresh. (${esc(err.message)})</p>`;
    }
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
  }

  boot();
})();
