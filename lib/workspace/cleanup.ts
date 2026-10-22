/**
 * lib/workspace/cleanup.ts
 *
 * Retention backstops for Kith Workspace:
 *   - recordings left in the `ws-audio` bucket (upload succeeded but the note
 *     was never created, the tab closed, a delete failed, a function was
 *     killed…) are deleted once they are 30 minutes old;
 *   - notes stuck in "processing" are marked failed;
 *   - expired rate-limit counters are dropped.
 * Run daily from /api/cron/keepalive, and per user on each upload.
 */
import { createServiceRoleClient } from '@/lib/supabase/server';
import { deleteAudio } from './polish';

const BUCKET = 'ws-audio';
// Processing starts seconds after upload and finishes within 5 minutes, so
// any file older than this is a leftover.
const AUDIO_MAX_AGE_MS = 30 * 60 * 1000;
const STUCK_AFTER_MS = 15 * 60 * 1000;

type Service = ReturnType<typeof createServiceRoleClient>;

/** Deletes leftover recordings (older than 30 minutes) in one user's folder. Returns how many. */
export async function sweepUserAudio(service: Service, userId: string): Promise<number> {
  const { data: files } = await service.storage.from(BUCKET).list(userId, { limit: 1000 });
  const cutoff = Date.now() - AUDIO_MAX_AGE_MS;
  const old = (files ?? [])
    .filter(f => f.id && new Date(f.created_at || 0).getTime() < cutoff)
    .map(f => `${userId}/${f.name}`);
  if (!old.length) return 0;
  return (await deleteAudio(service, old)) ? old.length : 0;
}

export async function runWorkspaceCleanup(): Promise<{ audioDeleted: number; stuckFailed: number }> {
  const service = createServiceRoleClient();

  // Stuck notes → failed; their recordings are released for deletion.
  const { data: stuck } = await service.from('ws_notes')
    .update({ status: 'failed', error: 'Timed out', audio_paths: [] })
    .eq('status', 'processing').lt('updated_at', new Date(Date.now() - STUCK_AFTER_MS).toISOString())
    .select('id');

  let audioDeleted = 0;
  const { data: folders } = await service.storage.from(BUCKET).list('', { limit: 1000 });
  for (const f of folders ?? []) {
    if (f.id) continue; // top level holds only user folders (id is null for folders)
    audioDeleted += await sweepUserAudio(service, f.name);
  }

  await service.from('ws_rate_limits').delete().lt('window_start', new Date(Date.now() - 2 * 86400_000).toISOString());
  return { audioDeleted, stuckFailed: stuck?.length ?? 0 };
}
