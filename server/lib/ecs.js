const AWS = require('aws-sdk');
const mongodb = require('mongodb');
const _ = require('underscore');
const async = require('async');

const { ObjectId } = mongodb;

const CredentialProvider = new AWS.CredentialProviderChain();
const CF = new AWS.CloudFormation({ CredentialProvider });
const ECS = new AWS.ECS({ CredentialProvider });
const ECR = new AWS.ECR({ CredentialProvider });


class ECSManager {

  constructor(db, subscribe) {
    this.db = {
      accounts: db.collection('accounts'),
      users: db.collection('users'),
    };
    subscribe('update', 'users', this.onUpdateUser, this);
    subscribe('remove', 'users', this.onRemoveUser, this);
    subscribe('update', 'accounts', this.onUpdateAccount, this);
    subscribe('remove', 'accounts', this.onRemoveAccount, this);
    subscribe('login', 'sessions', this.onLogin, this);
  }

  initialize(cluster, callback) {
    this.params = {
      Cluster: cluster,
      Region: process.env.AWS_REGION,
      Domain: false,
      AccountId: false,
      ALB: false,
    };
    this.listExports(this.params, cluster, undefined, (err) => {
      callback(err, this.params);
    });
  }

  // CloudFormation で用意されている値を取得する
  // aws からは以下の形式で取得できる
  //   Name: <クラスタ名>-<キー名>
  //   Value: 値
  listExports(map, cluster, NextToken, callback) {
    CF.listExports({ NextToken }, (err, data) => {
      if (err) {
        callback(err);
      } else {
        data.Exports.forEach(obj => {
          const info = obj.Name.split('-', 2);
          if (info[0] === cluster && map[info[1]] !== undefined) {
            map[info[1]] = obj.Value;
          }
        });
        if (data.NextToken) {
          setImmediate(this.listExports(map, cluster, data.NextToken, callback));
        } else {
          callback(null);
        }
      }
    });
  }

  // accounts 更新
  onUpdateAccount(account, callback) {
    // account (契約) のイメージが更新された。
    // イメージの最新バージョンでタスクを全て更新する
  }

  // accounts 削除
  onRemoveAccount(account, callback) {

  }

  // users 更新
  onUpdateUser(user, callback) {
    // タスク追加
    this.createTask(user, (err, data) => {
      // 旧バージョンのタスク削除
      // : data.taskDefinition.family
      this.deleteTask(user, 2, (err) => {
        callback(err, user);
      });
    });
  }

  // users 削除
  onRemoveUser(user, callback) {
    // タスク削除 (全バージョン)
    this.deleteTask(user, 0, (err) => {
      callback(err, user);
    });
  }

  // ログイン
  onLogin(session, callback) {
    // 必要数が 2 なら、何もしない
    // サービスが存在するなら、必要数 2 、タスク定義 最新 に更新する
    // サービスが存在しないなら、サービス作成
    this.db.users.findOne({ _id: session.user._id }, (err, user) => {
      if (err) {
        callback(err);
      } else if (!user.account) {
        return callback(null, session);
      } else {
        const desiredCount = 2;
        this.updateService(user, { desiredCount }, (err) => {
          if (err) {
            this.createService(user, { desiredCount }, (err) => {
              callback(err, session);
            });
          } else {
            callback(err, session);
          }
        });
      }
    });
  }

  // ログアウト
  onLogout(session, callback) {
    // 必要数 0 に更新する
    callback(null, session);
  }

  cleanUp() {
    // 必要数が0, 実行数が0 なら サービス削除
    // タスクは最新だけ残して、他は削除
  }

  //

  // Task
  familyPrefix(item) {
    return [item.account.key, item.userName].join('_');
  }

  image(item, callback) {
    this.db.accounts.findOne({ _id: item.account._id }, (err, result) => {
      callback(err, result.image);
    });
  }

