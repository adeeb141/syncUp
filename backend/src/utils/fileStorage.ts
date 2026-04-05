import fs from "fs/promises";
import path from "path";
import * as Y from "yjs";

const DATA_DIR = path.join(process.cwd(), "data");

export async function saveDocument(documentName: string, document: Y.Doc): Promise<void> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const binaryUpdate = Y.encodeStateAsUpdate(document);
    const filePath = path.join(DATA_DIR, `${documentName}.bin`);
    await fs.writeFile(filePath, Buffer.from(binaryUpdate));
    console.log(`Saved document ${documentName} to ${filePath}`);
  } catch (error) {
    console.error(`Error saving document ${documentName}:`, error);
  }
}

export async function loadDocument(documentName: string): Promise<Y.Doc> {
  const doc = new Y.Doc();
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const filePath = path.join(DATA_DIR, `${documentName}.bin`);
    const binaryData = await fs.readFile(filePath);
    Y.applyUpdate(doc, new Uint8Array(binaryData));
    console.log(`Loaded document ${documentName} from ${filePath}`);
  } catch (error: any) {
    if (error.code !== "ENOENT") {
      console.error(`Error loading document ${documentName}:`, error);
    }
  }
  return doc;
}
