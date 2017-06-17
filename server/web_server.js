const express = require('express');
const fs = require('fs');
const morgan = require('morgan');

process.env.PORT = process.env.PORT || 8008;
process.env.APP_HOME = process.env.APP_HOME || './build';

const app = express();

app.use(morgan('dev'));

// ファイル内容が文字列と同じかどうか？
function isEqual(path, buff) {
  try {
    return buff === fs.readFileSync(path, 'utf8');
  } catch (err) {
    return false;
  }
}

// 環境変数ファイル生成
// <keys> に列挙した環境変数を
// <configFile>.template をテンプレートとして、<configFile> を生成する
// index.html の script タグでグローバル変数として読み込まれる
const configFile = process.env.APP_HOME + '/env.js';
const template = `${configFile}.template`;
const keys = ['API_URL'];
const config = keys.reduce(
  (memo, key) => memo.replace(`\${${key}}`, process.env[key]),
  fs.readFileSync(template, 'utf8'));

if (!isEqual(configFile, config)) {
  fs.writeFileSync(configFile, config);
  const stat = fs.statSync(template);
  fs.utimesSync(configFile, stat.atime, stat.mtime);
}

// ファイル
app.get('/**', (req, res, next) => {
  // todo: 認証

  const index = 'index.html';
  const file = req.params[0] || index;
  const root = process.env.APP_HOME;
  res.sendFile(file, { root }, (err1) => {
    if (err1) {
      res.sendFile(index, { root }, (err2) => {
        if (err2) {
          next();
        }
      });
    }
  });
});

app.listen(process.env.PORT, () => {
  console.log(`Example app listening on port ${process.env.PORT}!`);
});
