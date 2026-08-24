(function () {
  function readFileAsImage(file) {
    return new Promise((resolve, reject) => {
      if (!file) return reject(new Error("No file selected"));
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("Could not read image"));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error("Could not load image"));
        img.onload = () => resolve(img);
        img.src = String(reader.result || "");
      };
      reader.readAsDataURL(file);
    });
  }

  function sampleCorners(img, w, h) {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d");
    ctx.drawImage(img, 0, 0, w, h);
    const pts = [
      [2, 2], [w - 3, 2], [2, h - 3], [w - 3, h - 3],
      [Math.floor(w / 2), 2], [2, Math.floor(h / 2)]
    ];
    const colors = pts.map(([x, y]) => ctx.getImageData(x, y, 1, 1).data);
    const avg = colors.reduce((acc, px) => {
      acc[0] += px[0]; acc[1] += px[1]; acc[2] += px[2];
      return acc;
    }, [0, 0, 0]).map((v) => v / colors.length);
    return avg;
  }

  function colorDistance(a, b) {
    return Math.sqrt(
      (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2
    );
  }

  function cleanBackground(ctx, w, h, bgColor, threshold) {
    const imageData = ctx.getImageData(0, 0, w, h);
    const d = imageData.data;
    const target = [248, 250, 252];
    for (let i = 0; i < d.length; i += 4) {
      const px = [d[i], d[i + 1], d[i + 2]];
      if (colorDistance(px, bgColor) < threshold) {
        const blend = 0.92;
        d[i] = Math.round(px[0] * (1 - blend) + target[0] * blend);
        d[i + 1] = Math.round(px[1] * (1 - blend) + target[1] * blend);
        d[i + 2] = Math.round(px[2] * (1 - blend) + target[2] * blend);
      }
    }
    ctx.putImageData(imageData, 0, 0);
  }

  function sharpen(ctx, w, h) {
    const imageData = ctx.getImageData(0, 0, w, h);
    const src = new Uint8ClampedArray(imageData.data);
    const out = imageData.data;
    const kernel = [0, -1, 0, -1, 5, -1, 0, -1, 0];
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        for (let c = 0; c < 3; c++) {
          let sum = 0;
          let ki = 0;
          for (let ky = -1; ky <= 1; ky++) {
            for (let kx = -1; kx <= 1; kx++) {
              const idx = ((y + ky) * w + (x + kx)) * 4 + c;
              sum += src[idx] * kernel[ki++];
            }
          }
          out[(y * w + x) * 4 + c] = Math.min(255, Math.max(0, sum));
        }
      }
    }
    ctx.putImageData(imageData, 0, 0);
  }

  async function enhanceProductImage(file, opts) {
    const banner = Boolean(opts?.banner);
    const img = await readFileAsImage(file);
    const maxW = banner ? 1400 : 1000;
    const maxH = banner ? 620 : 1000;
    const scale = Math.min(maxW / img.width, maxH / img.height, 1);
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(0, 0, w, h);
    ctx.filter = "brightness(1.06) contrast(1.08) saturate(1.1)";
    ctx.drawImage(img, 0, 0, w, h);
    ctx.filter = "none";
    const bg = sampleCorners(img, w, h);
    cleanBackground(ctx, w, h, bg, banner ? 42 : 36);
    sharpen(ctx, w, h);
    ctx.strokeStyle = "rgba(15, 23, 42, 0.06)";
    ctx.lineWidth = Math.max(1, Math.round(w * 0.003));
    ctx.strokeRect(0.5, 0.5, w - 1, h - 1);
    return canvas.toDataURL("image/jpeg", 0.88);
  }

  async function uploadEnhancedImage(dataUrl, meta) {
    if (!window.MM_API?.uploadImage) throw new Error("Upload API unavailable");
    return window.MM_API.uploadImage({
      data_url: dataUrl,
      store_id: meta?.storeId || meta?.store_id || "general",
      kind: meta?.kind || "products"
    });
  }

  function bindCameraUpload(inputId, previewId, onReady, opts) {
    const input = document.getElementById(inputId);
    const preview = document.getElementById(previewId);
    if (!input) return;
    input.addEventListener("change", async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const enhanced = await enhanceProductImage(file, opts);
        if (preview) {
          preview.src = enhanced;
          preview.classList.remove("hidden");
          preview.style.display = "block";
        }
        onReady?.(enhanced, file);
      } catch (error) {
        window.toast?.(error.message || String(error), { type: "bad", title: "Image" });
      }
    });
  }

  window.MM_Media = {
    enhanceProductImage,
    uploadEnhancedImage,
    bindCameraUpload
  };
})();
