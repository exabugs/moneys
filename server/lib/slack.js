const request = require('request');
const os = require('os');

// 例外発生
process.on('uncaughtException', function (err) {

  var hostname = os.hostname().split('.')[0];
  var text = [
    (new Date()).toISOString(),
    process.env.HOST,
    hostname,
    collie.version.revision,
    '```' + err.stack + '```'
  ].join('\n');

  var data = {
    'channel': '#general',
    'username': 'uncaughtException',
    'text': text,
    'icon_emoji': ':ghost:',
    'mrkdwn': true
  };

  var options = {
    uri: 'https://hooks.slack.com/services/' + process.env.SLACK_TOKEN,
    form: {payload: JSON.stringify(data)}
  };

  request.post(options, function (error, response, body) {
    process.exit(1); // 1:異常終了
  });

});
