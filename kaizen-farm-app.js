"use strict";

(function () {
  const STORAGE_KEY = "kaizen-farm-data-v1";
  const SCHEMA_VERSION = "1.0.0";
  const APP_VERSION = "0.1.0";

  const GROWTH_STEPS = [
    {
      id: "problem",
      title: "困りごと",
      nagiLine: "まずは、どんな困りごとがあったか教えてな。",
      fields: ["originalMemo", "problem"],
    },
    {
      id: "placePeople",
      title: "場所・関係者",
      nagiLine: "どこで起きていて、誰が困っているか見てみよか。",
      fields: ["location", "affectedPeople"],
    },
    {
      id: "frequencyImpact",
      title: "頻度・影響",
      nagiLine: "どれくらい起きていて、どんな影響があるか整理しよか。",
      fields: ["frequency", "impact"],
    },
    {
      id: "hypothesis",
      title: "原因の仮説",
      nagiLine: "原因は決めつけず、可能性として置いてみよな。",
      fields: ["hypothesis"],
    },
    {
      id: "idea",
      title: "改善案",
      nagiLine: "いきなり全部変えんと、小さく試せる形にしよか。",
      fields: ["improvementIdea", "trialPlan", "expectedEffect", "risks"],
    },
    {
      id: "idealNext",
      title: "理想の状態・次に確認すること",
      nagiLine: "最後に、どうなればよくて、次に誰へ確認するか決めよな。",
      fields: ["idealState", "nextAction"],
    },
  ];

  const SEED_TYPES = {
    quick: { label: "すぐ育つたね", defaultReviewDays: 0 },
    steady: { label: "じっくり育つたね", defaultReviewDays: 3 },
    large: { label: "大きく育てるたね", defaultReviewDays: 7 },
  };

  const CHARACTER_AVATARS = {
    nagi: '<span class="character-avatar" role="img" aria-label="凪（農園長）"><img class="character-avatar-image" src="assets/characters/nagi-farm-manager-v2.svg" alt="" width="112" height="112" aria-hidden="true" /></span>',
    ren: '<span class="character-avatar" role="img" aria-label="蓮（収穫担当）"><img class="character-avatar-image" src="assets/characters/ren-harvest-manager-v2.svg" alt="" width="112" height="112" aria-hidden="true" /></span>',
  };

  function createId(prefix) {
    const cryptoApi = globalThis.crypto || (globalThis.window && globalThis.window.crypto);
    if (cryptoApi && typeof cryptoApi.randomUUID === "function") {
      return `${prefix}-${cryptoApi.randomUUID()}`;
    }
    return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  }

  function addDays(dateText, days) {
    const date = new Date(`${dateText}T00:00:00.000Z`);
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
  }

  function firstLineTitle(text) {
    const compact = String(text || "").replace(/\s+/g, " ").trim();
    return compact.slice(0, 40) || "無題のたね";
  }

  function createDefaultSettings(timeZone, now) {
    return {
      id: "main",
      fontSize: "standard",
      characterMode: "normal",
      playfulMode: "normal",
      voiceInputEnabled: false,
      voiceNoticeAcceptedAt: null,
      defaultReviewDaysQuick: 0,
      defaultReviewDaysSteady: 3,
      defaultReviewDaysLarge: 7,
      lastBackupAt: null,
      timeZone,
      updatedAt: now,
    };
  }

  function createAppMeta(now) {
    return {
      id: "app",
      schemaVersion: SCHEMA_VERSION,
      appVersion: APP_VERSION,
      createdAt: now,
      updatedAt: now,
    };
  }

  function createSeed(input) {
    const now = input.now || new Date().toISOString();
    const today = input.today || now.slice(0, 10);
    const seedType = input.seedType || "steady";
    const typeConfig = SEED_TYPES[seedType] || SEED_TYPES.steady;
    const originalMemo = String(input.originalMemo || "").trim();
    return {
      id: createId("seed"),
      title: String(input.title || "").trim() || firstLineTitle(originalMemo),
      originalMemo,
      inputMethod: "text",
      seedType,
      status: "growing",
      createdAt: now,
      updatedAt: now,
      nextReviewDate: addDays(today, typeConfig.defaultReviewDays),
      timeZone: input.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Tokyo",
      flowVersion: "1.0.0",
      steps: {
        problem: { originalMemo },
        placePeople: {},
        frequencyImpact: {},
        hypothesis: {},
        idea: {},
        idealNext: {},
      },
    };
  }

  function hasHarvestMaterial(seed) {
    const steps = seed.steps || {};
    return Boolean(
      steps.problem && steps.problem.originalMemo &&
        steps.idea && (steps.idea.improvementIdea || steps.idea.trialPlan || steps.idea.expectedEffect),
    );
  }

  function updateSeedStep(seed, stepId, values, now) {
    const next = {
      ...seed,
      steps: {
        ...seed.steps,
        [stepId]: {
          ...(seed.steps && seed.steps[stepId] ? seed.steps[stepId] : {}),
          ...values,
        },
      },
      updatedAt: now || new Date().toISOString(),
    };
    next.status = hasHarvestMaterial(next) ? "ready" : "growing";
    return next;
  }

  function section(key, heading, content) {
    return { key, heading, content: String(content || "").trim() || "未入力" };
  }

  function createHarvest(seed, harvestType, now) {
    const timestamp = now || new Date().toISOString();
    const steps = seed.steps || {};
    const sections = [
      section("problem", "現在の問題", steps.problem && (steps.problem.problem || steps.problem.originalMemo)),
      section("impact", "影響", steps.frequencyImpact && steps.frequencyImpact.impact),
      section("hypothesis", "原因の仮説", steps.hypothesis && steps.hypothesis.hypothesis),
      section("improvementIdea", "改善案", steps.idea && steps.idea.improvementIdea),
      section("trialPlan", "小さく試す方法", steps.idea && steps.idea.trialPlan),
      section("expectedEffect", "期待できる効果", steps.idea && steps.idea.expectedEffect),
      section("risks", "想定されるリスク", steps.idea && steps.idea.risks),
      section("nextAction", "次に確認すること", steps.idealNext && steps.idealNext.nextAction),
    ];
    const renderedText = [`# ${seed.title}`, "", ...sections.map((item) => `## ${item.heading}\n${item.content}`)].join("\n\n");
    return {
      id: createId("harvest"),
      seedId: seed.id,
      harvestType: harvestType || "proposal",
      title: seed.title,
      sections,
      renderedText,
      sourceSnapshot: JSON.parse(JSON.stringify(seed)),
      sourceUpdatedAt: seed.updatedAt,
      createdAt: timestamp,
      updatedAt: timestamp,
      printedAt: null,
      copiedAt: null,
    };
  }

  function serializeKaizenFarmData(data) {
    return JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        app: "kaizen-farm",
        version: 1,
        ...data,
      },
      null,
      2,
    );
  }

  function parseKaizenFarmImport(json) {
    let parsed;
    try {
      parsed = JSON.parse(json);
    } catch (error) {
      throw new Error("JSONの形式が正しくありません。");
    }
    if (!parsed || parsed.app !== "kaizen-farm" || !Array.isArray(parsed.seeds) || !Array.isArray(parsed.harvests)) {
      throw new Error("改善農園の書き出しJSONを選んでください。");
    }
    return {
      seeds: parsed.seeds,
      growthLogs: Array.isArray(parsed.growthLogs) ? parsed.growthLogs : [],
      harvests: parsed.harvests,
      settings: parsed.settings || createDefaultSettings("Asia/Tokyo", new Date().toISOString()),
      appMeta: parsed.appMeta || createAppMeta(new Date().toISOString()),
    };
  }

  function emptyAppData(timeZone, now) {
    return {
      seeds: [],
      growthLogs: [],
      harvests: [],
      settings: createDefaultSettings(timeZone, now),
      appMeta: createAppMeta(now),
    };
  }

  function normalizeAppData(parsed, timeZone, now) {
    if (!parsed || typeof parsed !== "object") {
      return emptyAppData(timeZone, now);
    }
    return {
      seeds: Array.isArray(parsed.seeds) ? parsed.seeds : [],
      growthLogs: Array.isArray(parsed.growthLogs) ? parsed.growthLogs : [],
      harvests: Array.isArray(parsed.harvests) ? parsed.harvests : [],
      settings: parsed.settings || createDefaultSettings(timeZone, now),
      appMeta: parsed.appMeta || createAppMeta(now),
    };
  }

  function loadKaizenFarmData(timeZone, now) {
    const currentNow = now || new Date().toISOString();
    const currentTimeZone = timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Tokyo";
    const saved = globalThis.localStorage && globalThis.localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      return emptyAppData(currentTimeZone, currentNow);
    }
    try {
      return normalizeAppData(JSON.parse(saved), currentTimeZone, currentNow);
    } catch (error) {
      return emptyAppData(currentTimeZone, currentNow);
    }
  }

  function saveKaizenFarmData(data) {
    if (!globalThis.localStorage) {
      throw new Error("ブラウザ保存を利用できません。");
    }
    globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return data;
  }

  function updateSettings(settings, values, now) {
    return {
      ...settings,
      ...values,
      updatedAt: now || new Date().toISOString(),
    };
  }

  Object.assign(globalThis, {
    GROWTH_STEPS,
    SEED_TYPES,
    createSeed,
    updateSeedStep,
    createHarvest,
    createDefaultSettings,
    createAppMeta,
    loadKaizenFarmData,
    saveKaizenFarmData,
    updateSettings,
    serializeKaizenFarmData,
    parseKaizenFarmImport,
  });

  const state = {
    data: null,
    screen: "home",
    activeSeedId: "",
    activeStepIndex: 0,
    activeHarvestId: "",
  };

  const els = {};

  function bindElements() {
    [
      "backButton",
      "settingsButton",
      "screenTitle",
      "homeScreen",
      "growScreen",
      "harvestScreen",
      "settingsScreen",
      "toast",
    ].forEach((id) => {
      els[id] = globalThis.document && globalThis.document.getElementById(id);
    });
  }

  function showToast(message) {
    if (!els.toast) return;
    els.toast.textContent = message;
    els.toast.classList.remove("hidden");
    globalThis.setTimeout(() => els.toast.classList.add("hidden"), 1800);
  }

  function setScreen(screen) {
    state.screen = screen;
    ["home", "grow", "harvest", "settings"].forEach((name) => {
      const screenEl = els[`${name}Screen`];
      if (screenEl) {
        screenEl.classList.toggle("hidden", name !== screen);
      }
    });
    if (els.screenTitle) {
      els.screenTitle.textContent = {
        home: "改善農園",
        grow: "たね入力・育成",
        harvest: "収穫",
        settings: "設定",
      }[screen];
    }
    globalThis.document.querySelectorAll("[data-screen]").forEach((button) => {
      button.classList.toggle("active", button.dataset.screen === screen);
    });
  }

  function saveAndRender(message) {
    saveKaizenFarmData(state.data);
    renderApp();
    if (message) showToast(message);
  }

  function currentSeed() {
    return state.data.seeds.find((seed) => seed.id === state.activeSeedId) || state.data.seeds[0] || null;
  }

  function harvestsForSeed(seedId) {
    return state.data.harvests.filter((harvest) => harvest.seedId === seedId);
  }

  function todayText() {
    return new Date().toISOString().slice(0, 10);
  }

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function fieldValue(seed, stepId, field) {
    return escapeHtml(seed && seed.steps && seed.steps[stepId] ? seed.steps[stepId][field] : "");
  }

  function applySettings() {
    const shell = globalThis.document && globalThis.document.querySelector(".farm-shell");
    if (!shell || !state.data || !state.data.settings) return;
    shell.dataset.fontSize = state.data.settings.fontSize;
    shell.dataset.characterMode = state.data.settings.characterMode;
  }

  function initApp() {
    if (!globalThis.document || !globalThis.document.addEventListener) return;
    bindElements();
    state.data = loadKaizenFarmData(Intl.DateTimeFormat().resolvedOptions().timeZone, new Date().toISOString());
    applySettings();
    renderApp();
    globalThis.document.querySelectorAll("[data-screen]").forEach((button) => {
      button.addEventListener("click", () => {
        setScreen(button.dataset.screen);
        renderApp();
      });
    });
    if (els.settingsButton) {
      els.settingsButton.addEventListener("click", () => {
        setScreen("settings");
        renderApp();
      });
    }
    if (els.backButton) {
      els.backButton.addEventListener("click", () => {
        setScreen("home");
        renderApp();
      });
    }
  }

  function renderApp() {
    if (!state.data) return;
    renderHome();
    renderGrow();
    renderHarvest();
    renderSettings();
    setScreen(state.screen);
  }

  function renderHome() {
    if (!els.homeScreen) return;
    const today = todayText();
    const dueSeeds = state.data.seeds
      .filter((seed) => seed.nextReviewDate && seed.nextReviewDate <= today)
      .sort((a, b) => String(a.nextReviewDate).localeCompare(String(b.nextReviewDate)))
      .slice(0, 3);
    const growingCount = state.data.seeds.filter((seed) => ["seed", "growing", "ready"].includes(seed.status)).length;
    const harvestedCount = state.data.harvests.length;
    els.homeScreen.className = "screen";
    els.homeScreen.innerHTML = `
      <div class="home-grid">
        <section class="hero-board">
          <div class="wood-sign">改善農園</div>
          <div class="character-row">
            ${CHARACTER_AVATARS.nagi}
            <div class="speech">今日はどんな困りごとを見つけたん？小さい違和感も、改善のたねになるで。</div>
          </div>
        </section>

        <section class="farm-card">
          <div class="stats-grid">
            <div><span class="muted">育成中</span><strong>${growingCount}</strong></div>
            <div><span class="muted">収穫済み</span><strong>${harvestedCount}</strong></div>
            <div><span class="muted">最終バックアップ</span><strong>${state.data.settings.lastBackupAt ? state.data.settings.lastBackupAt.slice(0, 10) : "未実施"}</strong></div>
            <div><span class="muted">保存先</span><strong>ブラウザ内</strong></div>
          </div>
        </section>
      </div>

      <section class="action-list">
        <button class="action-card" id="newSeedButton" type="button">
          <span class="action-icon">芽</span>
          <span><strong>新しいたねを植える</strong><br><span class="muted">困りごとを入力して、たねを育てよう</span></span>
          <span>›</span>
        </button>
        <button class="action-card" id="openGrowButton" type="button">
          <span class="action-icon">鉢</span>
          <span><strong>育成中のたねを見る</strong><br><span class="muted">途中のたねを育てていこう</span></span>
          <span>›</span>
        </button>
        <button class="action-card" id="openHarvestButton" type="button">
          <span class="action-icon">籠</span>
          <span><strong>収穫済みの改善を見る</strong><br><span class="muted">作成した改善提案を確認しよう</span></span>
          <span>›</span>
        </button>
      </section>

      <section class="farm-card">
        <h2>今日見るたね</h2>
        ${dueSeeds.length ? dueSeeds.map((seed) => `
          <button class="action-card seed-link" data-seed-id="${seed.id}" type="button">
            <span class="action-icon">葉</span>
            <span><strong>${escapeHtml(seed.title)}</strong><br><span class="muted">${escapeHtml(SEED_TYPES[seed.seedType].label)} / 見直し ${escapeHtml(seed.nextReviewDate)}</span></span>
            <span>開く</span>
          </button>
        `).join("") : `<p class="muted">今日見るたねはありません。</p>`}
      </section>
    `;
    els.homeScreen.querySelector("#newSeedButton").addEventListener("click", () => {
      const seed = createSeed({
        originalMemo: "",
        title: "",
        seedType: "steady",
        today: todayText(),
        now: new Date().toISOString(),
        timeZone: state.data.settings.timeZone,
      });
      state.data.seeds.unshift(seed);
      state.activeSeedId = seed.id;
      state.activeStepIndex = 0;
      setScreen("grow");
      saveAndRender("新しいたねを用意しました");
    });
    els.homeScreen.querySelector("#openGrowButton").addEventListener("click", () => {
      const seed = currentSeed();
      if (seed) state.activeSeedId = seed.id;
      setScreen("grow");
      renderApp();
    });
    els.homeScreen.querySelector("#openHarvestButton").addEventListener("click", () => {
      setScreen("harvest");
      renderApp();
    });
    els.homeScreen.querySelectorAll(".seed-link").forEach((button) => {
      button.addEventListener("click", () => {
        state.activeSeedId = button.dataset.seedId;
        state.activeStepIndex = 0;
        setScreen("grow");
        renderApp();
      });
    });
  }

  function fieldsForStep(seed, step) {
    const common = {
      problem: [
        ["originalMemo", "今日、何が気になったか", "textarea", true],
        ["problem", "問題として整理すると", "textarea", false],
      ],
      placePeople: [
        ["location", "どこで起きている？", "input", false],
        ["affectedPeople", "誰が困っている？", "input", false],
      ],
      frequencyImpact: [
        ["frequency", "どれくらい起きている？", "input", false],
        ["impact", "どんな影響がある？", "textarea", false],
      ],
      hypothesis: [
        ["hypothesis", "原因として何が考えられる？", "textarea", false],
      ],
      idea: [
        ["improvementIdea", "改善案", "textarea", false],
        ["trialPlan", "最初に小さく試す内容", "textarea", false],
        ["expectedEffect", "期待できる効果", "input", false],
        ["risks", "想定されるリスク", "textarea", false],
      ],
      idealNext: [
        ["idealState", "どうなれば理想？", "textarea", false],
        ["nextAction", "次に確認すること", "textarea", false],
      ],
    };
    return common[step.id].map(([name, label, type, required]) => {
      const value = fieldValue(seed, step.id, name);
      const requiredText = required ? "必須" : "任意";
      if (type === "textarea") {
        return `<label>${label} <span class="muted">${requiredText}</span><textarea name="${name}">${value}</textarea></label>`;
      }
      return `<label>${label} <span class="muted">${requiredText}</span><input name="${name}" value="${value}" /></label>`;
    }).join("");
  }

  function renderGrow() {
    if (!els.growScreen) return;
    let seed = currentSeed();
    if (!seed) {
      els.growScreen.innerHTML = `
        <section class="farm-card">
          <p>まだ、たねは植えられていません。</p>
          <button class="primary-button" id="emptyNewSeedButton" type="button">最初のたねを植える</button>
        </section>
      `;
      els.growScreen.querySelector("#emptyNewSeedButton").addEventListener("click", () => {
        const created = createSeed({
          originalMemo: "",
          seedType: "steady",
          today: todayText(),
          now: new Date().toISOString(),
          timeZone: state.data.settings.timeZone,
        });
        state.data.seeds.unshift(created);
        state.activeSeedId = created.id;
        state.activeStepIndex = 0;
        saveAndRender("最初のたねを用意しました");
      });
      return;
    }
    const step = GROWTH_STEPS[state.activeStepIndex];
    els.growScreen.className = "screen two-column";
    els.growScreen.innerHTML = `
      <section class="step-card">
        <div class="step-dots">${GROWTH_STEPS.map((item, index) => `<span class="step-dot ${index === state.activeStepIndex ? "active" : ""}">${index + 1}</span>`).join("")}</div>
        <div class="character-row">
          ${CHARACTER_AVATARS.nagi}
          <div class="speech">${escapeHtml(step.nagiLine)}</div>
        </div>
        <form id="stepForm" class="field-stack">
          <label>たねのタイトル <span class="muted">任意</span><input name="title" value="${escapeHtml(seed.title)}" /></label>
          <label>たねの種類
            <select name="seedType">
              ${Object.entries(SEED_TYPES).map(([id, config]) => `<option value="${id}" ${seed.seedType === id ? "selected" : ""}>${config.label}</option>`).join("")}
            </select>
          </label>
          <h2>${state.activeStepIndex + 1}. ${escapeHtml(step.title)}</h2>
          ${fieldsForStep(seed, step)}
          <div class="button-row">
            <button class="secondary-button" id="saveStepButton" type="submit">一時保存</button>
            <button class="primary-button" id="nextStepButton" type="button">${state.activeStepIndex === GROWTH_STEPS.length - 1 ? "収穫へ進む" : "次へ進む"}</button>
          </div>
        </form>
      </section>
      <section class="farm-card">
        <h2>育成中のたね</h2>
        <div class="action-list">
          ${state.data.seeds.map((item) => `
            <button class="action-card seed-switch" data-seed-id="${item.id}" type="button">
              <span class="action-icon">${item.status === "ready" ? "蕾" : "芽"}</span>
              <span><strong>${escapeHtml(item.title)}</strong><br><span class="muted">${escapeHtml(SEED_TYPES[item.seedType].label)} / ${escapeHtml(item.status)}</span></span>
              <span>${item.id === seed.id ? "選択中" : "開く"}</span>
            </button>
          `).join("")}
        </div>
      </section>
    `;
    const form = els.growScreen.querySelector("#stepForm");
    const collect = () => {
      const formData = new FormData(form);
      const values = {};
      step.fields.forEach((field) => {
        values[field] = String(formData.get(field) || "").trim();
      });
      const title = String(formData.get("title") || "").trim();
      const seedType = String(formData.get("seedType") || "steady");
      seed = {
        ...seed,
        title: title || firstLineTitle(values.originalMemo || seed.originalMemo),
        seedType,
      };
      return updateSeedStep(seed, step.id, values, new Date().toISOString());
    };
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const updated = collect();
      state.data.seeds = state.data.seeds.map((item) => (item.id === updated.id ? updated : item));
      saveAndRender("保存しました");
    });
    els.growScreen.querySelector("#nextStepButton").addEventListener("click", () => {
      const updated = collect();
      if (!updated.steps.problem.originalMemo) {
        showToast("困りごとを入力してください");
        return;
      }
      state.data.seeds = state.data.seeds.map((item) => (item.id === updated.id ? updated : item));
      if (state.activeStepIndex < GROWTH_STEPS.length - 1) {
        state.activeStepIndex += 1;
        saveAndRender("保存しました");
      } else {
        state.activeSeedId = updated.id;
        setScreen("harvest");
        saveAndRender("収穫画面へ進みます");
      }
    });
    els.growScreen.querySelectorAll(".seed-switch").forEach((button) => {
      button.addEventListener("click", () => {
        state.activeSeedId = button.dataset.seedId;
        state.activeStepIndex = 0;
        renderApp();
      });
    });
  }
  async function copyText(text) {
    if (globalThis.navigator && globalThis.navigator.clipboard && globalThis.navigator.clipboard.writeText) {
      await globalThis.navigator.clipboard.writeText(text);
      return true;
    }
    const textarea = globalThis.document.createElement("textarea");
    textarea.value = text;
    globalThis.document.body.append(textarea);
    textarea.select();
    const copied = globalThis.document.execCommand("copy");
    textarea.remove();
    return copied;
  }

  function downloadJson() {
    const now = new Date().toISOString();
    state.data.settings = updateSettings(state.data.settings, { lastBackupAt: now }, now);
    state.data.appMeta = { ...state.data.appMeta, updatedAt: now };
    const blob = new Blob([serializeKaizenFarmData(state.data)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = globalThis.document.createElement("a");
    link.href = url;
    link.download = `kaizen-farm-backup-${now.slice(0, 10)}.json`;
    globalThis.document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    saveAndRender("書き出しました");
  }

  function renderHarvest() {
    if (!els.harvestScreen) return;
    const seed = currentSeed();
    if (!seed) {
      els.harvestScreen.innerHTML = `<section class="farm-card"><p>収穫できるたねがありません。</p></section>`;
      return;
    }
    let harvest = state.data.harvests.find((item) => item.id === state.activeHarvestId);
    if (!harvest || harvest.seedId !== seed.id) {
      harvest = createHarvest(seed, "proposal", new Date().toISOString());
    }
    els.harvestScreen.className = "screen";
    els.harvestScreen.innerHTML = `
      <section class="summary-card">
        <div class="character-row">
          ${CHARACTER_AVATARS.ren}
          <div class="speech">これ、改善のカタチにまとめたで。使う相手に合わせて最後に整えてな。</div>
        </div>
        <h2>改善提案サマリー</h2>
        <div class="summary-table">
          ${harvest.sections.map((item) => `
            <div class="summary-row">
              <strong>${escapeHtml(item.heading)}</strong>
              <span>${escapeHtml(item.content)}</span>
            </div>
          `).join("")}
        </div>
        <label>コピー用本文
          <textarea id="harvestText">${escapeHtml(harvest.renderedText)}</textarea>
        </label>
        <div class="button-row">
          <button class="primary-button" id="copyHarvestButton" type="button">コピーする</button>
          <button class="secondary-button" id="printHarvestButton" type="button">印刷する</button>
          <button class="secondary-button" id="saveHarvestButton" type="button">保存する</button>
          <button class="ghost-button" id="backToGrowButton" type="button">編集に戻る</button>
        </div>
      </section>
    `;
    els.harvestScreen.querySelector("#copyHarvestButton").addEventListener("click", async () => {
      const text = els.harvestScreen.querySelector("#harvestText").value;
      await copyText(text);
      showToast("コピーしました");
    });
    els.harvestScreen.querySelector("#printHarvestButton").addEventListener("click", () => {
      globalThis.print();
    });
    els.harvestScreen.querySelector("#saveHarvestButton").addEventListener("click", () => {
      const text = els.harvestScreen.querySelector("#harvestText").value;
      const saved = { ...harvest, renderedText: text, updatedAt: new Date().toISOString() };
      state.data.harvests = state.data.harvests.filter((item) => item.id !== saved.id);
      state.data.harvests.unshift(saved);
      state.activeHarvestId = saved.id;
      saveAndRender("収穫済みとして保存しました");
    });
    els.harvestScreen.querySelector("#backToGrowButton").addEventListener("click", () => {
      setScreen("grow");
      renderApp();
    });
  }

  function renderSettings() {
    if (!els.settingsScreen) return;
    const settings = state.data.settings;
    els.settingsScreen.className = "screen";
    els.settingsScreen.innerHTML = `
      <section class="settings-panel">
        <h2>表示設定</h2>
        <div class="settings-grid">
          <label>文字サイズ
            <select id="fontSizeInput">
              <option value="standard" ${settings.fontSize === "standard" ? "selected" : ""}>標準</option>
              <option value="large" ${settings.fontSize === "large" ? "selected" : ""}>大</option>
              <option value="xlarge" ${settings.fontSize === "xlarge" ? "selected" : ""}>特大</option>
            </select>
          </label>
          <label>キャラクター表示
            <select id="characterModeInput">
              <option value="normal" ${settings.characterMode === "normal" ? "selected" : ""}>通常</option>
              <option value="minimal" ${settings.characterMode === "minimal" ? "selected" : ""}>控えめ</option>
              <option value="off" ${settings.characterMode === "off" ? "selected" : ""}>非表示</option>
            </select>
          </label>
        </div>
        <div class="button-row">
          <button class="primary-button" id="saveSettingsButton" type="button">設定を保存</button>
          <button class="secondary-button" id="exportDataButton" type="button">データを書き出す</button>
        </div>
        <label>データを読み込む
          <input id="importDataInput" type="file" accept="application/json" />
        </label>
        <p class="muted">このアプリは、あなたのブラウザ内にデータを保存します。外部サーバーへは送信しません。</p>
      </section>
    `;
    els.settingsScreen.querySelector("#saveSettingsButton").addEventListener("click", () => {
      const now = new Date().toISOString();
      state.data.settings = updateSettings(settings, {
        fontSize: els.settingsScreen.querySelector("#fontSizeInput").value,
        characterMode: els.settingsScreen.querySelector("#characterModeInput").value,
      }, now);
      applySettings();
      saveAndRender("設定を保存しました");
    });
    els.settingsScreen.querySelector("#exportDataButton").addEventListener("click", downloadJson);
    els.settingsScreen.querySelector("#importDataInput").addEventListener("change", async (event) => {
      const file = event.target.files && event.target.files[0];
      if (!file) return;
      try {
        const text = await file.text();
        state.data = parseKaizenFarmImport(text);
        saveAndRender("読み込みました");
      } catch (error) {
        showToast(error.message);
      }
      event.target.value = "";
    });
  }

  if (globalThis.document && globalThis.document.addEventListener) {
    globalThis.document.addEventListener("DOMContentLoaded", initApp);
  }
})();
