const fs = require('fs');

const modules = {};
module.exports.config = (db) => ({ modules });

const dir = __dirname + '/../../src/config/list/';
const files = fs.readdirSync(dir);
files.filter(file => {
  if (fs.statSync(dir + file).isFile() && /^([a-z].*)\.json$/.test(file)) {
    modules[RegExp.$1] = require(dir + file);
  }
});
