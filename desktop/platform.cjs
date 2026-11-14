function desktopFeatures(platform = process.platform, env = process.env) {
  const linux = platform === 'linux';
  const wayland = linux && (env.XDG_SESSION_TYPE === 'wayland' || Boolean(env.WAYLAND_DISPLAY));
  return {
    globalInput: platform === 'win32',
    globalCursor: !wayland,
    nativeDrag: wayland,
    portalCapture: wayland,
    loginItem: platform === 'win32' || platform === 'darwin',
  };
}

module.exports = {desktopFeatures};
