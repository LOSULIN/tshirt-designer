/**
 * Upload file size limits — leaf module for API / pro-upload.
 * No dependency on @/lib/constants or coordinate runtimes.
 */

export const MAX_FILE_SIZE_MB = 50;

export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
