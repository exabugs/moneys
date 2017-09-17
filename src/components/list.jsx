import React from 'react';
import { reduxForm } from 'redux-form';
import {
  Table, TableBody, TableHeader, TableFooter,
  TableHeaderColumn, TableRow, TableRowColumn
} from 'material-ui/Table';
import RaisedButton from 'material-ui/RaisedButton';
import DropDownMenu from 'material-ui/DropDownMenu';
import MenuItem from 'material-ui/MenuItem';
import { FormattedMessage } from 'react-intl';
import moment from 'moment-timezone';
import numeral from 'numeral';
import { Link, browserHistory } from 'react-router';
import IconButton from 'material-ui/IconButton';
import { Field, FieldArray } from 'redux-form';
import Dropzone from 'react-dropzone';

import {
  AutoComplete,
  Checkbox,
  RadioButtonGroup,
  SelectField,
  TextField,
  DatePicker,
  TimePicker,
  Slider,
  Toggle
} from 'redux-form-material-ui';

import config from '../config/list';
import { getValue } from '../util';
import icons from './icons';
import items from '../config/items';

const styles = {
  button: {
    width: 160,
    margin: 2,
  },
  footerLeft: {
    float: 'left',
  },
  footerRight: {
    float: 'right',
  },
  detail: {
    width: 30,
  },
  table: {
    border: 'solid 1px #eeeeee',
    borderSpacing: 0,
  },
  td: {
    'verticalAlign': 'middle',
  },
};

// TODO
const timezone = 'Asia/Tokyo';

function format(item, field, onDownload) {
  const v = getValue(item, field.key);
  const values = Array.isArray(v) ? v : [v];
  return values.map(value => {
    if (value === null || value === undefined) {
      return value;
    } else if (field.type && field.type === 'Date') {
      return moment(value).tz(timezone).format(field.format);
    } else if (field.type && field.type === 'download') {
      return <RaisedButton onClick={() => onDownload({ key: v })} label={v} />;
    } else if (field.itemsKey) {
      return <FormattedMessage id={`modules.items.${field.itemsKey}.${value}`} defaultMessage={`${value}`} />
    } else if (field.type && field.type === 'Number') {
      return numeral(value).format('0,0');
    } else {
      return value;
    }
  });
}

