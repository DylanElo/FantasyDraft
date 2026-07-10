(function () {
  'use strict';

  const SHELL_VERSION = '18';

  const fontsReady = window.JJK_FONTS_READY || Promise.resolve();
  fontsReady
    .then(() => import(`./phaser/index.js?v=${SHELL_VERSION}`))
    .catch((error) => {
      console.error('Failed to load JJK Phaser shell module', error);
    });
})();
