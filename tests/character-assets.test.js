"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const appSource = fs.readFileSync(path.join(root, "kaizen-farm-app.js"), "utf8");
const styleSource = fs.readFileSync(path.join(root, "kaizen-farm.css"), "utf8");

function cssRule(selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = styleSource.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`));
  return match ? match[1] : "";
}

const characters = [
  {
    label: "凪",
    alt: "凪（農園長）",
    path: "assets/characters/nagi-farm-manager-v2.svg",
  },
  {
    label: "蓮",
    alt: "蓮（収穫担当）",
    path: "assets/characters/ren-harvest-manager-v2.svg",
  },
];

for (const character of characters) {
  const assetPath = path.join(root, character.path);
  assert.equal(fs.existsSync(assetPath), true, `${character.label} image should exist`);
  const assetSource = fs.readFileSync(assetPath, "utf8");
  assert.match(assetSource, /viewBox="0 0 512 512"/, `${character.label} image should keep a 512px viewBox`);
  assert.match(assetSource, new RegExp(`<title id="title">${character.alt}</title>`), `${character.label} image should include an accessible title`);
  assert.doesNotMatch(assetSource, /<filter\b|filter=/, `${character.label} image should avoid SVG filters inside clipped avatars`);
  assert.match(appSource, new RegExp(character.path.replaceAll("/", "\\/")), `${character.label} image should be referenced in markup`);
  assert.match(appSource, new RegExp(`<span class="character-avatar" role="img" aria-label="${character.alt}">`), `${character.label} avatar should expose the useful label on a stable wrapper`);
  assert.match(appSource, new RegExp(`<img class="character-avatar-image" src="${character.path}" alt=""`), `${character.label} image should be decorative inside the labelled avatar wrapper`);
}

const avatarRule = cssRule(".character-avatar");
assert.match(avatarRule, /overflow:\s*hidden;/, "avatar wrapper should clip the image reliably");
assert.doesNotMatch(avatarRule, /object-fit:/, "avatar wrapper should not apply object-fit directly to SVG images");
assert.match(cssRule(".character-avatar-image"), /object-fit:\s*cover;/, "avatar image should scale inside the wrapper");
assert.doesNotMatch(styleSource, /background-image: url\("assets\/characters\//, "character images should not be CSS backgrounds");

console.log("ok - character images are present and referenced");
