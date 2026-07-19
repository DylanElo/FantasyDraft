(function () {
  'use strict';

  const SHELL_VERSION = '41';

  import(`./phaser/index.js?v=${SHELL_VERSION}`).catch((error) => {
    console.error('Failed to load JJK Phaser shell module', error);
  });
})();
