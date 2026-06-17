"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "..", "kaizen-farm-app.js"), "utf8");

const store = new Map();
const sandbox = {
  console,
  Date,
  Math,
  Blob,
  URL: {
    createObjectURL: () => "blob:kaizen-farm",
    revokeObjectURL: () => {},
  },
  navigator: {
    clipboard: {
      writeText: () => Promise.resolve(),
    },
  },
  crypto: { randomUUID: () => "test-uuid" },
  window: {
    addEventListener: () => {},
    print: () => {},
    crypto: { randomUUID: () => "test-uuid" },
  },
  document: {
    addEventListener: () => {},
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => [],
    createElement: () => ({
      append: () => {},
      remove: () => {},
      click: () => {},
      select: () => {},
      setAttribute: () => {},
      style: {},
      classList: { add: () => {}, remove: () => {}, toggle: () => {} },
    }),
    body: { append: () => {} },
    execCommand: () => true,
  },
  localStorage: {
    getItem: (key) => store.get(key) || null,
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
  },
};

sandbox.window.window = sandbox.window;
sandbox.window.document = sandbox.document;
sandbox.window.localStorage = sandbox.localStorage;
sandbox.globalThis = sandbox;

vm.createContext(sandbox);
vm.runInContext(source, sandbox);

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`not ok - ${name}`);
    throw error;
  }
}

test("defines the six growth steps in the agreed order", () => {
  assert.deepEqual(
    Array.from(sandbox.GROWTH_STEPS.map((step) => step.id)),
    ["problem", "placePeople", "frequencyImpact", "hypothesis", "idea", "idealNext"],
  );
  assert.equal(sandbox.GROWTH_STEPS[0].title, "困りごと");
  assert.equal(sandbox.GROWTH_STEPS[5].title, "理想の状態・次に確認すること");
});

test("reapplies the active screen after rerendering screen markup", () => {
  const renderAppBody = source.match(/function renderApp\(\) \{([\s\S]*?)\n  \}/)[1];
  assert.match(renderAppBody, /renderHome\(\);[\s\S]*renderGrow\(\);[\s\S]*renderHarvest\(\);[\s\S]*renderSettings\(\);[\s\S]*setScreen\(state\.screen\);/);
});

test("creates a seed with browser-local data shape", () => {
  const seed = sandbox.createSeed({
    originalMemo: "記録を書くのに時間がかかる",
    title: "",
    seedType: "steady",
    today: "2026-06-16",
    now: "2026-06-16T10:00:00.000Z",
    timeZone: "Asia/Tokyo",
  });

  assert.equal(seed.title, "記録を書くのに時間がかかる");
  assert.equal(seed.status, "growing");
  assert.equal(seed.seedType, "steady");
  assert.equal(seed.nextReviewDate, "2026-06-19");
  assert.equal(seed.timeZone, "Asia/Tokyo");
  assert.deepEqual(JSON.parse(JSON.stringify(seed.steps.problem)), { originalMemo: "記録を書くのに時間がかかる" });
});

test("updates a seed step and marks it ready when enough harvest material exists", () => {
  const seed = sandbox.createSeed({
    originalMemo: "記録を書くのに時間がかかる",
    title: "記録時間の削減",
    seedType: "quick",
    today: "2026-06-16",
    now: "2026-06-16T10:00:00.000Z",
    timeZone: "Asia/Tokyo",
  });

  const updated = sandbox.updateSeedStep(seed, "idea", {
    improvementIdea: "記録フォーマットを見直す",
    trialPlan: "1ラインだけ新しい記録テンプレートを試す",
    expectedEffect: "記録時間を1日30分減らす",
  }, "2026-06-16T11:00:00.000Z");

  assert.equal(updated.steps.idea.improvementIdea, "記録フォーマットを見直す");
  assert.equal(updated.status, "ready");
  assert.equal(updated.updatedAt, "2026-06-16T11:00:00.000Z");
});

