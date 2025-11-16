const fs = require('fs');
const path = require('path');

const comandosPath = path.join(__dirname, '..', 'comandos');
const files = fs.readdirSync(comandosPath).filter(f => f.endsWith('.js'));
const changed = [];

for (const file of files) {
  const fp = path.join(comandosPath, file);
  let content = fs.readFileSync(fp, 'utf8');
  let original = content;

  // If file already has enabled: true/false
  if (/\benabled\s*:\s*true\b/.test(content)) {
    content = content.replace(/\benabled\s*:\s*true\b/, 'enabled: false');
  } else if (/\benabled\s*:\s*false\b/.test(content)) {
    content = content.replace(/\benabled\s*:\s*false\b/, 'enabled: true');
  } else {
    // Insert enabled: false after the first occurrence of "name: 'xxx'," or "name: \"xxx\","
    const nameMatch = content.match(/(name\s*:\s*['\"][-_a-zA-Z0-9 ]+['\"\]][\s\r\n]*,)/);
    if (nameMatch) {
      const insertAfter = nameMatch[1];
      content = content.replace(insertAfter, insertAfter + '\n  enabled: false,');
    } else {
      // fallback: insert near module.exports opening brace
      content = content.replace(/module\.exports\s*=\s*{/, "module.exports = {\n  enabled: false,");
    }
  }

  if (content !== original) {
    fs.writeFileSync(fp, content, 'utf8');
    changed.push(file);
  }
}

console.log('Files changed:', changed.length);
changed.forEach(f => console.log('- ' + f));
