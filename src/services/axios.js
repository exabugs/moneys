const _ = require('underscore');
const db = require('./test_sample.js');


const axios = ({ method, url, headers, params, data }) => {
  const path = url.split('/').slice(3);

  const name = path[1];
  db[name] = (db[name] || {});
  const coll = db[name];

  const _id = path[2];

  const rand = Date.now() + Math.random().toString(36).slice(-8);

  console.log(path);

  let result = { data: { items: [] } };

  switch (method) {
    case 'GET':
      if (_id) {
        const item = coll[_id];
        result = { data: { item } };
      } else {
        let items = Object.values(coll);
        if (params.orderBy) {
          items = _.sortBy(items, params.orderBy);
          items = params.order === 'asc' ? items : items.reverse();
        }
        result = { data: { items } };
      }
      break;
    case 'POST':
      const userName = data.userName;
      result = {
        data: { token_type: 'Bearer' },
      };
      if (name === 'login' && userName) {
        const user = Object.values(db.users).find(user => user.userName === userName);
        result.data.session = {
          user,
          group: {},
        };
        result.data.token = rand;
      }
      break;
    case 'PUT':
      if (data.item) {
        const item = data.item;
        const _id = item._id || rand;
        coll[_id] = item;
        item._id = _id;
        item.updatedAt = new Date();
        result = { data: { item } };
      }
      break;
    case 'DELETE':
      delete coll[_id];
      break;
    default:
      break;
  }

  return new Promise((resolve) => {
    resolve(result);
  });
};

axios.put = (url, file, options) => {
  console.log(url);
  console.log(file);
  console.log(options);
};

export default axios;
