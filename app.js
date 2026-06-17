const STORAGE_KEY = "mundial_summaries_v1";
const API_SUMMARIES_URL = "./api/summaries";
const PUBLIC_SUMMARIES_URL = "./data/summaries.json";
const ADMIN_PASSWORD = "tzp5-385F";
const REMOTE_BACKEND_URL = (window.MUNDIAL_BACKEND_URL || "").trim();
const DEFAULT_HOTSPOTS = [
  { id: "tv_1", label: "TV 1", x: 12, y: 19.4, width: 24.3, height: 19.2 },
  { id: "tv_2", label: "TV 2", x: 37.6, y: 19.4, width: 24.1, height: 19.2 },
  { id: "tv_3", label: "TV 3", x: 62.9, y: 19.4, width: 24.2, height: 19.2 },
  { id: "tv_4", label: "TV 4", x: 12, y: 40.7, width: 24.3, height: 19.6 },
  { id: "tv_5", label: "TV 5", x: 37.6, y: 40.7, width: 24.1, height: 19.6 },
  { id: "tv_6", label: "TV 6", x: 62.9, y: 40.7, width: 24.2, height: 19.6 }
];

const DEFAULT_PANELS = [
  { tvId: "tv_1", title: "Grupos A y B", image: "./assets/grupos-ab.png" },
  { tvId: "tv_2", title: "Grupos C y D", image: "./assets/grupos-cd.png" },
  { tvId: "tv_3", title: "Grupos E y F", image: "./assets/grupos-ef.png" },
  { tvId: "tv_4", title: "Grupos G y H", image: "./assets/grupos-gh.png" },
  { tvId: "tv_5", title: "Grupos I y J", image: "./assets/grupos-ij.png" },
  { tvId: "tv_6", title: "Grupos K y L", image: "./assets/grupos-kl.png" }
];

const state = {
  hotspots: DEFAULT_HOTSPOTS,
  panels: DEFAULT_PANELS,
  summaries: [],
  activeIndex: 0,
  activeTvId: null,
  selectedSummary: null,
  touchStartX: null
};

const els = {
  stage: document.querySelector("#stage"),
  wallpaper: document.querySelector("#wallpaper"),
  hotspotLayer: document.querySelector("#hotspotLayer"),
  outcomyLogo: document.querySelector("#outcomyLogo"),
  videoDialog: document.querySelector("#videoDialog"),
  videoTitle: document.querySelector("#videoTitle"),
  videoDate: document.querySelector("#videoDate"),
  playerFrame: document.querySelector("#playerFrame"),
  videoIndex: document.querySelector("#videoIndex"),
  openYoutube: document.querySelector("#openYoutube"),
  prevVideo: document.querySelector("#prevVideo"),
  nextVideo: document.querySelector("#nextVideo"),
  closeVideo: document.querySelector("#closeVideo"),
  authDialog: document.querySelector("#authDialog"),
  authForm: document.querySelector("#authForm"),
  closeAuth: document.querySelector("#closeAuth"),
  adminPassword: document.querySelector("#adminPassword"),
  authMessage: document.querySelector("#authMessage"),
  adminDialog: document.querySelector("#adminDialog"),
  openAdmin: document.querySelector("#openAdmin"),
  closeAdmin: document.querySelector("#closeAdmin"),
  adminForm: document.querySelector("#adminForm"),
  targetTv: document.querySelector("#targetTv"),
  matchTitle: document.querySelector("#matchTitle"),
  matchDate: document.querySelector("#matchDate"),
  youtubeUrl: document.querySelector("#youtubeUrl"),
  sortOrder: document.querySelector("#sortOrder"),
  thumbnailOverride: document.querySelector("#thumbnailOverride"),
  adminMessage: document.querySelector("#adminMessage")
};

init();

async function init() {
  const [publicSummaries] = await Promise.all([loadSummaries(), loadHotspots(), loadPanels()]);
  state.summaries = normalizeSummaries(publicSummaries);
  renderAdminOptions();
  renderHotspots();
  bindEvents();
  requestAnimationFrame(positionHotspots);
}

async function loadPanels() {
  try {
    const response = await fetch("./panels.json", { cache: "no-store" });
    if (response.ok) {
      state.panels = await response.json();
    }
  } catch {
    state.panels = DEFAULT_PANELS;
  }
}

