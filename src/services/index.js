import _ from 'underscore';
import axios from './axios';

// const API_HOST = 'http://127.0.0.1:8006/survey';
// const API_HOST = 'http://jcomsurvey.k2s.io:8006/survey';
// const API_HOST = '/survey';
const API_HOST = window.config.url;

// HTTPリクエスト
const request = (method, token, path, params, data) => {
  // 相対パス(「/」始まり)なら${API_HOST}
  const url = path.startsWith('/') ? `${API_HOST}${path}` : path;
  const headers = {
    Authorization: `Bearer ${token}`,
  };

  const config = {
    method,
    url,
    headers,
    params,
    data,
  };
  return axios(config).catch((error) => {
    return { error };
  });
};


//
// class WebService {
//
//   // constructor() {
//   //
//   // }
//   // static setUrl(url) {
//   //   WebService.url = url;
//   // }
//   static login(userName) {
//     console.log(window.config.url);
//     console.log(userName);
//   }
//
// }
//
// // WebService.url = '';
//
// export default WebService;

// ログイン
export const serviceDoLogin = ({ userName, password }) => {
  // const data = { name: userName, pass: password };
  const data = { userName, password };
  return request('POST', null, '/login', {}, data);

  // return { data: { IdentityId: 'dummy', Token: 'dummy' } };
};

// リスト
export const serviceGetList = (token, para) => {
  const { collection } = para;
  const params = _.omit(para, 'collection');
  return request('GET', token, `/${collection}`, params, {});

  // return { data: { IdentityId: 'dummy', Token: 'dummy' } };
};

// リスト
export const serviceTree = (token, para) => {
  const { collection, id } = para;
  return request('GET', token, `/breadcrumbs/${collection}/${id}`, {}, {});

  // return { data: { IdentityId: 'dummy', Token: 'dummy' } };
};

// 詳細取得
export const serviceDetail = (token, para) => {
  const { collection, id } = para;
  return request('GET', token, `/${collection}/${id}`, {}, {});

  // return { data: { IdentityId: 'dummy', Token: 'dummy' } };
};

// 削除
export const serviceRemove = (token, para) => {
  const { collection, id } = para;
  return request('DELETE', token, `/${collection}/${id}`, {}, {});

  // return { data: { IdentityId: 'dummy', Token: 'dummy' } };
};

// 詳細更新
export const serviceSubmitDetail = (token, para) => {
  const { collection, id, item } = para;
  const data = { item };

  return request('PUT', token, `/${collection}/${id}`, {}, data);

  // return { data: { IdentityId: 'dummy', Token: 'dummy' } };
};

// アップロード
// file: react-dropzone の file
export const serviceUploadFile = (token, para) => {

  const { collection, file } = para;

  const path = `/upload/${collection}`;

  const params = {
    contentType: file.type || 'application/octet-stream',
    name: file.name,
    length: file.size,
  };

  return request('GET', token, path, params, {}).then(({ data }) => {

    const options = {
      headers: {
        'Content-Type': params.contentType,
      },
    };

    return axios.put(data.url, file, options).then(() => {
      return { data };
    });
  });
};

// ダウンロード
export const serviceDownloadFile = (token, para) => {

  const { key } = para;

  const path = `/download/files/${key}`;

  return request('GET', token, path, {}, {})
};
