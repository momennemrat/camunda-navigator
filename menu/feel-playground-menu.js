'use strict';

const { openFeelPlayground } = require('../utils/open-feel-playground.js');

module.exports = function(electronApp, menuState) {
  return [
    {
      label: 'Open FEEL Playground',
      accelerator: 'CommandOrControl+Shift+f',
      action: () => { openFeelPlayground(); }
    }
  ];
};
