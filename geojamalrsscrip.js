
/* === Global Config and Constants === */
const logoBase = "https://blogger.googleusercontent.com/img/a/AVvXsEiSUkC8yJpjNxc77EUF_f-m-1sl4yM4N7CUWgKhAEtbRZTib9lOEdrvZfmzgMgzCOst_rMNIDyACpMT2v_PBHnwcRc7HyGmlR2h4Yj5Es-c0KNMSp7sJpqSeNACH2u-7s9Cjjv7ceZGtE83MeEdO-4CAFe9BPeoNAO6ubZablGyjFl529aRBd327EPIU-w=s";
const defaultThumbSize = "80";
const defaultThumbUrl = `${logoBase}${defaultThumbSize}`;

const MAX_RESULTS = 22;
const GROUPED_CACHE_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days
const RSS_BLOCK_CACHE_EXPIRY = 7 * 24 * 60 * 60 * 1000;

const imgRegex = /<img[^>]+src="([^"]+)"/i;
const ytRegex = /youtube\.com\/embed\/([^"?&]+)/i;

const CACHE_VERSION = "v5";
const CACHE_KEY = `rss_grouped_cache_${CACHE_VERSION}`;
const EXPIRY_KEY = `rss_grouped_expiry_${CACHE_VERSION}`;
  
function buildFeedUrl(baseUrl, callbackName, maxResults = MAX_RESULTS) {
  return `${baseUrl}/feeds/posts/default?alt=json-in-script&callback=${callbackName}&max-results=${maxResults}`;
}

/* === Subdomain Sources === */
const subdomains = [
  { name: 'GIS', url: 'https://gis.geojamal.com' },
  { name: 'Earth Tools & Maps', url: 'https://earth.geojamal.com' },
  { name: 'GEE Scripts & Apps', url: 'https://gee.geojamal.com' },
  { name: 'TV: English Tutorials', url: 'https://tv.geojamal.com' },
  { name: 'Downloads Center', url: 'https://downloads.geojamal.com' },
  { name: 'Coordinate Tools', url: 'https://coordinates.geojamal.com' },
  { name: 'Convert Tools', url: 'https://convert.geojamal.com' },
  { name: 'GPS Utilities', url: 'https://gps.geojamal.com' },
  { name: 'Map Resources', url: 'https://maps.geojamal.com' },
  { name: 'How-To Guides', url: 'https://howto.geojamal.com' },
  { name: 'SASPlanet Center', url: 'https://sasplanet.geojamal.com' },
  //{ name: 'Remote Senging', url: 'https://remotesensing.geojamal.com' },
  { name: 'GeoJamal بالعربية', url: 'https://ar.geojamal.com' }
];

/* === DOM Elements === */
const wrapper = document.getElementById("rss-feed-wrapper");

/* === Caching === */
function isCacheValid() {
  const expiry = localStorage.getItem(EXPIRY_KEY);
  return expiry && Date.now() < parseInt(expiry, 10);
}

/* === UI Controls === */
function toggleAll(open = true) {
  document.querySelectorAll('.category').forEach(cat => {
    cat.classList.toggle('open', open);
  });
}

/* === Main RSS Fetch Logic === */
if (wrapper) {
  if (isCacheValid() && localStorage.getItem(CACHE_KEY)) {
    renderGroupedFeeds(JSON.parse(localStorage.getItem(CACHE_KEY)));
  } else {
    fetchAllFeeds().then(data => {
      localStorage.setItem(CACHE_KEY, JSON.stringify(data));
      localStorage.setItem(EXPIRY_KEY, Date.now() + GROUPED_CACHE_EXPIRY);
      renderGroupedFeeds(data);
    });
  }
}

function fetchAllFeeds() {
  return new Promise(resolve => {
    const results = {};
    let completed = 0;

    subdomains.forEach(site => {
      const callbackName = `callback_${site.name.replace(/\W/g, '')}_${Date.now()}`;
      window[callbackName] = function(data) {
        const entries = (data.feed?.entry || []).map(entry => ({
          title: entry.title.$t,
          link: entry.link.find(l => l.rel === "alternate")?.href,
          date: entry.published.$t,
          content: entry.content?.$t || "",
          siteName: site.name,
          siteUrl: site.url
        }));
        results[site.name] = entries;
        cleanup(callbackName);
        if (++completed === subdomains.length) resolve(results);
      };

      const script = document.createElement("script");
      script.src = buildFeedUrl(site.url, callbackName); // max results
      script.id = `scr_${callbackName}`;
      document.body.appendChild(script);
    });

    function cleanup(name) {
      delete window[name];
      const script = document.getElementById(`scr_${name}`);
      if (script) script.remove();
    }
  });
}

function renderGroupedFeeds(feedGroups) {
  wrapper.innerHTML = "";
  const blocks = [];

  for (const [siteName, entries] of Object.entries(feedGroups)) {
    const siteUrl = subdomains.find(s => s.name === siteName)?.url || "#";
    const blockId = siteName.replace(/\W/g, '').toLowerCase();
    const container = document.createElement("div");
    container.className = "rss-block";
    container.id = `rss-${blockId}`;

    const selected = entries.sort(() => Math.random() - 0.5).slice(0, 4);
    container.innerHTML = `
      <h3 style="margin: 0;"><a href="${siteUrl}" target="_self">${siteName}</a></h3>
      <ul>
        ${selected.map(entry => {
          let thumb = defaultThumbUrl;
          const imgMatch = entry.content.match(imgRegex);
          const ytMatch = entry.content.match(ytRegex);
          if (imgMatch) thumb = imgMatch[1];
          else if (ytMatch) thumb = `https://img.youtube.com/vi/${ytMatch[1]}/mqdefault.jpg`;

          return `
            <li>
              <a href="${entry.link}" target="_self">
                <img src="${thumb}" alt="${entry.title}">
                <span>${entry.title}</span>
              </a>
            </li>`;
        }).join("")}
      </ul>
    `;
    blocks.push(container);
  }

  blocks.sort(() => Math.random() - 0.5).forEach(block => wrapper.appendChild(block));
}

/* === Manual Refresh === */
function refreshAllFeeds() {
  const rssCategory = document.querySelector('.category .category-header i.fas.fa-rss')?.closest('.category');
  if (rssCategory) rssCategory.classList.add('open');

  localStorage.removeItem(CACHE_KEY);
  localStorage.removeItem(EXPIRY_KEY);
  wrapper.innerHTML = '<p style="padding: 10px;">Refreshing feeds...</p>';

  fetchAllFeeds().then(data => {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    localStorage.setItem(EXPIRY_KEY, Date.now() + GROUPED_CACHE_EXPIRY);
    renderGroupedFeeds(data);
  });
}
  
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".rss-section").forEach(section => setupRssBlock(section));
});

function setupRssBlock(section) {
  const wrapper = section.querySelector(".rss-feed-wrapper");
  const titleElem = section.querySelector(".rss-title");
  const refreshBtn = section.querySelector(".refresh-btn");

  const sources = JSON.parse(section.dataset.rss);
  const thumbSize = section.dataset.thumbSize || "80";
  const maxResults = parseInt(section.dataset.maxResults) || 5;
  const layout = section.dataset.layout || "card";
  const title = section.dataset.title || "RSS Updates";
  const sectionId = section.dataset.id || "rss-section";

  if (titleElem) titleElem.textContent = title;

  loadRssFeeds(wrapper, sources, layout, thumbSize, maxResults, sectionId);

  refreshBtn?.addEventListener("click", () => {
    wrapper.innerHTML = "";
    loadRssFeeds(wrapper, sources, layout, thumbSize, maxResults, sectionId, true);
  });
}

function loadRssFeeds(wrapper, sources, layout, thumbSize, maxResults, sectionId, forceRefresh = false) {
  const cacheKey = `rss_cache_${sectionId}`;
  const cacheExpiryKey = `rss_cache_expiry_${sectionId}`;
  const cacheExpiry = RSS_BLOCK_CACHE_EXPIRY; 
  const now = Date.now();

  const cachedData = localStorage.getItem(cacheKey);
  const cachedExpiry = localStorage.getItem(cacheExpiryKey);

  if (cachedData && cachedExpiry && now < parseInt(cachedExpiry) && !forceRefresh) {
    const entries = JSON.parse(cachedData);
    const randomSubset = entries.sort(() => 0.5 - Math.random()).slice(0, maxResults);
    displayEntries(randomSubset, wrapper, layout, thumbSize);
    return;
  }

  const allEntries = [];
  let sourcesProcessed = 0;

  sources.forEach(source => {
    const callbackName = `cb_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    const script = document.createElement("script");
    script.src = buildFeedUrl(source.url, callbackName, 25); // max results

    window[callbackName] = function(data) {
      const entries = data.feed.entry || [];
      entries.forEach(entry => {
        const title = entry.title.$t;
        const link = entry.link.find(l => l.rel === "alternate")?.href;
        const content = entry.content?.$t || "";
        const thumbnail = extractThumbnail(content, thumbSize);
        allEntries.push({ title, link, thumbnail });
      });

      sourcesProcessed++;
      if (sourcesProcessed === sources.length) {
        localStorage.setItem(cacheKey, JSON.stringify(allEntries));
        localStorage.setItem(cacheExpiryKey, (now + cacheExpiry).toString());
        const shuffled = allEntries.sort(() => 0.5 - Math.random()).slice(0, maxResults);
        displayEntries(shuffled, wrapper, layout, thumbSize);
      }

      script.remove();
      delete window[callbackName];
    };

    document.body.appendChild(script);
  });
}

function extractThumbnail(content, size) {
  const img = content.match(imgRegex);
  if (img) return img[1];
  const yt = content.match(ytRegex);
  if (yt) return `https://img.youtube.com/vi/${yt[1]}/mqdefault.jpg`;
  return `${logoBase}${size}`;
}

function displayEntries(entries, wrapper, layout, thumbSize) {
  wrapper.innerHTML = "";
  entries.forEach(entry => {
    wrapper.insertAdjacentHTML("beforeend", createRssCard(layout, entry.title, entry.link, entry.thumbnail));
  });
}

function createRssCard(layout, title, link, thumbnail) {
  if (layout === "grid") {
    return `<div class="rss-item"><img src="${thumbnail}" alt="${title}"><a href="${link}" target="_self">${title}</a></div>`;
  } else if (layout === "card") {
    return `<div class="rss-post-card"><a href="${link}" target="_self"><img src="${thumbnail}" alt="${title}" loading="lazy"><h4>${title}</h4></a></div>`;
  } else if (layout === "list") {
    return `<div class="rss-list-item"><a href="${link}" target="_self">${title}</a></div>`;
  }
  return "";
}
