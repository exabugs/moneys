const express = require('express');
const fs = require('fs-extra');
const morgan = require('morgan');
const Plist = require('plist');
const moment = require('moment-timezone');
const _ = require('underscore');
const zip = require('zip');
// const unzip = require('unzip'); 解凍できないipaがある

process.env.PORT = process.env.PORT || 8010;
process.env.IPAS = process.env.IPAS || './server/ipas';

//
// itms-services://?action=download-manifest&url=https://hogehoge.com/HogehogeApp.plist
//

const app = express();

app.use(morgan('dev'));

const unzipDir = `${process.env.IPAS}/unzip`;
const ipasDir = `${process.env.IPAS}/ipas`;

function host(req) {
  const port = req.headers['x-forwarded-port'];
  const fqdn = req.get('host').split(':')[0];
  const path = port ? `${fqdn}:${port}` : `${req.get('host')}`;
  return `https://${path}`;
}

function icon(app) {
  // ファイル名に'@'を含むimgファイル(アイコン)で一番大きいサイズを探す
  const files = fs.readdirSync(`${unzipDir}/Payload/${app}.app`)
    .filter(file => file.substr(-4) === '.png')
    .filter(file => file.indexOf('@') !== -1)
    .map((file) => {
      const stat = fs.statSync(`${unzipDir}/Payload/${app}.app/${file}`);
      return { size: stat.size, name: file };
    });
  files.sort((file1, file2) => file2.size - file1.size);
  return files[0].name;
}


// index
app.get('/', (req, res) => {
  const start = moment.utc('1970-01-01');
  const files = fs.readdirSync(ipasDir)
    .filter(file => file.substr(-4) === '.ipa')
    .map(file => file.split('.')[0])
    .map(file => {
      const info = `${unzipDir}/Payload/${file}.json`;
      let json = {};
      try {
        json = JSON.parse(fs.readFileSync(info));
      } catch (err) {
        json.title = file;
      }
      json.etime = json.etime || start;
      json.utime = json.utime || start;
      return json;
    });
  files.sort((file1, file2) => file2.utime - file1.utime);
  const buff = files.map((json) => {
    const url = `itms-services://?action=download-manifest&url=${host(req)}/${json.title}.plist`;
    const zone = 'Asia/Tokyo';
    const etime = moment(json.etime).tz(zone);
    const utime = moment(json.utime).tz(zone);
    let buff = "";
    buff += '<tr>';
    buff += `<td><img src="${json.title}/${json.icon}" width="40" height="40"></td>`;
    buff += `<td><a href='${url}'>${json.title}</a></td>`;
    // buff += `<td>${json.identifier}</td>`;
    buff += `<td>${etime.format("YYYY-MM-DD")}</td>`;
    buff += `<td>${json.version}</td>`;
    buff += `<td>${utime.format("YYYY-MM-DD HH:mm:ss")}</td>`;
    buff += '</tr>';
    return buff;
  });
  let html = '';
  html += `<html>`;
  html += `<head>`;
  html += `  <meta charset="utf-8">`;
  html += `  <meta name="viewport" content="width=device-width, initial-scale=1">`;
  html += `  <style>`;
  html += `  table {border: solid 1px #000000; border-collapse: collapse;}`;
  html += `  td {border: solid 1px #000000; margin: 10px; padding: 10px;}`;
  html += `  </style>`;
  html += `</head>`;
  html += `<body>`;
  html += `  <table>${buff.join('')}</table>`;
  html += `</body>`;
  html += `<html>`;
  res.send(html);
});

// png
app.get('/:app/:png.png', (req, res) => {
  const file = `/Payload/${req.params.app}.app/${req.params.png}.png`;
  res.append('Content-Type', 'image/png');
  res.sendFile(file, { root: unzipDir });
});

// ipa
app.get('/:app.ipa', (req, res) => {
  const file = `${req.params.app}.ipa`;
  res.sendFile(file, { root: ipasDir });
});

// plist
app.get('/:app.plist', (req, res) => {
  const app = req.params.app;
  const plist = `${unzipDir}/Payload/${app}.plist`;
  const root = '.';
  const ipaf = `${ipasDir}/${app}.ipa`;
  const statIPA = fs.statSync(ipaf);
  return new Promise((resolve) => {
    res.header('Content-Type', 'application/x-plist');
    try {
      const statPLT = fs.statSync(plist);
      if (statIPA.ctime < statPLT.ctime) {
        res.sendFile(plist, { root }, err => (err ? resolve() : true));
      } else {
        resolve();
      }
    } catch (err) {
      resolve(); // Not Found. Go Unzip.
    }
  }).then(() => {
    return new Promise((resolve, reject) => {
      const file = `${unzipDir}/Payload/${app}.app/embedded.mobileprovision`;
      try {
        const statMPV = fs.statsSync(file);
        if (statIPA.ctime < statMPV.ctime) {
          return resolve(fs.readFileSync(file));
        }
      } catch (err) {
        console.log(`[info] unzip ${app}.ipa`);
      }
      try {
        // 解凍できないipaがある
        // fs.createReadStream(`${ipasDir}/${app}.ipa`)
        //   .pipe(unzip.Extract({ path: `${ipasDir}/unzip` }))
        //   .on('close', () => resolve(fs.readFileSync(file)));
        const reader = zip.Reader(fs.readFileSync(ipaf));
        const files = reader.toObject();
        _.each(files, (value, _key) => {
          const key = `${unzipDir}/${_key}`;
          let dir = key.split('/');
          dir = dir.slice(0, dir.length - 1);
          fs.mkdirpSync(dir.join('/'));
          fs.writeFileSync(key, value);
        });
        resolve(fs.readFileSync(file));
      } catch (err) {
        reject(err);
      }
    });
  }).then((provision) => {
    const xml = provision.toString().match(/(<\?xml [\s\S]*<\/plist>)/);

    const obj = Plist.parse(xml[0]);

    const title = req.params.app;
    const id1 = obj.Entitlements['application-identifier'];
    const id2 = id1.replace(/\*$/, req.params.app);
    const identifier = id2.slice(id2.indexOf('.') + 1);
    const ctime = obj.CreationDate.getTime();
    const etime = obj.ExpirationDate.getTime();
    const version = [obj.Version, Math.floor(ctime / 60 / 60 / 1000)].join('.');
    const utime = statIPA.ctime.getTime();

    const installHost = process.env.HOST || host(req);
    const url = `${installHost}/${title}.ipa`;

    const infoFile = `${unzipDir}/Payload/${req.params.app}.json`;
    const infoJson = {
      title,
      identifier,
      ctime, // CreationDate
      etime, // ExpirationDate
      utime, // ipa upload time
      version,
      icon: icon(req.params.app),
    };
    fs.writeFileSync(infoFile, JSON.stringify(infoJson));

    const buff = Plist.build({
      items: [
        {
          assets: [
            { kind: 'software-package', url },
          ],
          metadata: {
            kind: 'software',
            title,
            'bundle-identifier': identifier,
            'bundle-version': version,
          },
        },
      ],
    });
    fs.writeFileSync(plist, buff.toString());

    return res.sendFile(plist, { root });
  });
})
;

app.listen(process.env.PORT, () => {
  console.log(`AppStore listening on port ${process.env.PORT}!`);
});
