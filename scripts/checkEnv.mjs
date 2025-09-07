#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const required = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'];

function loadEnvFile(name) {
  const p = path.resolve(process.cwd(), name);
  if (!fs.existsSync(p)) return;
  const content = fs.readFileSync(p, 'utf8');
  content.split(/\r?\n/).forEach(line => {
    if (!line || line.startsWith('#')) return;
    const idx = line.indexOf('=');
    if (idx === -1) return;
    const key = line.slice(0, idx).trim();
    if (!key) return;
    if (process.env[key]) return; // don't override existing
    const value = line.slice(idx + 1).trim();
    process.env[key] = value;
  });
}

// If vars not already provided, attempt to hydrate from local files
const initialMissing = required.filter(k => !process.env[k]);
if (initialMissing.length) {
  loadEnvFile('.env.local');
  loadEnvFile('.env');
}

const missing = required.filter(k => !process.env[k] || !process.env[k].trim());
if (missing.length) {
  console.error(`\n[env-check] Missing required env vars: ${missing.join(', ')}`);
  process.exit(1);
}
console.log('[env-check] OK');
