/*
 * Stable Android chroma-key effects.
 * The source video is invisible; its sound remains available when wanted.
 */
const mobileChromaFrames = new Map();

function stopChromaEffect(videoId, canvasId) {
  const frame = mobileChromaFrames.get(videoId);
  if (frame) cancelAnimationFrame(frame);
  mobileChromaFrames.delete(videoId);

  const video = document.getElementById(videoId);
  const canvas = document.getElementById(canvasId);
  if (!video || !canvas) return;

  video.pause();
  video.loop = false;
  video.onended = null;
  canvas.classList.remove("show");
}

function playChromaEffect(videoId, canvasId, options = {}) {
  const video = document.getElementById(videoId);
  const canvas = document.getElementById(canvasId);
  if (!video || !canvas) return;

  const context = canvas.getContext("2d", { willReadFrequently: true });
  const { loop = false, muted = false, onended = null } = options;
  let started = false;

  stopChromaEffect(videoId, canvasId);
  canvas.classList.add("show");
  video.muted = muted;
  video.playsInline = true;
  video.loop = loop;

  const render = () => {
    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      const width = Math.min(video.videoWidth || 480, 480);
      const height = Math.round(width * (video.videoHeight || 360) / (video.videoWidth || 640));

      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      context.clearRect(0, 0, width, height);
      context.drawImage(video, 0, 0, width, height);
      const image = context.getImageData(0, 0, width, height);
      const pixels = image.data;

      for (let i = 0; i < pixels.length; i += 4) {
        const red = pixels[i];
        const green = pixels[i + 1];
        const blue = pixels[i + 2];
        if (green > 28 && green > Math.max(red, blue) * 1.02) pixels[i + 3] = 0;
      }

      context.putImageData(image, 0, 0);
    }

    mobileChromaFrames.set(videoId, requestAnimationFrame(render));
  };

  const begin = () => {
    if (started) return;
    started = true;
    render();
  };

  video.onended = () => {
    stopChromaEffect(videoId, canvasId);
    if (onended) onended();
  };

  const play = () => {
    try { video.currentTime = 0; } catch (_) {}
    video.play().then(begin).catch(() => {
      video.addEventListener("canplay", () => video.play().then(begin).catch(() => {}), { once: true });
    });
  };

  if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) play();
  else {
    video.addEventListener("loadeddata", play, { once: true });
    video.load();
  }
}
