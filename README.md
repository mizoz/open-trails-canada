# Open Trails Canada

A free, multilingual guide to the outdoors around Calgary and Alberta, written for people who are new to Canada.

**Live site:** https://mizoz.github.io/open-trails-canada/

Many newcomers don't know that most of Alberta is public land they can visit, that a lot of parks near Calgary are free, or which passes and licences they need. This site explains those things in plain language in 14 languages. Each guide links to the official government source.

Topics: start here, passes and fees, hiking, camping, public (Crown) land, fishing, hunting, rivers and lakes, winter, safety, programs and gear, a glossary, and a map.

> This is an independent community project, not a government website. Rules and prices change. Always check the linked official source before you go.

## How it works

A plain static site with no build step, hosted on GitHub Pages.

```
index.html            page shell
assets/app.js         rendering, language picking, routing, map (Leaflet + OpenStreetMap)
assets/style.css      styles (light/dark, right-to-left support)
data/facts.json       shared facts: prices, official links, map places, last-checked date
i18n/languages.json   the language menu
i18n/<code>.json      all text for one language
sw.js                 offline cache for pages already visited
```

Prices, URLs and coordinates are stored once in `data/facts.json`. Translations include them with placeholders like `{kpass_day}`. When a price changes, edit that one file and every language updates.

If a translation is missing a topic, the site shows that topic in English.

## Run it locally

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000.

## Help improve it

- **Fix a translation:** edit `i18n/<code>.json` and open a pull request, or [open an issue](https://github.com/mizoz/open-trails-canada/issues). Most translations started as machine-assisted drafts, so corrections from native speakers are very welcome.
- **Report an outdated rule or price:** open an issue with the official link.
- **Add a language:** copy `i18n/en.json` to `i18n/<code>.json`, translate the text values (keep the keys, `id`s, `links` and `{placeholders}` unchanged), and add the language to `i18n/languages.json` (`"dir": "rtl"` for right-to-left scripts).
- **Add a province:** this guide is designed to grow across Canada. Open an issue to discuss adding new topics and places.

## License

Code: MIT. Guide text and translations: CC BY 4.0. See [LICENSE](LICENSE). Map data © OpenStreetMap contributors.
