import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../prisma/prisma.service'

const LINE_NOTIFY_API = 'https://notify-api.line.me/api/notify'

@Injectable()
export class LineNotifyService {
  private readonly logger = new Logger(LineNotifyService.name)

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async push(token: string, message: string): Promise<void> {
    try {
      const res = await fetch(LINE_NOTIFY_API, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ message }),
      })
      if (!res.ok) {
        this.logger.warn(`LINE Notify API error: ${res.status}`)
      }
    } catch (err) {
      this.logger.error(`LINE Notify push failed: ${String(err)}`)
    }
  }

  // LINE Notify OAuth: step 1 — build authorization URL
  buildAuthUrl(state: string): string {
    const clientId = this.config.getOrThrow<string>('LINE_NOTIFY_CLIENT_ID')
    const redirectUri = this.config.getOrThrow<string>('LINE_NOTIFY_REDIRECT_URI')
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: 'notify',
      state,
    })
    return `https://notify-bot.line.me/oauth/authorize?${params.toString()}`
  }

  // LINE Notify OAuth: step 2 — exchange code for token, save to wholesaler
  async exchangeAndSave(wholesalerUserId: bigint, code: string): Promise<void> {
    const clientId = this.config.getOrThrow<string>('LINE_NOTIFY_CLIENT_ID')
    const clientSecret = this.config.getOrThrow<string>('LINE_NOTIFY_CLIENT_SECRET')
    const redirectUri = this.config.getOrThrow<string>('LINE_NOTIFY_REDIRECT_URI')

    const res = await fetch('https://notify-bot.line.me/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    })

    if (!res.ok) {
      throw new Error(`LINE Notify token exchange failed: ${res.status}`)
    }

    const data = (await res.json()) as { access_token: string }

    await this.prisma.wholesaler.update({
      where: { userId: wholesalerUserId },
      data: { lineNotifyToken: data.access_token },
    })
  }

  async getTokenByUserId(userId: bigint): Promise<string | null> {
    const wholesaler = await this.prisma.wholesaler.findUnique({
      where: { userId },
      select: { lineNotifyToken: true },
    })
    return wholesaler?.lineNotifyToken ?? null
  }
}
