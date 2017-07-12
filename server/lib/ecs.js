const AWS = require('aws-sdk');
const mongodb = require('mongodb');
const _ = require('underscore');
const async = require('async');
const fs = require('fs-extra')

const { ObjectId } = mongodb;

const CredentialProvider = new AWS.CredentialProviderChain();
const CF = new AWS.CloudFormation({ CredentialProvider });
const ECS = new AWS.ECS({ CredentialProvider });
const ECR = new AWS.ECR({ CredentialProvider });
const ELB = new AWS.ELBv2({ CredentialProvider });

// const S3 = new AWS.S3({ CredentialProvider });
// const SG = new AWS.StorageGateway({ CredentialProvider });

// - NFS の ディレクトリ名  AmazonS3 > frontend-nfs-11653ya3x556k > webideadmin > test > test1
// - サービス名 '_'  webideadmin_test_test1_4e4ef2f7f5ddf9c603d099a01ad18e72
// − タスク名 (familyPrefix) '_'   webideadmin_test_test1
// - ターゲットグループ名 '-' 最大32文字 webideadmin-test-test1
const APP = 'webideadmin';

// value で指定される path をもつルールを削除する
const deleteRule = (ListenerArn, value, callback, Marker) => {
  const params = { ListenerArn, Marker };
  ELB.describeRules(params, (err, data) => {
    if (err) {
      callback(err);
    } else {
      async.eachSeries(data.Rules, (rule, next) => {
        const condiiton = rule.Conditions[0];
        if (condiiton && condiiton.Values[0] === value) {
          ELB.deleteRule({ RuleArn: rule.RuleArn }, (err2) => {
            next(err2);
          });
        } else {
          next(null);
        }
      }, (err3) => {
        if (data && data.Marker) {
          deleteRule(ListenerArn, value, callback, data.Marker);
        } else {
          callback(err3);
        }
      });
    }
  });
};

class ECSManager {

  // Bucket
  bucketKey(account, user) {
    const array = [APP, account.key];
    user && array.push(user.userName);
    // 末尾の / は タスク定義の volume では必要なし。
    // (S3でディレクトリを作成する場合には必要)
    // array.push('');
    return array.join('/');
  }

  //
  // mount_nfs -o vers=3,nolock -v 13.112.217.50:/jp.co.dreamarts.jcomsurvey-sakurai nfs
  //
  bucketCreateFolder(account, user, callback) {
    // const params = {
    //   Bucket: this.params.Bucket,
    //   // Key: `${account.key}/${user.userName}/`,
    //   Key: this.bucketKey(account, user),
    // };
    // S3.putObject(params, (err) => {
    //   if (err) {
    //     console.log(err);
    //     callback(err);
    //   } else {
    //     const FileShareARN = 'arn:aws:storagegateway:ap-northeast-1:663889673734:share/share-EE9E7D8C';
    //     SG.refreshCache({ FileShareARN }, (err) => {
    //       err && console.log(err);
    //       callback(err);
    //     });
    //   }
    // });
    const dir = [this.params.LocalNFS, this.bucketKey(account, user)].join('/');
    fs.ensureDir(dir, (err) => {
      callback(err);
    });
  }

  constructor(db, subscribe) {
    this.db = {
      accounts: db.collection('accounts'),
      users: db.collection('users'),
      sessions: db.collection('sessions'),
    };
    subscribe('update', 'users', this.onUpdateUser, this);
    subscribe('remove', 'users', this.onRemoveUser, this);
    subscribe('update', 'accounts', this.onUpdateAccount, this);
    subscribe('remove', 'accounts', this.onRemoveAccount, this);
    subscribe('login', 'sessions', this.onLogin, this);
    subscribe('logout', 'sessions', this.onLogout, this);
  }

