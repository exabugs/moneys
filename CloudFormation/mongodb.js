//
// CloudFormation Template Builder
//

// todo: APサーバ用 SG (export)
// todo: DBサーバ用 SG (ingress AP)


// bitnami では members.name が IPアドレスになってしまう。
//   replicaset:PRIMARY> rs.status()
//     { "members" : [ { "name" : "10.6.10.106:27017",
//
// コンテナの以下に以下に修正スクリプトを作成しているので
// mongo reconfig.js を実行する
//   /opt/bitnami/mongodb/conf/reconfig.js
//
// Issue登録済み
//   https://github.com/bitnami/bitnami-docker-mongodb/issues/76

const CFName = 'mongodb';

const Description = 'MongoDB Cluster';
const Parameters = {};
const Mappings = {};
const Resources = {};
const Outputs = {};

// TODO: Autoscale で 最小1:最大1

// amzn-ami-2017.03.a-amazon-ecs-optimized

// frontend が使うための SecurityGroup


// [DependsOn 必要]
// ・VPC ゲートウェイのアタッチメント
//     Auto Scaling グループ
//     Amazon EC2 インスタンス
//     Elastic Load Balancing ロードバランサー
//     Elastic IP アドレス
//     Amazon RDS データベースインスタンス
//     インターネットゲートウェイを含む Amazon VPC のルート

// Server has startup warnings:
//
// ** WARNING: Using the XFS filesystem is strongly recommended with the WiredTiger storage engine
// **          See http://dochub.mongodb.org/core/prodnotes-filesystem
//  [解決]
//    https://github.com/aws/amazon-ecs-agent/issues/62
//
//    `echo '${v.Device}  ${v.SourcePath}  xfs  defaults,nofail,discard   0   2' >> /etc/fstab\n`
//    `mkfs.xfs -K ${v.Device}\n
//    'mount -a\n'
//    'service docker restart\n'
//    'start ecs\n'
//
// ** WARNING: /sys/kernel/mm/transparent_hugepage/defrag is 'always'.
// **        We suggest setting it to 'never'
//  [解決]
//    /etc/rc.local
//     echo 'never' > /sys/kernel/mm/transparent_hugepage/enabled
//     echo 'never' > /sys/kernel/mm/transparent_hugepage/defrag
// http://dev.classmethod.jp/server-side/db/mongodb-on-ec2/


//
// Parameters
//

Parameters.KeyName = {
  Type: 'AWS::EC2::KeyPair::KeyName',
  Description: 'Name of an existing EC2 KeyPair',
};

Parameters.Domain = {
  Type: 'String',
  Default: `${CFName}.internal`,
  Description: 'Name of a hosted zone',
};

Parameters.EBSSize = {
  Type: 'Number',
  Default: 10, // GB
  Description: 'Size of Data Storage (GB)',
};

Parameters.AlertTopic = {
  Type: 'String',
  Default: 'SakuraiAlertTest',
  Description: 'Alert Topic',
};

// http://docs.aws.amazon.com/ja_jp/AmazonECS/latest/developerguide/ecs-optimized_AMI_launch_latest.html

Parameters.AmazonLinuxAMI = {
  Type: 'String',
  // Default: 'ami-cb787aac', // amzn-ami-2017.03.a-amazon-ecs-optimized
  Default: 'ami-e4657283', // amzn-ami-2017.03.d-amazon-ecs-optimized
  Description: 'http://docs.aws.amazon.com/ja_jp/AmazonECS/latest/developerguide/ecs-optimized_AMI_launch_latest.html',
};

Parameters.MongoDBVersion = {
  Type: 'String',
  // Default: 'latest', // 3.4.6-r0
  Default: '3.4.6-r0', // 3.4.6-r0
  Description: 'https://github.com/bitnami/bitnami-docker-mongodb/releases',
};

// "SSHLocation" : {
//   "Description" : "The IP address range that can be used to SSH to the EC2 instances",
//     "Type": "String",
//     "MinLength": "9",
//     "MaxLength": "18",
//     "Default": "0.0.0.0/0",
//     "AllowedPattern": "(\\d{1,3})\\.(\\d{1,3})\\.(\\d{1,3})\\.(\\d{1,3})/(\\d{1,2})",
//     "ConstraintDescription": "Must be a valid IP CIDR range of the form x.x.x.x/x"
// }

