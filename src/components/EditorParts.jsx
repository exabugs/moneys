import React from 'react';

import { Table, TableBody, TableRow, TableRowColumn } from 'material-ui/Table';

import IconButton from 'material-ui/IconButton';

import { FormattedMessage } from 'react-intl';
// import MaterialUIAutoComplete from 'material-ui/AutoComplete';


import Dropzone from 'react-dropzone';
import _ from 'underscore';

import { Field, FieldArray } from 'redux-form';
import MenuItem from 'material-ui/MenuItem'
import { RadioButton } from 'material-ui/RadioButton';
import AC from 'material-ui/AutoComplete';
import numeral from 'numeral';

import {
  AutoComplete,
  RadioButtonGroup,
  SelectField,
  TextField,
  DatePicker,
  TimePicker,
  Slider,
  Toggle
} from 'redux-form-material-ui';
import { getValue } from '../util';
import icons from './icons';


// import AutoComplete from './MaterialUIAutocomplete';


// import Timezone from './parts/timezone';

// import TextField from 'material-ui/TextField';
// import {RadioButton, RadioButtonGroup} from 'material-ui/RadioButton';
// import RaisedButton from 'material-ui/RaisedButton';
// import Checkbox from 'material-ui/Checkbox';
// import DatePicker from 'material-ui/DatePicker';
// import TimePicker from 'material-ui/TimePicker';
// import {List, ListItem} from 'material-ui/List';
// import ContentInbox from 'material-ui/svg-icons/content/inbox';

//import timezone from './parts/timezone.json';
import items from '../config/items';

//onUpdateInput={props.onChange}

// const AutoComplete = props => (
//   <MaterialUIAutoComplete
//     {..._.omit(props, 'input', 'meta')}
//     searchText={props.input.value}
//   />
// );


const styles = {
  table: {
    border: 'solid 0px #f3f3f3',
    borderRightWidth: 1,
    borderSpacing: 0,
  },
  td: {
    padding: 0,
  },
  action: {
    margin: 0,
    width: 20,
    padding: 0,
  },
  checkbox: {},
  title_column: {
    backgroundColor: '#E4E7F5',
    width: 120,
  },
  button: {
    margin: 12,
  },
};

// 使い方
// http://erikras.github.io/redux-form-material-ui/

const formattedMessage = (field, item) =>
  <FormattedMessage id={`modules.items.${field.itemsKey}.${item}`} defaultMessage={item} />

const Parts = (props) => {

  const { name, rootinfo, fieldDef } = props;

  const onSelect = (({ fieldDef, name }) => (
    <td>
      <IconButton onClick={rootinfo.handleSubmit(detail =>
        rootinfo.onSelect({ detail, name, fieldDef }))}>
        {icons['file/file-download']}
      </IconButton>
    </td>
  ));

  if (fieldDef.array) {
    return (
      <FieldArray
        name={name}
        rootinfo={rootinfo}
        fieldDefs={fieldDef}
        component={EditorPartArray}
      />
    );
  }

  if (fieldDef.fieldDefs) {
    return (
      <table>
        <tbody>
          <tr>
            <td style={styles.td}>
              <EditorParts
                name={name}
                rootinfo={{ ...rootinfo, readonly: !!fieldDef.selector }}
                fieldDefs={fieldDef}
              />
            </td>
            {fieldDef.selector ? onSelect({ fieldDef, name }) : <td />}
          </tr>
        </tbody>
      </table>
    );
  }

  const itemsKey = fieldDef.itemsKey;

  switch (fieldDef.type) {
    case 'ObjectId':
      return (
        <Field
          name={name}
          component={TextField}
          underlineShow={false}
          disabled={true}
          style={{ width: 400 }}
        />
      );
    case 'TextField':
      return (
        <Field
          name={name}
          component={TextField}
          hintText={fieldDef.key}
          style={{ width: 400, height: 56, margin: 2 }}
          underlineShow={!rootinfo.readonly}
          disabled={rootinfo.readonly}
        />
      );
    case 'NumberField':
      return (
        <Field
          name={name}
          component={TextField}
          hintText={fieldDef.key}
          style={{ width: 200, height: 56, margin: 2 }}
          underlineShow={!fieldDef.auto}
          inputStyle={{ textAlign: 'right' }}
          disabled={!!fieldDef.auto}
          // type="number" // カンマ区切りにしたいので string タイプにする。
          format={v => numeral(v).format(fieldDef.format || '0,0')}
        />
      );
    case 'Location':
      return (
        <Field
          name={name}
          component={TextField}
          hintText={fieldDef.key}
          style={{ width: 600, height: 56, margin: 2 }}
          underlineShow={!rootinfo.readonly}
          disabled={rootinfo.readonly}
        />
      );
    case 'TextArea':
      return (
        <Field
          name={name}
          component={TextField}
          hintText={fieldDef.key}
          multiLine={true}
          rows={4}
          style={{ width: 600, margin: 2 }}
        />
      );
    case 'Radio':
      return (
        <Field name={name} component={RadioButtonGroup}>
          {items[itemsKey].map(item => (
            <RadioButton key={item} value={item} label={formattedMessage(fieldDef, item)} />
          ))}
        </Field>
      );
    case 'Date':
      return (
        <Field name={name} component={DatePicker} hintText={fieldDef.key} container="inline" mode="landscape" />
      );
    case 'DateTime':
      return (
        <div>
          <Field name={name} component={DatePicker} hintText={fieldDef.key} container="inline" mode="landscape" />
          <Field name={name} component={TimePicker} hintText={fieldDef.key} container="inline" mode="landscape" />
        </div>
      );
    case 'AutoComplete':
      return (
        <Field name={name} component={AutoComplete} hintText={name}
               maxSearchResults={20}
               filter={AC.caseInsensitiveFilter}
               dataSource={items[itemsKey]}
        />
      );
    case 'SelectField':
      return (
        <Field name={name} component={SelectField} hintText={name}
               style={{ position: 'relative', top: 10 }}
        >
          {getValue(items, itemsKey).map(item => (
            <MenuItem key={item} value={item} primaryText={formattedMessage(fieldDef, item)} />
          ))}
        </Field>
      );
    case 'Slider':
      return (
        <table>
          <tbody>
            <tr>
              <td>
                <Field {...fieldDef.props} name={name} component={Slider}
                       style={{ width: 500, height: 32, margin: 0, marginRight: 10 }} />
              </td>
              <td>
                <Field underlineShow={true} name={name} component={TextField} disabled={false}
                       style={{ width: 90 }} inputStyle={{ textAlign: 'right' }}
                       format={v => numeral(v).format('0,0')}
                />
              </td>
            </tr>
          </tbody>
        </table>
      );
    case 'Toggle':
      return (
        <Field name={name} component={Toggle} />
      );
    case 'File':
      return (
        <Dropzone onDrop={rootinfo.onDrop} />
      );
    default:
      return <h4>invalid type</h4>;
  }
};

