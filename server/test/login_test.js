var axios = require('axios');

const HOST = "http://127.0.0.1:8006";
const APIURL = HOST + "/survey";

describe('SampleServer test', () => {

  it('ルート', (done) => {
    axios.get(HOST).then((result) => {
      done();
    });
  });

  it('ログイン', (done) => {
    const data = {
      userName: 'da_admin',
      password: 'hogehoge',
      clientKey: 'jp.co.dreamarts.jcomsurvey',
    };

    axios.post(`${APIURL}/login`, data).then(({ data }) => {
      return data;
    }).then((data) => {
      const option = {
        method: 'post',
        url: `${APIURL}/sessions`,
        headers: {
          Authorization: ['Bearer', data.token].join(' '),
        },
      };
      return axios(option);
    }).then((data) => {
      done();
    }).catch((err) => {
      console.log(err);
      done(err);
    });
  });

  it('ログイン', (done) => {
    const data = {
      userName: 'daadmin',
      password: 'hogehoge',
      clientKey: 'jp.co.dreamarts.jcomsurvey',
    };

    axios.post(`${APIURL}/login2`, data).then(({ data }) => {
      done();
    }).catch((err) => {
      console.log(err);
      done(err);
    });
  });
});