async function loadSummaries() {
  if (REMOTE_BACKEND_URL) {
    const remoteSummaries = await fetchSummaries(REMOTE_BACKEND_URL);
    if (remoteSummaries.length) return remoteSummaries;
  }
  const apiSummaries = await fetchSummaries(API_SUMMARIES_URL);
  if (apiSummaries.length) return apiSummaries;
  return fetchSummaries(PUBLIC_SUMMARIES_URL);
}

async function fetchSummaries(url) {
  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) return [];
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

async function loadHotspots() {
  try {
    const response = await fetch("./hotspots.json", { cache: "no-store" });
    if (response.ok) {
      state.hotspots = await response.json();
    }
  } catch {
    state.hotspots = DEFAULT_HOTSPOTS;
  }
}

function bindEvents() {
  window.addEventListener("resize", positionHotspots);
  els.wallpaper.addEventListener("load", positionHotspots);
  els.openAdmin.addEventListener("click", openAuth);
  els.authForm.addEventListener("submit", unlockAdmin);
  els.closeAuth.addEventListener("click", closeAuth);
  els.closeAdmin.addEventListener("click", () => els.adminDialog.close());
  els.closeVideo.addEventListener("click", closeVideo);
  els.videoDialog.addEventListener("click", (event) => {
    if (event.target.hasAttribute("data-close-video")) closeVideo();
  });
  els.prevVideo.addEventListener("click", () => navigateVideo(-1));
  els.nextVideo.addEventListener("click", () => navigateVideo(1));
  els.playerFrame.addEventListener("click", handlePlayerAction);
  els.adminForm.addEventListener("submit", saveSummary);
  els.targetTv.addEventListener("change", fillFormFromTv);
  els.videoDialog.addEventListener("touchstart", (event) => {
    state.touchStartX = event.changedTouches[0].clientX;
  });
  els.videoDialog.addEventListener("touchend", (event) => {
    if (state.touchStartX === null) return;
    const delta = event.changedTouches[0].clientX - state.touchStartX;
    state.touchStartX = null;
    if (Math.abs(delta) < 48) return;
    navigateVideo(delta > 0 ? -1 : 1);
  });
}

function renderHotspots() {
  els.hotspotLayer.innerHTML = "";
  state.hotspots.forEach((hotspot) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "tv-hotspot";
    button.dataset.tvId = hotspot.id;
    button.setAttribute("aria-label", hotspot.label);
    button.addEventListener("click", () => openTv(hotspot.id));
    els.hotspotLayer.append(button);
  });
  refreshLoadedHotspots();
  positionHotspots();
}

function positionHotspots() {
  const stageRect = els.stage.getBoundingClientRect();
  const naturalWidth = els.wallpaper.naturalWidth || 1024;
  const naturalHeight = els.wallpaper.naturalHeight || 1792;
  const stageRatio = stageRect.width / stageRect.height;
  const imageRatio = naturalWidth / naturalHeight;

  let renderedWidth = stageRect.width;
  let renderedHeight = stageRect.height;
  let offsetX = 0;
  let offsetY = 0;

  if (stageRatio > imageRatio) {
    renderedHeight = stageRect.height;
    renderedWidth = stageRect.height * imageRatio;
    offsetX = (stageRect.width - renderedWidth) / 2;
  } else {
    renderedWidth = stageRect.width;
    renderedHeight = stageRect.width / imageRatio;
    offsetY = (stageRect.height - renderedHeight) / 2;
  }

  state.hotspots.forEach((hotspot) => {
    const node = els.hotspotLayer.querySelector(`[data-tv-id="${hotspot.id}"]`);
    if (!node) return;
    node.style.left = `${offsetX + (hotspot.x / 100) * renderedWidth}px`;
    node.style.top = `${offsetY + (hotspot.y / 100) * renderedHeight}px`;
    node.style.width = `${(hotspot.width / 100) * renderedWidth}px`;
    node.style.height = `${(hotspot.height / 100) * renderedHeight}px`;
  });

  const logoWidth = Number(getComputedStyle(document.documentElement).getPropertyValue("--outcomy-width")) || 10.2;
  const logoX = Number(getComputedStyle(document.documentElement).getPropertyValue("--outcomy-x")) || 86.7;
  const logoY = Number(getComputedStyle(document.documentElement).getPropertyValue("--outcomy-y")) || 13.1;
  if (els.outcomyLogo) {
    const width = (logoWidth / 100) * renderedWidth;
    els.outcomyLogo.style.left = `${offsetX + (logoX / 100) * renderedWidth}px`;
    els.outcomyLogo.style.top = `${offsetY + (logoY / 100) * renderedHeight}px`;
    els.outcomyLogo.style.width = `${width}px`;
  }

  const adminWidth =
    Number(getComputedStyle(document.documentElement).getPropertyValue("--admin-picture-width")) || 6.8;
  const adminX = Number(getComputedStyle(document.documentElement).getPropertyValue("--admin-picture-x")) || 2.4;
  const adminY = Number(getComputedStyle(document.documentElement).getPropertyValue("--admin-picture-y")) || 53.8;
  if (els.openAdmin) {
    const width = (adminWidth / 100) * renderedWidth;
    els.openAdmin.style.left = `${offsetX + (adminX / 100) * renderedWidth}px`;
    els.openAdmin.style.top = `${offsetY + (adminY / 100) * renderedHeight}px`;
    els.openAdmin.style.width = `${width}px`;
  }
}

