const slack = require('./alert');

const event = {
  "Records": [{
    "EventSource": "aws:sns",
    "EventVersion": "1.0",
    "EventSubscriptionArn": "arn:aws:sns:ap-northeast-1:663889673734:JCOM_Alert:b4513965-52b9-4503-9972-0f5365daf6d1",
    "Sns": {
      "Type": "Notification",
      "MessageId": "6486bebf-ea0a-5cd9-af12-ef5ddca127db",
      "TopicArn": "arn:aws:sns:ap-northeast-1:663889673734:JCOM_Alert",
      "Subject": "ALARM: \"ImageResize Error\" in Asia Pacific - Tokyo",
      "Message": "{\"AlarmName\":\"ImageResize Error\",\"AlarmDescription\":\"ImageResize Error\",\"AWSAccountId\":\"663889673734\",\"NewStateValue\":\"ALARM\",\"NewStateReason\":\"Threshold Crossed: 1 datapoint [3.0 (14/07/17 02:58:00)] was greater than the threshold (2.0).\",\"StateChangeTime\":\"2017-07-14T03:03:07.717+0000\",\"Region\":\"Asia Pacific - Tokyo\",\"OldStateValue\":\"OK\",\"Trigger\":{\"MetricName\":\"Errors\",\"Namespace\":\"AWS/Lambda\",\"StatisticType\":\"Statistic\",\"Statistic\":\"SUM\",\"Unit\":null,\"Dimensions\":[{\"name\":\"FunctionName\",\"value\":\"image_resize\"}],\"Period\":300,\"EvaluationPeriods\":1,\"ComparisonOperator\":\"GreaterThanThreshold\",\"Threshold\":2.0,\"TreatMissingData\":\"- TreatMissingData:                    NonBreaching\",\"EvaluateLowSampleCountPercentile\":\"\"}}",
      "Timestamp": "2017-07-14T03:03:07.873Z",
      "SignatureVersion": "1",
      "Signature": "l099s8zVePKgsuq673++GoBelDBxUjL3HqHazmqhAUDf8s3X+v7dfDuMFBna9+EXSrEk7/cjZQ80nuJW59XrZ7PSQ7/mCIrjeu/RaWCgnsRP48RtJas+TM0KWK6tXYacu+2H7Kt5gzQShL4/etozEetHUqupdMUxCvIIZy/8e2HDp6tHWhIhofEL7pkl27OUTcQS8V1C7zt59IxpV6AWM1uvkMc3+n49FgDLkigLpmvHJZABmbFd/izK1+dMQx4ojq+FOP6bERIpB/1BBgeK184N4KYn4CB/B++LWv6wh6qnWipKDjCqwuLV3arILL9Gyze/Vbv9bKgnAWUV8dN4VA==",
      "SigningCertUrl": "https://sns.ap-northeast-1.amazonaws.com/SimpleNotificationService-b95095beb82e8f6a046b3aafc7f4149a.pem",
      "UnsubscribeUrl": "https://sns.ap-northeast-1.amazonaws.com/?Action=Unsubscribe&SubscriptionArn=arn:aws:sns:ap-northeast-1:663889673734:JCOM_Alert:b4513965-52b9-4503-9972-0f5365daf6d1",
      "MessageAttributes": {}
    }
  }]
};

slack.handler(event, {}, (err) => {

});
