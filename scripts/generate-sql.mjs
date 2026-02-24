/**
 * generate-sql.mjs
 * Lit le backup JSON local et génère un fichier SQL prêt à exécuter dans Supabase.
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const backupPath = join(__dirname, 'vinea_backup_2026-02-08.json');
const outputPath = join(__dirname, 'inject-backup.sql');

const backup = JSON.parse(readFileSync(backupPath, 'utf8'));

// ─── Helpers ────────────────────────────────────────────────────────────────

function esc(v) {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
  if (typeof v === 'number') return String(v);
  if (Array.isArray(v)) {
    // TEXT[] literal — single quotes required, double quotes are identifiers in PostgreSQL
    const items = v.map((i) => `'${String(i).replace(/'/g, "''")}'`);
    return `ARRAY[${items.join(', ')}]::TEXT[]`;
  }
  if (typeof v === 'object') {
    // JSONB literal
    return `'${JSON.stringify(v).replace(/'/g, "''")}'::JSONB`;
  }
  // Plain string
  return `'${String(v).replace(/'/g, "''")}'`;
}

function row(obj, cols) {
  return `(${cols.map((c) => esc(obj[c])).join(', ')})`;
}

const lines = [];
lines.push('-- ============================================================');
lines.push('-- Vinea — Injection backup 2026-02-08');
lines.push('-- Généré automatiquement — À exécuter dans l\'éditeur SQL Supabase');
lines.push('-- ============================================================');
lines.push('');

// ─── 1. church_services ─────────────────────────────────────────────────────

const rawServices = backup.vinea_services ?? [];
console.log(`Services trouvés : ${rawServices.length}`);

if (rawServices.length > 0) {
  lines.push('-- ────────────────────────────────────────────────────────────');
  lines.push(`-- 1. church_services (${rawServices.length} enregistrements)`);
  lines.push('-- ────────────────────────────────────────────────────────────');
  lines.push('');

  const cols = [
    'id', 'date', 'time', 'service_type', 'series',
    'speaker', 'worship_leader', 'praise_leader', 'moderator',
    'theme', 'scripture', 'content', 'ai_analysis', 'social_summary',
    'tags', 'youtube_link', 'facebook_link', 'audio_link', 'attendance',
  ];

  const colList = cols.join(', ');
  const updateClauses = cols
    .filter((c) => c !== 'id')
    .map((c) => `${c} = EXCLUDED.${c}`)
    .join(',\n    ');

  lines.push(`INSERT INTO church_services (${colList})`);
  lines.push('VALUES');

  const mappedServices = rawServices.map((s) => {
    const mapped = {
      id: s.id,
      date: s.date || null,
      time: s.time || null,
      service_type: s.serviceType || s.service_type || 'Culte',
      series: s.series || null,
      speaker: s.speaker || '',
      worship_leader: s.worshipLeader || s.worship_leader || null,
      praise_leader: s.praiseLeader || s.praise_leader || null,
      moderator: s.moderator || null,
      theme: s.theme || '',
      scripture: s.scripture || null,
      content: s.content || null,
      ai_analysis: s.aiAnalysis || s.ai_analysis || null,
      social_summary: s.socialSummary || s.social_summary || null,
      tags: Array.isArray(s.tags) ? s.tags : [],
      youtube_link: s.youtubeLink || s.youtube_link || null,
      facebook_link: s.facebookLink || s.facebook_link || null,
      audio_link: s.audioLink || s.audio_link || null,
      attendance: s.attendance ?? null,
    };
    return row(mapped, cols);
  });

  lines.push(mappedServices.join(',\n') + '');
  lines.push(`ON CONFLICT (id) DO UPDATE SET`);
  lines.push(`    ${updateClauses};`);
  lines.push('');
}

// ─── 2. vinea_attendance_assignments_v2 → app_config ────────────────────────

const assignments = backup.vinea_attendance_assignments_v2 ?? {};
const assignmentCount = Object.keys(assignments).length;

if (assignmentCount > 0) {
  console.log(`Assignations de présence : ${assignmentCount}`);
  lines.push('-- ────────────────────────────────────────────────────────────');
  lines.push(`-- 2. app_config — vinea_attendance_assignments_v2 (${assignmentCount} entrées)`);
  lines.push('-- ────────────────────────────────────────────────────────────');
  lines.push('');
  lines.push(`INSERT INTO app_config (key, value)`);
  lines.push(`VALUES ('vinea_attendance_assignments_v2', ${esc(assignments)})`);
  lines.push(`ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;`);
  lines.push('');
}

// ─── 3. vinea_user_permissions → app_config ─────────────────────────────────

const permissions = backup.vinea_user_permissions ?? [];

if (permissions.length > 0) {
  console.log(`Permissions : ${permissions.length}`);
  lines.push('-- ────────────────────────────────────────────────────────────');
  lines.push(`-- 3. app_config — vinea_user_permissions (${permissions.length} permissions)`);
  lines.push('-- ────────────────────────────────────────────────────────────');
  lines.push('');
  lines.push(`INSERT INTO app_config (key, value)`);
  lines.push(`VALUES ('vinea_user_permissions', '${JSON.stringify(permissions).replace(/'/g, "''")}'::JSONB)`);
  lines.push(`ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;`);
  lines.push('');
}

lines.push('-- ============================================================');
lines.push('-- Fin de l\'injection');
lines.push('-- ============================================================');

writeFileSync(outputPath, lines.join('\n'), 'utf8');
console.log(`\n✅  Fichier SQL généré : ${outputPath}`);