function renderAdminOptions() {
  els.targetTv.innerHTML = `<option value="">Seleccionar TV</option>` + state.hotspots
    .map((hotspot) => {
      const panel = state.panels.find((item) => item.tvId === hotspot.id);
      return `<option value="${hotspot.id}">${hotspot.label} - ${panel?.title || ""}</option>`;
    })
    .join("");
}

function openTv(tvId) {
  state.activeTvId = tvId;
  const ordered = getOrderedSummaries(tvId);
  state.activeIndex = ordered.length ? 0 : -1;
  state.selectedSummary = ordered[0] || null;

  const node = els.hotspotLayer.querySelector(`[data-tv-id="${tvId}"]`);
  node?.classList.add("is-active");
  setTimeout(() => node?.classList.remove("is-active"), 220);

  openVideoDialog();
  renderVideo();
}

function openVideoDialog() {
  if (!els.videoDialog.open) els.videoDialog.showModal();
}

function closeVideo() {
  stopVideo();
  els.videoDialog.close();
}

function renderVideo() {
  const ordered = getOrderedSummaries(state.activeTvId);
  const summary = state.selectedSummary || null;
  const fallbackTv = state.hotspots.find((item) => item.id === state.activeTvId);

  if (!summary) {
    els.videoTitle.textContent = "Resumen no disponible todavía.";
    els.videoDate.textContent = fallbackTv?.label || "";
    els.playerFrame.innerHTML = `<div class="empty-player">Resumen no disponible todavía.</div>`;
    els.videoIndex.textContent = "0 / 0";
    els.prevVideo.disabled = true;
    els.nextVideo.disabled = true;
    els.openYoutube.classList.add("is-disabled");
    els.openYoutube.removeAttribute("href");
    return;
  }

  els.videoTitle.textContent = summary.matchTitle;
  els.videoDate.textContent = formatDate(summary.matchDate);
  renderVideoPoster(summary);
  els.videoIndex.textContent = `${state.activeIndex + 1} / ${ordered.length}`;
  els.prevVideo.disabled = state.activeIndex <= 0;
  els.nextVideo.disabled = state.activeIndex >= ordered.length - 1;
  els.openYoutube.href = summary.youtubeUrl;
  els.openYoutube.classList.remove("is-disabled");
}

function renderVideoPoster(summary) {
  const thumbnail = summary.thumbnailUrl || getYoutubeThumbnail(summary.youtubeUrl);
  els.playerFrame.innerHTML = `
    <div class="video-poster" style="background-image: url('${escapeAttribute(thumbnail)}')">
      <div class="video-poster-shade"></div>
      <div class="video-poster-content">
        <span class="poster-kicker">Resumen disponible</span>
        <strong>${escapeHtml(summary.matchTitle)}</strong>
        <div class="poster-actions">
          <button class="poster-play" type="button" data-play-inline>Reproducir aca</button>
          <a class="poster-youtube" href="${escapeAttribute(summary.youtubeUrl)}" target="_blank" rel="noreferrer">Ver en YouTube</a>
        </div>
        <small>Si YouTube bloquea el reproductor, usa el boton de YouTube.</small>
      </div>
    </div>
  `;
}

function renderInlinePlayer(summary) {
  els.playerFrame.innerHTML = `
    <iframe
      src="${summary.embedUrl}"
      title="${escapeHtml(summary.matchTitle)}"
      referrerpolicy="strict-origin-when-cross-origin"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      allowfullscreen
    ></iframe>
    <a class="player-fallback" href="${escapeAttribute(summary.youtubeUrl)}" target="_blank" rel="noreferrer">
      Si no carga, ver en YouTube
    </a>
  `;
}

