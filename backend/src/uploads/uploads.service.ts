import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { randomUUID } from 'crypto'
import * as path from 'path'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_SIZE_BYTES = 5 * 1024 * 1024 // 5 MB

@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name)
  private readonly s3: S3Client
  private readonly bucket: string
  private readonly publicUrl: string

  constructor(private readonly config: ConfigService) {
    const endpoint = this.config.get<string>('S3_ENDPOINT')
    const region = this.config.get<string>('S3_REGION') ?? 'us-east-1'

    this.s3 = new S3Client({
      region,
      ...(endpoint && {
        endpoint,
        forcePathStyle: true, // required for MinIO
      }),
      credentials: {
        accessKeyId: this.config.getOrThrow<string>('S3_ACCESS_KEY'),
        secretAccessKey: this.config.getOrThrow<string>('S3_SECRET_KEY'),
      },
    })

    this.bucket = this.config.getOrThrow<string>('S3_BUCKET')
    this.publicUrl = this.config.getOrThrow<string>('S3_PUBLIC_URL').replace(/\/$/, '')
  }

  async createPresignedUpload(
    filename: string,
    contentType: string,
    folder = 'products',
  ): Promise<{ uploadUrl: string; objectUrl: string; key: string }> {
    if (!ALLOWED_TYPES.includes(contentType)) {
      throw new Error(`不支援的圖片格式：${contentType}`)
    }

    const ext = path.extname(filename) || '.jpg'
    const key = `${folder}/${randomUUID()}${ext}`

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
      Metadata: { originalName: encodeURIComponent(filename) },
    })

    const uploadUrl = await getSignedUrl(this.s3, command, { expiresIn: 300 })
    const objectUrl = `${this.publicUrl}/${key}`

    this.logger.debug(`Presigned URL created: ${key}`)
    return { uploadUrl, objectUrl, key }
  }
}
