const fs = require('fs'); const content = fs.readFileSync(0, 'utf-8'); fs.writeFileSync(process.argv[2], content, 'utf-8'); console.log('OK');
