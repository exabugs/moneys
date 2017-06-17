cd $(cd $(dirname $0);pwd)

# export AWS_ACCESS_KEY_ID=
# export AWS_SECRET_ACCESS_KEY=

export PORT=8006
export AWS_REGION=ap-northeast-1
export AWS_BUCKET=jp.co.dreamarts.jcomsurvey2
export AWS_POOL_ID=ap-northeast-1:a40e4348-098a-4867-a79d-165d774f3f53
export HOST=jcm-sv.yi-manage.jp

node ../server/api_server.js