//
// Mappings
//

Mappings.Network = {
  CIDR: {
    VPC: '10.6.0.0/16',
    DA: '124.35.0.163/32',
  },
  PublicSubnet: {
    PublicSubnet0: '10.6.10.0/24',
    PublicSubnet1: '10.6.15.0/24',
  },
};

// データ永続化定義
//
// サイズを拡張した後はOSで以下のコマンド実行
// # xfs_growfs /dev/xvdk
const mongodbData = {
  Name: 'mongodbData',
  Device: '/dev/xvdk',
  SourcePath: '/mongodb',
  ContainerPath: '/bitnami/mongodb',
};

const Instances = {
  mongodb01: {
    Type: 't2.micro',
    Subnet: 'PublicSubnet0',
    Memory: 900, // MB
    env: [
      { Name: 'MONGODB_REPLICA_SET_MODE', Value: 'primary' },
    ],
    Volumes: [mongodbData],
    DependsOn: [],
  },
  mongodb02: {
    Type: 't2.micro',
    Subnet: 'PublicSubnet1',
    Memory: 600, // MB
    env: [
      { Name: 'MONGODB_REPLICA_SET_MODE', Value: 'secondary' },
      { Name: 'MONGODB_PRIMARY_HOST', Value: 'mongodb01' },
    ],
    Volumes: [mongodbData],
    DependsOn: ['mongodb01Service'],
  },
  mongodb03: {
    Type: 't2.micro',
    Subnet: 'PublicSubnet0',
    Memory: 300, // MB
    env: [
      { Name: 'MONGODB_REPLICA_SET_MODE', Value: 'arbiter' },
      { Name: 'MONGODB_PRIMARY_HOST', Value: 'mongodb01' },
    ],
    Volumes: [mongodbData],
    DependsOn: ['mongodb02Service'],
  },
};

// ////////////
// Resources
//

const tagname = (name) => {
  const key = { Ref: 'AWS::StackName' };
  if (name && name.length) {
    return { 'Fn::Join': ['-', [key].concat(name)] };
  } else {
    return key;
  }
};

// // arn:aws:ecs:ap-northeast-1:663889673734:cluster/seventest23
// const clusterArn = name => (
//   {
//     'Fn::Join': [':', ['arn:aws:ecs', { Ref: 'AWS::Region' }, { Ref: 'AWS::AccountId' },
//       { 'Fn::Join': ['/', ['cluster', { Ref: name }]] }]],
//   });

// arn:aws:sns:ap-northeast-1:663889673734:SakuraiAlertTest
const topicArn = name => (
  {
    'Fn::Join': [':', ['arn:aws:sns', { Ref: 'AWS::Region' }, { Ref: 'AWS::AccountId' }, name]],
  });

Resources.VPC = {
  Type: 'AWS::EC2::VPC',
  Properties: {
    EnableDnsSupport: true,
    EnableDnsHostnames: true,
    CidrBlock: { 'Fn::FindInMap': ['Network', 'CIDR', 'VPC'] },
    Tags: [
      { Key: 'VPC', Value: 'ECS' },
      { Key: 'Name', Value: tagname() },
    ],
  },
};

Resources.HostedZone = {
  Type: 'AWS::Route53::HostedZone',
  Properties: {
    HostedZoneConfig: {
      Comment: 'Hosted Zone for ECS Service Discovery',
    },
    Name: { Ref: 'Domain' },
    VPCs: [
      {
        VPCId: { Ref: 'VPC' },
        VPCRegion: { Ref: 'AWS::Region' },
      },
    ],
  },
};

//
// Network
//

Resources.InternetGateway = {
  Type: 'AWS::EC2::InternetGateway',
};

Resources.AttachGateway = {
  Type: 'AWS::EC2::VPCGatewayAttachment',
  Properties: {
    VpcId: { Ref: 'VPC' },
    InternetGatewayId: { Ref: 'InternetGateway' },
  },
};

