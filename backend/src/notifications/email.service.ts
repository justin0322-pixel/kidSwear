import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as nodemailer from 'nodemailer'

type MailOptions = {
  to: string
  subject: string
  html: string
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name)
  private readonly transporter: nodemailer.Transporter | null

  constructor(private readonly config: ConfigService) {
    const host = this.config.get<string>('SMTP_HOST')
    const user = this.config.get<string>('SMTP_USER')
    const pass = this.config.get<string>('SMTP_PASS')

    if (!host || !user || !pass) {
      this.logger.warn('SMTP not configured — email notifications disabled')
      this.transporter = null
      return
    }

    this.transporter = nodemailer.createTransport({
      host,
      port: this.config.get<number>('SMTP_PORT') ?? 587,
      secure: false,
      auth: { user, pass },
    })
  }

  async send(options: MailOptions): Promise<void> {
    if (!this.transporter) return

    try {
      await this.transporter.sendMail({
        from: this.config.get<string>('SMTP_FROM') ?? 'noreply@kidswear.com',
        ...options,
      })
    } catch (err) {
      this.logger.error(`Failed to send email to ${options.to}: ${String(err)}`)
    }
  }

  async sendNewOrderNotification(to: string, orderNumber: string, retailerName: string): Promise<void> {
    await this.send({
      to,
      subject: `[童裝平台] 新訂單 ${orderNumber}`,
      html: `
        <h2>您有一筆新訂單</h2>
        <p><strong>訂單編號：</strong>${orderNumber}</p>
        <p><strong>零售商：</strong>${retailerName}</p>
        <p>請登入平台查看訂單詳情並進行處理。</p>
      `,
    })
  }

  async sendOrderStatusNotification(to: string, orderNumber: string, status: string): Promise<void> {
    const STATUS_LABEL: Record<string, string> = {
      paid: '已確認付款',
      processing: '備貨中',
      shipped: '已出貨',
      completed: '已完成',
      cancelled: '已取消',
    }
    await this.send({
      to,
      subject: `[童裝平台] 訂單 ${orderNumber} 狀態更新`,
      html: `
        <h2>您的訂單狀態已更新</h2>
        <p><strong>訂單編號：</strong>${orderNumber}</p>
        <p><strong>最新狀態：</strong>${STATUS_LABEL[status] ?? status}</p>
        <p>請登入平台查看訂單詳情。</p>
      `,
    })
  }
}
