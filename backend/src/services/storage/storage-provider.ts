/**
 * The seam this phase's "cloud-ready" requirement hangs off of. Every
 * caller (profilePhoto.service.ts) talks to this interface only — never to
 * the filesystem directly — so swapping in Cloudinary/S3/Azure Blob later
 * is a matter of writing one new class and changing a single import in
 * `storage.ts`, not touching the service, controller, or routes.
 */
export interface StorageProvider {
  /**
   * Persists a file and returns a URL/path to store on the User document.
   * Implementations decide what that URL looks like (a local provider
   * returns an app-relative path like "/uploads/avatars/xyz.jpg"; a cloud
   * provider would return its own absolute CDN URL) — callers must treat
   * it as an opaque string, not assume a shape.
   */
  save(buffer: Buffer, filename: string, mimeType: string): Promise<string>;

  /**
   * Deletes a previously-saved file given the URL/path `save()` returned.
   * Must no-op quietly (not throw) for a URL the provider doesn't
   * recognize as its own — see LocalStorageProvider for why that matters.
   */
  delete(url: string): Promise<void>;
}
