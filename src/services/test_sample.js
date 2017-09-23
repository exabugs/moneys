const data = {
  users: [
    {
      _id: '58d381ada749de2aa4000000',
      name: '小泉',
      userName: 'koizumi',
      email: 'koizumi@shonanblue.ne.jp',
      valid: true,
    },
    {
      _id: '58d381ada749de2aa4000001',
      name: '櫻井',
      userName: 'sakurai',
      email: 'exabugs@gmail.com',
      valid: true,
    },
  ],
  passwords: [
    {
      _id: '58d381ada749de2aa4000000',
      user: {
        _id: '58d381ada749de2aa4000000',
        userName: 'koizumi',
      },
      password: '01d0c6e4b4c5f3bc98e747debf74e040c89fb746185403fbe287287c87c54371', // 123
    },
    {
      _id: '58d381ada749de2aa4000001',
      user: {
        _id: '58d381ada749de2aa4000001',
        userName: 'sakurai',
      },
      password: '01d0c6e4b4c5f3bc98e747debf74e040c89fb746185403fbe287287c87c54371', // 123
    },
  ],
  customers: [
    {
      _id: '58d381ada749de2aa5000000',
      name: '櫻井',
      tel: '045-903-0435',
      postcode: '225-0001',
      address: '横浜市青葉区美しが丘西',
      valid: true,
    },
  ],
  claims: [
    {
      _id: '58d381ada749de2aa5000001',
      customer: {
        _id: '58d381ada749de2aa5000000',
        name: '櫻井',
      },
      date: new Date(),
      product: '家賃',
      productDetail: '',
      billing: 200000,
      discount: 100000,
      advance: 50000,
      status: 'completed',
    },
    {
      _id: '58d381ada749de2aa5000002',
      customer: {
        _id: '58d381ada749de2aa5000000',
        name: '櫻井',
      },
      date: new Date(),
      product: '工事費',
      productDetail: '水道工事',
      billing: 110000,
      discount: 10000,
      advance: 40000,
      status: 'incomplete',
    },
  ],
};

module.exports = Object.keys(data).reduce((m, k) => {
  m[k] = data[k].reduce((m, v) => {
    m[v._id] = v;
    return m;
  }, {});
  return m;
}, {});