function equal(a, b) {
  if (a.length !== b.length) return false;
  for (var i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

class MyTableBody extends TableBody {
  componentWillReceiveProps(nextProps) {
    console.log('componentWillReceiveProps');
    console.log(this.state);
    console.log(this.props);
    const selectedRows = nextProps.selectedRows;
    if (!equal(this.state.selectedRows, selectedRows)) {
      this.setState({ selectedRows });
    }
  }

  // shouldComponentUpdate() {
  //   return true;
  // }
}

const formattedMessage = (field, item) =>
  <FormattedMessage id={`modules.items.${field.itemsKey}.${item}`} defaultMessage={item} />

const Search = ({ props, collection, field }) => {
  switch (field.type) {
    case 'owner':
      const owner = props.owner[collection] || {};
      const owner_items = owner.items || [];
      const { onInitOwner } = props;
      return (
        <div>
          {owner_items.map((groups, i) =>
            <DropDownMenu
              key={i}
              value={groups.value}
              onChange={(event, index, primaryGroup) => onInitOwner({ collection, primaryGroup })}
            >
              {groups.items.map(group =>
                <MenuItem value={group.value} key={group.value} primaryText={group.name} />
              )}
            </DropDownMenu>
          )}
        </div>
      );
    case 'Location':
    case 'TextField':
      return (
        <Field
          name={field.key}
          component={TextField}
          style={{ width: 300, height: 56, margin: 2 }}
        />
      );
    case 'SelectField':
      return (
        <Field name={field.key} component={SelectField} hintText="Select something"
               style={{ position: 'relative', top: 10 }}
        >
          {items[field.itemsKey].map(item => (
            <MenuItem key={item} value={item} primaryText={formattedMessage(field, item)} />
          ))}
        </Field>
      );
    default:
      return null;
  }
};

const Content = (props) => {
  const { params } = props;
  const { collection } = params;
  const { items, onLoadNext, onRowSelection, onSelected, onSearch, onDrop, onDownload } = props;
  const { handleSubmit, pristine, reset, submitting } = props;

  const { search, fields } = config.modules[collection];


  const context = props.context[collection] || {};
  const { selected = {}, indexes = [] } = context;

  const selectedRows = [];
  items.forEach((item, i) => {
    if (selected[item._id.toString()])
      selectedRows.push(i);
  });
  console.log(selectedRows);

  // 動作モード : ReactRouter で指定
  //   list   : 通常の一覧画面
  //   select : 選択ダイアログ
  const { mode } = props.route;

  const detail = ({ _id }) => <Link to={`/modules/${collection}/${_id}`} />;

  // allRowsSelected

  return (
    <form onSubmit={handleSubmit(condition => onSearch({ collection, condition }))}>
      <h4><FormattedMessage id={`menu.${collection}`} /></h4>

      <table style={styles.table}>
        <tbody>
          {search.map((field, i) =>
            <tr key={i}>
              <td style={styles.td}>
                <FormattedMessage
                  id={`modules.modules.${field.collection || collection}.${field.title || field.key}`} />
              </td>
              <td style={styles.td}>:</td>
              <td style={styles.td}>
                {Search({ props, collection, field, handleSubmit, onSearch })}
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <RaisedButton
        style={styles.button}
        label={<FormattedMessage id="modules.clear" />}
        onClick={handleSubmit(condition => onSearch({ collection, condition }))}
      />
      <RaisedButton
        style={styles.button}
        label={<FormattedMessage id="modules.search" />}
        primary={true}
        onClick={handleSubmit(condition => onSearch({ collection, condition }))}
      />

      <Table
        selectable={false}
      >
        <TableHeader displaySelectAll={false} adjustForCheckbox={false}>
          <TableRow>
            <TableHeaderColumn style={styles.detail}>
              <IconButton disabled={true}>
                {icons['image/details']}
              </IconButton>
            </TableHeaderColumn>
            {fields.map((field) => {
              const width = `${field.width}px`;
              const textAlign = 'center';
              const style = { width, textAlign };
              const _collection = field.collection || collection;
              return (
                <TableHeaderColumn style={style} key={field.key}>
                  <FormattedMessage id={`modules.modules.${_collection}.${field.title || field.key}`} />
                </TableHeaderColumn>
              );
            })}
          </TableRow>
        </TableHeader>

        <TableBody displayRowCheckbox={false}>
          {items.map((item) =>
            <TableRow
              key={item._id}
            >
              <TableRowColumn style={styles.detail}>
                {mode === 'list' ?
                  <IconButton containerElement={detail(item)}>
                    {icons['image/details']}
                  </IconButton> :
                  <IconButton onClick={() => onSelected({ item })}>
                    {icons['file/file-download']}
                  </IconButton>
                }
              </TableRowColumn>

              {fields.map((field) => {
                const width = `${field.width}px`;
                const textAlign = field.align;
                const style = { width, textAlign };
                return (
                  <TableRowColumn style={style} key={field.key}>
                    <span>{format(item, field, onDownload).map((val, i) =>
                      <div key={i}>{val}</div>
                    )}</span>
                  </TableRowColumn>
                );
              })}


            </TableRow>
          )}

        </TableBody>

        <TableFooter adjustForCheckbox={false}>
          <TableRow>
            <TableRowColumn style={styles.footerLeft}>
              <RaisedButton
                style={styles.button}
                label={<FormattedMessage id="modules.new" />}
                onClick={() => browserHistory.push(`/modules/${collection}/new`)}
              />
            </TableRowColumn>

            <TableRowColumn>
              {
                // <Dropzone onDrop={(file) => onDrop({ collection, file })} />
              }
            </TableRowColumn>

            <TableRowColumn style={styles.footerRight}>
              <RaisedButton
                style={styles.button}
                label={<FormattedMessage id="modules.next" />}
                onClick={() => onLoadNext({ skip: items.length })}
              />
            </TableRowColumn>
          </TableRow>
        </TableFooter>


      </Table>


    </form>
  );
};

export default reduxForm({
  form: 'searchForm',
  //enableReinitialize: true,
})(Content);
