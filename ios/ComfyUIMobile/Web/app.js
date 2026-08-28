"use strict";

// ---------- storage ----------

const STORE_KEY_SETTINGS = "comfyMob.settings";
const STORE_KEY_WORKFLOWS = "comfyMob.workflows";
const STORE_KEY_ADDRESSES = "comfyMob.addresses";

function loadSettings() {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY_SETTINGS)) || {};
  } catch {
    return {};
  }
}

function saveSettings(settings) {
  localStorage.setItem(STORE_KEY_SETTINGS, JSON.stringify(settings));
}

function loadWorkflows() {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY_WORKFLOWS)) || {};
  } catch {
    return {};
  }
}

function saveWorkflows(workflows) {
  localStorage.setItem(STORE_KEY_WORKFLOWS, JSON.stringify(workflows));
}

function loadAddresses() {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY_ADDRESSES)) || {};
  } catch {
    return {};
  }
}

function saveAddresses(addresses) {
  localStorage.setItem(STORE_KEY_ADDRESSES, JSON.stringify(addresses));
}

const STORE_KEY_ADDRESS_HISTORY = "comfyMob.addressHistory";
const MAX_ADDRESS_HISTORY = 8;

function loadAddressHistory() {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY_ADDRESS_HISTORY)) || [];
  } catch {
    return [];
  }
}

function saveAddressHistory(list) {
  localStorage.setItem(STORE_KEY_ADDRESS_HISTORY, JSON.stringify(list.slice(0, MAX_ADDRESS_HISTORY)));
}

const STORE_KEY_MEDIA = "comfyMob.media";
const MAX_MEDIA_ENTRIES = 500;

function loadMedia() {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY_MEDIA)) || [];
  } catch {
    return [];
  }
}

function saveMedia(media) {
  localStorage.setItem(STORE_KEY_MEDIA, JSON.stringify(media.slice(0, MAX_MEDIA_ENTRIES)));
}

// ---------- state ----------

let settings = loadSettings();
let workflows = loadWorkflows();
let addresses = loadAddresses();
let addressHistory = loadAddressHistory();
let media = loadMedia();
let currentWorkflowName = null;
let analysis = null; // result of analyzeWorkflow()
let clientId = localStorage.getItem("comfyMob.clientId");
if (!clientId) {
  clientId = crypto.randomUUID();
  localStorage.setItem("comfyMob.clientId", clientId);
}

// ---------- dom refs ----------

const $ = (id) => document.getElementById(id);

const connDot = $("connDot");
const settingsBtn = $("settingsBtn");
const settingsOverlay = $("settingsOverlay");
const closeSettingsBtn = $("closeSettingsBtn");
const baseUrlInput = $("baseUrlInput");
const testConnBtn = $("testConnBtn");
const connStatus = $("connStatus");
const addressSelect = $("addressSelect");
const saveAddressBtn = $("saveAddressBtn");
const deleteAddressBtn = $("deleteAddressBtn");
const addressHistoryList = $("addressHistoryList");

const workflowSelect = $("workflowSelect");
const importWorkflowBtn = $("importWorkflowBtn");
const deleteWorkflowBtn = $("deleteWorkflowBtn");
const workflowFileInput = $("workflowFileInput");
const workflowHint = $("workflowHint");
const currentWorkflowLabel = $("currentWorkflowLabel");
const changeWorkflowBtn = $("changeWorkflowBtn");
const emptyImportBtn = $("emptyImportBtn");

