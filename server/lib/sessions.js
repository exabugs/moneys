const crypto = require('crypto');

const Bearer = 'Bearer';

const ERROR_REALM = { type: Bearer, status: 401, text: 'realm="survey"' };
const ERROR_INVALID_TOKEN = { type: Bearer, status: 401, text: 'error="invalid_token"' };

class Session {

  constructor(sessions) {
    this.sessions = sessions; // Collection. Set after DB connect succeeded.
    this.tokenLength = 32;
    this.tokenValidity = 24 * 60 * 60 * 1000; // 24h
  }

  // Create session.
  create(user, client) {
    return new Promise((resolve, reject) => {
      if (!user) {
        reject(ERROR_REALM);
      } else {
        const token = crypto.randomBytes(this.tokenLength).toString('hex');
        const expires = new Date(Date.now() + this.tokenValidity);
        const session = { _id: token, user, client, expires };
        this.sessions.insertOne(session, (err) => {
          if (err) {
            reject(err);
          } else {
            resolve({ token_type: Bearer, token });
          }
        });
      }
    });
  }

  // Verify Authorization header.
  verify(authorization) {
    return new Promise((resolve, reject) => {
      if (!authorization) {
        reject(ERROR_REALM);
      } else {
        const token = authorization.split(' ')[1];
        if (!token) {
          reject(ERROR_INVALID_TOKEN);
        } else {
          resolve(this.find(token));
        }
      }
    });
  }

  // Find Token.
  find(token) {
    return new Promise((resolve, reject) => {
      this.sessions.findOne({ _id: token }, (err, session) => {
        if (err || !session) {
          reject(ERROR_INVALID_TOKEN);
        } else if (!session.expires || session.expires < (new Date())) {
          reject(ERROR_INVALID_TOKEN);
        } else {
          resolve(session);
        }
      });
    });
  }

  // Express error handler
  static handleError(err, req, res, next) {
    if (err.type === Bearer) {
      console.log(err.text);
      res.append('WWW-Authenticate', [Bearer, err.text].join(' '));
      res.sendStatus(err.status);
    } else {
      next(err);
    }
  }
}

module.exports = Session;