Resources.PublicRouteTable = {
  Type: 'AWS::EC2::RouteTable',
  Properties: {
    VpcId: { Ref: 'VPC' },
    Tags: [
      { Key: 'Name', Value: tagname('public') },
    ],
  },
};

Object.keys(Mappings.Network.PublicSubnet).forEach((subnet, i) => {
  Resources[subnet] = {
    Type: 'AWS::EC2::Subnet',
    DependsOn: 'AttachGateway',
    Properties: {
      VpcId: { Ref: 'VPC' },
      CidrBlock: { 'Fn::FindInMap': ['Network', 'PublicSubnet', subnet] },
      AvailabilityZone: {
        'Fn::Select': [i, { 'Fn::GetAZs': '' }],
      },
      Tags: [
        { Key: 'Name', Value: tagname(subnet) },
      ],
    },
  };

  Resources[`${subnet}RouteTableAssociation`] = {
    Type: 'AWS::EC2::SubnetRouteTableAssociation',
    Properties: {
      SubnetId: { Ref: subnet },
      RouteTableId: { Ref: 'PublicRouteTable' },
    },
  };
});

Resources.PublicRoute = {
  Type: 'AWS::EC2::Route',
  Properties: {
    RouteTableId: { Ref: 'PublicRouteTable' },
    DestinationCidrBlock: '0.0.0.0/0',
    GatewayId: { Ref: 'InternetGateway' },
  },
};

//
// Security
//

Resources.DASecurityGroupApps = {
  Type: 'AWS::EC2::SecurityGroupIngress',
  Properties: {
    GroupId: { 'Fn::GetAtt': ['VPC', 'DefaultSecurityGroup'] },
    IpProtocol: -1,
    CidrIp: { 'Fn::FindInMap': ['Network', 'CIDR', 'DA'] },
  },
};

Resources.InstanceSecurityGroup = {
  Type: 'AWS::EC2::SecurityGroup',
  Properties: {
    GroupDescription: 'Allow http to client host',
    VpcId: { Ref: 'VPC' },
    SecurityGroupIngress: [
      {
        IpProtocol: 'tcp',
        FromPort: '80',
        ToPort: '80',
        CidrIp: '0.0.0.0/0',
      },
    ],
  },
};

Resources.EC2Role = {
  Type: 'AWS::IAM::Role',
  Properties: {
    AssumeRolePolicyDocument: {
      Statement: [
        {
          Effect: 'Allow',
          Principal: {
            Service: ['ec2.amazonaws.com'],
          },
          Action: ['sts:AssumeRole'],
        },
      ],
    },
    Path: '/',
    ManagedPolicyArns: [
      'arn:aws:iam::aws:policy/service-role/AmazonEC2ContainerServiceforEC2Role',
      'arn:aws:iam::aws:policy/AmazonRoute53FullAccess',
      'arn:aws:iam::aws:policy/AmazonEC2FullAccess',
    ],
  },
};

Resources.InstanceProfile = {
  Type: 'AWS::IAM::InstanceProfile',
  Properties: {
    Path: '/',
    Roles: [
      { Ref: 'EC2Role' },
    ],
  },
};

Resources.CloudwatchLogsGroup = {
  Type: 'AWS::Logs::LogGroup',
  Properties: {
    LogGroupName: tagname(),
    RetentionInDays: 14,
  },
};

//
// ECS
//

Resources.ECSCluster = {
  Type: 'AWS::ECS::Cluster',
  Properties: {
    ClusterName: tagname(),
  },
};

const modeHostname = mode => (
  JSON.stringify(Object.keys(Instances).reduce((memo, name) => {
    const instance = Instances[name];
    if (instance.env.reduce((f, i) =>
        (f || (i.Name === 'MONGODB_REPLICA_SET_MODE' && i.Value === mode)), false)
    ) {
      memo.push(name);
    }
    return memo;
  }, []))
);

