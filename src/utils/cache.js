const NodeCache = require('node-cache');

const appCache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

module.exports = appCache;
