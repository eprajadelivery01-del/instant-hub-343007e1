import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Lovable Links Checker', () => {
  const findInDir = (dir: string, fileList: string[] = []) => {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        findInDir(filePath, fileList);
      } else if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
        fileList.push(filePath);
      }
    }
    
    return fileList;
  };

  it('should not contain lovableproject.com in any source file', () => {
    const srcDir = path.resolve(__dirname, '../../src');
    const files = findInDir(srcDir);
    
    let foundFiles: string[] = [];
    
    for (const file of files) {
      if (file.includes('logger.ts') || file.includes('no-lovable-links.test.ts')) continue;
      const content = fs.readFileSync(file, 'utf-8');
      if (content.includes('lovableproject.com')) {
        foundFiles.push(file);
      }
    }
    
    expect(foundFiles).toEqual([]);
  });
});
