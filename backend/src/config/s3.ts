import { S3Client } from "@aws-sdk/client-s3";
import dotenv from "dotenv";
dotenv.config();

let _s3: S3Client | null = null;

export function getS3(): S3Client {
  if (!_s3) {
    const accessKeyId = process.env.AWS_ACCESS_KEY;
    const secretAccessKey = process.env.AWS_SECRET_KEY;
    const region = process.env.AWS_REGION;

    if (!accessKeyId || !secretAccessKey || !region) {
      console.error("❌ AWS credentials missing!", {
        hasAccessKey: !!accessKeyId,
        hasSecretKey: !!secretAccessKey,
        hasRegion: !!region,
      });
    }

    _s3 = new S3Client({
      region: region!,
      credentials: {
        accessKeyId: accessKeyId!,
        secretAccessKey: secretAccessKey!,
      },
    });
  }
  return _s3;
}