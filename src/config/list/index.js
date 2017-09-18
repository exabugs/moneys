import _ from 'underscore';

import claims from './claims.json';
import customers from './customers.json';
import images from './images.json';
import accounts from './accounts.json';
import users from './users.json';
import passwords from './passwords.json';
import sessions from './sessions.json';
import files from './files.json';

import common from './_common.json';

const config = {
  modules: {
    claims,
    customers,
    images,
    accounts,
    users,
    passwords,
    sessions,
    files,
  },
};

function resolve(fieldDef) {

  if (fieldDef.fields) {
    fieldDef.fields = fieldDef.fields.map((field) => {

      const newDef = {};
      _.extend(newDef, common[field.common]);
      _.extend(newDef, field);

      return newDef;
    });
  }

  if (fieldDef.search) {
    fieldDef.search = fieldDef.search.map((field) => {

      const newDef = {};
      _.extend(newDef, common[field.common]);
      _.extend(newDef, field);

      return newDef;
    });
  }

  return fieldDef;
}

export default (() => {
  _.each(config.modules, (fieldDef) => {
    return resolve(fieldDef);
  });
  return config;
})();
