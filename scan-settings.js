const fs=require('fs');
const s=fs.readFileSync('settings.yaml','utf8');
const m=s.match(/value: "([a-z-]+)"/g)||[];
const vals=new Set(m.map(x=>x.match(/"([a-z-]+)"/)[1]));
console.log([...vals].join(', '));
EOF