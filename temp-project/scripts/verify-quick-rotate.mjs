function normalizeRotationDegrees0To360(rotation) {
  return ((rotation % 360) + 360) % 360;
}

function rotateClockwise90(rotation) {
  return (normalizeRotationDegrees0To360(rotation) + 90) % 360;
}

function rotateCounterClockwise90(rotation) {
  return (normalizeRotationDegrees0To360(rotation) - 90 + 360) % 360;
}

const cases = [
  [0, 90, 270],
  [90, 180, 0],
  [270, 0, 180],
  [-90, 0, 180],
  [45, 135, 315],
];

let failed = false;
for (const [start, cw, ccw] of cases) {
  if (rotateClockwise90(start) !== cw) {
    console.error(`✗ CW ${start}° → ${rotateClockwise90(start)} (expected ${cw})`);
    failed = true;
  }
  if (rotateCounterClockwise90(start) !== ccw) {
    console.error(
      `✗ CCW ${start}° → ${rotateCounterClockwise90(start)} (expected ${ccw})`,
    );
    failed = true;
  }
}

if (!failed) {
  console.log("✓ 快速旋轉角度公式正確");
}

if (failed) process.exit(1);
