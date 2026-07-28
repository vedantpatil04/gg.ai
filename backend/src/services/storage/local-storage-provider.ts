import fs from "fs/promises";
import path from "path";
import type { StorageProvider } from "./storage-provider";

const UPLOADS_ROOT = path.join(__dirname, "../../../uploads");
const AVATARS_DIR = path.join(UPLOADS_ROOT, "avatars");
const PUBLIC_PREFIX = "/uploads/avatars";

export class LocalStorageProvider implements StorageProvider {
  async save(buffer: Buffer, filename: string, _mimeType: string): Promise<string> {
    await fs.mkdir(AVATARS_DIR, { recursive: true });
    await fs.writeFile(path.join(AVATARS_DIR, filename), buffer);
    // App-relative, not absolute — the backend's origin isn't baked in, so
    // this stays correct across environments/ports. The frontend resolves
    // it against the API's origin at render time (see resolveAssetUrl).
    return `${PUBLIC_PREFIX}/${filename}`;
  }

  async delete(url: string): Promise<void> {
    if (!url.startsWith(PUBLIC_PREFIX)) return; // not ours to manage — no-op
    const filename = url.slice(PUBLIC_PREFIX.length + 1);
    // Reject anything that isn't a bare filename (defends against a
    // path-traversal-style value ever reaching here).
    if (!filename || filename.includes("/") || filename.includes("..")) return;
    try {
      await fs.unlink(path.join(AVATARS_DIR, filename));
    } catch (err) {
      // Already gone / never existed — fine, deletion is best-effort.
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
    }
  }
}
