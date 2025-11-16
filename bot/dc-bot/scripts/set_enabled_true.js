const fs = require('fs');
const path = require('path');

const comandosPath = path.join(__dirname, '..', 'comandos');
const files = fs.readdirSync(comandosPath).filter(f => f.endsWith('.js'));
const changed = [];

for (const file of files) {
  const fp = path.join(comandosPath, file);
  let content = fs.readFileSync(fp, 'utf8');
  let original = content;

  // If explicit enabled:false -> replace with enabled: true
  content = content.replace(/\benabled\s*:\s*false\b/g, 'enabled: true');
  // If enabled:true already present, keep
  // If no enabled property, try to insert enabled: true after the name property or at module.exports
  if (!/\benabled\s*:\s*(?:true|false)\b/.test(content)) {
    // Try to find the name: 'xxx', line to insert after
    const nameMatch = content.match(/(name\s*:\s*['\"][\w\- ]+['\"]\s*,)/);
    if (nameMatch) {
      const insertAfter = nameMatch[1];
      content = content.replace(insertAfter, insertAfter + '\n  enabled: true,');
    } else {
      // fallback: insert at the start of module.exports object
      content = content.replace(/module\.exports\s*=\s*{/, "module.exports = {\n  enabled: true,");
    }
  }

  if (content !== original) {
    fs.writeFileSync(fp, content, 'utf8');
    changed.push(file);
  }
}

console.log('Files changed:', changed.length);
changed.forEach(f => console.log('- ' + f));
