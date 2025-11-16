const fs = require('fs');
const path = require('path');
const comandosPath = path.join(__dirname, '..', 'comandos');
const files = fs.readdirSync(comandosPath).filter(f => f.endsWith('.js'));
for (const file of files) {
  const fp = path.join(comandosPath, file);
  const content = fs.readFileSync(fp, 'utf8');
  const m = content.match(/\benabled\s*:\s*(true|false)\b/);
  console.log(file, '->', m ? m[1] : 'MISSING');
}
