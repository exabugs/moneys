const I = require('immutable');

const init = I.List([1, 3, 5]);


console.log(init);

const b = init.push(7);

console.log(I.is(init, init));
console.log(I.is(init, b));
console.log(b);
console.log(init);


const ToDoRecord = I.Record({
  text: '',
  val: '',
})

const textVal = I.Record({
  text: 'hellohello',
})

const c = new ToDoRecord({ text: 'action.text' });
console.log(c);

console.log(c.get('text'));
const d = c.set('val', 'hello');
console.log(d);

const e = c.set('val', b);
console.log(e);

const f = c.set('text', new textVal());
console.log(f)
console.log(e.get('text'))
console.log(e.get('text.text'))

// const d = new ToDoRecord({text:'action.text', 'name':'hello'});


// const d = c.set('name', 'hello');
// console.log(c);
console.log(d);

const map1 = I.Map({ 'a': 1 })
const g = new textVal({ 'text': map1 })
console.log(g.get('text'))
console.log(g.getIn(['text', 'a']))
console.log(g.setIn(['text', 'a'], 2))

const h = new textVal({ 'text': init })
console.log(h);
console.log(h.getIn(['text', 0]))


let map2 = I.fromJS({ a: 1, b: { c: 2 } })
console.log(map2);

let book = I.fromJS({
  title: 'Harry Potter & The Goblet of Fire',
  isbn: '0439139600',
  series: 'Harry Potter',
  author: {
    firstName: 'J.K.',
    lastName: 'Rowling'
  },
  genres: [
    'Crime',
    'Fiction',
    'Adventure',
  ],
  storeListings: [
    { storeId: 'amazon', price: 7.95 },
    { storeId: 'barnesnoble', price: 7.95 },
    { storeId: 'biblio', price: 4.99 },
    { storeId: 'bookdepository', price: 11.88 },
  ]
});
console.log(book);
console.log(book.getIn(['genres', 1]));


const key = 'storeListings[1].price';
console.log(book.getIn([key]));

function splitKey(str) {
  // return str.split(/[.\[]/).map(k => /(\d)\]/.test(k) ? Number(RegExp.$1) : k)
 // return str.replace(/\[(\d)\]/g, '.$1').split('.').map(k => /\d/.test(k) ? Number(k) : k);
  return str.replace(/\[(\d)\]/g, '.$1').split('.');
}

console.log(splitKey(key))
console.log(book.getIn(splitKey(key)))

const key2 = 'storeListings';
console.log(book.setIn(splitKey(key2), I.fromJS({ price: 123 })))

console.log(book);
book = book.update('genres', genres => genres.push('Wizards'));
console.log(book);


book = book.updateIn(['genres'], genres => genres.push('Wizards'));
console.log(book);

var map = I.fromJS({
  a: 1,
  b: 2,
  c: {
    d: "asdf"
  }
})

var arr = map.keySeq().toArray()
console.log(arr);