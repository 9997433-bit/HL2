'use strict';

function createPlatform(host) {
  if (!host || typeof host.createCanvas !== 'function') {
    throw new Error('This package must run in a WeChat Mini Game host.');
  }

  const info = typeof host.getWindowInfo === 'function'
    ? host.getWindowInfo()
    : host.getSystemInfoSync();
  const width = info.windowWidth;
  const height = info.windowHeight;
  const pixelRatio = Math.min(info.pixelRatio || 1, 3);
  const canvas = host.createCanvas();

  canvas.width = Math.round(width * pixelRatio);
  canvas.height = Math.round(height * pixelRatio);

  const context = canvas.getContext('2d');
  context.scale(pixelRatio, pixelRatio);

  return {
    canvas,
    context,
    width,
    height,
    onTouchStart(handler) {
      host.onTouchStart((event) => {
        const touch = event.touches && event.touches[0];
        if (touch) handler({ x: touch.clientX, y: touch.clientY });
      });
    },
    onShow(handler) {
      host.onShow(handler);
    },
    vibrate() {
      if (typeof host.vibrateShort === 'function') {
        host.vibrateShort({ type: 'light' });
      }
    }
  };
}

module.exports = { createPlatform };
