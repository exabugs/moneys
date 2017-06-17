import React from 'react';
import { reduxForm } from 'redux-form';
import { FormattedMessage } from 'react-intl';
import RaisedButton from 'material-ui/RaisedButton';
import { Link } from 'react-router';
import { browserHistory } from 'react-router';
import {
  TableFooter, TableRow, TableRowColumn
} from 'material-ui/Table';

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
  const { collection, id } = params; // URL param

  const { onReset, onRemove, onSubmitDetail, onSelect, onDrop, detail } = props; // Container
  const { handleSubmit, pristine, reset, submitting } = props;

  const fieldDefs = config.modules[collection];

  const rootinfo = {
    config,
    handleSubmit,
    onSelect,
    onDrop: (file) => {
      onDrop({ collection, file });
    },
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
                onClick={() => browserHistory.push(`/modules/${collection}`)}
              >
                <FormattedMessage id="modules.cancel" />
              </RaisedButton>
            </td>
            <td style={styles.footerCenter}>
              <RaisedButton
                style={styles.button}
                disabled={submitting}
                onClick={handleSubmit(detail => onReset({ collection, detail }))}
              >
                <FormattedMessage id="modules.reset" />
              </RaisedButton>
              <RaisedButton
                style={styles.button}
                disabled={submitting}
                onClick={handleSubmit(detail => onRemove({ collection, detail }))}
              >
                <FormattedMessage id="modules.remove" />
              </RaisedButton>
            </td>
            <td>
              <RaisedButton
                style={styles.button}
                disabled={submitting}
                onClick={handleSubmit(detail => onSubmitDetail({ collection, detail }))}
              >
                <FormattedMessage id="modules.save" />
              </RaisedButton>
            </td>
          </tr>
        </tbody>
      </table>


    </div>
  );
};

export default reduxForm({
  form: 'detailForm',
  //enableReinitialize: true,
})(Detail);
