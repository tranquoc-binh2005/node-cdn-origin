import express from 'express';
import multer from 'multer';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

// ===== Helper =====
function normalizeBaseUrl(base, port) {
  if (!base) return `http://127.0.0.1:${port}`;
  if (!/^https?:\/\//i.test(base)) base = `http://${base}`;
  try {
    const u = new URL(base);
    if (!u.port) u.port = String(port);
    return u.origin; // protocol + host + port
  } catch {
    return base.includes(':') ? base : `${base}:${port}`;
  }
}

function guessMime(name) {
  const ext = (name || '').toLowerCase().split('.').pop();
  return ({
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
    webp: 'image/webp', gif: 'image/gif', bmp: 'image/bmp'
  }[ext] || 'application/octet-stream');
}

async function uploadRemote(file, { baseUrl, prefix, filename, mimetype } = {}) {
  // Ưu tiên options.baseUrl → ENV → default VPS
  baseUrl = baseUrl || process.env.CDN_REMOTE_URL || process.env.APP_URL || 'http://161.248.146.206:6868';
  if (!/^https?:\/\//i.test(baseUrl)) baseUrl = `http://${baseUrl}`;
  baseUrl = baseUrl.replace(/\/+$/, '');

  let buffer, name, type;
  if (Buffer.isBuffer(file)) {
    buffer = file; name = filename || 'image.jpg'; type = mimetype || 'image/jpeg';
  } else if (typeof file === 'string') {
    buffer = fs.readFileSync(file);
    name = filename || path.basename(file) || 'image.jpg';
    type = mimetype || guessMime(name);
  } else if (file?.buffer) {
    buffer = file.buffer;
    name = file.originalname || filename || 'image.jpg';
    type = file.mimetype || mimetype || 'image/jpeg';
  } else {
    throw new Error('Invalid file input');
  }

  // Node 18+: fetch/FormData/Blob có sẵn
  const fd = new FormData();
  fd.append('file', new Blob([buffer], { type }), name);
  if (prefix) fd.append('prefix', String(prefix));

  const res = await fetch(`${baseUrl}/upload`, { method: 'POST', body: fd });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.success === false) {
    throw new Error(data?.error || `Upload failed with status ${res.status}`);
  }
  return data; // { success, original.url, compressed.url, ... }
}

export class CDNUploader {
  constructor(options = {}) {
    this.uploadDir = options.uploadDir || './data';
    this.port = options.port || 6868;
    // URL dùng khi chạy local-mode (tạo link trả về)
    this.appUrl = options.appUrl || process.env.APP_URL || `http://161.248.146.206:${this.port}`;

    this.maxFileSize = options.maxFileSize || 50 * 1024 * 1024;
    this.quality = options.quality || 50;

    // Server stack (để ai gọi trực tiếp vào VPS)
    this.app = express();
    this.app.use(express.json());
    const storage = multer.memoryStorage();
    this.uploadMw = multer({ storage, limits: { fileSize: this.maxFileSize } });

    // Health
    this.app.get('/health', (_, res) => res.json({ ok: true }));

    // Endpoint upload duy nhất (chạy ở VPS)
    this.app.post('/upload', this.uploadMw.single('file'), this.handleUpload.bind(this));

    // Static
    this.app.use('/files', express.static(this.uploadDir, {
      setHeaders: (res, filePath) => {
        if (/\.[a-f0-9]{16}\./i.test(filePath) || /\/[a-f0-9]{16}$/.test(filePath)) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        } else {
          res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=600, stale-while-revalidate=120');
        }
      },
      fallthrough: false
    }));
  }

  // Chỉ 1 API public: upload()
  // - Có options.baseUrl -> remote (VPS)
  // - Không có -> local (xử lý & lưu tại chỗ)
  async upload(file, options = {}) {
    if (options.baseUrl || process.env.CDN_REMOTE_URL || process.env.APP_URL) {
      return await uploadRemote(file, {
        baseUrl: options.baseUrl, prefix: options.prefix,
        filename: options.filename, mimetype: options.mimetype
      });
    }

    // LOCAL MODE
    // Chuẩn hóa input
    if (Buffer.isBuffer(file)) {
      file = {
        buffer: file,
        originalname: options.filename || 'image.jpg',
        mimetype: options.mimetype || 'image/jpeg',
        size: file.length
      };
    }
    if (typeof file === 'string') {
      const buffer = fs.readFileSync(file);
      file = {
        buffer,
        originalname: path.basename(file),
        mimetype: this.getMimeType(path.extname(file)),
        size: buffer.length
      };
    }

    if (!file || !file.buffer) throw new Error('File is required');
    if (file.size > this.maxFileSize) {
      throw new Error(`File size too large. Maximum allowed: ${this.maxFileSize / (1024 * 1024)}MB`);
    }

    return await this.processImage(file, options.prefix || '');
  }

  async handleUpload(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, httpcode: 400, error: 'File is required' });
      }
      if (req.file.size > this.maxFileSize) {
        return res.status(400).json({
          success: false, httpcode: 400,
          error: `File size too large. Maximum allowed: ${this.maxFileSize / (1024 * 1024)}MB`
        });
      }
      const allowed = ['image/jpeg','image/jpg','image/png','image/gif','image/bmp','image/webp'];
      if (!allowed.includes(req.file.mimetype)) {
        return res.status(400).json({
          success: false, httpcode: 400,
          error: 'Only image files are allowed. Supported formats: JPEG, PNG, GIF, BMP, WebP'
        });
      }
      const result = await this.processImage(req.file, req.body.prefix);
      return res.json({ success: true, httpcode: 200, ...result });
    } catch (e) {
      console.error('Upload error:', e);
      return res.status(500).json({ success: false, httpcode: 500, error: 'Internal server error' });
    }
  }

  getMimeType(ext) {
    const map = {
      '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
      '.gif': 'image/gif', '.bmp': 'image/bmp', '.webp': 'image/webp'
    };
    return map[ext.toLowerCase()] || 'image/jpeg';
  }

  async processImage(file, prefix = '') {
    const timestamp = Date.now();
    const hash = crypto.createHash('sha256')
      .update(file.buffer).update(String(timestamp))
      .digest('hex').slice(0, 16);

    const now = new Date();
    const datePath = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
    const timePath = `${String(now.getHours()).padStart(2,'0')}`;

    const originalExt = path.extname(file.originalname || '').toLowerCase() || '.jpg';
    const fileName = `${hash}${originalExt}`;
    const webpFileName = `${hash}.webp`;

    const qualityDir = path.join(this.uploadDir, 'storage', 'quality', datePath, timePath);
    const lowDir = path.join(this.uploadDir, 'storage', 'low', datePath, timePath);
    fs.mkdirSync(qualityDir, { recursive: true });
    fs.mkdirSync(lowDir, { recursive: true });

    const qualityPath = path.join(qualityDir, fileName);
    const lowPath = path.join(lowDir, webpFileName);

    fs.writeFileSync(qualityPath, file.buffer);

    const lowBuffer = await sharp(file.buffer).webp({ quality: this.quality }).toBuffer();
    fs.writeFileSync(lowPath, lowBuffer);

    const base = normalizeBaseUrl(this.appUrl, this.port);
    return {
      original: { url: `${base}/files/storage/quality/${datePath}/${timePath}/${fileName}` },
      compressed: { url: `${base}/files/storage/low/${datePath}/${timePath}/${webpFileName}` },
      hash, datePath, timePath
    };
  }

  start() {
    return new Promise((resolve) => {
      this.server = this.app.listen(this.port, () => {
        console.log(`CDN Uploader running on port ${this.port}`);
        console.log(`Upload directory: ${this.uploadDir}`);
        console.log(`App URL: ${this.appUrl}`);
        resolve();
      });
    });
  }

  stop() { if (this.server) this.server.close(); }
  getApp() { return this.app; }
}

// ===== Export API duy nhất để dùng phía client =====
export const upload = async (file, options = {}) => {
  const uploader = new CDNUploader(options);
  return await uploader.upload(file, options);
};

export default CDNUploader;
