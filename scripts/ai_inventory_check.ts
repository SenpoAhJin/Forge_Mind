/**
 * AI Feature Inventory Check
 * Searches for evidence of 7 AI features in the codebase
 * 
 * NOTE: This is a Node.js utility script, run via `npx tsx` (not compiled by React Native tsconfig)
 * @ts-nocheck
 */

import { promises as fs } from 'node:fs';
import * as path from 'node:path';

interface SearchResult {
  file: string;
  line: number;
  content: string;
}

async function searchFiles(dir: string, pattern: RegExp, extensions: string[]): Promise<SearchResult[]> {
  const results: SearchResult[] = [];
  
  async function walk(currentDir: string): Promise<void> {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist') {
          continue;
        }
        await walk(fullPath);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        if (extensions.includes(ext)) {
          const content = await fs.readFile(fullPath, 'utf-8');
          const lines = content.split('\n');
          
          lines.forEach((line, index) => {
            if (pattern.test(line)) {
              results.push({
                file: fullPath,
                line: index + 1,
                content: line.trim(),
              });
            }
          });
        }
      }
    }
  }
  
  await walk(dir);
  return results;
}

async function main(): Promise<void> {
  const mobileRoot = path.join(process.cwd(), '..');
  
  console.log('=== AI FEATURE INVENTORY ===\n');
  
  // 1. Attire Matching
  console.log('1. ATTIRE MATCHING:');
  const matchResults = await searchFiles(
    path.join(mobileRoot, 'src'),
    /(match|matching|matcher)/i,
    ['.ts', '.tsx']
  );
  console.log(`   Found ${matchResults.length} references`);
  if (matchResults.length > 0 && matchResults.length <= 10) {
    matchResults.slice(0, 10).forEach(r => {
      const shortPath = r.file.replace(mobileRoot, '').replace(/\\/g, '/');
      console.log(`   - ${shortPath}:${r.line}`);
    });
  }
  console.log('');
  
  // 2. Suggestions
  console.log('2. ATTIRE SUGGESTIONS:');
  const suggestionResults = await searchFiles(
    path.join(mobileRoot, 'src'),
    /(suggest|suggestion|recommend)/i,
    ['.ts', '.tsx']
  );
  console.log(`   Found ${suggestionResults.length} references`);
  console.log('');
  
  // 3. Budgeting
  console.log('3. BUDGETING:');
  const budgetResults = await searchFiles(
    path.join(mobileRoot, 'src'),
    /(budget|cost|price.*predict|forecast.*budget)/i,
    ['.ts', '.tsx']
  );
  console.log(`   Found ${budgetResults.length} references`);
  console.log('');
  
  // 4. Readiness Forecast
  console.log('4. READINESS FORECAST:');
  const readinessResults = await searchFiles(
    path.join(mobileRoot, 'src'),
    /(readiness|forecast|completion.*predict)/i,
    ['.ts', '.tsx']
  );
  console.log(`   Found ${readinessResults.length} references`);
  console.log('');
  
  // 5. Listing Screener
  console.log('5. LISTING SCREENER:');
  const screenerResults = await searchFiles(
    path.join(mobileRoot, 'src'),
    /(screen|moderat|filter|blocklist|wordlist)/i,
    ['.ts', '.tsx']
  );
  console.log(`   Found ${screenerResults.length} references`);
  if (screenerResults.length > 0 && screenerResults.length <= 5) {
    screenerResults.slice(0, 5).forEach(r => {
      const shortPath = r.file.replace(mobileRoot, '').replace(/\\/g, '/');
      console.log(`   - ${shortPath}:${r.line}`);
    });
  }
  console.log('');
  
  // 6. Photo Categorization
  console.log('6. PHOTO CATEGORIZATION:');
  const photoResults = await searchFiles(
    path.join(mobileRoot, 'src'),
    /(photo.*categ|image.*classif|photo.*tag)/i,
    ['.ts', '.tsx']
  );
  console.log(`   Found ${photoResults.length} references`);
  console.log('');
  
  // 7. Voice Input
  console.log('7. VOICE INPUT/TRANSCRIPTION:');
  const voiceResults = await searchFiles(
    path.join(mobileRoot, 'src'),
    /(voice|speech|transcri|audio.*input)/i,
    ['.ts', '.tsx']
  );
  console.log(`   Found ${voiceResults.length} references`);
  console.log('');
}

main().catch(console.error);
