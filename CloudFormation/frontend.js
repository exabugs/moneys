//
// CloudFormation Template Builder
//

// タスク配置戦略
// http://docs.aws.amazon.com/ja_jp/AmazonECS/latest/developerguide/task-placement-strategies.html
//   binpack : 使用するインスタンス数を最小限に抑えます。
//   random  : タスクをランダムに配置します。
//   spread  : 指定された値に基づいてタスクを均等に配置します。

// frontyard < - > backyard

/*
 #!/bin/bash
 echo 'ECS_CLUSTER=frontend' >> /etc/ecs/ecs.config
 */


const CFName = 'frontend';

const Description = 'Frontend Cluster';
const Parameters = {};
const Mappings = {};
const Resources = {};
const Outputs = {};

const NFSHOST = 'nfs';

//
// Parameters
//

Parameters.NetworkStackName = {
  Description: 'Name of an active CloudFormation stack.',
  Type: 'String',
  MinLength: 1,
  MaxLength: 255,
  AllowedPattern: '^[a-zA-Z][-a-zA-Z0-9]*$',
};

// Parameters.KeyName = {
//   Type: 'AWS::EC2::KeyPair::KeyName',
//   Description: 'Name of an existing EC2 KeyPair',
// };
// { 'Fn::ImportValue': { 'Fn::Sub': '${NetworkStackName}-KeyName' } }
//
// Parameters.Domain = {
//   Type: 'String',
//   Default: `${CFName}.internal`,
//   Description: 'Name of a hosted zone',
// };
// { 'Fn::ImportValue': { 'Fn::Sub': '${NetworkStackName}-Domain' } }
//
// Parameters.VPC = {
//   Type: 'AWS::EC2::VPC::Id',
//   Description: 'Name of an existing VPC',
// };
// { 'Fn::ImportValue': { 'Fn::Sub': '${NetworkStackName}-VPCID' } }

Parameters.SubnetID = {
  Type: 'List<AWS::EC2::Subnet::Id>',
  Description: 'Select at two subnets in your selected VPC.',
};

Parameters.SSHLocation = {
  Description: 'The IP address range that can be used to SSH to the EC2 instances',
  Type: 'String',
  MinLength: '9',
  MaxLength: '18',
  // Default: '0.0.0.0/0',
  Default: '124.35.0.163/32',
  AllowedPattern: '(\\d{1,3})\\.(\\d{1,3})\\.(\\d{1,3})\\.(\\d{1,3})/(\\d{1,2})',
  ConstraintDescription: 'Must be a valid IP CIDR range of the form x.x.x.x/x',
};

// http://docs.aws.amazon.com/ja_jp/AmazonECS/latest/developerguide/ecs-optimized_AMI_launch_latest.html

Parameters.AmazonLinuxAMI = {
  Type: 'String',
  // Default: 'ami-cb787aac', // amzn-ami-2017.03.a-amazon-ecs-optimized
  Default: 'ami-e4657283', // amzn-ami-2017.03.d-amazon-ecs-optimized
  Description: 'http://docs.aws.amazon.com/ja_jp/AmazonECS/latest/developerguide/ecs-optimized_AMI_launch_latest.html',
};

// StorageGW AMI
Parameters.StorageGWAMI = {
  Type: 'String',
  Default: 'ami-48898c2f',
  Description: 'StorageGW AMI',
};

// PublicDomain
Parameters.PublicDomain = {
  Type: 'String',
  Default: 'webide.exabugs.com',
  Description: 'PublicDomain',
};

// Certificate
Parameters.Certificate = {
  Type: 'String',
  // *.webide.exabugs.com
  Default: 'arn:aws:acm:ap-northeast-1:521185453080:certificate/0f78b17e-d455-42c4-bf15-8293852c737b',
  Description: 'Certificate',
};

//
// Mappings
//

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

const importValue = name => (
  { 'Fn::ImportValue': { 'Fn::Join': ['-', [{ Ref: 'NetworkStackName' }, name]] } }
);

