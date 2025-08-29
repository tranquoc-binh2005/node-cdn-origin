import { Express } from 'express';

export interface CDNUploaderOptions {
  uploadDir?: string;
  port?: number;
  appUrl?: string;
  maxFileSize?: number;
  quality?: number;
}

export interface UploadResult {
  original: { url: string };
  compressed: { url: string };
  hash: string;
  datePath: string;
  timePath: string;
}

export interface ProcessedFile {
  buffer: Buffer;
  originalname?: string;
  mimetype?: string;
  size?: number;
}

export interface UploadOptions {
  filename?: string;
  mimetype?: string;
  prefix?: string;
}

export declare class CDNUploader {
  constructor(options?: CDNUploaderOptions);
  
  uploadDir: string;
  port: number;
  appUrl: string;
  maxFileSize: number;
  quality: number;
  
  setupDirectories(): void;
  setupMiddleware(): void;
  setupRoutes(): void;
  handleUpload(req: any, res: any): Promise<void>;
  processImage(file: ProcessedFile, prefix?: string): Promise<UploadResult>;
  
  // Main upload methods
  upload(file: Buffer | string | ProcessedFile, options?: UploadOptions): Promise<UploadResult>;
  uploadMultiple(files: (Buffer | string | ProcessedFile)[], options?: UploadOptions): Promise<(UploadResult & { success: boolean; error?: string })[]>;
  
  getMimeType(ext: string): string;
  start(): Promise<void>;
  stop(): void;
  getApp(): Express;
}

// Utility functions
export declare function createUploader(options?: CDNUploaderOptions): CDNUploader;
export declare function upload(file: Buffer | string | ProcessedFile, options?: CDNUploaderOptions & UploadOptions): Promise<UploadResult>;
export declare function uploadMultiple(files: (Buffer | string | ProcessedFile)[], options?: CDNUploaderOptions & UploadOptions): Promise<(UploadResult & { success: boolean; error?: string })[]>;
export declare function processImageBuffer(buffer: Buffer, options?: CDNUploaderOptions): Promise<UploadResult>;
export declare function compressImage(buffer: Buffer, quality?: number): Promise<Buffer>;

export default CDNUploader;
