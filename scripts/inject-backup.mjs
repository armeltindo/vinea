/**
 * inject-backup.mjs
 * Injecte le backup JSON (vinea_backup_2026-02-08.json) dans Supabase.
 * Tables cibles : church_services, app_config (attendance_assignments + permissions)
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = 'https://mbpzmazyulgetorncdiv.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1icHptYXp5dWxnZXRvcm5jZGl2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4OTYzNTEsImV4cCI6MjA4NzQ3MjM1MX0.Kx7rhNJXUnLyG09KjVG5lgR7xsQ8FdCkmxnwr8oyD2M';

const BACKUP_URL =
  'https://raw.githubusercontent.com/armeltindo/vinea/main/vinea_backup_2026-02-08.json';

// ─── Helpers ────────────────────────────────────────────────────────────────

async function supabaseUpsert(table, rows) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(rows),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`[${table}] HTTP ${res.status}: ${err}`);
  }
  return res;
}

async function supabaseUpsertConfig(key, value) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/app_config`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify({ key, value }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`[app_config/${key}] HTTP ${res.status}: ${err}`);
  }
  return res;
}

// ─── Mapping vinea_services → church_services ───────────────────────────────

function mapService(s) {
  return {
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
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('📥  Lecture du backup JSON local…');
  const backupPath = join(__dirname, 'vinea_backup_2026-02-08.json');
  const backup = JSON.parse(readFileSync(backupPath, 'utf8'));

  // ── 1. church_services ───────────────────────────────────────────────────
  const rawServices = backup.vinea_services ?? [];
  if (rawServices.length === 0) {
    console.log('⚠️  Aucun service trouvé dans le backup.');
  } else {
    console.log(`\n🔧  Injection de ${rawServices.length} services (church_services)…`);
    const services = rawServices.map(mapService);

    // Envoi par lots de 50 pour éviter les limites HTTP
    const CHUNK = 50;
    for (let i = 0; i < services.length; i += CHUNK) {
      const batch = services.slice(i, i + CHUNK);
      await supabaseUpsert('church_services', batch);
      console.log(`  ✔  Lot ${Math.floor(i / CHUNK) + 1} (${batch.length} enregistrements)`);
    }
    console.log(`✅  ${services.length} services injectés avec succès.`);
  }

  // ── 2. vinea_attendance_assignments_v2 → app_config ──────────────────────
  const assignments = backup.vinea_attendance_assignments_v2 ?? {};
  const assignmentCount = Object.keys(assignments).length;
  if (assignmentCount > 0) {
    console.log(`\n🔧  Sauvegarde de ${assignmentCount} assignations de présence (app_config)…`);
    await supabaseUpsertConfig('vinea_attendance_assignments_v2', assignments);
    console.log(`✅  Assignations sauvegardées dans app_config.`);
  }

  // ── 3. vinea_user_permissions → app_config ───────────────────────────────
  const permissions = backup.vinea_user_permissions ?? [];
  if (permissions.length > 0) {
    console.log(`\n🔧  Sauvegarde de ${permissions.length} permissions (app_config)…`);
    await supabaseUpsertConfig('vinea_user_permissions', permissions);
    console.log(`✅  Permissions sauvegardées dans app_config.`);
  }

  console.log('\n🎉  Injection terminée avec succès !');
}

main().catch((err) => {
  console.error('\n❌  Erreur :', err.message);
  process.exit(1);
});
