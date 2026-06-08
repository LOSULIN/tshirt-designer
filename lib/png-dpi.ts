/** 於 PNG 插入 pHYs chunk，標記為 300 DPI（等效像素／公尺） */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array, start: number, length: number): number {
  let crc = 0xffffffff;
  for (let i = start; i < start + length; i++) {
    crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function writeUint32BE(buf: Uint8Array, offset: number, value: number) {
  buf[offset] = (value >>> 24) & 0xff;
  buf[offset + 1] = (value >>> 16) & 0xff;
  buf[offset + 2] = (value >>> 8) & 0xff;
  buf[offset + 3] = value & 0xff;
}

export async function embedPngDpi(blob: Blob, dpi: number): Promise<Blob> {
  const source = new Uint8Array(await blob.arrayBuffer());
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  for (let i = 0; i < signature.length; i++) {
    if (source[i] !== signature[i]) return blob;
  }

  // IHDR 固定緊接 signature 之後，長度 25 bytes
  const insertAt = 8 + 25;
  const ppm = Math.round(dpi / 0.0254);
  const chunk = new Uint8Array(21);
  writeUint32BE(chunk, 0, 9);
  chunk[4] = 0x70; // p
  chunk[5] = 0x48; // H
  chunk[6] = 0x59; // Y
  chunk[7] = 0x73; // s
  writeUint32BE(chunk, 8, ppm);
  writeUint32BE(chunk, 12, ppm);
  chunk[16] = 1; // 單位：公尺
  const crc = crc32(chunk, 4, 13);
  writeUint32BE(chunk, 17, crc);

  const output = new Uint8Array(source.length + chunk.length);
  output.set(source.subarray(0, insertAt));
  output.set(chunk, insertAt);
  output.set(source.subarray(insertAt), insertAt + chunk.length);

  return new Blob([output], { type: "image/png" });
}
