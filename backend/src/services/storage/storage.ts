import { LocalStorageProvider } from "./local-storage-provider";
import type { StorageProvider } from "./storage-provider";

/**
 * The one line that changes to move off local disk: swap this for
 * `new CloudinaryStorageProvider()` / `new S3StorageProvider()` etc. once
 * one exists — nothing else in the app (service, controller, routes)
 * knows or cares which implementation is active.
 */
export const storage: StorageProvider = new LocalStorageProvider();
