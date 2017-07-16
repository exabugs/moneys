const https = require('https');

const path = '/services/T0DD9AQER/B0DDBKWSX/BmtRdpAZZtRkx0fiF70Zapza'; // exabugs

const request = (data) => {

  return new Promise((resolve) => {
    const body = JSON.stringify(data);

    const req = https.request({
      hostname: 'hooks.slack.com',
      port: 443,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charser=UTF-8',
        'Content-Length': Buffer.byteLength(body),
      },
    });

    req.end(body, (err) => {
      resolve(err);
    });
  });
};

exports.handler = (event, context, callback) => {

  const datas = event.Records.reduce((memo, record) => {
    if (record.EventSource === 'aws:sns') {
      const sns = record.Sns;
      const json = JSON.parse(sns.Message);
      const msg = {
        text: sns.Subject,
        attachments: [
          {
            text: JSON.stringify(json, null, '    '),
            color: 'danger',
          },
        ],
      };
      memo.push(msg);
    }
    return memo;
  }, []);

  const tasks = datas.map(data => request(data));

  Promise.all(tasks).then((results) => {
    console.log(results);
    callback(null);
  }).catch((err) => {
    callback(err);
  });
};