const EditorPartArray = ({ name, rootinfo, fieldDefs, fields }) => {
  const onAdd = (fields => (
    <td>
      <IconButton onClick={() => fields.push()}>
        {icons['content/add']}
      </IconButton>
    </td>
  ));
  const onDown = ((fields, index) => (
    <td>
      <IconButton onClick={() => fields.swap(index + 1, index)}>
        {icons['navigation/downward']}
      </IconButton>
    </td>
  ));
  return (
    <table style={styles.table}>
      <tbody>
        <tr>
          {fields.length === 0 ? onAdd(fields) : <td />}
        </tr>
        {fields.map((field, index) => (
          <tr key={index}>
            <td style={styles.td}>
              <Parts
                name={field}
                rootinfo={rootinfo}
                fieldDef={_.omit(fieldDefs, 'array')}
              />
            </td>
            <td style={styles.td}>
              <IconButton onClick={() => fields.remove(index)}>{icons['content/clear']}</IconButton>
            </td>
            {index === fields.length - 1 ? onAdd(fields) : onDown(fields, index)}
          </tr>
        ))}
      </tbody>
    </table>
  );
};

const EditorParts = (props) => {
  const { name, rootinfo, fieldDefs, fields } = props;
  const { error } = rootinfo;
  return (
    <Table style={styles.table} selectable={false}>
      <TableBody displayRowCheckbox={false}>
        {fieldDefs.fieldDefs.map((fieldDef, index) => {
          if (fieldDef.visible === false) {
            return '';
          }
          return (
            <TableRow key={index}>
              <TableRowColumn style={styles.title_column}>
                <FormattedMessage id={
                  `modules.modules.${fieldDef.titleGroup || fieldDefs.collection}.${fieldDef.title || fieldDef.key}`
                } />
              </TableRowColumn>
              <TableRowColumn>
                <table>
                  <tbody>
                    <tr>
                      <td>
                        <Parts
                          name={name ? [name, fieldDef.key].join('.') : fieldDef.key}
                          rootinfo={rootinfo}
                          fieldDef={fieldDef}
                        />
                      </td>
                      <td style={{ marginLeft: 3 }}>
                        {fieldDef.unit ? <FormattedMessage id={`modules.unit.${fieldDef.unit}`} /> : ''}
                      </td>
                      <td style={{ marginLeft: 20 }}>
                        <div>
                          {fieldDef.description ? <FormattedMessage
                            id={`modules.modules.${fieldDefs.collection}.${fieldDef.description}`} /> : ''}
                        </div>
                        <div style={{ color: 'red' }}>
                          {error && error[fieldDef.key] ? error[fieldDef.key].map(key => (
                            <div key={key}><FormattedMessage
                              id={`modules.modules.${fieldDefs.collection}.${key}`} /></div>)) : ''}
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </TableRowColumn>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
};

export default EditorParts;
