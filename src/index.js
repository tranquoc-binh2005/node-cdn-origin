import express from 'express';
import multer from 'multer';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

export class CDNUploader {
    constructor(options = {}) {
        this.uploadDir = options.uploadDir || './data';
        this.port = options.port || 6868;
        this.appUrl = options.appUrl || `http://localhost:${this.port}`;
        this.maxFileSize = options.maxFileSize || 50 * 1024 * 1024; // 50MB
        this.quality = options.quality || 50; // WebP quality
        
        this.setupDirectories();
        this.setupMiddleware();
        this.setupRoutes();
    }

    setupDirectories() {
        fs.mkdirSync(this.uploadDir, { recursive: true });
        
        this.qualityDir = path.join(this.uploadDir, "storage", "quality");
        this.lowDir = path.join(this.uploadDir, "storage", "low");
        
        fs.mkdirSync(this.qualityDir, { recursive: true });
        fs.mkdirSync(this.lowDir, { recursive: true });
    }

    setupMiddleware() {
        this.app = express();
        this.app.use(express.json());
        
        const storage = multer.memoryStorage();
        this.upload = multer({ 
            storage, 
            limits: { fileSize: this.maxFileSize } 
        });
    }

    setupRoutes() {
        // Health check
        this.app.get("/health", (_, res) => res.json({ ok: true }));

        // Upload endpoint
        this.app.post("/upload", this.upload.single("file"), this.handleUpload.bind(this));

        // Static file serving
        this.app.use("/files", express.static(this.uploadDir, {
            setHeaders: (res, filePath) => {
                if (/\.[a-f0-9]{16}\./i.test(filePath) || /\/[a-f0-9]{16}$/.test(filePath)) {
                    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
                } else {
                    res.setHeader("Cache-Control", "public, max-age=60, s-maxage=600, stale-while-revalidate=120");
                }
            },
            fallthrough: false
        }));
    }

    // Main upload method - đơn giản và dễ sử dụng
    async upload(file, options = {}) {
        // Nếu file là Buffer, tạo object file
        if (Buffer.isBuffer(file)) {
            file = {
                buffer: file,
                originalname: options.filename || 'image.jpg',
                mimetype: options.mimetype || 'image/jpeg',
                size: file.length
            };
        }

        // Nếu file là string path, đọc file
        if (typeof file === 'string') {
            const buffer = fs.readFileSync(file);
            file = {
                buffer,
                originalname: path.basename(file),
                mimetype: this.getMimeType(path.extname(file)),
                size: buffer.length
            };
        }

        // Validate file
        if (!file || !file.buffer) {
            throw new Error('File is required');
        }

        if (file.size > this.maxFileSize) {
            throw new Error(`File size too large. Maximum allowed: ${this.maxFileSize / (1024 * 1024)}MB`);
        }

        // Process image
        return await this.processImage(file, options.prefix || '');
    }

    // Upload multiple files
    async uploadMultiple(files, options = {}) {
        if (!Array.isArray(files)) {
            files = [files];
        }

        const results = [];
        for (const file of files) {
            try {
                const result = await this.upload(file, options);
                results.push({ success: true, ...result });
            } catch (error) {
                results.push({ success: false, error: error.message });
            }
        }

        return results;
    }

    // Get MIME type from extension
    getMimeType(ext) {
        const mimeTypes = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.bmp': 'image/bmp',
            '.webp': 'image/webp'
        };
        return mimeTypes[ext.toLowerCase()] || 'image/jpeg';
    }

    async handleUpload(req, res) {
        try {
            // Validation
            if (!req.file) {
                return res.status(400).json({ 
                    success: false,
                    httpcode: 400,
                    error: "File is required" 
                });
            }

            if (req.file.size > this.maxFileSize) {
                return res.status(400).json({ 
                    success: false,
                    httpcode: 400,
                    error: `File size too large. Maximum allowed: ${this.maxFileSize / (1024 * 1024)}MB` 
                });
            }

            const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/bmp', 'image/webp'];
            if (!allowedMimeTypes.includes(req.file.mimetype)) {
                return res.status(400).json({ 
                    success: false,
                    httpcode: 400,
                    error: "Only image files are allowed. Supported formats: JPEG, PNG, GIF, BMP, WebP" 
                });
            }

            // Process file
            const result = await this.processImage(req.file, req.body.prefix);
            
            return res.json({ 
                success: true,
                httpcode: 200,
                ...result
            });

        } catch (error) {
            console.error('Upload error:', error);
            return res.status(500).json({ 
                success: false,
                httpcode: 500,
                error: "Internal server error" 
            });
        }
    }

    async processImage(file, prefix = '') {
        const timestamp = Date.now();
        const hash = crypto.createHash("sha256")
            .update(file.buffer)
            .update(timestamp.toString())
            .digest("hex")
            .slice(0, 16);

        const keyPrefix = prefix.replace(/[^a-zA-Z0-9/_-]/g, "");
        
        // Create time-based directory structure
        const now = new Date();
        const datePath = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
        const timePath = `${now.getHours().toString().padStart(2, '0')}`;
        
        const originalExt = path.extname(file.originalname || "").toLowerCase() || '.jpg';
        const fileName = `${hash}${originalExt}`;
        const webpFileName = `${hash}.webp`;
        
        const qualityPath = path.join(this.qualityDir, datePath, timePath, fileName);
        const lowPath = path.join(this.lowDir, datePath, timePath, webpFileName);
        
        // Create directories
        fs.mkdirSync(path.dirname(qualityPath), { recursive: true });
        fs.mkdirSync(path.dirname(lowPath), { recursive: true });
        
        // Save quality version (original)
        fs.writeFileSync(qualityPath, file.buffer);
        
        // Process and save compressed version
        const lowBuffer = await sharp(file.buffer)
            .webp({ quality: this.quality })
            .toBuffer();
        fs.writeFileSync(lowPath, lowBuffer);
        
        // Generate URLs
        const qualityUrl = `${this.appUrl}/files/storage/quality/${datePath}/${timePath}/${fileName}`;
        const lowUrl = `${this.appUrl}/files/storage/low/${datePath}/${timePath}/${webpFileName}`;
        
        return {
            original: { url: qualityUrl },
            compressed: { url: lowUrl },
            hash: hash,
            datePath: datePath,
            timePath: timePath
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

    stop() {
        if (this.server) {
            this.server.close();
        }
    }

    getApp() {
        return this.app;
    }
}

// Export utility functions
export const createUploader = (options) => new CDNUploader(options);

// Simple upload function - dễ sử dụng nhất
export const upload = async (file, options = {}) => {
    const uploader = new CDNUploader(options);
    return await uploader.upload(file, options);
};

// Upload multiple files
export const uploadMultiple = async (files, options = {}) => {
    const uploader = new CDNUploader(options);
    return await uploader.uploadMultiple(files, options);
};

// Process image buffer
export const processImageBuffer = async (buffer, options = {}) => {
    const uploader = new CDNUploader(options);
    return await uploader.processImage({ buffer, originalname: 'image.jpg' });
};

// Compress image
export const compressImage = async (buffer, quality = 50) => {
    return await sharp(buffer)
        .webp({ quality })
        .toBuffer();
};

// Default export
export default CDNUploader;
