const aws = require('aws-sdk');
const mongodb = require('mongodb');
const _ = require('underscore');
const async = require('async');

const { ObjectId } = mongodb;

process.env.CLUSTER = process.env.CLUSTER || 'frontend';

const credentialProvider = new aws.CredentialProviderChain();
const ecs = new aws.ECS({ credentialProvider });
const ecr = new aws.ECR({ credentialProvider });


class ECS {

  constructor(db, subscribe) {
    this.users = db.collection('users');
    subscribe('update', 'users', this.onUpdateUser);
    subscribe('remove', 'users', this.onRemoveUser);
    subscribe('update', 'accounts', this.onUpdateAccount);
    subscribe('remove', 'accounts', this.onRemoveAccount);
    subscribe('login', 'sessions', this.onLogin);
  }

  // accounts 更新
  onUpdateAccount(item, callback) {
    // account (契約) のイメージが更新された。
    // イメージの最新バージョンでタスクを全て更新する
  }

  // accounts 削除
  onRemoveAccount(item, callback) {

  }

  // users 更新
  onUpdateUser(item, callback) {
    // タスク追加
    this.createTask(item, (err, data) => {
      callback(err, data);
    });
  }

  // users 削除
  onRemoveUser(item, callback) {
    // タスク削除 (全バージョン)

    this.createTask(item, (err, data) => {
      callback(err, data);
    });
  }

  // ログイン
  onLogin(item, callback) {
    // 必要数が 2 なら、何もしない
    // サービスが存在するなら、必要数 2 、タスク定義 最新 に更新する
    // サービスが存在しないなら、サービス作成
    callback(null, item);
  }

  // ログアウト
  onLogout(item, callback) {
    // 必要数 0 に更新する
    callback(null, item);
  }

  cleanUp() {
    // 必要数が0, 実行数が0 なら サービス削除
    // タスクは最新だけ残して、他は削除
  }

  //

  // Task
  familyPrefix(item) {
    return item._id.toString();
  }

  createTask(item, callback) {
    const name = this.familyPrefix(item);
    const task = {
      containerDefinitions: [
        {
          name,
          image: 'jquerywebide_terminal',
          memory: 100,
        },
      ],
      family: name,
    };
    ecs.registerTaskDefinition(task, (err, data) => {
      callback(err, data);
    });
  }

  deleteTask(item, callback) {
    const params = { familyPrefix: this.familyPrefix(item) };

    ecs.listTaskDefinitions(params, (err, data) => {
      callback(null);
    });
  }

  listTask(item, callback) {
    const params = {
      familyPrefix: this.familyPrefix(item),
      sort: 'DESC',
    };

    ecs.listTaskDefinitions(params, (err, data) => {
      if (err) {
        callback(err);
      } else {
        callback(err, data.taskDefinitionArns[0]);
      }
    });
  }

  listServices(item, callback) {
    // service arn
    // arn:aws:ecs:ap-northeast-1:663889673734:service/frontend-ECSTerminalService-UV3UFS2J2XG0

    var params = {
      cluster: process.env.CLUSTER,
    };
    ecs.listServices(params, (err, data) => {

      const params = { familyPrefix: familyPrefix(item) };

      ecs.listTaskDefinitions(params, (err, data) => {
        //   callback(null);
        // });

        // var params = {
        //   taskDefinition: "hello_world:8"
        // };
        // ecs.describeTaskDefinition(params, (err, data) => {


      });
    });
  }


  updateService(item, callback) {
    callback(null);

    var params = {
      cluster: process.env.CLUSTER,
      service: 'STRING_VALUE', // serviceName
      desiredCount: 0,
      // taskDefinition: 'STRING_VALUE'
    };
    ecs.updateService(params, (err, data) => {
      if (err) console.log(err, err.stack); // an error occurred
      else     console.log(data);           // successful response
    });
  }

  createService(item, callback) {

    const params = {
      cluster: process.env.CLUSTER,
      desiredCount: 0, /* required */
      serviceName: 'STRING_VALUE', /* required */
      taskDefinition: 'STRING_VALUE', /* required */
      clientToken: 'STRING_VALUE', // _id
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
      // role: 'STRING_VALUE'
    };
    ecs.createService(params, (err, data) => {
      if (err) console.log(err, err.stack); // an error occurred
      else     console.log(data);           // successful response
    });
  }

  deleteService(item, callback) {

  }

}
module.exports = ECS;
