import React from 'react';
import { reduxForm } from 'redux-form';
import { FormattedMessage } from 'react-intl';
import RaisedButton from 'material-ui/RaisedButton';
import { browserHistory } from 'react-router';
import numeral from 'numeral';
import _ from 'underscore';
import { getValue } from '../util';

import EditorParts from './EditorParts';

import config from '../config/detail';

const styles = {
  button: {
    width: 160,
    margin: 2,
  },
  footerCenter: {
    width: '100%',
    textAlign: 'center',
  },
};

const Detail = (props) => {
  const { params } = props;
  console.log(params);
  const { collection } = params; // URL param

  const { onReset, onRemove, onSubmitDetail, onSelect, onDrop } = props; // Container
  const { handleSubmit, submitting, error } = props;

  const fieldDefs = config.modules[collection];

  const rootinfo = {
    config,
    handleSubmit,
    onSelect,
    onDrop: (file) => {
      onDrop({ collection, file });
    },
    error,
  };

  return (
    <div>

      <h4><FormattedMessage id={`menu.${collection}`} /></h4>

      <table>
        <tbody>

          <tr>
            <td>
              <form>

                <EditorParts
                  rootinfo={rootinfo}
                  fieldDefs={fieldDefs}
                />

              </form>
            </td>
          </tr>
        </tbody>
      </table>

      <table>
        <tbody>

          <tr>
            <td>
              <RaisedButton
                style={styles.button}
                label={<FormattedMessage id="modules.cancel" />}
                onClick={() => browserHistory.push(`/modules/${collection}`)}
              />
            </td>
            <td style={styles.footerCenter}>
              <RaisedButton
                style={styles.button}
                label={<FormattedMessage id="modules.reset" />}
                disabled={submitting}
                onClick={handleSubmit(detail => onReset({ collection, detail }))}
              />
              <RaisedButton
                style={styles.button}
                label={<FormattedMessage id="modules.remove" />}
                disabled={submitting}
                onClick={handleSubmit(detail => onRemove({ collection, detail }))}
              />
            </td>
            <td>
              <RaisedButton
                style={styles.button}
                label={<FormattedMessage id="modules.save" />}
                primary={true}
                disabled={submitting}
                onClick={handleSubmit(detail => onSubmitDetail({ collection, detail }))}
              />
            </td>
          </tr>
        </tbody>
      </table>


    </div>
  );
};

const evaluate = (str, values, map) => {
  const auto = str.replace(/:([a-zA-Z.]+)/g, (all, key) => {
    switch (map[key].type) {
      case 'NumberField':
        return numeral(getValue(values, key)).value();
      case 'TextField':
        return getValue(values, key);
      default:
        return key;
    }
  });
  return eval(auto);
};

const onChange = (values, dispatch, props) => {
  const { change, params } = props;

  const { collection } = params; // URL param
  const { fieldDefs } = config.modules[collection];
  const map = _.indexBy(fieldDefs, 'key');

  fieldDefs.forEach(field => {
    if (field.type === 'NumberField') {
      if (field.auto) {
        const value = evaluate(field.auto, values, map);
        dispatch(change(field.key, value));
      }
    }
  });
};

const validate = (values, props) => {
  const { dispatch, change, params } = props;

  const { collection } = params; // URL param
  const { fieldDefs } = config.modules[collection];
  const map = _.indexBy(fieldDefs, 'key');
  const _error = {};

  fieldDefs.forEach(field => {
    if (field.type === 'NumberField') {
      if (!getValue(values, field.key)) {
        dispatch(change(field.key, field.initial ? field.initial : 0));
      }
    }
  });

  fieldDefs.forEach(field => {
    _.each(field.validate, info => {
      const valid = evaluate(info.condition, values, map);
      if (!valid) {
        _error[field.key] = _error[field.key] || [];
        _error[field.key].push(info.message);
      }
    });
  });

  return { _error };
};

export default reduxForm({
  form: 'detailForm',
  onChange,
  validate,
  //enableReinitialize: true,
})(Detail);
