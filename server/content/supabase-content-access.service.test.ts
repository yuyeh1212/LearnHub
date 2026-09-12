import assert from 'node:assert/strict'
import test from 'node:test'
import type { SupabaseClient } from '@supabase/supabase-js'
import { SupabaseContentAccessService } from './supabase-content-access.service.js'

test('Supabase content access uses a private signed URL and preserves the download file name', async () => {
  const calls: unknown[] = []
  const client = {
    storage: {
      from: (bucket: string) => ({
        createSignedUrl: async (path: string, expiresIn: number, options?: unknown) => {
          calls.push({ bucket, path, expiresIn, options })
          return { data: { signedUrl: 'https://example.supabase.co/storage/v1/object/sign/learnhub-content/file?token=signed' }, error: null }
        },
      }),
    },
  } as unknown as Pick<SupabaseClient, 'storage'>
  const service = new SupabaseContentAccessService({
    bucket: 'learnhub-content',
    client,
    now: () => new Date('2026-09-12T00:00:00.000Z').getTime(),
    secretKey: 'server-only-secret-key',
    supabaseUrl: 'https://example.supabase.co',
    ttlSeconds: 900,
  })

  const access = await service.createAccess({
    assetId: '11111111-1111-4111-8111-111111111111',
    disposition: 'attachment',
    originalFileName: 'useFetch.ts',
    storageKey: 'demo/resources/useFetch.ts',
  })

  assert.equal(access.expiresAt, '2026-09-12T00:15:00.000Z')
  assert.deepEqual(calls, [{
    bucket: 'learnhub-content',
    path: 'demo/resources/useFetch.ts',
    expiresIn: 900,
    options: { download: 'useFetch.ts' },
  }])
})
