import { createHmac, timingSafeEqual } from 'node:crypto'

export type ContentDisposition = 'attachment' | 'inline'

export type CreateContentAccessInput = {
  assetId: string
  disposition: ContentDisposition
  originalFileName?: string
  storageKey?: string
}

export type ContentAccess = {
  expiresAt: string
  url: string
}

export interface ContentAccessProvider {
  createAccess(input: CreateContentAccessInput): ContentAccess | Promise<ContentAccess>
}

type VerifyContentAccessInput = CreateContentAccessInput & {
  expires: number
  signature: string
}

type ContentAccessServiceOptions = {
  publicApiBaseUrl: string
  signingSecret: string
  ttlSeconds: number
  now?: () => number
}

function canonicalValue(input: VerifyContentAccessInput) {
  return `${input.assetId}.${input.expires}.${input.disposition}`
}

export class ContentAccessService {
  private readonly publicApiBaseUrl: string
  private readonly signingSecret: string
  private readonly ttlSeconds: number
  private readonly now: () => number

  constructor({ publicApiBaseUrl, signingSecret, ttlSeconds, now = Date.now }: ContentAccessServiceOptions) {
    this.publicApiBaseUrl = publicApiBaseUrl.replace(/\/$/, '')
    this.signingSecret = signingSecret
    this.ttlSeconds = ttlSeconds
    this.now = now
  }

  createAccess(input: CreateContentAccessInput) {
    const expires = Math.floor(this.now() / 1_000) + this.ttlSeconds
    const signature = this.sign({ ...input, expires, signature: '' })
    const url = new URL(`${this.publicApiBaseUrl}/content-assets/${encodeURIComponent(input.assetId)}`)
    url.searchParams.set('expires', String(expires))
    url.searchParams.set('disposition', input.disposition)
    url.searchParams.set('signature', signature)

    return {
      url: url.toString(),
      expiresAt: new Date(expires * 1_000).toISOString(),
    }
  }

  verifyAccess(input: VerifyContentAccessInput) {
    if (input.expires <= Math.floor(this.now() / 1_000)) {
      return false
    }

    const expected = Buffer.from(this.sign(input), 'hex')
    const received = Buffer.from(input.signature, 'hex')
    return received.length === expected.length && timingSafeEqual(received, expected)
  }

  private sign(input: VerifyContentAccessInput) {
    return createHmac('sha256', this.signingSecret)
      .update(canonicalValue(input))
      .digest('hex')
  }
}
