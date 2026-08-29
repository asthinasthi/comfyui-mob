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
let selectedImageFile = null; // pending input image chosen for a LoadImage workflow
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
const inputImageField = $("inputImageField");
const inputImageInput = $("inputImageInput");
const inputImagePreview = $("inputImagePreview");
const inputImageName = $("inputImageName");
const pickImageBtn = $("pickImageBtn");
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
const tabQueueBtn = $("tabQueueBtn");
const tabExplorerBtn = $("tabExplorerBtn");
const queueBadge = $("queueBadge");
const appView = $("app");
const queueView = $("queueView");
const explorerView = $("explorerView");
const bottomBar = $("bottomBar");
const refreshQueueBtn = $("refreshQueueBtn");
const clearQueueBtn = $("clearQueueBtn");
const queueStatus = $("queueStatus");
const queueListCard = $("queueListCard");
const queueList = $("queueList");
const queueEmptyState = $("queueEmptyState");
const refreshMediaBtn = $("refreshMediaBtn");
const clearMediaBtn = $("clearMediaBtn");
const mediaStatus = $("mediaStatus");
const mediaCard = $("mediaCard");
const mediaGrid = $("mediaGrid");
const mediaEmptyState = $("mediaEmptyState");

// ---------- tabs ----------

function setActiveTab(name) {
  const isGen = name === "generate";
  const isQueue = name === "queue";
  const isExp = name === "explorer";

  appView.hidden = !isGen;
  queueView.hidden = !isQueue;
  explorerView.hidden = !isExp;
  bottomBar.hidden = !isGen;

  tabGenerateBtn.classList.toggle("active", isGen);
  tabQueueBtn.classList.toggle("active", isQueue);
  tabExplorerBtn.classList.toggle("active", isExp);

  stopQueuePolling();
  if (isQueue) startQueuePolling();
  if (isExp) {
    renderMediaGrid(); // show what's cached immediately…
    if (baseUrl()) refreshMediaFromComfy(); // …then merge in the server's latest, incl. jobs from other clients (Home PC)
  }
}

