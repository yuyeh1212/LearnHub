import type { Pool } from 'pg'

export type ContentAssetRecord = {
  id: string
  storageKey: string
  mediaType: string
  originalFileName: string
  byteSize: number | null
}

export interface ContentRepository {
  findById(assetId: string): Promise<ContentAssetRecord | null>
}

export class PostgresContentRepository implements ContentRepository {
  constructor(private readonly pool: Pool) {}

  async findById(assetId: string): Promise<ContentAssetRecord | null> {
    const result = await this.pool.query<ContentAssetRecord>(
      `SELECT id, storage_key AS "storageKey", media_type AS "mediaType",
        original_file_name AS "originalFileName", byte_size AS "byteSize"
       FROM content_assets
       WHERE id = $1`,
      [assetId],
    )

    const asset = result.rows[0]
    return asset ? { ...asset, byteSize: asset.byteSize === null ? null : Number(asset.byteSize) } : null
  }
}
