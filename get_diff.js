const fs = require('fs');

const page = fs.readFileSync('src/app/(dashboard)/system/page.tsx', 'utf8');
const loading = fs.readFileSync('src/app/(dashboard)/system/loading.tsx', 'utf8');

console.log("Analyzing...");
