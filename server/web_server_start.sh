cd $(cd $(dirname $0);pwd)

cd ../build

export PORT=8007
export API_URL=http://127.0.0.1:8006/
#export API_URL=https://jcm-sv.yi-manage.jp/


node ../server/web_server.js