function handlePlayerAction(event) {
  const playButton = event.target.closest("[data-play-inline]");
  if (!playButton || !state.selectedSummary) return;
  renderInlinePlayer(state.selectedSummary);
}

function navigateVideo(direction) {
  const ordered = getOrderedSummaries(state.activeTvId);
  if (!ordered.length) return;
  const currentIndex = state.activeIndex >= 0 ? state.activeIndex : ordered.findIndex((item) => item.id === state.selectedSummary?.id);
  const nextIndex = currentIndex + direction;
  if (nextIndex < 0 || nextIndex >= ordered.length) return;
  state.activeIndex = nextIndex;
  state.selectedSummary = ordered[nextIndex];
  renderVideo();
}

function stopVideo() {
  els.playerFrame.innerHTML = "";
}

function openAuth() {
  els.authMessage.textContent = "";
  els.adminPassword.value = "";
  els.authDialog.showModal();
  setTimeout(() => els.adminPassword.focus(), 80);
}

function closeAuth() {
  els.authDialog.close();
}

function unlockAdmin(event) {
  event.preventDefault();
  if (els.adminPassword.value !== ADMIN_PASSWORD) {
    els.authMessage.textContent = "Contraseña incorrecta.";
    els.adminPassword.select();
    return;
  }
  els.authDialog.close();
  openAdmin();
}

function openAdmin() {
  setMessage("");
  fillFormFromTv();
  els.adminDialog.showModal();
}

function fillFormFromTv() {
  if (!els.targetTv.value) {
    clearAdminFields(false);
    return;
  }
  const summary = state.summaries.find((item) => item.tvId === els.targetTv.value && item.active);
  els.matchTitle.value = summary?.matchTitle || "";
  els.matchDate.value = summary?.matchDate || "";
  els.youtubeUrl.value = summary?.youtubeUrl || "";
  els.sortOrder.value = summary?.sortOrder || "";
  els.thumbnailOverride.value = summary?.thumbnailUrl || "";
}

async function saveSummary(event) {
  event.preventDefault();
  if (!els.targetTv.value) {
    setMessage("Elegí una TV.", true);
    return;
  }

  const normalized = normalizeYoutubeUrl(els.youtubeUrl.value.trim());
  if (!normalized) {
    setMessage("Pegá un link válido de YouTube.", true);
    return;
  }

  const tvId = els.targetTv.value;
  const now = new Date().toISOString();
  const summary = {
    id: `summary_${Date.now()}`,
    tvId,
    matchTitle: els.matchTitle.value.trim(),
    matchDate: els.matchDate.value,
    youtubeUrl: normalized.watchUrl,
    embedUrl: normalized.embedUrl,
    thumbnailUrl: els.thumbnailOverride.value.trim() || normalized.thumbnailUrl,
    sortOrder: Number(els.sortOrder.value || getNextSortOrder()),
    createdAt: now,
    updatedAt: now,
    active: true
  };

  state.summaries = state.summaries.concat(summary);
  state.summaries = normalizeSummaries(state.summaries);
  const saved = await persistSummaries(summary);
  if (!saved) {
    setMessage("No se pudo guardar online. Configurá la URL de Apps Script en backend-config.js.", true);
    return;
  }
  refreshLoadedHotspots();
  clearAdminFields(true);
  setMessage("Guardado en JSON. Listo para cargar otro link.");
}

async function persistSummaries(newSummary = null) {
  const summaries = state.summaries.filter((item) => item.active);
  if (REMOTE_BACKEND_URL) {
    try {
      const response = await fetch(REMOTE_BACKEND_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(newSummary ? [newSummary] : summaries)
      });
      if (!response.ok) throw new Error("Remote save failed");
      localStorage.setItem(STORAGE_KEY, JSON.stringify(summaries));
      return true;
    } catch {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(summaries));
      return false;
    }
  }

  try {
    const response = await fetch(API_SUMMARIES_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(summaries)
    });
    if (!response.ok) throw new Error("Save failed");
    localStorage.setItem(STORAGE_KEY, JSON.stringify(summaries));
    return true;
  } catch {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(summaries));
    return false;
  }
}

function clearAdminFields(resetTv = true) {
  if (resetTv) els.targetTv.value = "";
  els.matchTitle.value = "";
  els.matchDate.value = "";
  els.youtubeUrl.value = "";
  els.sortOrder.value = "";
  els.thumbnailOverride.value = "";
  (resetTv ? els.targetTv : els.matchTitle).focus();
}

