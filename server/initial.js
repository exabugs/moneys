module.exports = (db, ObjectId, createHmac) => {
// 管理者アカウント
  const createdAt = new Date();
  const valid = true;
  const upsert = { upsert: true };
  const rootId = ObjectId('000000000000000000000000');

  {
    const _id = rootId;
    const name = 'root';
    const userName = 'admin';
    const password = createHmac('123');
    db.collection('groups').updateOne({ _id },
      { $setOnInsert: { name, ancestors: [{ _id, name }], createdAt, valid } }, upsert);

    db.collection('users').updateOne({ _id },
      { $setOnInsert: { userName, primaryGroup: { _id, name }, createdAt, valid } }, upsert);
    db.collection('passwords').updateOne({ userName },
      { $setOnInsert: { password, createdAt, valid } }, upsert);
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
      const password = createHmac('123');
      db.collection('users').updateOne({ _id }, {
        $setOnInsert: {
          userName,
          account,
          primaryGroup,
          createdAt,
          valid,
        },
      }, upsert);
      db.collection('passwords').updateOne({ userName },
        { $setOnInsert: { password, createdAt } }, upsert);
    }
    {
      const _id = ObjectId('5944f4898853b80000000002');
      const userName = 'test2';
      const password = createHmac('123');
      db.collection('users').updateOne({ _id }, {
        $setOnInsert: {
          userName,
          account,
          primaryGroup,
          createdAt,
          valid,
        },
      }, upsert);
      db.collection('passwords').updateOne({ userName },
        { $setOnInsert: { password, createdAt } }, upsert);
    }
  }
};
