import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { ENV } from "../_core/env";

export type StoredArtifact = {
  key: string;
  url: string;
};

function storageConfig() {
  if (ENV.storageProvider === "r2") {
    if (!ENV.r2AccountId || !ENV.r2AccessKeyId || !ENV.r2SecretAccessKey || !ENV.r2Bucket) {
      throw new Error("Cloudflare R2 is selected but its bucket credentials are incomplete.");
    }
    return {
      region: "auto",
      endpoint: `https://${ENV.r2AccountId}.r2.cloudflarestorage.com`,
      forcePathStyle: true,
      credentials: { accessKeyId: ENV.r2AccessKeyId, secretAccessKey: ENV.r2SecretAccessKey },
      bucket: ENV.r2Bucket,
      publicBaseUrl: ENV.r2PublicBaseUrl.replace(/\/$/, ""),
    };
  }
  if (ENV.storageProvider === "s3") {
    if (!ENV.awsAccessKeyId || !ENV.awsSecretAccessKey || !ENV.awsS3Bucket || !ENV.awsRegion) {
      throw new Error("Amazon S3 is selected but its bucket credentials are incomplete.");
    }
    return {
      region: ENV.awsRegion,
      endpoint: ENV.awsS3Endpoint || undefined,
      forcePathStyle: Boolean(ENV.awsS3Endpoint),
      credentials: { accessKeyId: ENV.awsAccessKeyId, secretAccessKey: ENV.awsSecretAccessKey },
      bucket: ENV.awsS3Bucket,
      publicBaseUrl: "",
    };
  }
  throw new Error("SYNTHIA_STORAGE_PROVIDER must be r2 or s3.");
}

function clientAndConfig() {
  const config = storageConfig();
  return {
    config,
    client: new S3Client({
      region: config.region,
      endpoint: config.endpoint,
      forcePathStyle: config.forcePathStyle,
      credentials: config.credentials,
    }),
  };
}

export async function putTaskArtifact(input: {
  taskId: string;
  filename: string;
  body: Uint8Array | string;
  contentType: string;
}) {
  const { client, config } = clientAndConfig();
  const safeFilename = input.filename.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 200);
  const key = `tasks/${input.taskId}/${Date.now()}-${safeFilename}`;
  await client.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      Body: input.body,
      ContentType: input.contentType,
      ServerSideEncryption: ENV.storageProvider === "s3" ? "AES256" : undefined,
    }),
  );
  const url = config.publicBaseUrl
    ? `${config.publicBaseUrl}/${key}`
    : await getSignedUrl(client, new GetObjectCommand({ Bucket: config.bucket, Key: key }), { expiresIn: 3_600 });
  return { key, url } satisfies StoredArtifact;
}

export async function getTaskArtifactUrl(key: string, expiresInSeconds = 3_600) {
  const { client, config } = clientAndConfig();
  if (config.publicBaseUrl) return `${config.publicBaseUrl}/${key}`;
  return getSignedUrl(client, new GetObjectCommand({ Bucket: config.bucket, Key: key }), { expiresIn: expiresInSeconds });
}
