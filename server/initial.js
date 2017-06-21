module.exports = (db, ObjectId, createHmac) => {

  const createdAt = new Date();
  const valid = true;
  const upsert = { upsert: true };


  function createUser(_id, userName, account, primaryGroup, pass) {
    // const _id = ObjectId('5944f4898853b80000000001');
    // const userName = 'test1';
    const password = createHmac(pass);
    db.collection('users').updateOne({ _id }, {
      $setOnInsert: {
        userName,
        account,
        primaryGroup,
        createdAt,
        valid,
      },
    }, upsert);
    const user = { _id, userName };
    db.collection('passwords').updateOne({ 'user._id': _id },
      { $setOnInsert: { password, user, createdAt } }, upsert);
  }

  // 管理者アカウント
  const rootId = ObjectId('000000000000000000000000');

  {
    const _id = rootId;
    const name = 'root';
    db.collection('groups').updateOne({ _id },
      { $setOnInsert: { name, ancestors: [{ _id, name }], createdAt, valid } }, upsert);

    const userName = 'admin';
    const password = '123';
    const primaryGroup = { _id, name };
    createUser(_id, userName, undefined, primaryGroup, password);
  }

  {
    const accountId = ObjectId('5944f4898853b8000000000a');
    const groupId = ObjectId('5944f4898853b8000000000b');
    const name = 'test';
    const key = 'test';
    {
      const _id = accountId;
      db.collection('accounts').updateOne({ _id },
        {
          $setOnInsert: {
            name,
            key,
            image: {
              name: 'jquerywebide_terminal',
              tag: '20170618',
              memory: 100,
              cpu: 100,
            },
            createdAt,
            valid,
          },
        }, upsert);
    }
    {
      const _id = groupId;
      db.collection('groups').updateOne({ _id }, {
        $setOnInsert: {
          name,
          parent: { _id: rootId },
          ancestors: [{ _id: rootId }, { _id, name }],
          createdAt,
          valid,
        },
      }, upsert);
    }

    const account = { _id: accountId, name, key };
    const primaryGroup = { _id: groupId, name };
    {
      const _id = ObjectId('5944f4898853b80000000001');
      const userName = 'test1';
      const password = '123';

      createUser(_id, userName, account, primaryGroup, password);
    }
    {
      const _id = ObjectId('5944f4898853b80000000002');
      const userName = 'test2';
      const password = '123';

      createUser(_id, userName, account, primaryGroup, password);
    }
  }
};
