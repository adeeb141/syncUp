import { PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { s3 } from "../config/s3";
import * as Y from "yjs";

/**
 * S3 key for a Yjs document.
 * Pattern: ydocs/<documentName>.bin
 * The documentName typically comes from the Hocuspocus room name.
 */
function getYdocKey(documentName: string): string {
  return `ydocs/${documentName}.bin`;
}

export async function saveDocument(documentName: string, document: Y.Doc): Promise<void> {
  try {
    const binaryUpdate = Y.encodeStateAsUpdate(document);
    const key = getYdocKey(documentName);

    await s3.send(new PutObjectCommand({
      Bucket: process.env.S3_BUCKET!,
      Key: key,
      Body: Buffer.from(binaryUpdate),
      ContentType: "application/octet-stream",
    }));

    console.log(`Saved ydoc "${documentName}" to S3 (key: ${key})`);
  } catch (error) {
    console.error(`Error saving ydoc "${documentName}" to S3:`, error);
  }
}

export async function loadDocument(documentName: string): Promise<Y.Doc> {
  const doc = new Y.Doc();
  try {
    const key = getYdocKey(documentName);

    const response = await s3.send(new GetObjectCommand({
      Bucket: process.env.S3_BUCKET!,
      Key: key,
    }));

    const bodyBytes = await response.Body?.transformToByteArray();
    if (bodyBytes) {
      Y.applyUpdate(doc, new Uint8Array(bodyBytes));
      console.log(`Loaded ydoc "${documentName}" from S3 (key: ${key})`);
    }
  } catch (error: any) {
    // NoSuchKey means the document doesn't exist yet — that's fine
    if (error.name !== "NoSuchKey") {
      console.error(`Error loading ydoc "${documentName}" from S3:`, error);
    }
  }
  return doc;
}