const initScript = () => (
  [
    'port = 27017;',
    'servers = {',
    `  primary: ${modeHostname('primary')},`,
    `  secondary: ${modeHostname('secondary')},`,
    `  arbiter: ${modeHostname('arbiter')}`,
    '};',
    'conf = rs.conf();',
    'conf.members.forEach(function(m) {',
    '  var mode;',
    '  if (m.arbiterOnly) {',
    '    mode = "arbiter";',
    '  } else if (m.priority === 1) {',
    '    mode = "secondary";',
    '  } else {',
    '    mode = "primary";',
    '  }',
    '  m.host = [servers[mode].pop(), port].join(":");',
    '});',
    'rs.reconfig(conf);',
  ].join('\n')
);

const ECSClusterUserData = (hostname, volumes) => {
  const command = [
    '#!/bin/bash\n',
    'export PATH=$PATH:/usr/local/bin\n',
    'export AWS_DEFAULT_REGION=', { Ref: 'AWS::Region' }, '\n',
    'echo \'ECS_CLUSTER=', { Ref: 'ECSCluster' }, '\' >> /etc/ecs/ecs.config\n',
    `echo 'ECS_INSTANCE_ATTRIBUTES={"hostname": "${hostname}"}' >> /etc/ecs/ecs.config\n`,
    `sed -i -e 's/localhost.localdomain/${hostname}/' /etc/sysconfig/network\n`,
    `hostname ${hostname}\n`,
    'sed -i -e \'s/search .*/search ', { Ref: 'Domain' }, '/\' /etc/resolv.conf\n',
    'sed -i -e \'s/PEERDNS=yes/PEERDNS=no/\' /etc/sysconfig/network-scripts/ifcfg-eth0\n',
    'yum install -y xfsprogs\n',
    'yum install -y yum-cron\n', // 自動アップデート
    'echo \'echo never > /sys/kernel/mm/transparent_hugepage/enabled\' >> /etc/rc.local\n',
    'echo \'echo never > /sys/kernel/mm/transparent_hugepage/defrag\' >> /etc/rc.local\n',
    'curl "https://bootstrap.pypa.io/get-pip.py" -o "get-pip.py"\n',
    'python get-pip.py\n',
    'pip install awscli\n',
    'instanceId=`curl http://169.254.169.254/latest/meta-data/instance-id`\n',
    'ipv4=`curl http://169.254.169.254/latest/meta-data/local-ipv4`\n',
    'aws route53 change-resource-record-sets --hosted-zone-id ', { Ref: 'HostedZone' },
    ` --change-batch "{\\"Changes\\":[{\\"Action\\":\\"UPSERT\\",\\"ResourceRecordSet\\":{\\"Name\\":\\"${hostname}.`,
    { Ref: 'Domain' }, '.\\",\\"Type\\":\\"A\\",\\"TTL\\":300,\\"ResourceRecords\\":[{\\"Value\\":\\"$ipv4\\"}]}}]}"\n',
  ];
  volumes.forEach((v) => {
    command.push('aws ec2 attach-volume --volume-id ', { Ref: v.id }, ` --instance-id $instanceId --device ${v.Device}\n`);
    command.push(`while [ ! -e ${v.Device} ]; do sleep 1; done;\n`);
    command.push(`echo '${v.Device}  ${v.SourcePath}  xfs  defaults,nofail,discard   0   2' >> /etc/fstab\n`);
    command.push(`mkfs.xfs -K ${v.Device}\n`); // 既にフォーマット済みならエラー終了
    command.push(`mkdir -p ${v.SourcePath}\n`);
    command.push(`mount ${v.Device}\n`);

    command.push(`mkdir -p ${v.SourcePath}/conf\n`);
    command.push(`echo '${initScript()}' > ${v.SourcePath}/conf/reconfig.js\n`);
  });
  command.push('service docker restart\n');
  command.push('start ecs\n');
  return { 'Fn::Base64': { 'Fn::Join': ['', command] } };
};

