import React, { Component } from 'react';
import { Router, Route, IndexRoute, browserHistory } from 'react-router';
import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider';
import getMuiTheme from 'material-ui/styles/getMuiTheme';
import injectTapEventPlugin from 'react-tap-event-plugin';
import { Provider } from 'react-redux';
import { createStore, combineReducers, applyMiddleware, compose } from 'redux';
import { IntlProvider, intlReducer } from 'react-intl-redux';
import { syncHistoryWithStore, routerReducer } from 'react-router-redux';
import createSagaMiddleware from 'redux-saga';
import { reducer as formReducer } from 'redux-form';
import persistState from 'redux-localstorage';

import { fade } from 'material-ui/utils/colorManipulator';
import { darkBlack } from 'material-ui/styles/colors';

import rootSaga from './sagas';

import Home from './components/Home';
import Content from './components/Content';
import About from './components/About';
import Help from './components/Help';
import NotFound from './components/NotFound';

import locale_en from './locales/en';

// Session 関連
import SessionContainer from './containers/session';
import SessionReducer from './reducers/session';
import { access } from './actions/session';

// Menu 関連
import MenuContainer from './containers/menu';
import MenuReducer from './reducers/menu';

// List 関連
import ListContainer from './containers/list';
import ListReducer from './reducers/list';
import { clear, setCollection, loadNext, initOwner } from './actions/list';

// Detail 関連
import DetailContainer from './containers/detail';
import DetailReducer from './reducers/detail';
import { loadDetail, doneSelect } from './actions/detail';


// http://qiita.com/usagi-f/items/24418c50faa6a5931ba8
const muiTheme = getMuiTheme({
  appBar: {
    height: 56, // Instead of 64
  },
  palette: {
    primary1Color: '#3F51B5',
    primary2Color: '#606FC7',
    primary3Color: '#8691D4',
    disabledColor: fade(darkBlack, 0.6),
  },
});

const sagaMiddleware = createSagaMiddleware();


const reducer = combineReducers({
  session: SessionReducer,
  menu: MenuReducer,
  list: ListReducer,
  detail: DetailReducer,
  form: formReducer,     // <---- Mounted at 'form'
  routing: routerReducer,
  intl: intlReducer,
});

const enhancer = compose(
  /* [middlewares] */
  applyMiddleware(sagaMiddleware),
  persistState(['session']),
);

const initialState = {
  intl: {
    locale: 'en',
    messages: locale_en,
  },
  // ...other initialState
};

const store = createStore(
  reducer,
  initialState,
  enhancer,
);

sagaMiddleware.run(rootSaga);

const history = syncHistoryWithStore(browserHistory, store);

injectTapEventPlugin();

const verifySession = (next, replace) => {
  store.dispatch(access(next.location.pathname));
  const session = store.getState().session;
  if (!session.state) {
    replace('/signin');
  }
};

const clearItemsHandler = (next) => {
  store.dispatch(clear());
  const collection = next.params.collection;
  store.dispatch(setCollection({ collection }));

  const { list, session } = store.getState();

  if (list.owner[collection]) {
    store.dispatch(loadNext({ collection }));
  } else {
    const primaryGroup = list.primaryGroup || session.primaryGroup;
    store.dispatch(initOwner({ collection, primaryGroup }));
  }
};

const clearDetailHandler = (next) => {
  const detail = store.getState().detail;
  if (next.location.action === 'POP' && detail.name) {
    // 選択ダイアログからの戻り
    store.dispatch(doneSelect(next.params));
  } else {
    store.dispatch(loadDetail(next.params));
  }
};

class App extends Component {
  render() {
    return (
      <Provider store={store}>
        <IntlProvider>
          <MuiThemeProvider muiTheme={muiTheme}>
            <Router history={history}>
              <Route path="/signin" component={SessionContainer} />
              <Route path="/" component={MenuContainer} onEnter={verifySession}>
                <IndexRoute component={Home} />
                <Route path="home" component={Home} />
                <Route path="content" component={Content} />
                <Route path="modules" component={Content}>
                  <Route
                    mode="list"
                    path=":collection"
                    component={ListContainer}
                    onEnter={clearItemsHandler}
                  />
                  <Route
                    path=":collection/:id"
                    component={DetailContainer}
                    onEnter={clearDetailHandler}
                  />
                </Route>
                <Route path="select" component={Content}>
                  <Route
                    mode="select"
                    path=":collection"
                    component={ListContainer}
                    onEnter={clearItemsHandler}
                  />
                </Route>
                <Route path="help" component={Help} />
                <Route path="about" component={About} />
              </Route>
              <Route path="*" component={NotFound} />
            </Router>
          </MuiThemeProvider>
        </IntlProvider>
      </Provider>
    );
  }
}

export default App;


// immutable.js
// Nested Structures
// getIn / setIn / updateIn / mergeDeep
// https://facebook.github.io/immutable-js/

// const key = 'storeListings[1].price';
// function splitKey(str) {
//   return str.replace(/\[(\d)\]/g, '.$1').split('.');
// }
// console.log(book.getIn(splitKey(key)))

// Reactの再レンダリングをなるべく減らす
// http://blog.aqutras.com/entry/2016/06/23/210000
