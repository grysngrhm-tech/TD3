const fs = require('fs');
const path = require('path');

const seedPath = path.join(__dirname, '..', 'supabase', '002_seed.sql');
let content = fs.readFileSync(seedPath, 'utf-8');

// Replace budget IDs
content = content.replace(/'bud-pend-(\d+)'/g, (_, num) => `'b0de0001-0001-0001-0001-${num.padStart(12, '0')}'`);
content = content.replace(/'bud-oak-(\d+)'/g, (_, num) => `'b0de0002-0002-0002-0002-${num.padStart(12, '0')}'`);
content = content.replace(/'bud-rvs-(\d+)'/g, (_, num) => `'b0de0003-0003-0003-0003-${num.padStart(12, '0')}'`);
content = content.replace(/'bud-sns-(\d+)'/g, (_, num) => `'b0de0004-0004-0004-0004-${num.padStart(12, '0')}'`);

// Replace draw IDs
content = content.replace(/'draw-oak-(\d+)'/g, (_, num) => `'d0ae0002-0002-0002-0002-${num.padStart(12, '0')}'`);
content = content.replace(/'draw-rvs-(\d+)'/g, (_, num) => `'d0ae0003-0003-0003-0003-${num.padStart(12, '0')}'`);
content = content.replace(/'draw-sns-(\d+)'/g, (_, num) => `'d0ae0004-0004-0004-0004-${num.padStart(12, '0')}'`);

// Replace line IDs (with draw number in them like line-oak-1-001)
content = content.replace(/'line-oak-(\d+)-(\d+)'/g, (_, draw, num) => `'10ae0002-0002-${draw.padStart(4, '0')}-0002-${num.padStart(12, '0')}'`);
content = content.replace(/'line-rvs-(\d+)-(\d+)'/g, (_, draw, num) => `'10ae0003-0003-${draw.padStart(4, '0')}-0003-${num.padStart(12, '0')}'`);
content = content.replace(/'line-sns-(\d+)-(\d+)'/g, (_, draw, num) => `'10ae0004-0004-${draw.padStart(4, '0')}-0004-${num.padStart(12, '0')}'`);

// Replace invoice IDs
content = content.replace(/'inv-oak-(\d+)'/g, (_, num) => `'10e00002-0002-0002-0002-${num.padStart(12, '0')}'`);
content = content.replace(/'inv-rvs-(\d+)'/g, (_, num) => `'10e00003-0003-0003-0003-${num.padStart(12, '0')}'`);
content = content.replace(/'inv-sns-(\d+)'/g, (_, num) => `'10e00004-0004-0004-0004-${num.padStart(12, '0')}'`);

// Replace approval IDs
content = content.replace(/'apr-oak-(\d+)'/g, (_, num) => `'a0e00002-0002-0002-0002-${num.padStart(12, '0')}'`);
content = content.replace(/'apr-rvs-(\d+)'/g, (_, num) => `'a0e00003-0003-0003-0003-${num.padStart(12, '0')}'`);
content = content.replace(/'apr-sns-(\d+)'/g, (_, num) => `'a0e00004-0004-0004-0004-${num.padStart(12, '0')}'`);

// Replace audit IDs (including aud-hce for hill country estate)
content = content.replace(/'aud-oak-(\d+)'/g, (_, num) => `'a0d00002-0002-0002-0002-${num.padStart(12, '0')}'`);
content = content.replace(/'aud-rvs-(\d+)'/g, (_, num) => `'a0d00003-0003-0003-0003-${num.padStart(12, '0')}'`);
content = content.replace(/'aud-sns-(\d+)'/g, (_, num) => `'a0d00004-0004-0004-0004-${num.padStart(12, '0')}'`);
content = content.replace(/'aud-hce-(\d+)'/g, (_, num) => `'a0d00001-0001-0001-0001-${num.padStart(12, '0')}'`);

fs.writeFileSync(seedPath, content);
console.log('✅ Fixed all UUIDs in seed file');

