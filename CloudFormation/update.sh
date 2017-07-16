

BUCKET=jp.co.dreamarts.cf.temp.temp.temp
STACK=mongodb1
REGION=ap-northeast-1
KeyName=jcomhonkey

FILE=${STACK}.json
AWS="aws --profile jcom_admin --region ${REGION}"

#node build.js > ${FILE}

#$AWS s3 cp ${FILE} s3://${BUCKET}/${FILE}

#  --template-url https://s3-${REGION}.amazonaws.com/${BUCKET}/${FILE} \
#  --parameters ParameterKey=KeyName,ParameterValue=${KeyName} \

$AWS cloudformation update-stack \
  --stack-name ${STACK} \
  --use-previous-template \
  --parameters ParameterKey=MongoDBVersion,ParameterValue=3.4.4-r2 \
  --parameters ParameterKey=KeyName,ParameterValue=${KeyName} \
  --capabilities CAPABILITY_IAM

# rm ${FILE}
