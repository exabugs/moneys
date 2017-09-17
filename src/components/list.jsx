import React from 'react';
import { reduxForm, Field } from 'redux-form';
import {
  Table, TableBody, TableHeader, TableFooter,
  TableHeaderColumn, TableRow, TableRowColumn,
} from 'material-ui/Table';
import RaisedButton from 'material-ui/RaisedButton';
import DropDownMenu from 'material-ui/DropDownMenu';
import MenuItem from 'material-ui/MenuItem';
import { FormattedMessage } from 'react-intl';
import moment from 'moment-timezone';
import numeral from 'numeral';
import { Link, browserHistory } from 'react-router';
import IconButton from 'material-ui/IconButton';
// import Dropzone from 'react-dropzone';

import {
  SelectField,
  TextField,
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
  conditionTD: {
    verticalAlign: 'middle',
    paddingLeft: 8,
    paddingRight: 8,
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
        <Field name={field.key} component={SelectField} hintText={field.key}
               style={{ position: 'relative', top: 10 }}
        >
          {getValue(items, field.itemsKey).map(item => (
            <MenuItem key={item} value={item} primaryText={formattedMessage(field, item)} />
          ))}
        </Field>
      );
    default:
      return null;
  }
};

const doSearch = ({ props, condition, key }) => {
  const { params, onSearch, context } = props;
  const { collection } = params;
  let { order, orderBy } = context[collection] || {};

  if (key) {
    order = (key !== orderBy || order === 'desc') ? 'asc' : 'desc';
    orderBy = key;
  }
  console.log(`orderBy:${orderBy} order:${order}`);
  onSearch({ collection, condition, order, orderBy });
};

const Content = (props) => {
  const { params } = props;
  const { collection } = params;
  const { items, onLoadNext, onSelected, onDownload } = props;
  const { handleSubmit } = props;

  const { search, fields } = config.modules[collection];


  const context = props.context[collection] || {};
  const { selected = {}, order, orderBy } = context;

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

  const _sortIcon = order => <span style={{ color: '#B2423E' }}>{icons[order]}</span>;

  const sortIcon = (align, sort, order) => align ? (sort ? _sortIcon(order) : icons.sort) : '';

  return (
    <form onSubmit={handleSubmit(condition => doSearch({ props, condition }))}>
      <h4><FormattedMessage id={`menu.${collection}`} /></h4>

      <table style={styles.table}>
        <tbody>
          {search.map((field, i) =>
            <tr key={i}>
              <td style={styles.conditionTD}>
                <FormattedMessage
                  id={`modules.modules.${field.collection || collection}.${field.title || field.key}`} />
              </td>
              <td>:</td>
              <td style={styles.conditionTD}>
                {Search({ props, collection, field })}
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <RaisedButton
        style={styles.button}
        label={<FormattedMessage id="modules.clear" />}
        onClick={handleSubmit(condition => doSearch({ props, condition }))}
      />
      <RaisedButton
        style={styles.button}
        label={<FormattedMessage id="modules.search" />}
        primary={true}
        onClick={handleSubmit(condition => doSearch({ props, condition }))}
      />

      <Table
        selectable={false}
      >
        <TableHeader displaySelectAll={false} adjustForCheckbox={false}>
          <TableRow
            onCellClick={(e, l, c) => {
              const { key } = fields[c - 2];
              handleSubmit(condition => doSearch({ props, condition, key }))();
            }}
          >
            <TableHeaderColumn style={styles.detail}>
              <IconButton disabled={true}>
              </IconButton>
            </TableHeaderColumn>
            {fields.map((field) => {
              const width = field.width;
              const textAlign = field.align;
              const style = { width, textAlign };
              const _collection = field.collection || collection;
              const sort = orderBy === field.key;
              return (
                <TableHeaderColumn style={style} key={field.key}>
                  {sortIcon(textAlign === 'right', sort, order)}
                  <FormattedMessage id={`modules.modules.${_collection}.${field.title || field.key}`} />
                  {sortIcon(textAlign !== 'right', sort, order)}
                </TableHeaderColumn>
              );
            })}
          </TableRow>
        </TableHeader>

        <TableBody displayRowCheckbox={false}
                   showRowHover={true}
        >
          {items.map((item) =>
            <TableRow key={item._id}>

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
                const width = field.width;
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
