const fs=require('fs');
const f='i18n/zh_CN.properties';
let s=fs.readFileSync(f,'utf8');
if(!s.includes('common.loadFailedRetry=')) s=s.replace('common.retry=重新加载','common.retry=重新加载\ncommon.loadFailedRetry=加载失败，点击重试');
fs.writeFileSync(f,s);
const f2='i18n/default.properties';
let s2=fs.readFileSync(f2,'utf8');
if(!s2.includes('common.loadFailedRetry=')) s2=s2.replace('common.retry=Retry','common.retry=Retry\ncommon.loadFailedRetry=Load failed, click to retry');
fs.writeFileSync(f2,s2);
console.log('done');
EOF