const genForm = $("genForm");
const positivePrompt = $("positivePrompt");
const negativeField = $("negativeField");
const negativePrompt = $("negativePrompt");
const checkpointField = $("checkpointField");
const checkpointSelect = $("checkpointSelect");
const sizeField = $("sizeField");
const widthInput = $("widthInput");
const heightInput = $("heightInput");
const durationField = $("durationField");
const durationInput = $("durationInput");
const samplerField = $("samplerField");
const samplerSelect = $("samplerSelect");
const schedulerSelect = $("schedulerSelect");
const stepsCfgField = $("stepsCfgField");
const stepsInput = $("stepsInput");
const cfgInput = $("cfgInput");
const seedField = $("seedField");
const seedInput = $("seedInput");
const randomSeedCheckbox = $("randomSeedCheckbox");
const rawJsonArea = $("rawJsonArea");

const generateBtn = $("generateBtn");
const progressCard = $("progressCard");
const progressText = $("progressText");
const galleryCard = $("galleryCard");
const gallery = $("gallery");
const emptyState = $("emptyState");

const lightboxOverlay = $("lightboxOverlay");
const lightboxImg = $("lightboxImg");
const lightboxOpenLink = $("lightboxOpenLink");
const closeLightboxBtn = $("closeLightboxBtn");

const tabGenerateBtn = $("tabGenerateBtn");
const tabExplorerBtn = $("tabExplorerBtn");
const appView = $("app");
const explorerView = $("explorerView");
const bottomBar = $("bottomBar");
const refreshMediaBtn = $("refreshMediaBtn");
const clearMediaBtn = $("clearMediaBtn");
const mediaStatus = $("mediaStatus");
const mediaCard = $("mediaCard");
const mediaGrid = $("mediaGrid");
const mediaEmptyState = $("mediaEmptyState");

// ---------- tabs ----------

function showGenerateTab() {
  appView.hidden = false;
  explorerView.hidden = true;
  bottomBar.hidden = false;
  tabGenerateBtn.classList.add("active");
  tabExplorerBtn.classList.remove("active");
}

function showExplorerTab() {
  appView.hidden = true;
  explorerView.hidden = false;
  bottomBar.hidden = true;
  tabGenerateBtn.classList.remove("active");
  tabExplorerBtn.classList.add("active");
  renderMediaGrid();
  if (media.length === 0 && baseUrl()) refreshMediaFromComfy();
}

tabGenerateBtn.addEventListener("click", showGenerateTab);
tabExplorerBtn.addEventListener("click", showExplorerTab);

// ---------- settings drawer ----------

function baseUrl() {
  return (settings.baseUrl || "").replace(/\/+$/, "");
}

function refreshAddressSelect() {
  const names = Object.keys(addresses);
  addressSelect.innerHTML = "";
  const blank = document.createElement("option");
  blank.value = "";
  blank.textContent = names.length ? "— pick a saved address —" : "No saved addresses yet";
  addressSelect.appendChild(blank);
  for (const name of names) {
    const opt = document.createElement("option");
    opt.value = name;
    opt.textContent = `${name} (${addresses[name]})`;
    if (addresses[name] === settings.baseUrl) opt.selected = true;
    addressSelect.appendChild(opt);
  }
}

addressSelect.addEventListener("change", () => {
  const name = addressSelect.value;
  if (name && addresses[name]) baseUrlInput.value = addresses[name];
});

saveAddressBtn.addEventListener("click", () => {
  const url = normalizeUrl(baseUrlInput.value);
  if (!url) {
    connStatus.textContent = "Enter an address first.";
    return;
  }
  baseUrlInput.value = url;
  const name = prompt("Name this address (e.g. \"Local\" or \"Tailscale\"):", addressSelect.value || "");
  if (!name) return;
  addresses[name] = url;
  saveAddresses(addresses);
  refreshAddressSelect();
  addressSelect.value = name;
});

deleteAddressBtn.addEventListener("click", () => {
  const name = addressSelect.value;
  if (!name || !addresses[name]) return;
  if (!confirm(`Delete saved address "${name}"?`)) return;
  delete addresses[name];
  saveAddresses(addresses);
  refreshAddressSelect();
});

function openSettings() {
  baseUrlInput.value = settings.baseUrl || "";
  connStatus.textContent = "";
  refreshAddressSelect();
  settingsOverlay.hidden = false;
}