test("builds a harvest summary without treating hypotheses as facts", () => {
  const seed = sandbox.createSeed({
    originalMemo: "記録を書くのに時間がかかる",
    title: "記録時間の削減",
    seedType: "steady",
    today: "2026-06-16",
    now: "2026-06-16T10:00:00.000Z",
    timeZone: "Asia/Tokyo",
  });

  const enriched = {
    ...seed,
    steps: {
      problem: { originalMemo: "記録を書くのに時間がかかる", problem: "記録作成に時間がかかる" },
      placePeople: { location: "製造室", affectedPeople: "製造担当者、リーダー" },
      frequencyImpact: { frequency: "1日30分、週5回", impact: "残業と記録ミスのリスクがある" },
      hypothesis: { hypothesis: "記録項目が多く、手書きで時間がかかっている可能性がある" },
      idea: {
        improvementIdea: "記録フォーマットを整理する",
        trialPlan: "1ラインで新しいテンプレートを試す",
        expectedEffect: "週150分の時間削減",
        risks: "必要項目が抜ける可能性",
      },
      idealNext: {
        idealState: "短時間で正確に記録を終えられる",
        nextAction: "現場担当者にフォーマット案を確認する",
      },
    },
  };

  const harvest = sandbox.createHarvest(enriched, "proposal", "2026-06-16T12:00:00.000Z");

  assert.equal(harvest.harvestType, "proposal");
  assert.equal(harvest.seedId, seed.id);
  assert.equal(harvest.sections.length, 8);
  assert.match(harvest.renderedText, /原因の仮説/);
  assert.doesNotMatch(harvest.renderedText, /原因は/);
  assert.equal(harvest.sourceUpdatedAt, seed.updatedAt);
});

test("round-trips export data and preserves ids", () => {
  const seed = sandbox.createSeed({
    originalMemo: "朝礼前の準備に抜けが出る",
    title: "朝礼準備",
    seedType: "quick",
    today: "2026-06-16",
    now: "2026-06-16T10:00:00.000Z",
    timeZone: "Asia/Tokyo",
  });
  const harvest = sandbox.createHarvest(seed, "proposal", "2026-06-16T12:00:00.000Z");
  const settings = sandbox.createDefaultSettings("Asia/Tokyo", "2026-06-16T10:00:00.000Z");

  const json = sandbox.serializeKaizenFarmData({
    seeds: [seed],
    growthLogs: [],
    harvests: [harvest],
    settings,
    appMeta: sandbox.createAppMeta("2026-06-16T10:00:00.000Z"),
  });
  const parsed = sandbox.parseKaizenFarmImport(json);

  assert.equal(parsed.seeds[0].id, seed.id);
  assert.equal(parsed.harvests[0].seedId, seed.id);
  assert.equal(parsed.settings.characterMode, "normal");
});

test("loads initial app data with default settings and metadata", () => {
  store.clear();
  const data = sandbox.loadKaizenFarmData("Asia/Tokyo", "2026-06-16T10:00:00.000Z");

  assert.deepEqual(Array.from(data.seeds), []);
  assert.deepEqual(Array.from(data.growthLogs), []);
  assert.deepEqual(Array.from(data.harvests), []);
  assert.equal(data.settings.characterMode, "normal");
  assert.equal(data.appMeta.schemaVersion, "1.0.0");
});

test("saves and reloads app data from localStorage", () => {
  store.clear();
  const seed = sandbox.createSeed({
    originalMemo: "記録作成に時間がかかる",
    seedType: "steady",
    today: "2026-06-16",
    now: "2026-06-16T10:00:00.000Z",
    timeZone: "Asia/Tokyo",
  });
  const data = sandbox.loadKaizenFarmData("Asia/Tokyo", "2026-06-16T10:00:00.000Z");
  data.seeds.push(seed);

  sandbox.saveKaizenFarmData(data);
  const loaded = sandbox.loadKaizenFarmData("Asia/Tokyo", "2026-06-16T10:30:00.000Z");

  assert.equal(loaded.seeds.length, 1);
  assert.equal(loaded.seeds[0].id, seed.id);
});

test("updates settings and last backup timestamp", () => {
  const settings = sandbox.createDefaultSettings("Asia/Tokyo", "2026-06-16T10:00:00.000Z");
  const updated = sandbox.updateSettings(settings, {
    characterMode: "minimal",
    fontSize: "large",
    lastBackupAt: "2026-06-16T11:00:00.000Z",
  }, "2026-06-16T11:00:00.000Z");

  assert.equal(updated.characterMode, "minimal");
  assert.equal(updated.fontSize, "large");
  assert.equal(updated.lastBackupAt, "2026-06-16T11:00:00.000Z");
  assert.equal(updated.updatedAt, "2026-06-16T11:00:00.000Z");
});