  // arn:aws:elasticloadbalancing:region:account-id:loadbalancer/app/load-balancer-name/load-balancer-id
  // arn:aws:elasticloadbalancing:region:account-id:listener/app/load-balancer-name/load-balancer-id/listener-id
  // arn:aws:elasticloadbalancing:region:account-id:listener-rule/app/load-balancer-name/load-balancer-id/listener-id/rule-id
  // arn:aws:elasticloadbalancing:region:account-id:targetgroup/target-group-name/target-group-id
  initialize(cluster, callback) {
    this.params = {
      Cluster: cluster,
      VpcId: false,
      Region: process.env.AWS_REGION,
      Domain: false,
      AccountId: false,

      // accountと 1to1 で
      ALB: 'front-Appli-1WZI69SAUQ9ZV',
      ListenerArn: 'arn:aws:elasticloadbalancing:ap-northeast-1:663889673734:listener/app/front-Appli-1WZI69SAUQ9ZV/acd8db52418b2c0b/548652979afddbdb',

      ECSServiceRole: false,
      NFS: false, // StorageGW で提供される NFS
      MountNFS: false, // 開発ローカル NFSマウント
      LocalNFS: `${__dirname}/../../nfs`, // ローカルNFSマウントポイント (自信がvolumeで与えられる)
    };
    this.listExports(this.params, cluster, undefined, (err) => {

      const cmd = `mount_nfs -o vers=3,nolock -v ${this.params.MountNFS} ${this.params.LocalNFS}`;
      console.log(cmd);

      callback(err, this.params);
    });

    setInterval(() => {
      this.listServices(undefined, (err) => {
        err && console.log(err);
      });
    }, 10 * 1000);
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
    async.waterfall([
      (next) => {
        this.bucketCreateFolder(account, null, (err) => {
          next(err);
        });
      },
      (next) => {
        // account (契約) のイメージが更新された。
        // イメージの最新バージョンでタスクを全て更新する
        const cond = { 'account._id': account._id };
        this.db.users.find(cond).toArray((err, users) => {
          if (err) {
            callback(err);
          } else {
            async.eachSeries(users, (user, next) => {
              this.createTask({ account, user }, (err) => {
                err && console.log(err);
                next(err);
              });
            }, (err) => {
              next(err);
            });
          }
        });
      },
    ], (err) => {
      callback(err);
    });
  }

  // accounts 削除
  onRemoveAccount(account, callback) {

  }

  // users 更新
  onUpdateUser(user, callback) {
    const account = user.account;
    if (!account) {
      callback(null);
    } else {
      async.waterfall([
        (next) => {
          this.bucketCreateFolder(account, user, (err) => {
            next(err);
          });
        },
        (next) => {
          // タスク追加
          this.createTask({ account, user }, (err) => {
            // 旧バージョンのタスク削除
            // : data.taskDefinition.family
            if (err) {
              next(err);
            } else {
              this.deleteTask({ account, user }, 2, (err) => {
                next(err);
              });
            }
          });
        },
        (next) => {
          // ターゲットグループ
          this.createTargetGroup({ account, user }, (err, data) => {
            if (err) {
              next(err);
            } else {
              // ターゲットグループARN を記憶しておく
              const targetGroup = data.TargetGroupArn.split('/').slice(-2).join('/');
              const _id = user._id;
              const $set = { targetGroup };
              this.db.users.updateOne({ _id }, { $set }, (err) => {
                next(err);
              });
            }
          });
        },
      ], (err) => {
        callback(err, user);
      });
    }
  }

  // users 削除
  onRemoveUser(user, callback) {
    const account = user.account;
    if (!account) {
      callback(null);
    } else {
      // タスク削除 (全バージョン)
      this.deleteTask(user, 0, (err) => {
        callback(err, user);
      });
    }
  }

  // ログイン
  onLogin(session, callback) {
    // 必要数が 2 なら、何もしない
    // サービスが存在するなら、必要数 2 、タスク定義 最新 に更新する
    // サービスが存在しないなら、サービス作成
    if (!session.user || !session.account || !session.account._id) {
      return callback(null, session);
    } else {
      async.waterfall([
        (next) => {
          // Sticky 1s にすれば 2台以上でも大丈夫
          const desiredCount = 2;
          this.updateService(session, { desiredCount }, (err, data) => {
            if (err && err.code === 'ServiceNotFoundException') {
              this.createService(session, { desiredCount }, (err, data) => {
                console.log(err || `Create service : ${session.user.userName}`);
                next(err, data);
              });
            } else {
              console.log(`Update service : ${session.user.userName}`);
              next(err, data);
            }
          });
        },
        (data, next) => {
          const { serviceName } = data.service;
          const { _id } = session;
          const $set = { serviceName };
          this.db.sessions.updateOne({ _id }, { $set }, (err) => {
            next(err);
          });
        },
      ], (err) => {
        callback(err);
      });
    }
  }

  // ログアウト
  onLogout(session, callback) {
    // 必要数 0 に更新する
    if (!session.user || !session.account || !session.serviceName) {
      return callback(null, session);
    } else {
      async.waterfall([
        (next) => {
          this.purgeService(session.serviceName, (err) => {
            next(err);
          });
        },
        (next) => {
          const { _id } = session;
          const $unset = { serviceName: 1 };
          this.db.sessions.updateOne({ _id }, { $unset }, (err) => {
            next(err);
          });
        },
      ], (err) => {
        callback(err);
      });
    }
  }

  // Service
  serviceName({ account, user, _id }) {
    return [APP, account.key, user.userName, _id].join('_');
  }

