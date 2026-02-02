import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'

export const r2 = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID!}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
})

export async function uploadHexToR2(params: { bucket: string; key: string; hex: string; contentType: string }) {
    const buffer = Buffer.from(params.hex, 'hex')

    await r2.send(
        new PutObjectCommand({
            Bucket: params.bucket,
            Key: params.key,
            Body: buffer,
            ContentType: params.contentType,
        })
    )

    return `https://pub-c76729f4096e4e008c08070f1ee35f4a.r2.dev/${params.key}`;
}