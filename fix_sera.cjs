const fs = require('fs');
const path = require('path');

const replacements = [
  { from: /user/g, to: 'user' },
  { from: /User/g, to: 'User' },
  { from: /service/g, to: 'service' },
  { from: /Service/g, to: 'Service' },
  { from: /server/g, to: 'server' },
  { from: /Server/g, to: 'Server' },
  { from: /browser/g, to: 'browser' },
  { from: /Browser/g, to: 'Browser' },
  { from: /insert/g, to: 'insert' },
  { from: /Insert/g, to: 'Insert' },
  { from: /observer/g, to: 'observer' },
  { from: /Observer/g, to: 'Observer' }
];

function fixFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    let newContent = content;
    
    for (const rep of replacements) {
      newContent = newContent.replace(rep.from, rep.to);
    }
      
    if (content !== newContent) {
      fs.writeFileSync(filePath, newContent, 'utf8');
      console.log('Fixed:', filePath);
    }
  } catch (err) {}
}

function walkDir(dir) {
  if (dir.includes('node_modules') || dir.includes('.git') || dir.includes('dist')) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walkDir(fullPath);
    } else {
      if (fullPath.match(/\.(ts|tsx|js|jsx|cjs|mjs|json|css|sql|html|md|txt)$/)) {
        fixFile(fullPath);
      }
    }
  }
}

walkDir('.');
