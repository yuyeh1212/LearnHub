import 'dotenv/config'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { Pool } from 'pg'

const requiredSettings = [
  'DATABASE_URL',
  'SUPABASE_URL',
  'SUPABASE_SECRET_KEY',
  'SUPABASE_STORAGE_BUCKET',
]
const missingSettings = requiredSettings.filter((name) => !process.env[name])
if (missingSettings.length) {
  throw new Error(`Missing server-only settings: ${missingSettings.join(', ')}`)
}

const storageRoot = resolve(process.env.CONTENT_STORAGE_ROOT ?? 'storage/private')
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
  auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
})
const bucket = supabase.storage.from(process.env.SUPABASE_STORAGE_BUCKET)
const database = new Pool({ connectionString: process.env.DATABASE_URL })
const assets = [
  { key: 'demo/videos/flower.mp4', mediaType: 'video/mp4' },
  { key: 'demo/resources/useFetch.ts', mediaType: 'text/plain' },
]

async function updateAssetByteSize(storageKey, byteSize) {
  const result = await database.query(
    'UPDATE public.content_assets SET byte_size = $1 WHERE storage_key = $2',
    [byteSize, storageKey],
  )

  if (result.rowCount !== 1) {
    throw new Error(`Could not update metadata for ${storageKey}: asset row not found`)
  }
}

try {
  for (const asset of assets) {
    const body = await readFile(resolve(storageRoot, asset.key))
    const { error } = await bucket.upload(asset.key, body, {
      cacheControl: '3600',
      contentType: asset.mediaType,
      upsert: true,
    })
    if (error) {
      throw new Error(`Could not upload ${asset.key}: ${error.message}`)
    }

    await updateAssetByteSize(asset.key, body.byteLength)

    console.info(`Uploaded ${asset.key} (${body.byteLength} bytes).`)
  }
} finally {
  await database.end()
}
