const fs = require('fs');
const path = require('path');

const replacements = [
  { from: /node/g, to: 'node' },
  { from: /Node/g, to: 'Node' },
  { from: /now/g, to: 'now' },
  { from: /Now/g, to: 'Now' },
  { from: /unknown/g, to: 'unknown' },
  { from: /Unknown/g, to: 'Unknown' },
  { from: /nor/g, to: 'nor' },
  { from: /Nor/g, to: 'Nor' },
  { from: /not(?=[^a-zA-ZÀ-ÿ]|$)/g, to: 'not' },
  { from: /not-/g, to: 'not-' },
  { from: /Not/g, to: 'Not' },
  { from: /note/g, to: 'note' },
  { from: /Note/g, to: 'Note' },
  { from: /normal/g, to: 'normal' },
  { from: /Normal/g, to: 'Normal' },
  { from: /anon/g, to: 'anon' },
  { from: /Anon/g, to: 'Anon' },
  { from: /none/g, to: 'none' },
  { from: /None/g, to: 'None' },
  { from: /popover/g, to: 'popover' },
  { from: /Popover/g, to: 'Popover' },
  { from: /no carrinho/g, to: 'no carrinho' },
  { from: /no cardápio/g, to: 'no cardápio' },
  { from: /igual no /g, to: 'igual no ' },
  { from: /No linha/g, to: 'No linha' },
  { from: /technologies/g, to: 'technologies' },
  { from: /notify/g, to: 'notify' },
  { from: /notification/g, to: 'notification' },
  { from: /Notify/g, to: 'Notify' },
  { from: /Notification/g, to: 'Notification' }
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