Object.keys(Instances).forEach((name) => {
  const info = Instances[name];

  info.Volumes.forEach((v) => {
    v.id = [name, 'Volume'].join('');

    Resources[v.id] = {
      Type: 'AWS::EC2::Volume',
      Properties: {
        Size: { Ref: 'EBSSize' },
        VolumeType: 'gp2',
        AvailabilityZone: { 'Fn::GetAtt': [info.Subnet, 'AvailabilityZone'] },
        Tags: [
          { Key: 'Name', Value: tagname(name) },
        ],
      },
    };
  });

  Resources[`${name}LaunchConfig`] = {
    Type: 'AWS::AutoScaling::LaunchConfiguration',
    Properties: {
      AssociatePublicIpAddress: true,
      ImageId: { Ref: 'AmazonLinuxAMI' },
      SecurityGroups: [
        { 'Fn::GetAtt': ['VPC', 'DefaultSecurityGroup'] },
      ],
      InstanceType: info.Type,
      IamInstanceProfile: { Ref: 'InstanceProfile' },
      KeyName: { Ref: 'KeyName' },
      UserData: ECSClusterUserData(name, info.Volumes),
    },
  };

  Resources[`${name}AutoScaling`] = {
    Type: 'AWS::AutoScaling::AutoScalingGroup',
    DependsOn: ['AttachGateway'],
    Properties: {
      VPCZoneIdentifier: [{ Ref: info.Subnet }],
      LaunchConfigurationName: { Ref: `${name}LaunchConfig` },
      MinSize: 1,
      MaxSize: 1,
      DesiredCapacity: 1,
      HealthCheckGracePeriod: 10, // 新しい EC2 インスタンスがサービス状態になってから、Auto Scaling がヘルスチェックを開始するまでの秒数。
      Tags: [
        { Key: 'Name', Value: tagname(name), PropagateAtLaunch: true },
      ],
      MetricsCollection: [
        { Granularity: '1Minute' },
      ],
      NotificationConfigurations: [
        {
          NotificationTypes: [
            'autoscaling:EC2_INSTANCE_LAUNCH',
            'autoscaling:EC2_INSTANCE_LAUNCH_ERROR',
            'autoscaling:EC2_INSTANCE_TERMINATE',
            'autoscaling:EC2_INSTANCE_TERMINATE_ERROR',
            'autoscaling:TEST_NOTIFICATION',
          ],
          TopicARN: topicArn({ Ref: 'AlertTopic' }),
        },
      ],
      //Cooldown: 300, // 規模の拡大や縮小の完了後、次の規模の拡大や縮小が開始できるようになるまでの秒数
    },
    // CreationPolicy: {
    //   ResourceSignal: { Timeout: 'PT15M' },
    // },
    // UpdatePolicy: {
    //   AutoScalingReplacingUpdate: { WillReplace: true },
    // },
  };

  const PORT = 27017; // 変更不可

  Resources[`${name}Task`] = {
    Type: 'AWS::ECS::TaskDefinition',
    Properties: {
      Family: tagname(name),
      // TaskRoleArn: null,
      NetworkMode: 'host',
      ContainerDefinitions: [
        {
          Name: tagname(name),
          Hostname: name,
          Image: { 'Fn::Join': [':', ['bitnami/mongodb', { Ref: 'MongoDBVersion' }]] },
          Memory: info.Memory,
          DnsSearchDomains: [{ Ref: 'Domain' }],
          PortMappings: [
            { ContainerPort: PORT, HostPort: PORT },
          ],
          LogConfiguration: {
            LogDriver: 'awslogs',
            Options: {
              'awslogs-group': { Ref: 'CloudwatchLogsGroup' },
              'awslogs-region': { Ref: 'AWS::Region' },
              'awslogs-stream-prefix': { Ref: 'AWS::StackName' },
            },
          },
          Environment: info.env,
          MountPoints: info.Volumes.map(v => (
            { SourceVolume: v.Name, ContainerPath: v.ContainerPath }
          )),
        },
      ],
      PlacementConstraints: [
        { Type: 'memberOf', Expression: `attribute:hostname == ${name}` },
      ],
      Volumes: info.Volumes.map(v => (
        { Name: v.Name, Host: { SourcePath: v.SourcePath } }
      )),
    },
  };

  Resources[`${name}Service`] = {
    Type: 'AWS::ECS::Service',
    DependsOn: info.DependsOn,
    Properties: {
      Cluster: { Ref: 'ECSCluster' },
      DesiredCount: 1,
      TaskDefinition: { Ref: `${name}Task` },
      DeploymentConfiguration: {
        MaximumPercent: 100,
        MinimumHealthyPercent: 0,
      },
    },
  };
});