function refreshLoadedHotspots() {
  const summariesByTv = new Map(state.summaries.filter((item) => item.active).map((item) => [item.tvId, item]));
  const panelsByTv = new Map(state.panels.map((item) => [item.tvId, item]));
  els.hotspotLayer.querySelectorAll(".tv-hotspot").forEach((node) => {
    const summary = summariesByTv.get(node.dataset.tvId);
    const panel = panelsByTv.get(node.dataset.tvId);
    node.classList.toggle("is-loaded", Boolean(summary));
    node.classList.toggle("has-panel", Boolean(panel));
    node.dataset.title = summary?.matchTitle || panel?.title || "";
    node.style.backgroundImage = panel?.image
      ? `linear-gradient(rgba(0, 0, 0, 0.08), rgba(0, 0, 0, 0.08)), url("${panel.image}")`
      : summary?.thumbnailUrl
        ? `url("${summary.thumbnailUrl}")`
        : "";
  });
}

function getOrderedSummaries(tvId = null) {
  return state.summaries
    .filter((item) => item.active && (!tvId || item.tvId === tvId))
    .slice()
    .sort((a, b) => (a.sortOrder || 999) - (b.sortOrder || 999) || b.updatedAt.localeCompare(a.updatedAt));
}

function getNextSortOrder() {
  const orders = state.summaries.map((item) => Number(item.sortOrder) || 0);
  return orders.length ? Math.max(...orders) + 1 : 1;
}

function normalizeSummaries(summaries) {
  return summaries
    .filter((item) => item && item.tvId && item.youtubeUrl)
    .map((item, index) => {
      const normalized = normalizeYoutubeUrl(item.youtubeUrl);
      return {
        ...item,
        id: item.id || `summary_${Date.now()}_${index}`,
        matchTitle: item.matchTitle || item.title || "Resumen",
        matchDate: item.matchDate || "",
        youtubeUrl: normalized?.watchUrl || item.youtubeUrl,
        embedUrl: normalized?.embedUrl || item.embedUrl || "",
        thumbnailUrl: item.thumbnailUrl || normalized?.thumbnailUrl || "",
        sortOrder: Number(item.sortOrder || index + 1),
        createdAt: item.createdAt || item.created_at || new Date().toISOString(),
        updatedAt: item.updatedAt || item.updated_at || new Date().toISOString(),
        active: item.active !== false
      };
    });
}

function normalizeYoutubeUrl(value) {
  try {
    const url = new URL(value);
    let videoId = "";

    if (url.hostname.includes("youtu.be")) {
      videoId = url.pathname.split("/").filter(Boolean)[0] || "";
    } else if (url.pathname.startsWith("/shorts/")) {
      videoId = url.pathname.split("/").filter(Boolean)[1] || "";
    } else if (url.pathname.startsWith("/embed/")) {
      videoId = url.pathname.split("/").filter(Boolean)[1] || "";
    } else if (url.pathname.startsWith("/live/")) {
      videoId = url.pathname.split("/").filter(Boolean)[1] || "";
    } else if (url.hostname.includes("youtube.com")) {
      videoId = url.searchParams.get("v") || "";
    }

    videoId = videoId.replace(/[^a-zA-Z0-9_-]/g, "");
    if (!videoId) {
      const match = value.match(/(?:v=|youtu\.be\/|shorts\/|embed\/|live\/)([a-zA-Z0-9_-]{6,})/);
      videoId = match?.[1] || "";
    }
    if (!videoId) return null;

    return {
      id: videoId,
      watchUrl: `https://www.youtube.com/watch?v=${videoId}`,
      embedUrl: buildYoutubeEmbedUrl(videoId),
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
    };
  } catch {
    return null;
  }
}

function getYoutubeThumbnail(value) {
  const normalized = normalizeYoutubeUrl(value);
  return normalized?.thumbnailUrl || "";
}

function buildYoutubeEmbedUrl(videoId) {
  const params = new URLSearchParams({ rel: "0", playsinline: "1", enablejsapi: "1" });
  if (location.protocol.startsWith("http") && location.origin && location.origin !== "null") {
    params.set("origin", location.origin);
  }
  return `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`;
}

function formatDate(dateValue) {
  if (!dateValue) return "";
  const date = new Date(`${dateValue}T12:00:00`);
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(date);
}

function setMessage(message, isError = false) {
  els.adminMessage.textContent = message;
  els.adminMessage.classList.toggle("is-error", isError);
}

function readSummaries() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (char) => {
    const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
    return map[char];
  });
}

function escapeAttribute(value) {
  return String(value || "").replace(/["'\\]/g, "");
}
