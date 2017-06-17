import _ from 'underscore';

import groups from './groups.json';
import users from './users.json';
import tokens from './tokens.json';
import queues from './queues.json';
import files from './files.json';

import common from './_common.json';

const config = {
  modules: {
    groups,
    users,
    tokens,
    queues,
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