//
// Outputs
//

const exportName = name => (
  { 'Fn::Join': ['-', [{ Ref: 'AWS::StackName' }, name]] }
);

Outputs.VpcId = {
  Description: 'VPC ID',
  Value: { Ref: 'VPC' },
  Export: { Name: exportName('VpcId') },
};

Outputs.DefaultSecurityGroup = {
  Description: 'DefaultSecurityGroup',
  Value: { 'Fn::GetAtt': ['VPC', 'DefaultSecurityGroup'] },
  Export: { Name: exportName('DefaultSecurityGroup') },
};

Outputs.Domain = {
  Description: 'Domain',
  Value: { Ref: 'Domain' },
  Export: { Name: exportName('Domain') },
};

// Outputs.SubnetID = {
//   Description: 'SubnetID',
//   Value: Object.keys(Mappings.Network.PublicSubnet).map(subnet => ({ Ref: subnet })),
//   Export: {
//     Name: { 'Fn::Sub': '${AWS::StackName}-SubnetID' },
//   },
// };

Outputs.KeyName = {
  Description: 'KeyName',
  Value: { Ref: 'KeyName' },
  Export: { Name: exportName('KeyName') },
};

Outputs.AlertTopic = {
  Description: 'AlertTopic',
  Value: { Ref: 'AlertTopic' },
  Export: { Name: exportName('AlertTopic') },
};

//
// Verify
//

const errors = [];

const error = msg => errors.push(msg);

const awsMap = {
  'AWS::AccountId': 1,
  'AWS::NotificationARNs': 1,
  'AWS::NoValue': 1,
  'AWS::Region': 'ap-northeast-1',
  'AWS::StackId': 1,
  'AWS::StackName': 1,
};

const refCheck = (key, obj) => {
  let flag = false;
  if (obj.startsWith('AWS::')) {
    if (awsMap[obj]) {
      return awsMap[obj];
    }
    flag = true;
  } else if (!Resources[obj] && !Parameters[obj]) {
    flag = true;
  }
  if (flag) {
    error(`${key} : ${obj}`);
  }
  return flag;
};

const value = (obj, keys) => keys.reduce((m, k) => (m ? m[k] : m), obj);

const verify = (obj, key) => {
  if (obj === null || obj === undefined) {
    return obj;
  } else if (key === 'Fn::FindInMap') {
    if (!value(Mappings, verify(obj))) {
      error(`${key} : ${JSON.stringify(obj)}`);
    }
    return obj;
  } else if (key === 'Fn::GetAtt') {
    refCheck(key, verify(obj[0]));
  } else if (key === 'Ref') {
    refCheck(key, obj);
    return obj;
  } else if (key === 'DependsOn') {
    return obj;
  } else if (Array.isArray(obj)) {
    return obj.map(v => verify(v, key));
  } else if (typeof obj === 'object') {
    return Object.keys(obj).reduce((memo, k) => {
      memo[k] = verify(obj[k], k);
      return k === 'Ref' ? memo[k] : memo;
    }, {});
  }
  return obj;
};

verify(Resources);

//
// 出力
//

const template = {
  AWSTemplateFormatVersion: '2010-09-09',
  Description,
  Parameters,
  Mappings,
  Resources,
  Outputs,
};

if (errors.length) {
  console.log(errors.join('\n'));
} else {
  const INDENT = '    ';
  console.log(JSON.stringify(template, null, INDENT));
}

// Docker ストレージ領域の再利用
// http://docs.aws.amazon.com/ja_jp/elasticbeanstalk/latest/dg/create_deploy_docker.container.console.html
//   /etc/sysconfig/docker-storage に --storage-opt dm.mountopt=discard を追加してオンラインの破棄を有効にします。
//   cron を使用するなど、コンテナの空き容量に対してホスト OS で定期的に fstrim を実行し、未使用コンテナのデータブロックを再利用します。
//    docker ps -q | xargs docker inspect --format='{{ .State.Pid }}' | xargs -IZ sudo fstrim /proc/Z/root/