  // Task
  familyPrefix({ account, user }) {
    return [APP, account.key, user.userName].join('_');
  }

  image({ account }, callback) {
    this.db.accounts.findOne({ _id: account._id }, (err, result) => {
      callback(err, result.image);
    });
  }

  createTask({ account, user }, callback) {
    async.waterfall([
      (next) => {
        if (account) {
          this.image({ account }, next);
        } else {
          next('NO ACCOUNT');
        }
      },
      (image, next) => {
        const ecrurl = [this.params.AccountId, 'dkr', ECR.endpoint.host].join('.');
        const name = this.familyPrefix({ account, user });
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
                { name: 'PORT', value: '4000' }, // Value must be string.
                { name: 'CONTEXT', value: `/${account.key}/${user.userName}` },
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
              host: { sourcePath: `${this.params.NFS}/${this.bucketKey(account, user)}` },
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
        this.updateService({ account, user }, param, (err) => {
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

  deleteTask({ account, user }, n, callback) {
    const params = { familyPrefix: this.familyPrefix({ account, user }) };
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

  // 定期的にサービスをチェックする
  //  - sessions が存在しないなら「必要なタスク」を 0 にする
  //  - 「必要なタスク」が 0 なら、サービス削除
  listServices(nextToken, callback) {
    const params = {
      cluster: this.params.Cluster,
      nextToken,
    };
    ECS.listServices(params, (err, data) => {
      if (err) {
        callback(err);
      } else {
        async.eachSeries(data.serviceArns, (arn, next) => {
          const name = arn.split('/', 2)[1];
          const info = name.split('_');
          if (info.length === 4 && info[0] === APP) {
            const _id = info[3];
            this.db.sessions.findOne({ _id }, (err, session) => {
              if (err) {
                next(err);
              } else if (!session || !session.serviceName) {
                // session がないなら purge する
                this.purgeService(name, next);
              } else {
                next(err);
              }
            });
          } else {
            next(null);
          }
        }, (err) => {
          if (data && data.NextToken) {
            setImmediate(this.listExports(data.NextToken, callback));
          } else {
            callback(err);
          }
        });
      }
    });

    // service arn
    // arn:aws:ecs:ap-northeast-1:663889673734:service/frontend-ECSTerminalService-UV3UFS2J2XG0
  }

  purgeService(serviceName, next) {
    const params = {
      cluster: this.params.Cluster,
      services: [serviceName],
    };
    ECS.describeServices(params, (err, data) => {
      if (err || !data.services.length) {
        next(err);
      } else if (data.services[0].desiredCount === 0) {
        this.deleteService(serviceName, (err) => {
          console.log(`Delete service. : ${serviceName}`);
          next(err);
        });
      } else {
        this.updateService({ serviceName }, { desiredCount: 0 }, (err) => {
          console.log(`DesiredCount set to 0. : ${serviceName}`);
          next(err);
        });
      }
    });
  }


  // 変更操作
  //   必要サービス数 : desiredCount
  //   タスク定義    : taskDefinition
  updateService({ account, user, _id, serviceName }, { desiredCount, taskDefinition }, callback) {
    const params = {
      cluster: this.params.Cluster,
      service: serviceName || this.serviceName({ account, user, _id }),
      desiredCount,
      taskDefinition,
    };
    ECS.updateService(params, (err, data) => {
      // err && console.log(err); // 存在しない場合もある
      callback(err, data);
    });
  }

  targetGroupName({ account, user }) {
    // This name must be unique per region per account, can have a maximum of 32 characters,
    // must contain only alphanumeric characters or hyphens, and must not begin or end with a hyphen.
    return [APP, account.key, user.userName].join('-');
  }

  createTargetGroup({ account, user }, callback) {
    const path = `/${account.key}/${user.userName}/`;
    async.waterfall([
      (next) => {
        const params = {
          Name: this.targetGroupName({ account, user }),
          Protocol: 'HTTP',
          Port: 80,
          VpcId: this.params.VpcId,
        };
        ELB.createTargetGroup(params, (err, data) => {
          if (err && err.code === 'DuplicateTargetGroupName') {
            const Names = [params.Name];
            ELB.describeTargetGroups({ Names }, (err2, result) => {
              if (err2 || !result || result.TargetGroups.length !== 1) {
                err2 && console.log(err2);
                next(err2);
              } else {
                // もし ['Protocol', 'Port', 'VpcId'] の何れかが違うならエラー
                const group = result.TargetGroups[0];
                if (_.find(['Protocol', 'Port', 'VpcId'], k => params[k] !== group[k])) {
                  console.log(err);
                  console.log(`管理コンソールでターゲットグループ削除してください : ${params.Name}`);
                  next(err);
                } else {
                  next(null, group);
                }
              }
            });
          } else if (err || !data) {
            next(err);
          } else {
            next(err, data.TargetGroups[0]);
          }
        });
      },
      (data, next) => {
        const params = {
          TargetGroupArn: data.TargetGroupArn,
          HealthCheckProtocol: 'HTTP',
          HealthCheckPath: path,
          HealthCheckPort: 'traffic-port',
          HealthyThresholdCount: 2,
          UnhealthyThresholdCount: 2,
          HealthCheckTimeoutSeconds: 2,
          HealthCheckIntervalSeconds: 5,
          Matcher: { HttpCode: '200' },
        };
        ELB.modifyTargetGroup(params, (err, result) => {
          err && console.log(err);
          next(err, result.TargetGroups[0]);
        });
      },
      (data, next) => {
        const params = {
          TargetGroupArn: data.TargetGroupArn,
          Attributes: [
            { Key: 'deregistration_delay.timeout_seconds', Value: '60' },
            { Key: 'stickiness.enabled', Value: 'true' },
            { Key: 'stickiness.type', Value: 'lb_cookie' },
            // Sticky 1s にすれば 2台以上でも大丈夫
            { Key: 'stickiness.lb_cookie.duration_seconds', Value: '1' },
          ],
        };
        ELB.modifyTargetGroupAttributes(params, (err) => {
          next(err, data);
        });
      },
      (data, next) => {
        // 既存ルールを削除
        const ListenerArn = this.params.ListenerArn;
        const value = `${path}*`;
        deleteRule(ListenerArn, value, (err) => {
          next(err, data);
        });
      },
      (data, next) => {
        this.db.users.findOne({ _id: user._id }, (err, obj) => {
          const Priority = Number.parseInt(obj.order);
          // todo: Priority の生成ルールが、むつかし。
          (99999 < Priority) && console.log('[ERROR] Priority must be less than 99999');
          next(err, data, Priority);
        });
      },
      (data, Priority, next) => {
        // data : ターゲットグループ
        // todo: リスナーはCFでセットする
        // いや、アカウント追加時に動的に作成する。→ ALBはアカウント別にする。
        const ListenerArn = this.params.ListenerArn;
        const TargetGroupArn = data.TargetGroupArn;
        const params = {
          Actions: [
            { TargetGroupArn, Type: 'forward' },
          ],
          Conditions: [
            { Field: 'path-pattern', Values: [`${path}*`] },
          ],
          ListenerArn,
          Priority,
        };
        ELB.createRule(params, (err) => {
          err && console.log(err);
          next(err, data);
        });
      },
    ], (err, data) => {
      // data : ターゲットグループ
      callback(err, data);
    });
  }

  createService({ account, user, _id }, { desiredCount }, callback) {

    async.waterfall([
      (next) => {
        this.db.users.findOne({ _id: user._id }, (err, obj) => {
          next(err, obj.targetGroup);
        });
      },
      (targetGroup, next) => {
        // const tgtGroupArn = 'arn:aws:elasticloadbalancing:ap-northeast-1:663889673734:targetgroup/ecs-fronte-test-test1/0671f63a9fa4024b';
        // const ecsServiceRole = 'arn:aws:iam::663889673734:role/frontend-ECSServiceRole-ZG4XNE2QBFS';
        const targetGroupArn = `arn:aws:elasticloadbalancing:${this.params.Region}:${this.params.AccountId}:targetgroup/${targetGroup}`;

        const taskName = this.familyPrefix({ account, user });
        const params = {
          cluster: this.params.Cluster,
          desiredCount,
          serviceName: this.serviceName({ account, user, _id }),
          taskDefinition: taskName,
          clientToken: _id.toString(),

          // deploymentConfiguration: {
          //   maximumPercent: 0,
          //   minimumHealthyPercent: 0
          // },

          loadBalancers: [
            {
              containerName: taskName,
              containerPort: 4000,
              // loadBalancerName: this.params.ALB,
              targetGroupArn,
            },
          ],

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
          role: `arn:aws:iam::${this.params.AccountId}:role/${this.params.ECSServiceRole}`,
        };
        ECS.createService(params, (err, data) => {
          next(err, data);
        });
      },
    ], (err, data) => {
      callback(err, data);
    });
  }

  deleteService(serviceName, callback) {
    const params = {
      cluster: this.params.Cluster,
      service: serviceName,
    };
    ECS.deleteService(params, (err, data) => {
      err && console.log(err);
      callback(err);
    });
  }

}

module
  .exports = ECSManager;