  createTask(user, callback) {
    async.waterfall([
      (next) => {
        this.image(user, next);
      },
      (image, next) => {
        const ecrurl = [this.params.AccountId, 'dkr', ECR.endpoint.host].join('.');
        const name = this.familyPrefix(user);
        const task = {
          family: name,
          networkMode: 'bridge',
          containerDefinitions: [
            {
              name,
              image: `${ecrurl}/${image.name}:${image.tag}`,
              memory: image.memory,
              cpu: image.cpu,
              logConfiguration: {
                logDriver: 'awslogs',
                options: {
                  'awslogs-group': this.params.Cluster,
                  'awslogs-region': this.params.Region,
                  'awslogs-stream-prefix': this.params.Cluster,
                },
              },
              mountPoints: [
                { containerPath: '/data', sourceVolume: 'USER_DATA' },
              ],
              environment: [
                { name: 'PORT', value: '4000' },
              ],
              portMappings: [
                { containerPort: 4000, protocol: 'tcp' },
              ],
              // user: 'STRING_VALUE',
              dnsSearchDomains: [this.params.Domain],
            },
          ],
          volumes: [
            {
              host: { sourcePath: `/data/${user.account.key}/${user.userName}` },
              name: 'USER_DATA',
            },
          ],
        };
        ECS.registerTaskDefinition(task, (err, data) => {
          next(err, data);
        });
      },
      (data, next) => {
        // サービスのタスク定義を更新
        const param = { taskDefinition: data.taskDefinition.taskDefinitionArn };
        this.updateService(user, param, (err) => {
          if (err && err.code === 'ServiceNotFoundException') {
            next(null, data);
          } else {
            next(err, data);
          }
        });
      },
    ], (err, data) => {
      callback(err, data);
    });
  }

  deleteTask(item, n, callback) {
    const params = { familyPrefix: this.familyPrefix(item) };
    ECS.listTaskDefinitions(params, (err, data) => {
      const arns = data.taskDefinitionArns;
      for (let i = 0; i < n; i += 1) {
        arns.pop();
      }
      async.eachSeries(arns, (arn, next) => {
        const params = { taskDefinition: arn };
        ECS.deregisterTaskDefinition(params, (err, data) => {
          next(err);
        });
      }, (err) => {
        callback(err);
      });
    });
  }

  // listTask(item, callback) {
  //   const params = {
  //     familyPrefix: this.familyPrefix(item),
  //     sort: 'DESC',
  //   };
  //
  //   ecs.listTaskDefinitions(params, (err, data) => {
  //     if (err) {
  //       callback(err);
  //     } else {
  //       callback(err, data.taskDefinitionArns[0]);
  //     }
  //   });
  // }

  listServices(item, callback) {
    // service arn
    // arn:aws:ecs:ap-northeast-1:663889673734:service/frontend-ECSTerminalService-UV3UFS2J2XG0

    var params = {
      cluster: this.params.Cluster,
    };
    ECS.listServices(params, (err, data) => {

      const params = { familyPrefix: familyPrefix(item) };

      ECS.listTaskDefinitions(params, (err, data) => {
        //   callback(null);
        // });

        // var params = {
        //   taskDefinition: "hello_world:8"
        // };
        // ecs.describeTaskDefinition(params, (err, data) => {


      });
    });
  }


  updateService(user, { desiredCount, taskDefinition }, callback) {
    const params = {
      cluster: this.params.Cluster,
      service: this.familyPrefix(user),
      desiredCount,
      taskDefinition,
    };
    ECS.updateService(params, (err, data) => {
      console.log(JSON.stringify(data));
      callback(err, data);
    });
  }

  createService(item, { desiredCount }, callback) {

    const params = {
      cluster: this.params.Cluster,
      desiredCount,
      serviceName: this.familyPrefix(item),
      taskDefinition: this.familyPrefix(item),
      clientToken: item._id.toString(),

      // deploymentConfiguration: {
      //   maximumPercent: 0,
      //   minimumHealthyPercent: 0
      // },

      // loadBalancers: [
      //   {
      //     containerName: 'STRING_VALUE',
      //     containerPort: 0,
      //     loadBalancerName: 'STRING_VALUE',
      //     targetGroupArn: 'STRING_VALUE'
      //   },
      //   /* more items */
      // ],

      // placementConstraints: [
      //   {
      //     expression: 'STRING_VALUE',
      //     type: distinctInstance | memberOf
      //   },
      //   /* more items */
      // ],
      // placementStrategy: [
      //   {
      //     field: 'STRING_VALUE',
      //     type: random | spread | binpack
      //   },
      //   /* more items */
      // ],

      // Role is required when configuring load-balancers for service
      // role: 'STRING_VALUE'
    };
    ECS.createService(params, (err, data) => {
      callback(err, data);
    });
  }

  deleteService(item, callback) {

  }

}
module.exports = ECSManager;
