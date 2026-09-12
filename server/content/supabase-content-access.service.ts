import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { ContentAccess, ContentAccessProvider, CreateContentAccessInput } from './content-access.service.js'

type SupabaseContentAccessServiceOptions = {
  bucket: string
  secretKey: string
  supabaseUrl: string
  ttlSeconds: number
  client?: Pick<SupabaseClient, 'storage'>
  now?: () => number
}

export class SupabaseContentAccessService implements ContentAccessProvider {
  private readonly bucket: string
  private readonly client: Pick<SupabaseClient, 'storage'>
  private readonly now: () => number
  private readonly ttlSeconds: number

  constructor({ bucket, secretKey, supabaseUrl, ttlSeconds, client, now = Date.now }: SupabaseContentAccessServiceOptions) {
    this.bucket = bucket
    this.ttlSeconds = ttlSeconds
    this.now = now
    this.client = client ?? createClient(supabaseUrl, secretKey, {
      auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
    })
  }

  async createAccess(input: CreateContentAccessInput): Promise<ContentAccess> {
    if (!input.storageKey) {
      throw new Error('A storage key is required to issue a Supabase content URL.')
    }

    const { data, error } = await this.client.storage
      .from(this.bucket)
      .createSignedUrl(
        input.storageKey,
        this.ttlSeconds,
        input.disposition === 'attachment' ? { download: input.originalFileName ?? true } : undefined,
      )

    if (error || !data?.signedUrl) {
      throw new Error('Supabase Storage could not issue a content URL.', { cause: error })
    }

    const expires = Math.floor(this.now() / 1_000) + this.ttlSeconds
    return { url: data.signedUrl, expiresAt: new Date(expires * 1_000).toISOString() }
  }
}
