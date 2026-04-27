import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

type MailOptions = {
  to: string;
  subject: string;
  html: string;
};

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly transporter: nodemailer.Transporter | null;

  constructor(private readonly config: ConfigService) {
    const host = this.config.get<string>('SMTP_HOST');
    const user = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASS');

    if (!host || !user || !pass) {
      this.logger.warn('SMTP not configured — email notifications disabled');
      this.transporter = null;
      return;
    }

    this.transporter = nodemailer.createTransport({
      host,
      port: this.config.get<number>('SMTP_PORT') ?? 587,
      secure: false,
      auth: { user, pass },
    });
  }

  async send(options: MailOptions): Promise<void> {
    if (!this.transporter) return;

    try {
      await this.transporter.sendMail({
        from: this.config.get<string>('SMTP_FROM') ?? 'noreply@kidswear.com',
        ...options,
      });
    } catch (err) {
      this.logger.error(`Failed to send email to ${options.to}: ${String(err)}`);
    }
  }

  async sendNewOrderNotification(
    to: string,
    orderNumber: string,
    retailerName: string,
    total?: string,
    itemCount?: number,
  ): Promise<void> {
    const frontendUrl = this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:3000';
    const totalFormatted = total
      ? new Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'TWD', maximumFractionDigits: 0 }).format(Number(total))
      : '';

    await this.send({
      to,
      subject: `[童裝平台] 新訂單 ${orderNumber}`,
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">
          <div style="background:#1d4ed8;padding:20px 24px">
            <h1 style="color:#fff;margin:0;font-size:18px">童裝 B2B 平台</h1>
          </div>
          <div style="padding:24px">
            <h2 style="margin-top:0;font-size:16px;color:#111827">您有一筆新訂單 🎉</h2>
            <table style="width:100%;border-collapse:collapse;font-size:14px;color:#374151">
              <tr>
                <td style="padding:8px 0;border-bottom:1px solid #f3f4f6;color:#6b7280;width:40%">訂單編號</td>
                <td style="padding:8px 0;border-bottom:1px solid #f3f4f6;font-weight:600">${orderNumber}</td>
              </tr>
              <tr>
                <td style="padding:8px 0;border-bottom:1px solid #f3f4f6;color:#6b7280">零售商</td>
                <td style="padding:8px 0;border-bottom:1px solid #f3f4f6">${retailerName}</td>
              </tr>
              ${itemCount !== undefined ? `<tr><td style="padding:8px 0;border-bottom:1px solid #f3f4f6;color:#6b7280">商品數量</td><td style="padding:8px 0;border-bottom:1px solid #f3f4f6">${itemCount} 件</td></tr>` : ''}
              ${totalFormatted ? `<tr><td style="padding:8px 0;color:#6b7280">訂單金額</td><td style="padding:8px 0;font-weight:700;color:#1d4ed8;font-size:16px">${totalFormatted}</td></tr>` : ''}
            </table>
            <a href="${frontendUrl}/wholesaler/orders" style="display:inline-block;margin-top:20px;background:#1d4ed8;color:#fff;text-decoration:none;padding:10px 20px;border-radius:6px;font-size:14px;font-weight:600">
              前往處理訂單
            </a>
          </div>
          <div style="padding:12px 24px;background:#f9fafb;font-size:12px;color:#9ca3af">
            此信件由系統自動發送，請勿直接回覆。
          </div>
        </div>
      `,
    });
  }

  async sendOrderStatusNotification(
    to: string,
    orderNumber: string,
    status: string,
  ): Promise<void> {
    const STATUS_LABEL: Record<string, string> = {
      paid: '已確認付款',
      processing: '備貨中',
      shipped: '已出貨',
      completed: '已完成',
      cancelled: '已取消',
    };
    const STATUS_COLOR: Record<string, string> = {
      paid: '#16a34a',
      processing: '#d97706',
      shipped: '#2563eb',
      completed: '#16a34a',
      cancelled: '#dc2626',
    };
    const frontendUrl = this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:3000';
    const label = STATUS_LABEL[status] ?? status;
    const color = STATUS_COLOR[status] ?? '#374151';

    await this.send({
      to,
      subject: `[童裝平台] 訂單 ${orderNumber} 狀態更新`,
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">
          <div style="background:#1d4ed8;padding:20px 24px">
            <h1 style="color:#fff;margin:0;font-size:18px">童裝 B2B 平台</h1>
          </div>
          <div style="padding:24px">
            <h2 style="margin-top:0;font-size:16px;color:#111827">您的訂單狀態已更新</h2>
            <table style="width:100%;border-collapse:collapse;font-size:14px;color:#374151">
              <tr>
                <td style="padding:8px 0;border-bottom:1px solid #f3f4f6;color:#6b7280;width:40%">訂單編號</td>
                <td style="padding:8px 0;border-bottom:1px solid #f3f4f6;font-weight:600">${orderNumber}</td>
              </tr>
              <tr>
                <td style="padding:8px 0;color:#6b7280">最新狀態</td>
                <td style="padding:8px 0;font-weight:700;color:${color}">${label}</td>
              </tr>
            </table>
            <a href="${frontendUrl}/retailer/orders" style="display:inline-block;margin-top:20px;background:#1d4ed8;color:#fff;text-decoration:none;padding:10px 20px;border-radius:6px;font-size:14px;font-weight:600">
              查看訂單詳情
            </a>
          </div>
          <div style="padding:12px 24px;background:#f9fafb;font-size:12px;color:#9ca3af">
            此信件由系統自動發送，請勿直接回覆。
          </div>
        </div>
      `,
    });
  }
}
