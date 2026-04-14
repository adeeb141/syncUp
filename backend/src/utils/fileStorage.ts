import { PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { promises as fs } from "node:fs";
import path from "node:path";
import * as Y from "yjs";
import { getS3 } from "../config/s3";

function getYdocKey(documentName: string): string {
  return `ydocs/${documentName}.bin`;
}

function hasS3Config(): boolean {
  return Boolean(
    process.env.S3_BUCKET &&
      process.env.AWS_ACCESS_KEY &&
      process.env.AWS_SECRET_KEY &&
      process.env.AWS_REGION
  );
}

function getLocalYdocPath(documentName: string): string {
  const safeName = encodeURIComponent(documentName);
  return path.join(process.cwd(), "data", "ydocs", `${safeName}.bin`);
}

async function saveDocumentLocal(documentName: string, binaryUpdate: Uint8Array): Promise<void> {
  const filePath = getLocalYdocPath(documentName);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, Buffer.from(binaryUpdate));
  console.log(`Saved ydoc "${documentName}" locally (path: ${filePath})`);
}

async function loadDocumentLocal(documentName: string): Promise<Uint8Array | null> {
  const filePath = getLocalYdocPath(documentName);
  try {
    const bytes = await fs.readFile(filePath);
    console.log(`Loaded ydoc "${documentName}" locally (path: ${filePath})`);
    return new Uint8Array(bytes);
  } catch (error: any) {
    if (error?.code !== "ENOENT") {
      console.error(`Error loading local ydoc "${documentName}"`, error);
    }
    return null;
  }
}

export async function saveDocument(documentName: string, document: Y.Doc): Promise<void> {
  const binaryUpdate = Y.encodeStateAsUpdate(document);

  if (!hasS3Config()) {
    await saveDocumentLocal(documentName, binaryUpdate);
    return;
  }

  try {
    const key = getYdocKey(documentName);
    const s3 = getS3();

    await s3.send(
      new PutObjectCommand({
        Bucket: process.env.S3_BUCKET!,
        Key: key,
        Body: Buffer.from(binaryUpdate),
        ContentType: "application/octet-stream",
      })
    );

    console.log(`Saved ydoc "${documentName}" to S3 (key: ${key})`);
  } catch (error) {
    console.error(`Error saving ydoc "${documentName}" to S3:`, error);
    await saveDocumentLocal(documentName, binaryUpdate);
  }
}

export async function loadDocument(documentName: string): Promise<Y.Doc> {
  const doc = new Y.Doc();

  if (!hasS3Config()) {
    const localBytes = await loadDocumentLocal(documentName);
    if (localBytes) {
      Y.applyUpdate(doc, localBytes);
    }
    return doc;
  }

  try {
    const key = getYdocKey(documentName);
    const s3 = getS3();

    const response = await s3.send(
      new GetObjectCommand({
        Bucket: process.env.S3_BUCKET!,
        Key: key,
      })
    );

    const bodyBytes = await response.Body?.transformToByteArray();
    if (bodyBytes) {
      Y.applyUpdate(doc, new Uint8Array(bodyBytes));
      console.log(`Loaded ydoc "${documentName}" from S3 (key: ${key})`);
    }
  } catch (error: any) {
    if (error.name !== "NoSuchKey") {
      console.error(`Error loading ydoc "${documentName}" from S3:`, error);
    }

    const localBytes = await loadDocumentLocal(documentName);
    if (localBytes) {
      Y.applyUpdate(doc, localBytes);
    }
  }

  return doc;
}