tabGenerateBtn.addEventListener("click", () => setActiveTab("generate"));
tabQueueBtn.addEventListener("click", () => setActiveTab("queue"));
tabExplorerBtn.addEventListener("click", () => setActiveTab("explorer"));

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
    fetchQueueCounts();
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
    loadImageId: null,
  };

  // video API nodes (e.g. MiniMax) expose duration directly in seconds, independent of any KSampler
  result.durationId = ids.find((id) => {
    const node = wf[id];
    return (node.class_type || "").startsWith("Minimax") && node.inputs && "duration" in node.inputs;
  }) || null;

  // a LoadImage node lets the user supply an input image (img2img, image-to-video).
  // Its `image` input is a plain filename string in ComfyUI's input/ dir.
  result.loadImageId = ids.find((id) => {
    const node = wf[id];
    return node.class_type === "LoadImage" && node.inputs && typeof node.inputs.image === "string";
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

  // reset any pending image selection when (re)loading a workflow
  selectedImageFile = null;
  inputImagePreview.hidden = true;
  inputImagePreview.removeAttribute("src");
  if (analysis.loadImageId) {
    const existing = wf[analysis.loadImageId].inputs.image;
    inputImageName.textContent = existing ? `Current: ${existing}` : "No image selected";
    inputImageField.hidden = false;
  } else {
    inputImageField.hidden = true;
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

// ---------- input image ----------

pickImageBtn.addEventListener("click", () => inputImageInput.click());

inputImageInput.addEventListener("change", () => {
  const file = inputImageInput.files[0];
  if (!file) return;
  selectedImageFile = file;
  inputImageName.textContent = file.name;
  const url = URL.createObjectURL(file);
  if (inputImagePreview.src) URL.revokeObjectURL(inputImagePreview.src);
  inputImagePreview.src = url;
  inputImagePreview.hidden = false;
  inputImageInput.value = "";
});

async function uploadImage(file) {
  const form = new FormData();
  form.append("image", file, file.name);
  form.append("overwrite", "true");
  const res = await fetch(`${baseUrl()}/upload/image`, { method: "POST", mode: "cors", body: form });
  if (!res.ok) throw new Error(`Image upload failed (HTTP ${res.status})`);
  const data = await res.json();
  return data.subfolder ? `${data.subfolder}/${data.name}` : data.name;
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

function buildPatchedWorkflow(uploadedImageName) {
  // Start from the raw JSON textarea, so manual edits there are respected.
  const wf = JSON.parse(rawJsonArea.value);

  if (analysis.loadImageId && wf[analysis.loadImageId] && uploadedImageName) {
    wf[analysis.loadImageId].inputs.image = uploadedImageName;
  }
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

// ---------- queue / jobs ----------

let queuePollTimer = null;

// Pull a human-readable label out of an API-format prompt (the workflow dict).
function promptLabel(prompt) {
  if (!prompt || typeof prompt !== "object") return null;
  let clipText = null;
  for (const node of Object.values(prompt)) {
    if (!node || !node.inputs) continue;
    const ct = node.class_type || "";
    if (ct.startsWith("Minimax") && typeof node.inputs.prompt_text === "string" && node.inputs.prompt_text.trim()) {
      return node.inputs.prompt_text.trim();
    }
    if (ct === "CLIPTextEncode" && typeof node.inputs.text === "string" && node.inputs.text.trim() && !clipText) {
      clipText = node.inputs.text.trim();
    }
  }
  return clipText;
}

// A /queue entry is [number, prompt_id, prompt, extra_data, outputs_to_execute].
function queueEntryToJob(entry, status) {
  return { number: entry[0], id: entry[1], label: promptLabel(entry[2]), status };
}

function updateQueueBadge(count) {
  if (count > 0) {
    queueBadge.textContent = String(count);
    queueBadge.hidden = false;
  } else {
    queueBadge.hidden = true;
  }
}

async function fetchQueueCounts() {
  // Lightweight badge refresh usable from anywhere (e.g. right after submitting).
  if (!baseUrl()) return;
  try {
    const res = await fetch(`${baseUrl()}/queue`, { mode: "cors" });
    if (!res.ok) return;
    const q = await res.json();
    updateQueueBadge((q.queue_running?.length || 0) + (q.queue_pending?.length || 0));
  } catch {
    /* ignore — badge just won't update */
  }
}

async function refreshQueue() {
  if (!baseUrl()) {
    queueStatus.textContent = "Set a ComfyUI address in Settings first.";
    renderQueue([]);
    return;
  }
  try {
    const res = await fetch(`${baseUrl()}/queue`, { mode: "cors" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const q = await res.json();
    const jobs = [
      ...(q.queue_running || []).map((e) => queueEntryToJob(e, "running")),
      ...(q.queue_pending || []).map((e) => queueEntryToJob(e, "pending")),
    ];
    updateQueueBadge(jobs.length);
    queueStatus.textContent = jobs.length
      ? `${jobs.filter((j) => j.status === "running").length} running, ${jobs.filter((j) => j.status === "pending").length} queued.`
      : "Queue is empty.";
    renderQueue(jobs);
  } catch (err) {
    queueStatus.textContent = `Couldn't reach ComfyUI (${err.message || err}).`;
  }
}

function renderQueue(jobs) {
  queueList.innerHTML = "";
  for (const job of jobs) {
    const row = document.createElement("div");
    row.className = "job-row";

    const main = document.createElement("div");
    main.className = "job-main";
    const label = document.createElement("div");
    label.className = "job-label";
    label.textContent = job.label || "(no prompt text)";
    const sub = document.createElement("div");
    sub.className = "job-sub";
    sub.textContent = `#${job.number} · ${job.id.slice(0, 8)}`;
    main.appendChild(label);
    main.appendChild(sub);

    const badge = document.createElement("span");
    badge.className = `job-badge ${job.status}`;
    badge.textContent = job.status === "running" ? "Running" : "Pending";

    const cancel = document.createElement("button");
    cancel.className = "job-cancel";
    cancel.textContent = job.status === "running" ? "Stop" : "Cancel";
    cancel.addEventListener("click", () => cancelJob(job));

    row.appendChild(main);
    row.appendChild(badge);
    row.appendChild(cancel);
    queueList.appendChild(row);
  }
  queueListCard.hidden = jobs.length === 0;
  queueEmptyState.hidden = jobs.length !== 0;
}

async function cancelJob(job) {
  try {
    if (job.status === "running") {
      // Interrupt the currently executing prompt.
      await fetch(`${baseUrl()}/interrupt`, { method: "POST", mode: "cors" });
    } else {
      // Remove a specific pending prompt from the queue.
      await fetch(`${baseUrl()}/queue`, {
        method: "POST",
        mode: "cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ delete: [job.id] }),
      });
    }
  } catch (err) {
    alert(`Couldn't cancel job: ${err.message || err}`);
  } finally {
    refreshQueue();
  }
}

function startQueuePolling() {
  refreshQueue();
  queuePollTimer = setInterval(refreshQueue, 1500);
}

function stopQueuePolling() {
  if (queuePollTimer) {
    clearInterval(queuePollTimer);
    queuePollTimer = null;
  }
}

refreshQueueBtn.addEventListener("click", refreshQueue);

clearQueueBtn.addEventListener("click", async () => {
  if (!baseUrl()) return;
  if (!confirm("Clear all pending (queued) jobs? The running job is not affected.")) return;
  try {
    await fetch(`${baseUrl()}/queue`, {
      method: "POST",
      mode: "cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clear: true }),
    });
  } catch (err) {
    alert(`Couldn't clear queue: ${err.message || err}`);
  } finally {
    refreshQueue();
  }
});

// Pause polling when the app is backgrounded; resume when the Queue tab is visible again.
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    stopQueuePolling();
  } else if (!queueView.hidden) {
    startQueuePolling();
  }
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
    let uploadedImageName = null;
    if (analysis.loadImageId && selectedImageFile) {
      progressText.textContent = "Uploading image…";
      uploadedImageName = await uploadImage(selectedImageFile);
    }
    const wf = buildPatchedWorkflow(uploadedImageName);
    progressText.textContent = "Queuing…";
    const promptId = await queuePrompt(wf);
    fetchQueueCounts(); // reflect the just-submitted job on the Queue tab badge
    const entry = await pollHistory(promptId);
    const urls = extractImages(entry);
    renderGallery(urls);
    recordMedia(promptId, urls, positivePrompt.value.trim());
  } catch (err) {
    alert(err.message || String(err));
  } finally {
    progressCard.hidden = true;
    generateBtn.disabled = false;
    fetchQueueCounts(); // job left the queue (done/failed) — refresh the badge
  }
});

// ---------- pin lock ----------
// NOTE: a hardcoded client-side PIN is a light "keep others out" gate, not real
// security — the code is delivered to the browser. The real access boundary is
// Tailscale. Change APP_PIN to update the code.
const APP_PIN = "0007";
const lockScreen = $("lockScreen");
const pinInput = $("pinInput");
const lockError = $("lockError");

function lockApp() {
  localStorage.removeItem("comfyMob.unlocked");
  pinInput.value = "";
  lockError.hidden = true;
  lockScreen.hidden = false;
  setTimeout(() => pinInput.focus(), 100);
}

function unlockApp() {
  localStorage.setItem("comfyMob.unlocked", "yes");
  lockScreen.hidden = true;
}

if (localStorage.getItem("comfyMob.unlocked") === "yes") {
  lockScreen.hidden = true;
} else {
  lockScreen.hidden = false;
  setTimeout(() => pinInput.focus(), 100);
}

pinInput.addEventListener("input", () => {
  lockError.hidden = true;
  if (pinInput.value.length === 4) {
    if (pinInput.value === APP_PIN) {
      pinInput.value = "";
      unlockApp();
    } else {
      lockError.hidden = false;
      pinInput.value = "";
    }
  }
});

$("lockAppBtn").addEventListener("click", () => {
  closeSettings();
  lockApp();
});

// ---------- init ----------

(async function init() {
  if (settings.baseUrl) {
    updateConnDot(false);
    try {
      const res = await fetch(`${baseUrl()}/system_stats`, { mode: "cors" });
      updateConnDot(res.ok);
      if (res.ok) fetchQueueCounts(); // surface any pre-existing queue on the badge
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
