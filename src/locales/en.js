import { flatten } from '../util';
import menu from './menu/en.json';
import modules from './modules/en';

const locale = {
  menu,
  modules,
};

export default flatten(locale);
