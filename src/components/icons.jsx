import React from 'react';

// アイコン
// 一覧 : https://material.io/icons/
// material-ui/lib/svg-icons/＜カテゴリ＞/＜アイコン名＞ のように指定
import IconDownload from 'material-ui/svg-icons/file/file-download';
import IconComment from 'material-ui/svg-icons/communication/comment';
import IconHome from 'material-ui/svg-icons/action/home';
import IconDelete from 'material-ui/svg-icons/action/delete';
import IconUpward from 'material-ui/svg-icons/navigation/arrow-upward';
import IconDownward from 'material-ui/svg-icons/navigation/arrow-downward';
import IconAdd from 'material-ui/svg-icons/content/add';
import IconClear from 'material-ui/svg-icons/content/clear';
import IconDetail from 'material-ui/svg-icons/image/details';

import IconSortAsc from 'react-icons/lib/fa/sort-asc';
import IconSortDesc from 'react-icons/lib/fa/sort-desc';
import IconSort from 'react-icons/lib/fa/sort';

export default {
  'file/file-download': <IconDownload />,
  'communication/comment': <IconComment />,
  'action/home': <IconHome />,
  'action/delete': <IconDelete />,
  'navigation/upward': <IconUpward />,
  'navigation/downward': <IconDownward />,
  'content/add': <IconAdd />,
  'content/clear': <IconClear />,
  'image/details': <IconDetail />,
  asc: <IconSortAsc />,
  desc: <IconSortDesc />,
  sort: <IconSort />,
};