// arn:aws:sns:ap-northeast-1:663889673734:SakuraiAlertTest
const topicArn = name => (
  {
    'Fn::Join': [':', ['arn:aws:sns', { Ref: 'AWS::Region' }, { Ref: 'AWS::AccountId' }, name]],
  });

//
// Security
//

Resources.LBSecurityGroup = {
  Type: 'AWS::EC2::SecurityGroup',
  Properties: {
    GroupDescription: 'Allow http to client host',
    VpcId: importValue('VpcId'),
    SecurityGroupIngress: [
      {
        IpProtocol: 'tcp',
        FromPort: '80',
        ToPort: '80',
        CidrIp: { Ref: 'SSHLocation' },
      },
      {
        IpProtocol: 'tcp',
        FromPort: '443',
        ToPort: '443',
        CidrIp: { Ref: 'SSHLocation' },
      },
    ],
  },
};

Resources.InstanceSecurityGroup = {
  Type: 'AWS::EC2::SecurityGroup',
  Properties: {
    GroupDescription: 'Allow LB',
    VpcId: importValue('VpcId'),
    SecurityGroupIngress: [
      {
        IpProtocol: 'tcp',
        FromPort: '0',
        ToPort: '65535',
        SourceSecurityGroupId: { Ref: 'LBSecurityGroup' },
      },
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
// DNS
//

Resources.HostedZone = {
  Type: 'AWS::Route53::HostedZone',
  Properties: {
    HostedZoneConfig: {
      Comment: 'Hosted Zone for Public Access',
    },
    Name: { Ref: 'PublicDomain' },
  },
};

//
// NFS
//

Resources.NFS = {
  Type: 'AWS::S3::Bucket',
};

Resources.StorageGW = {
  Type: 'AWS::EC2::Instance',
  Properties: {
    ImageId: { Ref: 'StorageGWAMI' },
    InstanceType: 't2.medium',
    KeyName: importValue('KeyName'),
    Tags: [
      { Key: 'Name', Value: tagname('StorageGW') },
    ],
    BlockDeviceMappings: [
      {
        DeviceName: '/dev/sdf',
        Ebs: {
          VolumeType: 'gp2',
          DeleteOnTermination: true,
          VolumeSize: 10,
        },
      },
    ],
    NetworkInterfaces: [{
      AssociatePublicIpAddress: true,
      DeviceIndex: 0,
      SubnetId: { 'Fn::Select': [0, { Ref: 'SubnetID' }] },
    }],
  },
};

Resources.StorageGWDNS = {
  Type: 'AWS::Route53::RecordSet',
  Properties: {
    HostedZoneName: { 'Fn::Join': ['.', [importValue('Domain'), '']] },
    Name: { 'Fn::Join': ['.', [NFSHOST, importValue('Domain'), '']] },
    Type: 'A',
    TTL: 300,
    ResourceRecords: [
      { 'Fn::GetAtt': ['StorageGW', 'PrivateIp'] },
    ],
  },
};

Resources.NFSRole = {
  Type: 'AWS::IAM::Role',
  Properties: {
    AssumeRolePolicyDocument: {
      Statement: [
        {
          Effect: 'Allow',
          Principal: {
            Service: ['storagegateway.amazonaws.com'],
          },
          Action: ['sts:AssumeRole'],
        },
      ],
    },
    Policies: [
      {
        PolicyName: tagname('NFSRole'),
        PolicyDocument: {
          Statement: [
            {
              Effect: 'Allow',
              Action: 's3:*',
              Resource: [
                { 'Fn::Join': ['', ['arn:aws:s3:::', { Ref: 'NFS' }]] },
                { 'Fn::Join': ['', ['arn:aws:s3:::', { Ref: 'NFS' }, '/*']] },
              ],
            },
          ],
        },
      },
    ],
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

// 'NFS='10.6.10.225/jp.co.dreamarts.jcomsurvey-sakurai''

const monitorScript = () => [
  '#!/bin/sh',
  'NFS=%NFS%',
  'while :; do',
  'docker events --filter "event=destroy" | while read event; do',
  '  DIR=`echo $event | sed -r "s:.*container-name=([^,]*).*:\\1:" | sed "s:_:/:g"`',
  '  docker volume create -d nfs --name $NFS/$DIR',
  'done >> /var/log/docker-monitor-nfs.log',
  'sleep 1',
  'done',
].join('\n');

const upstart = exec => [
  'start on runlevel [2345]',
  'stop on runlevel [!2345]',
  'respawn',
  `exec ${exec}`,
].join('\n');

const ECSClusterUserData = () => {
  const command = [
    '#!/bin/bash\n',
    'echo \'ECS_CLUSTER=', { Ref: 'ECSCluster' }, '\' >> /etc/ecs/ecs.config\n',

    // DNS
    // 'sed -i -e \'s/search .*/search ', importValue('Domain'), '/\' /etc/resolv.conf\n', // // amzn-ami-2017.03.b
    'echo \'search ', importValue('Domain'), '\' >> /etc/resolv.conf\n', // // amzn-ami-2017.03.d

    'sed -i -e \'s/PEERDNS=yes/PEERDNS=no/\' /etc/sysconfig/network-scripts/ifcfg-eth0\n',

    // NFS
    'yum install -y nfs-utils\n',
    'curl -L https://github.com/ContainX/docker-volume-netshare/releases/download/v0.34/docker-volume-netshare_0.34_linux_amd64-bin',
    ' -o /sbin/docker-volume-netshare\n',
    'chmod +x /sbin/docker-volume-netshare\n',
    `echo '${upstart('/sbin/docker-volume-netshare nfs')}' >> /etc/init/docker-volume-netshare.conf\n`,
    'initctl start docker-volume-netshare\n',

    // ECS タスク定義で volume-driver が使えるようになるまでの暫定対応
    // → docker events でイベントを監視して docker volume で nfs volume を作成する。
    `echo '${monitorScript()}' | sed 's:%NFS%:${NFSHOST}/`, { Ref: 'NFS' }, ':\' > /sbin/docker-monitor-nfs.sh\n',
    'chmod +x /sbin/docker-monitor-nfs.sh\n',
    `echo '${upstart('/sbin/docker-monitor-nfs.sh')}' >> /etc/init/docker-monitor-nfs.conf\n`,
    'initctl start docker-monitor-nfs\n',

    // `echo 'ECS_INSTANCE_ATTRIBUTES={"hostname": "${hostname}"}' >> /etc/ecs/ecs.config\n`,
    // `sed -i -e 's/localhost.localdomain/${hostname}/' /etc/sysconfig/network\n`,
    // `hostname ${hostname}\n`,

    // 'yum install -y aws-cfn-bootstrap\n',
    // '/opt/aws/bin/cfn-signal -e $? ',
    // '         --stack ', { Ref: 'AWS::StackName' },
    // '         --resource ECSAutoScalingGroup ',
    // '         --region ', { Ref: 'AWS::Region' }, '\n',
  ];
  return { 'Fn::Base64': { 'Fn::Join': ['', command] } };
};

// Object.keys(Instances).forEach((name) => {
//   const info = Instances[name];
//
//   info.Volumes.forEach((v) => {
//     v.id = [name, 'Volume'].join('');
//
//     Resources[v.id] = {
//       Type: 'AWS::EC2::Volume',
//       Properties: {
//         Size: v.Size,
//         VolumeType: 'gp2',
//         AvailabilityZone: { 'Fn::GetAtt': [info.Subnet, 'AvailabilityZone'] },
//         Tags: [
//           { Key: 'Name', Value: tagname(name) },
//         ],
//       },
//     };
//   });
//
//   Resources[name] = {
//     Type: 'AWS::EC2::Instance',
//     DependsOn: [`${info.Subnet}RouteTableAssociation`],
//     Properties: {
//       KeyName: { Ref: 'KeyName' },
//       ImageId: { 'Fn::FindInMap': ['AmazonLinuxAMI', { Ref: 'AWS::Region' }, 'AMI'] },
//       InstanceType: info.Type,
//       IamInstanceProfile: { Ref: 'InstanceProfile' },
//       NetworkInterfaces: [
//         {
//           AssociatePublicIpAddress: true,
//           DeviceIndex: '0',
//           GroupSet: [
//             { 'Fn::GetAtt': ['VPC', 'DefaultSecurityGroup'] },
//           ],
//           SubnetId: { Ref: info.Subnet },
//         },
//       ],
//       UserData: ECSClusterUserData(name, info.Volumes),
//       Tags: [
//         { Key: 'Application', Value: tagname() },
//         { Key: 'Name', Value: tagname(name) },
//       ],
//       Volumes: info.Volumes.map(v => (
//         { VolumeId: { Ref: v.id }, Device: v.Device }
//       )),
//     },
//   };
//
//   Resources[`${name}DNSRecord`] = {
//     Type: 'AWS::Route53::RecordSet',
//     Properties: {
//       HostedZoneName: { 'Fn::Join': ['.', [{ Ref: 'Domain' }, '']] },
//       Name: { 'Fn::Join': ['.', [name, { Ref: 'Domain' }, '']] },
//       Type: 'A',
//       TTL: 300, // sec
//       ResourceRecords: [
//         { 'Fn::GetAtt': [name, 'PrivateIp'] },
//       ],
//     },
//   };
//
//   const PORT = 27017; // 変更不可
//
//   Resources[`${name}Task`] = {
//     Type: 'AWS::ECS::TaskDefinition',
//     Properties: {
//       Family: name,
//       // TaskRoleArn: null,
//       NetworkMode: 'host',
//       ContainerDefinitions: [
//         {
//           Name: name,
//           Hostname: name,
//           Image: 'bitnami/mongodb:latest',
//           Memory: info.Memory,
//           DnsSearchDomains: [{ Ref: 'Domain' }],
//           PortMappings: [
//             { ContainerPort: PORT, HostPort: PORT },
//           ],
//           LogConfiguration: {
//             LogDriver: 'awslogs',
//             Options: {
//               'awslogs-group': { Ref: 'CloudwatchLogsGroup' },
//               'awslogs-region': { Ref: 'AWS::Region' },
//               'awslogs-stream-prefix': { Ref: 'AWS::StackName' },
//             },
//           },
//           Environment: info.env,
//           MountPoints: info.Volumes.map(v => (
//             { SourceVolume: v.Name, ContainerPath: v.ContainerPath }
//           )),
//         },
//       ],
//       PlacementConstraints: [
//         { Type: 'memberOf', Expression: `attribute:hostname == ${name}` },
//       ],
//       Volumes: info.Volumes.map(v => (
//         { Name: v.Name, Host: { SourcePath: v.SourcePath } }
//       )),
//     },
//   };
//
//   Resources[`${name}Service`] = {
//     Type: 'AWS::ECS::Service',
//     DependsOn: info.DependsOn,
//     Properties: {
//       Cluster: { Ref: 'ECSCluster' },
//       DesiredCount: 1,
//       TaskDefinition: { Ref: `${name}Task` },
//       DeploymentConfiguration: {
//         MaximumPercent: 100,
//         MinimumHealthyPercent: 0,
//       },
//     },
//   };
// });
//
// //
// // Notification
// //
//
// Resources.SNSTopic = {
//   Type: 'AWS::SNS::Topic',
//   Properties: {
//     TopicName: tagname(),
//   },
// };
//
// Resources.EventRule = {
//   Type: 'AWS::Events::Rule',
//   Properties: {
//     Description: 'EventRule',
//     EventPattern: {
//       'detail-type': [
//         'ECS Task State Change',
//         'ECS Container Instance State Change',
//       ],
//       detail: {
//         clusterArn: [clusterArn('ECSCluster')],
//       },
//     },
//     State: 'ENABLED',
//     Targets: [
//       { Arn: { Ref: 'SNSTopic' }, Id: tagname() },
//     ],
//   },
// };


Resources.ContainerInstances = {
  Type: 'AWS::AutoScaling::LaunchConfiguration',
  Properties: {
    AssociatePublicIpAddress: true,
    ImageId: { Ref: 'AmazonLinuxAMI' },
    SecurityGroups: [
      importValue('DefaultSecurityGroup'),
      { Ref: 'InstanceSecurityGroup' },
      // todo: APサーバ用 SG (import from mongodb)
    ],
    InstanceType: 't2.micro',
    IamInstanceProfile: { Ref: 'InstanceProfile' },
    KeyName: importValue('KeyName'),
    UserData: ECSClusterUserData(),
  },
};

Resources.ECSAutoScalingGroup = {
  Type: 'AWS::AutoScaling::AutoScalingGroup',
  Properties: {
    VPCZoneIdentifier: { Ref: 'SubnetID' },
    LaunchConfigurationName: { Ref: 'ContainerInstances' },
    MinSize: 1,
    MaxSize: 3,
    DesiredCapacity: 1,
    HealthCheckGracePeriod: 10, // ヘルスチェックの猶予期間
    Tags: [
      { Key: 'Name', Value: tagname(), PropagateAtLaunch: true },
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
        TopicARN: topicArn(importValue('AlertTopic')),
      },
    ],
    // Cooldown: 300, // 規模の拡大や縮小の完了後、次の規模の拡大や縮小が開始できるようになるまでの秒数
  },
  // CreationPolicy: {
  //   ResourceSignal: { Timeout: 'PT15M' },
  // },
  // UpdatePolicy: {
  //   AutoScalingReplacingUpdate: { WillReplace: true },
  // },

  //スケールイン時に Auto Scaling がどのインスタンスを終了するかを制御する
  //http://docs.aws.amazon.com/ja_jp/autoscaling/latest/userguide/as-instance-termination.html
  // TerminationPolicies: {
  // },
};

const stepAdjustment = (threshold, lower, upper, adj) => ({
  ScalingAdjustment: adj,
  MetricIntervalLowerBound: lower !== undefined ? lower - threshold : lower,
  MetricIntervalUpperBound: upper !== undefined ? upper - threshold : upper,
});

const ClusterThresholdMax = 65;
const ClusterThresholdMin = 15;

const clusterPolicy = ({ StepAdjustments }) => (
  {
    Type: 'AWS::AutoScaling::ScalingPolicy',
    Properties: {
      PolicyType: 'StepScaling',
      AutoScalingGroupName: { Ref: 'ECSAutoScalingGroup' },
      AdjustmentType: 'PercentChangeInCapacity',
      MetricAggregationType: 'Average',
      StepAdjustments,
    },
  }
);

Resources.ClusterScalingPolicyScaleOut = clusterPolicy({
  StepAdjustments: [
    stepAdjustment(ClusterThresholdMax, ClusterThresholdMax, 90, 10), // 65 < x < 90 10%増加
    stepAdjustment(ClusterThresholdMax, 90, undefined, 20), // 90 < x < 100 20%増加
  ],
});

Resources.ClusterScalingPolicyScaleIn = clusterPolicy({
  StepAdjustments: [
    stepAdjustment(ClusterThresholdMin, undefined, 10, -20), // 0 < x < 10 20%削減
    stepAdjustment(ClusterThresholdMin, 10, ClusterThresholdMin, -10), // 10 < x < 15 10%削減
  ],
});

const name = 'jquerywebide_terminal';

const ecrImage = (image, ver) => (
  { 'Fn::Join': ['.', [{ Ref: 'AWS::AccountId' }, `dkr.ecr.ap-northeast-1.amazonaws.com/${image}:${ver}`]] }
);

// 管理サービスの定義
Resources.ECSTerminalTask = {
  Type: 'AWS::ECS::TaskDefinition',
  Properties: {
    Family: name,
    // TaskRoleArn: null,
    NetworkMode: 'bridge',
    ContainerDefinitions: [
      {
        Name: name,
        Image: ecrImage(name, 'latest'),
        Cpu: 100,
        Memory: 100,
        DnsSearchDomains: [importValue('Domain')],
        PortMappings: [
          { ContainerPort: 4000 },
        ],
        Environment: [
          { Name: 'NFS', Value: { 'Fn::Join': ['/', [NFSHOST, { Ref: 'NFS' }]] } },
        ],
        LogConfiguration: {
          LogDriver: 'awslogs',
          Options: {
            'awslogs-group': { Ref: 'CloudwatchLogsGroup' },
            'awslogs-region': { Ref: 'AWS::Region' },
            'awslogs-stream-prefix': { Ref: 'AWS::StackName' },
          },
        },
      },
    ],
  },
};

//
// AssumeRole
//

const assumeRole = (service, managedArns) => (
  {
    Type: 'AWS::IAM::Role',
    Properties: {
      AssumeRolePolicyDocument: {
        Statement: [
          {
            Effect: 'Allow',
            Principal: { Service: [service] },
            Action: ['sts:AssumeRole'],
          },
        ],
      },
      Path: '/',
      ManagedPolicyArns: managedArns,
    },
  }
);

Resources.ECSServiceRole = assumeRole('ecs.amazonaws.com', [
  'arn:aws:iam::aws:policy/service-role/AmazonEC2ContainerServiceRole',
]);

Resources.AutoscalingRole = assumeRole('application-autoscaling.amazonaws.com', [
  'arn:aws:iam::aws:policy/service-role/AmazonEC2ContainerServiceAutoscaleRole',
]);

Resources.EC2Role = assumeRole('ec2.amazonaws.com', [
  'arn:aws:iam::aws:policy/service-role/AmazonEC2ContainerServiceforEC2Role',
]);

Resources.ECSTerminalService = {
  Type: 'AWS::ECS::Service',
  DependsOn: ['ALBListener'],
  Properties: {
    Cluster: { Ref: 'ECSCluster' },
    DesiredCount: 1,
    TaskDefinition: { Ref: 'ECSTerminalTask' },
    DeploymentConfiguration: {
      MaximumPercent: 100,
      MinimumHealthyPercent: 0,
    },
    LoadBalancers: [{
      TargetGroupArn: { Ref: 'ALBTargetGroup' },
      ContainerPort: 4000,
      ContainerName: name,
    }],
    Role: { Ref: 'ECSServiceRole' },
  },
};

Resources.ALBListener = {
  Type: 'AWS::ElasticLoadBalancingV2::Listener',
  Properties: {
    DefaultActions: [
      { Type: 'forward', TargetGroupArn: { Ref: 'ALBTargetGroup' } },
    ],
    LoadBalancerArn: { Ref: 'ApplicationLoadBalancer' },
    Port: 80,
    Protocol: 'HTTP',
  },
};

Resources.ApplicationLoadBalancer = {
  Type: 'AWS::ElasticLoadBalancingV2::LoadBalancer',
  Properties: {
    Scheme: 'internet-facing',
    Subnets: { Ref: 'SubnetID' },
    SecurityGroups: [{ Ref: 'LBSecurityGroup' }],
  },
};

Resources.ALBTargetGroup = {
  Type: 'AWS::ElasticLoadBalancingV2::TargetGroup',
  Properties: {
    HealthCheckIntervalSeconds: 60,
    UnhealthyThresholdCount: 10,
    HealthCheckPath: '/',
    Name: tagname(),
    Port: 80,
    Protocol: 'HTTP',
    VpcId: importValue('VpcId'),
  },
};

Resources.ServiceScalingTarget = {
  Type: 'AWS::ApplicationAutoScaling::ScalableTarget',
  DependsOn: 'ECSTerminalService',
  Properties: {
    MaxCapacity: 2,
    MinCapacity: 1,
    ResourceId: {
      'Fn::Join': ['/',
        ['service', { Ref: 'ECSCluster' }, { 'Fn::GetAtt': ['ECSTerminalService', 'Name'] }]]
    },
    RoleARN: { 'Fn::GetAtt': ['AutoscalingRole', 'Arn'] },
    ScalableDimension: 'ecs:service:DesiredCount',
    ServiceNamespace: 'ecs',
  },
};

const ServiceThresholdMax = 75;
const ServiceThresholdMin = 25;

const servicePolicy = ({ PolicyName, StepAdjustments }) => (
  {
    Type: 'AWS::ApplicationAutoScaling::ScalingPolicy',
    Properties: {
      PolicyName,
      PolicyType: 'StepScaling',
      ScalingTargetId: { Ref: 'ServiceScalingTarget' },
      StepScalingPolicyConfiguration: {
        AdjustmentType: 'PercentChangeInCapacity',
        Cooldown: 60,
        MetricAggregationType: 'Average',
        StepAdjustments,
      },
    },
  }
);

Resources.ServiceScalingPolicyScaleOut = servicePolicy({
  PolicyName: 'ScaleOut',
  StepAdjustments: [
    stepAdjustment(ServiceThresholdMax, ServiceThresholdMax, 90, 10), // 75 < x < 90 10%増加
    stepAdjustment(ServiceThresholdMax, 90, undefined, 20), // 90 < x < 100 20%増加
  ],
});

Resources.ServiceScalingPolicyScaleIn = servicePolicy({
  PolicyName: 'ScaleIn',
  StepAdjustments: [
    stepAdjustment(ServiceThresholdMin, undefined, 10, -20), // 0 < x < 10 20%削減
    stepAdjustment(ServiceThresholdMin, 10, ServiceThresholdMin, -10), // 10 < x < 25 10%削減
  ],
});

const serviceScale = ({ AlarmAction, MetricName, ComparisonOperator, Threshold }) => (
  {
    Type: 'AWS::CloudWatch::Alarm',
    Properties: {
      EvaluationPeriods: 1,
      Statistic: 'Average',
      Threshold,
      Period: 60,
      AlarmActions: [{ Ref: AlarmAction }],
      Namespace: 'AWS/ECS',
      Dimensions: [
        { Name: 'ClusterName', Value: { Ref: 'ECSCluster' } },
        { Name: 'ServiceName', Value: { 'Fn::GetAtt': ['ECSTerminalService', 'Name'] } },
      ],
      ComparisonOperator,
      MetricName,
    },
  }
);

Resources.ServiceScaleOut = serviceScale({
  AlarmAction: 'ServiceScalingPolicyScaleOut',
  MetricName: 'CPUUtilization',
  ComparisonOperator: 'GreaterThanThreshold',
  Threshold: ServiceThresholdMax,
});

Resources.ServiceScaleIn = serviceScale({
  AlarmAction: 'ServiceScalingPolicyScaleIn',
  MetricName: 'CPUUtilization',
  ComparisonOperator: 'LessThanThreshold',
  Threshold: ServiceThresholdMin,
});

const clusterScale = ({ AlarmAction, MetricName, ComparisonOperator, Threshold }) => (
  {
    Type: 'AWS::CloudWatch::Alarm',
    Properties: {
      EvaluationPeriods: 1,
      Statistic: 'Average',
      Threshold,
      Period: 60,
      AlarmActions: [{ Ref: AlarmAction }],
      Namespace: 'AWS/ECS',
      Dimensions: [
        { Name: 'ClusterName', Value: { Ref: 'ECSCluster' } },
      ],
      ComparisonOperator,
      MetricName,
    },
  }
);

Resources.ClusterScaleOut = clusterScale({
  AlarmAction: 'ClusterScalingPolicyScaleOut',
  MetricName: 'CPUReservation',
  ComparisonOperator: 'GreaterThanThreshold',
  Threshold: ClusterThresholdMax,
});

Resources.ClusterScaleIn = clusterScale({
  AlarmAction: 'ClusterScalingPolicyScaleIn',
  MetricName: 'CPUReservation',
  ComparisonOperator: 'LessThanThreshold',
  Threshold: ClusterThresholdMin,
});


// 'EC2Role': {
//   'Type': 'AWS::IAM::Role',
//   'Properties': {
//     'AssumeRolePolicyDocument': {
//       'Statement': [
//         {
//           'Effect': 'Allow',
//           'Principal': {
//             'Service': [
//               'ec2.amazonaws.com'
//             ]
//           },
//           'Action': [
//             'sts:AssumeRole'
//           ]
//         }
//       ]
//     }
//     ,
//     'Path': '/',
//     'Policies': [
//       {
//         'PolicyName': 'ecs-service',
//         'PolicyDocument': {
//           'Statement': [
//             {
//               'Effect': 'Allow',
//               'Action': [
//                 'ecs:CreateCluster',
//                 'ecs:DeregisterContainerInstance',
//                 'ecs:DiscoverPollEndpoint',
//                 'ecs:Poll',
//                 'ecs:RegisterContainerInstance',
//                 'ecs:StartTelemetrySession',
//                 'ecs:Submit*',
//                 'logs:CreateLogStream',
//                 'logs:PutLogEvents'
//               ],
//               'Resource': '*'
//             }
//           ]
//         }
//       }
//     ]
//   }
// },
//
// 'EC2InstanceProfile': {
//   'Type': 'AWS::IAM::InstanceProfile',
//   'Properties': {
//     'Path': '/',
//     'Roles': [
//       {
//         'Ref': 'EC2Role'
//       }
//     ]
//   }
// }

//
// Outputs
//

const exportName = name => (
  { 'Fn::Join': ['-', [{ Ref: 'AWS::StackName' }, name]] }
);

Outputs.VpcId = {
  Description: 'VpcId',
  Value: importValue('VpcId'),
  Export: { Name: exportName('VpcId') },
};

Outputs.Domain = {
  Description: 'Domain',
  Value: importValue('Domain'),
  Export: { Name: exportName('Domain') },
};

Outputs.AccountId = {
  Description: 'AccountId',
  Value: { Ref: 'AWS::AccountId' },
  Export: { Name: exportName('AccountId') },
};

Outputs.NFS = {
  Description: 'NFS',
  Value: { 'Fn::Join': ['/', [NFSHOST, { Ref: 'NFS' }]] },
  Export: { Name: exportName('NFS') },
};

Outputs.MountNFS = {
  Description: 'NFS Mount Point.',
  Value: { 'Fn::Join': [':/', [{ 'Fn::GetAtt': ['StorageGW', 'PublicIp'] }, { Ref: 'NFS' }]] },
  Export: { Name: exportName('MountNFS') },
};

Outputs.ECSServiceRole = {
  Description: 'ECSServiceRole',
  Value: { Ref: 'ECSServiceRole' },
  Export: { Name: exportName('ECSServiceRole') },
};

Outputs.PublicSubnet0 = {
  Description: 'PublicSubnet0',
  Value: { 'Fn::Select': [0, { Ref: 'SubnetID' }] },
  Export: { Name: exportName('PublicSubnet0') },
};

Outputs.PublicSubnet1 = {
  Description: 'PublicSubnet1',
  Value: { 'Fn::Select': [1, { Ref: 'SubnetID' }] },
  Export: { Name: exportName('PublicSubnet1') },
};

Outputs.LBSecurityGroup = {
  Description: 'LBSecurityGroup',
  Value: { Ref: 'LBSecurityGroup' },
  Export: { Name: exportName('LBSecurityGroup') },
};

Outputs.PublicDomain = {
  Description: 'PublicDomain',
  Value: { Ref: 'PublicDomain' },
  Export: { Name: exportName('PublicDomain') },
};

Outputs.HostedZone = {
  Description: 'HostedZone',
  Value: { Ref: 'HostedZone' },
  Export: { Name: exportName('HostedZone') },
};

Outputs.Certificate = {
  Description: 'Certificate',
  Value: { Ref: 'Certificate' },
  Export: { Name: exportName('Certificate') },
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
