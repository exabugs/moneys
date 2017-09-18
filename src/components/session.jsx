import React, { PropTypes } from 'react';
import { reduxForm, Field } from 'redux-form';
import RaisedButton from 'material-ui/RaisedButton';
import { TextField } from 'redux-form-material-ui';
import Snackbar from 'material-ui/Snackbar';

const styles = {
  button: {
    width: 250,
    margin: 2,
  },
  login: {
    float: 'none',
    width: 250,
    marginTop: 50,
    marginLeft: 'auto',
    marginRight: 'auto',
  },
  field: {
    width: 250,
    margin: 2,
  },
  hr: {
    color: 'white',
    width: '100%',
    height: 1,
    marginBotton: 0,
  },
  copyright: {
    textAlign: 'center',
    fontSize: 9,
  },
};

const copyright = '(c) 2017 ShonanBlue Corp. All right reserved.';

const Session = (props) => {
  const { onLogin, state } = props;
  const { handleSubmit, pristine, submitting } = props;
  return (
    <div>
      <hr style={styles.hr} />
      <form style={styles.login}>
        <Field style={styles.field} name="userName" component={TextField} hintText="userName" /><br />
        <Field style={styles.field} name="password" component={TextField} hintText="password" /><br />
        <RaisedButton
          primary={true}
          style={styles.button}
          disabled={pristine || submitting}
          label="Sign In" onClick={handleSubmit(onLogin)}
        />
      </form>
      <hr style={styles.hr} />
      <div style={styles.copyright}>{copyright}</div>
      <Snackbar
        open={!state}
        message="Sign in Failed.."
        autoHideDuration={4000}
      />
    </div>
  );
};

Session.propTypes = {
  onLogin: PropTypes.func.isRequired,
  handleSubmit: PropTypes.func.isRequired,
  pristine: PropTypes.bool.isRequired,
  submitting: PropTypes.bool.isRequired,
};

// Decorate with redux-form
export default reduxForm({ form: 'mySession' })(Session);

