export const DO_ACCESS = 'DO_ACCESS';
export const DO_LOGIN = 'DO_LOGIN';
export const LOGIN_SUCCESS = 'LOGIN_SUCCESS';
export const LOGIN_FAILER = 'LOGIN_FAILER';

export const access = path => ({
  type: DO_ACCESS,
  path,
});

export const login = (userName, password) => ({
  type: DO_LOGIN,
  userName,
  password,
});

export const loginSuccess = (params) => {
  const { IdentityId, Token, userName, name, token, primaryGroup } = params;
  return {
    type: LOGIN_SUCCESS,
    IdentityId, // Cognito
    Token, // Cognito
    token, // JCOMSurvey token
    userName,
    name,
    primaryGroup,
  };
};

export const loginFailer = userName => ({
  type: LOGIN_FAILER,
  userName,
});
