#!/usr/bin/env node
/**
 * 驗證 deleteLayer revoke 邏輯：history 保留時不 revoke，無快照時 revoke。
 */
import assert from "node:assert/strict";

const revoked = [];

function revokeLayerAssets(layer) {
  if (layer.type === "image") {
    revoked.push(layer.id);
  }
}

function collectImageLayerIds(layers) {
  return layers.filter((l) => l.type === "image").map((l) => l.id);
}

function collectRetainedImageLayerIds(retainedSnapshots, liveLayers) {
  const retainedIds = new Set();
  for (const snapshot of retainedSnapshots) {
    for (const id of collectImageLayerIds(snapshot)) retainedIds.add(id);
  }
  for (const id of collectImageLayerIds(liveLayers)) retainedIds.add(id);
  return retainedIds;
}

function revokeLayerAssetsUnlessRetained(layer, stacks, liveLayers) {
  if (layer.type !== "image") return;
  const retainedIds = collectRetainedImageLayerIds(
    [...stacks.historyStack, ...stacks.futureStack],
    liveLayers,
  );
  if (!retainedIds.has(layer.id)) revokeLayerAssets(layer);
}

const imageLayer = { id: "img-1", type: "image" };

// Case 1: layer still in history → no revoke (Undo safe)
revoked.length = 0;
revokeLayerAssetsUnlessRetained(
  imageLayer,
  { historyStack: [[imageLayer]], futureStack: [] },
  [],
);
assert.deepEqual(revoked, [], "history retains image → no revoke");

// Case 2: not in history/future/live → revoke
revoked.length = 0;
revokeLayerAssetsUnlessRetained(
  imageLayer,
  { historyStack: [], futureStack: [] },
  [],
);
assert.deepEqual(revoked, ["img-1"], "orphan image → revoke");

// Case 3: text layer → no-op
revoked.length = 0;
revokeLayerAssetsUnlessRetained(
  { id: "txt-1", type: "text" },
  { historyStack: [], futureStack: [] },
  [],
);
assert.deepEqual(revoked, [], "text layer → skip");

console.log("verify-delete-layer-revoke: OK");
