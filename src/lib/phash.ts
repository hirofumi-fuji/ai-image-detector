import sharp from "sharp";

/**
 * 画像バッファからpHashを計算する（64bit）。
 * sharp-phashの代わりに、自前でDCTベースのpHashを実装。
 */
async function computePhash(imageBuffer: Buffer): Promise<bigint> {
  // 32x32にリサイズしグレースケール化
  const { data } = await sharp(imageBuffer)
    .resize(32, 32, { fit: "fill" })
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixels = Array.from(data);

  // DCT計算 (8x8の低周波成分を使用)
  const dctSize = 8;
  const dct: number[] = [];

  for (let u = 0; u < dctSize; u++) {
    for (let v = 0; v < dctSize; v++) {
      let sum = 0;
      for (let x = 0; x < 32; x++) {
        for (let y = 0; y < 32; y++) {
          sum +=
            pixels[x * 32 + y] *
            Math.cos(((2 * x + 1) * u * Math.PI) / 64) *
            Math.cos(((2 * y + 1) * v * Math.PI) / 64);
        }
      }
      dct.push(sum);
    }
  }

  // DC成分を除いた平均を計算
  const dctWithoutDC = dct.slice(1);
  const avg = dctWithoutDC.reduce((a, b) => a + b, 0) / dctWithoutDC.length;

  // 平均より大きければ1、小さければ0のハッシュを生成
  let hash = BigInt(0);
  for (let i = 0; i < 64; i++) {
    if (dct[i] > avg) {
      hash |= BigInt(1) << BigInt(63 - i);
    }
  }

  return hash;
}

function hammingDistance(a: bigint, b: bigint): number {
  let xor = a ^ b;
  let count = 0;
  while (xor > 0n) {
    count += Number(xor & 1n);
    xor >>= 1n;
  }
  return count;
}

export async function calculatePhashSimilarity(
  targetBuffer: Buffer,
  referenceBuffer: Buffer
): Promise<number> {
  try {
    const [hash1, hash2] = await Promise.all([
      computePhash(targetBuffer),
      computePhash(referenceBuffer),
    ]);

    const distance = hammingDistance(hash1, hash2);
    const similarity = 1.0 - distance / 64;
    return Math.round(similarity * 1000) / 1000;
  } catch {
    return -1.0;
  }
}
