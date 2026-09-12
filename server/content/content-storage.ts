import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { resolve, sep } from 'node:path'
import type { Readable } from 'node:stream'

export type ContentStorageObject = {
  createReadStream: (range?: { end: number; start: number }) => Readable
  size: number
}

export interface ContentStorage {
  open(storageKey: string): Promise<ContentStorageObject | null>
}

export class LocalContentStorage implements ContentStorage {
  private readonly rootPath: string
  private readonly rootPrefix: string

  constructor(rootPath: string) {
    this.rootPath = resolve(rootPath)
    this.rootPrefix = `${this.rootPath}${sep}`.toLocaleLowerCase('en-US')
  }

  async open(storageKey: string): Promise<ContentStorageObject | null> {
    const absolutePath = resolve(this.rootPath, storageKey)
    if (!absolutePath.toLocaleLowerCase('en-US').startsWith(this.rootPrefix)) {
      return null
    }

    try {
      const metadata = await stat(absolutePath)
      if (!metadata.isFile()) {
        return null
      }

      return {
        size: metadata.size,
        createReadStream: (range) => createReadStream(absolutePath, range),
      }
    } catch (error) {
      if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT') {
        return null
      }
      throw error
    }
  }
}
