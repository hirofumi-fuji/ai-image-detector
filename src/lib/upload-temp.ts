export async function uploadToTmpFiles(imageBuffer: Buffer): Promise<string> {
  const formData = new FormData();
  const blob = new Blob([new Uint8Array(imageBuffer)], { type: "image/png" });
  formData.append("file", blob, "image.png");

  const resp = await fetch("https://tmpfiles.org/api/v1/upload", {
    method: "POST",
    body: formData,
  });

  if (!resp.ok) {
    throw new Error(`tmpfiles.org upload failed: ${resp.status}`);
  }

  const data = await resp.json();
  const url: string = data.data.url;
  return url.replace("tmpfiles.org/", "tmpfiles.org/dl/");
}
