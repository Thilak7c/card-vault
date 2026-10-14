// Runs in the browser.
export function shrink(file: Blob, maxEdge = 1600, quality = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const src = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(src);
      const k = Math.min(1, maxEdge / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * k);
      c.height = Math.round(img.height * k);
      const ctx = c.getContext("2d")!;
      ctx.fillStyle = "#fff"; // transparent PNGs become white, not black
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(img, 0, 0, c.width, c.height);
      resolve(c.toDataURL("image/jpeg", quality)); // redrawing strips EXIF and location data
    };
    img.onerror = () => {
      URL.revokeObjectURL(src);
      reject(new Error("That image could not be read."));
    };
    img.src = src;
  });
}

export const thumbnail = (file: Blob) => shrink(file, 240, 0.7);