function closeSettings() {
  settingsOverlay.hidden = true;
}

settingsBtn.addEventListener("click", openSettings);
closeSettingsBtn.addEventListener("click", closeSettings);
settingsOverlay.addEventListener("click", (e) => {
  if (e.target === settingsOverlay) closeSettings();
});

function normalizeUrl(input) {
  let url = input.trim().replace(/\/+$/, "");
  if (url && !/^https?:\/\//i.test(url)) url = `http://${url}`;
  return url;
}

function recordAddressHistory(url) {
  addressHistory = [url, ...addressHistory.filter((u) => u !== url)].slice(0, MAX_ADDRESS_HISTORY);
  saveAddressHistory(addressHistory);
}

function renderAddressHistorySuggestions() {
  addressHistoryList.innerHTML = "";
  for (const url of addressHistory) {
    const li = document.createElement("li");
    li.textContent = url;
    li.addEventListener("mousedown", (e) => e.preventDefault()); // keep focus so click fires before blur hides the list
    li.addEventListener("click", () => {
      baseUrlInput.value = url;
      addressHistoryList.hidden = true;
    });
    addressHistoryList.appendChild(li);
  }
  return addressHistory.length > 0;
}

baseUrlInput.addEventListener("focus", () => {
  addressHistoryList.hidden = !renderAddressHistorySuggestions();
});
baseUrlInput.addEventListener("blur", () => {
  setTimeout(() => (addressHistoryList.hidden = true), 150);
});

async function testConnection() {
  const url = normalizeUrl(baseUrlInput.value);
  baseUrlInput.value = url;
  if (!url) {
    connStatus.textContent = "Enter an address first.";
    return;
  }
  connStatus.textContent = "Testing…";
  try {
    const res = await fetch(`${url}/system_stats`, { mode: "cors" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    await res.json();
    settings.baseUrl = url;
    saveSettings(settings);
    recordAddressHistory(url);
    connStatus.textContent = "Connected.";
    updateConnDot(true);
    if (currentWorkflowName) await populateDynamicOptions();
    setTimeout(closeSettings, 700);
  } catch (err) {
    updateConnDot(false);
    connStatus.textContent =
      "Couldn't reach ComfyUI. Check the address, and make sure ComfyUI was started with --enable-cors-header (see README). " +
      (err && err.message ? `(${err.message})` : "");
  }
}

testConnBtn.addEventListener("click", testConnection);

function updateConnDot(ok) {
  connDot.classList.remove("ok", "bad");
  connDot.classList.add(ok ? "ok" : "bad");
}

// ---------- workflow analysis ----------

// Given API-format workflow JSON (object of nodeId -> {class_type, inputs}),
// find the key nodes we know how to drive from a simple UI.
function analyzeWorkflow(wf) {
  const ids = Object.keys(wf);
  const ksamplerId = ids.find((id) => (wf[id].class_type || "").startsWith("KSampler"));

  const result = {
    ksamplerId: null,
    seedKey: null,
    positiveId: null,
    negativeId: null,
    latentId: null,
    checkpointId: null,
    checkpointClass: null,
    durationId: null,
  };

  // video API nodes (e.g. MiniMax) expose duration directly in seconds, independent of any KSampler
  result.durationId = ids.find((id) => {
    const node = wf[id];
    return (node.class_type || "").startsWith("Minimax") && node.inputs && "duration" in node.inputs;
  }) || null;

  if (!ksamplerId) return result;
  result.ksamplerId = ksamplerId;
  const ksampler = wf[ksamplerId];
  const inputs = ksampler.inputs || {};

  result.seedKey = "seed" in inputs ? "seed" : ("noise_seed" in inputs ? "noise_seed" : null);

  if (Array.isArray(inputs.positive)) result.positiveId = inputs.positive[0];
  if (Array.isArray(inputs.negative)) result.negativeId = inputs.negative[0];

  if (Array.isArray(inputs.latent_image)) {
    const latentId = inputs.latent_image[0];
    if (wf[latentId] && wf[latentId].class_type === "EmptyLatentImage") {
      result.latentId = latentId;
    }
  }

  // walk the model chain back to a checkpoint loader
  let modelRef = inputs.model;
  let depth = 0;
  while (Array.isArray(modelRef) && depth < 8) {
    const nodeId = modelRef[0];
    const node = wf[nodeId];
    if (!node) break;
    if ((node.class_type || "").includes("CheckpointLoader")) {
      result.checkpointId = nodeId;
      result.checkpointClass = node.class_type;
      break;
    }
    modelRef = node.inputs && node.inputs.model;
    depth++;
  }

  return result;
}

// ---------- object_info lookups ----------

const objectInfoCache = {};

async function fetchNodeOptions(classType, inputName) {
  const cacheKey = classType;
  try {
    if (!objectInfoCache[cacheKey]) {
      const res = await fetch(`${baseUrl()}/object_info/${encodeURIComponent(classType)}`, { mode: "cors" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      objectInfoCache[cacheKey] = await res.json();
    }
    const info = objectInfoCache[cacheKey][classType];
    const required = info && info.input && info.input.required;
    const spec = required && required[inputName];
    if (spec && Array.isArray(spec[0])) return spec[0];
  } catch (err) {
    console.warn("fetchNodeOptions failed", classType, inputName, err);
  }
  return null;
}

function fillSelect(select, options, selected) {
  select.innerHTML = "";
  for (const opt of options) {
    const el = document.createElement("option");
    el.value = opt;
    el.textContent = opt;
    if (opt === selected) el.selected = true;
    select.appendChild(el);
  }
}

async function populateDynamicOptions() {
  if (!analysis || !baseUrl()) return;

  if (analysis.checkpointId) {
    const node = workflows[currentWorkflowName][analysis.checkpointId];
    const current = node.inputs.ckpt_name;
    const options = await fetchNodeOptions(analysis.checkpointClass, "ckpt_name");
    if (options) {
      fillSelect(checkpointSelect, options, current);
      checkpointField.hidden = false;
    } else {
      checkpointField.hidden = true;
    }
  }

  if (analysis.ksamplerId) {
    const node = workflows[currentWorkflowName][analysis.ksamplerId];
    const klass = node.class_type;
    const samplerOptions = await fetchNodeOptions(klass, "sampler_name");
    const schedulerOptions = await fetchNodeOptions(klass, "scheduler");
    if (samplerOptions && schedulerOptions) {
      fillSelect(samplerSelect, samplerOptions, node.inputs.sampler_name);
      fillSelect(schedulerSelect, schedulerOptions, node.inputs.scheduler);
      samplerField.hidden = false;
    } else {
      samplerField.hidden = true;
    }
  }
}

// ---------- workflow select/import/delete ----------

function refreshWorkflowSelect() {
  workflowSelect.innerHTML = "";
  const names = Object.keys(workflows);
  if (names.length === 0) {
    const opt = document.createElement("option");
    opt.textContent = "No workflows imported";
    opt.disabled = true;
    opt.selected = true;
    workflowSelect.appendChild(opt);
    workflowHint.hidden = false;
    return;
  }
  for (const name of names) {
    const opt = document.createElement("option");
    opt.value = name;
    opt.textContent = name;
    workflowSelect.appendChild(opt);
  }
  if (!currentWorkflowName || !workflows[currentWorkflowName]) {
    currentWorkflowName = names[0];
  }
  workflowSelect.value = currentWorkflowName;
}

function loadWorkflowIntoForm(name) {
  currentWorkflowName = name;
  const wf = workflows[name];
  if (!wf) {
    genForm.hidden = true;
    emptyState.hidden = false;
    generateBtn.disabled = true;
    return;
  }

  analysis = analyzeWorkflow(wf);
  emptyState.hidden = true;
  genForm.hidden = false;
  generateBtn.disabled = false;
  currentWorkflowLabel.textContent = name;
  rawJsonArea.value = JSON.stringify(wf, null, 2);

  if (analysis.positiveId) {
    positivePrompt.value = wf[analysis.positiveId].inputs.text || "";
  }
  if (analysis.negativeId) {
    negativeField.hidden = false;
    negativePrompt.value = wf[analysis.negativeId].inputs.text || "";
  } else {
    negativeField.hidden = true;
  }

  if (analysis.latentId) {
    const node = wf[analysis.latentId];
    widthInput.value = node.inputs.width;
    heightInput.value = node.inputs.height;
    sizeField.hidden = false;
  } else {
    sizeField.hidden = true;
  }

  if (analysis.durationId) {
    durationInput.value = wf[analysis.durationId].inputs.duration;
    durationField.hidden = false;
  } else {
    durationField.hidden = true;
  }

  if (analysis.ksamplerId) {
    const node = wf[analysis.ksamplerId];
    stepsInput.value = node.inputs.steps ?? "";
    cfgInput.value = node.inputs.cfg ?? "";
    stepsCfgField.hidden = node.inputs.steps === undefined && node.inputs.cfg === undefined;
    if (analysis.seedKey) {
      seedInput.value = node.inputs[analysis.seedKey] ?? 0;
      seedField.hidden = false;
    } else {
      seedField.hidden = true;
    }
  } else {
    stepsCfgField.hidden = true;
    seedField.hidden = true;
  }

  checkpointField.hidden = true;
  samplerField.hidden = true;
  if (baseUrl()) populateDynamicOptions();
}

workflowSelect.addEventListener("change", () => {
  loadWorkflowIntoForm(workflowSelect.value);
  closeSettings(); // user picked one — show it
});

importWorkflowBtn.addEventListener("click", () => workflowFileInput.click());
emptyImportBtn.addEventListener("click", () => workflowFileInput.click());
changeWorkflowBtn.addEventListener("click", openSettings);

workflowFileInput.addEventListener("change", async () => {
  const file = workflowFileInput.files[0];
  if (!file) return;
  try {
    const text = await file.text();
    const json = JSON.parse(text);
    // basic sanity check: API-format workflows are an object of numeric-ish keys -> {class_type, inputs}
    const values = Object.values(json);
    if (values.length === 0 || !values.every((v) => v && typeof v.class_type === "string")) {
      throw new Error("This doesn't look like an API-format workflow export (missing class_type on nodes).");
    }
    let name = file.name.replace(/\.json$/i, "");
    if (workflows[name]) name = `${name} (${Date.now()})`;
    workflows[name] = json;
    saveWorkflows(workflows);
    refreshWorkflowSelect();
    workflowSelect.value = name;
    loadWorkflowIntoForm(name);
    closeSettings(); // reveal the freshly loaded form
  } catch (err) {
    alert(`Couldn't import workflow: ${err.message}`);
  } finally {
    workflowFileInput.value = "";
  }
});

deleteWorkflowBtn.addEventListener("click", () => {
  if (!currentWorkflowName || !workflows[currentWorkflowName]) return;
  if (!confirm(`Delete workflow "${currentWorkflowName}"?`)) return;
  delete workflows[currentWorkflowName];
  saveWorkflows(workflows);
  currentWorkflowName = null;
  refreshWorkflowSelect();
  loadWorkflowIntoForm(workflowSelect.value);
});

// ---------- generate ----------

function buildPatchedWorkflow() {
  // Start from the raw JSON textarea, so manual edits there are respected.
  const wf = JSON.parse(rawJsonArea.value);

  if (analysis.positiveId && wf[analysis.positiveId]) {
    wf[analysis.positiveId].inputs.text = positivePrompt.value;
  }
  if (analysis.negativeId && wf[analysis.negativeId]) {
    wf[analysis.negativeId].inputs.text = negativePrompt.value;
  }
  if (analysis.checkpointId && wf[analysis.checkpointId] && !checkpointField.hidden) {
    wf[analysis.checkpointId].inputs.ckpt_name = checkpointSelect.value;
  }
  if (analysis.latentId && wf[analysis.latentId]) {
    wf[analysis.latentId].inputs.width = Number(widthInput.value);
    wf[analysis.latentId].inputs.height = Number(heightInput.value);
  }
  if (analysis.ksamplerId && wf[analysis.ksamplerId]) {
    const node = wf[analysis.ksamplerId];
    if (stepsInput.value !== "") node.inputs.steps = Number(stepsInput.value);
    if (cfgInput.value !== "") node.inputs.cfg = Number(cfgInput.value);
    if (!samplerField.hidden) {
      node.inputs.sampler_name = samplerSelect.value;
      node.inputs.scheduler = schedulerSelect.value;
    }
    if (analysis.seedKey) {
      const seed = randomSeedCheckbox.checked
        ? Math.floor(Math.random() * 2 ** 32)
        : Number(seedInput.value);
      node.inputs[analysis.seedKey] = seed;
      seedInput.value = seed;
    }
  }
  if (analysis.durationId && wf[analysis.durationId] && durationInput.value !== "") {
    wf[analysis.durationId].inputs.duration = Number(durationInput.value);
  }

  return wf;
}

async function queuePrompt(wf) {
  const res = await fetch(`${baseUrl()}/prompt`, {
    method: "POST",
    mode: "cors",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: wf, client_id: clientId }),
  });
  const body = await res.json();
  if (!res.ok || body.error) {
    const detail = body.node_errors ? JSON.stringify(body.node_errors) : (body.error || `HTTP ${res.status}`);
    throw new Error(`ComfyUI rejected the prompt: ${detail}`);
  }
  return body.prompt_id;
}

async function pollHistory(promptId) {
  while (true) {
    const res = await fetch(`${baseUrl()}/history/${promptId}`, { mode: "cors" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const history = await res.json();
    const entry = history[promptId];
    if (entry) {
      const status = entry.status || {};
      if (status.completed || status.status_str === "success" || entry.outputs) {
        return entry;
      }
      if (status.status_str === "error") {
        throw new Error("Generation failed. Check ComfyUI's console for details.");
      }
    }
    progressText.textContent = "Rendering…";
    await new Promise((r) => setTimeout(r, 1200));
  }
}

function imageUrl({ filename, subfolder, type }) {
  const params = new URLSearchParams({ filename, subfolder: subfolder || "", type: type || "output" });
  return `${baseUrl()}/view?${params.toString()}`;
}

function extractImages(historyEntry) {
  const urls = [];
  const outputs = historyEntry.outputs || {};
  for (const nodeId of Object.keys(outputs)) {
    const images = outputs[nodeId].images || [];
    for (const img of images) {
      urls.push(imageUrl(img));
    }
  }
  return urls;
}

// ---------- media explorer ----------

function recordMedia(id, images, prompt) {
  if (images.length === 0) return;
  media = media.filter((entry) => entry.id !== id);
  media.unshift({ id, ts: Date.now(), source: "app", prompt: prompt || null, images });
  saveMedia(media);
}

async function refreshMediaFromComfy() {
  refreshMediaBtn.disabled = true;
  mediaStatus.textContent = "Refreshing…";
  try {
    const res = await fetch(`${baseUrl()}/history`, { mode: "cors" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const history = await res.json();
    const knownIds = new Set(media.map((entry) => entry.id));
    const ids = Object.keys(history).filter((id) => !knownIds.has(id));
    const baseTs = Date.now();
    ids.forEach((id, idx) => {
      const images = extractImages(history[id]);
      if (images.length === 0) return;
      media.push({ id, ts: baseTs - (ids.length - idx), source: "comfy", prompt: null, images });
    });
    media.sort((a, b) => b.ts - a.ts);
    saveMedia(media);
    renderMediaGrid();
    mediaStatus.textContent = `Loaded. ${media.length} generation(s) cached.`;
  } catch (err) {
    mediaStatus.textContent = `Couldn't refresh from ComfyUI (${err.message || err}).`;
  } finally {
    refreshMediaBtn.disabled = false;
  }
}

function relativeTime(ts) {
  const diffSec = Math.round((Date.now() - ts) / 1000);
  if (diffSec < 60) return "just now";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return new Date(ts).toLocaleDateString();
}

function renderMediaGrid() {
  mediaGrid.innerHTML = "";
  for (const entry of media) {
    for (const url of entry.images) {
      const item = document.createElement("div");
      item.className = "media-item";
      const img = document.createElement("img");
      img.src = url;
      img.loading = "lazy";
      img.addEventListener("click", () => openLightbox(url));
      const caption = document.createElement("div");
      caption.className = "media-caption";
      caption.textContent = entry.prompt ? `${entry.prompt} · ${relativeTime(entry.ts)}` : relativeTime(entry.ts);
      item.appendChild(img);
      item.appendChild(caption);
      mediaGrid.appendChild(item);
    }
  }
  mediaCard.hidden = mediaGrid.children.length === 0;
  mediaEmptyState.hidden = mediaGrid.children.length !== 0;
}

refreshMediaBtn.addEventListener("click", () => {
  if (!baseUrl()) {
    openSettings();
    return;
  }
  refreshMediaFromComfy();
});

clearMediaBtn.addEventListener("click", () => {
  if (!confirm("Clear the locally cached media history? (Images stay on your ComfyUI PC — this only clears this app's cache.)")) return;
  media = [];
  saveMedia(media);
  renderMediaGrid();
  mediaStatus.textContent = "Cache cleared.";
});

function renderGallery(urls) {
  gallery.innerHTML = "";
  for (const url of urls) {
    const img = document.createElement("img");
    img.src = url;
    img.loading = "lazy";
    img.addEventListener("click", () => openLightbox(url));
    gallery.appendChild(img);
  }
  galleryCard.hidden = urls.length === 0;
}

function openLightbox(url) {
  lightboxImg.src = url;
  lightboxOpenLink.href = url;
  lightboxOverlay.hidden = false;
}

closeLightboxBtn.addEventListener("click", () => (lightboxOverlay.hidden = true));
lightboxOverlay.addEventListener("click", (e) => {
  if (e.target === lightboxOverlay) lightboxOverlay.hidden = true;
});

generateBtn.addEventListener("click", async () => {
  if (!baseUrl()) {
    openSettings();
    return;
  }
  generateBtn.disabled = true;
  progressCard.hidden = false;
  progressText.textContent = "Queuing…";
  try {
    const wf = buildPatchedWorkflow();
    const promptId = await queuePrompt(wf);
    const entry = await pollHistory(promptId);
    const urls = extractImages(entry);
    renderGallery(urls);
    recordMedia(promptId, urls, positivePrompt.value.trim());
  } catch (err) {
    alert(err.message || String(err));
  } finally {
    progressCard.hidden = true;
    generateBtn.disabled = false;
  }
});

// ---------- init ----------

(async function init() {
  if (settings.baseUrl) {
    updateConnDot(false);
    try {
      const res = await fetch(`${baseUrl()}/system_stats`, { mode: "cors" });
      updateConnDot(res.ok);
    } catch {
      updateConnDot(false);
    }
  }
  refreshWorkflowSelect();
  loadWorkflowIntoForm(workflowSelect.value);
})();

// Register the service worker for offline app-shell caching (PWA). Skipped on
// file:// (the standalone build), where service workers aren't available.
if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch((err) => console.warn("SW registration failed", err));
  });
}
