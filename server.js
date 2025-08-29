// server.js
import express from "express";
import multer from "multer";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const app = express();
const UPLOAD_DIR = process.env.UPLOAD_DIR || "./data";
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// Tạo thư mục logs
const LOG_DIR = 'logs';
fs.mkdirSync(LOG_DIR, { recursive: true });

// Tạo file log
const logFile = path.join(LOG_DIR, 'server.log');

// Override console.error để chỉ lưu error vào file
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

// console.log chỉ hiển thị trên terminal, không ghi vào file
console.log = function(...args) {
    // Chỉ hiển thị trên terminal
    originalConsoleLog.apply(console, args);
};

// console.error ghi vào file log và hiển thị trên terminal
console.error = function(...args) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [ERROR] ${args.join(' ')}\n`;
    
    // Ghi vào file log
    try {
        fs.appendFileSync(logFile, logMessage);
    } catch (error) {
        // Nếu không ghi được file, fallback về console
        originalConsoleError('Failed to write to log file:', error);
    }
    
    // Vẫn hiển thị trên terminal
    originalConsoleError.apply(console, args);
};

// Tạo các thư mục con
const QUALITY_DIR = path.join(UPLOAD_DIR, "storage", "quality");
const LOW_DIR = path.join(UPLOAD_DIR, "storage", "low");
fs.mkdirSync(QUALITY_DIR, { recursive: true });
fs.mkdirSync(LOW_DIR, { recursive: true });

const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } }); // 50MB

// Middleware để parse JSON
app.use(express.json());

app.get("/health", (_, res) => res.json({ ok: true }));

app.post("/upload", upload.single("file"), async (req, res) => {
    try {
        console.log(`Upload request received: ${req.file?.originalname || 'No file'}`);
        
        // Validation 1: Kiểm tra file có tồn tại không
        if (!req.file) {
            console.log('Upload failed: No file provided');
            return res.status(400).json({ 
                success: false,
                httpcode: 400,
                error: "File is required" 
            });
        }

        // Validation 2: Kiểm tra kích thước file
        const maxSize = 50 * 1024 * 1024; // 50MB
        if (req.file.size > maxSize) {
            console.log(`Upload failed: File too large - ${req.file.size} bytes`);
            return res.status(400).json({ 
                success: false,
                httpcode: 400,
                error: `File size too large. Maximum allowed: ${maxSize / (1024 * 1024)}MB` 
            });
        }

        // Validation 3: Kiểm tra MIME type
        const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/bmp', 'image/webp'];
        if (!allowedMimeTypes.includes(req.file.mimetype)) {
            console.log(`Upload failed: Invalid MIME type - ${req.file.mimetype}`);
            return res.status(400).json({ 
                success: false,
                httpcode: 400,
                error: "Only image files are allowed. Supported formats: JPEG, PNG, GIF, BMP, WebP" 
            });
        }

        // Validation 4: Kiểm tra extension
        const originalExt = path.extname(req.file.originalname || "").toLowerCase();
        const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];
        if (originalExt && !allowedExtensions.includes(originalExt)) {
            console.log(`Upload failed: Invalid extension - ${originalExt}`);
            return res.status(400).json({ 
                success: false,
                httpcode: 400,
                error: "Invalid file extension. Supported extensions: .jpg, .jpeg, .png, .gif, .bmp, .webp" 
            });
        }

        // Validation 5: Kiểm tra buffer có dữ liệu không
        if (!req.file.buffer || req.file.buffer.length === 0) {
            console.log('Upload failed: Empty or corrupted file');
            return res.status(400).json({ 
                success: false,
                httpcode: 400,
                error: "File is empty or corrupted" 
            });
        }

        console.log(`File validation passed: ${req.file.originalname} (${req.file.size} bytes, ${req.file.mimetype})`);

        // Tạo hash cho file với timestamp để tránh trùng lặp
        const timestamp = Date.now();
        const hash = crypto.createHash("sha256")
            .update(req.file.buffer)
            .update(timestamp.toString())
            .digest("hex")
            .slice(0, 16);
        const keyPrefix = (req.body.prefix || "").replace(/[^a-zA-Z0-9/_-]/g, "");
        
        // Tạo cấu trúc thư mục theo thời gian (ngày-tháng-năm/giờ)
        const now = new Date();
        const datePath = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
        const timePath = `${now.getHours().toString().padStart(2, '0')}`; // Chỉ giữ giờ (14 = 2h chiều)
        
        // Lấy extension gốc
        const format = originalExt || '.jpg'; // Mặc định .jpg nếu không có extension
        
        // Tạo tên file chỉ còn hash (không còn tên gốc)
        const fileName = `${hash}${format}`;
        const webpFileName = `${hash}.webp`;
        
        // Đường dẫn đầy đủ cho cả 2 phiên bản
        const qualityPath = path.join(QUALITY_DIR, datePath, timePath, fileName);
        const lowPath = path.join(LOW_DIR, datePath, timePath, webpFileName);
        
        console.log(`Creating directories: ${path.dirname(qualityPath)}`);
        
        // Tạo thư mục theo ngày và thời gian
        fs.mkdirSync(path.dirname(qualityPath), { recursive: true });
        fs.mkdirSync(path.dirname(lowPath), { recursive: true });
        
        // Xử lý ảnh quality (100% - giữ nguyên chất lượng và định dạng)
        let qualityBuffer = req.file.buffer;
        
        console.log('Processing image: Creating quality version (100%)');
        
        // Xử lý ảnh low (50% chất lượng và chuyển đổi sang WebP)
        console.log('Processing image: Creating compressed version (50% WebP)');
        let lowBuffer = await sharp(req.file.buffer)
            .webp({ quality: 50 })
            .toBuffer();
        
        // Lưu cả 2 phiên bản
        fs.writeFileSync(qualityPath, qualityBuffer);
        fs.writeFileSync(lowPath, lowBuffer);
        
        console.log(`Files saved: Quality=${qualityPath}, Low=${lowPath}`);
        
        // Tạo URLs công khai với APP_URL từ environment
        const appUrl = process.env.APP_URL || "http://localhost:3000";
        
        // Validation: Kiểm tra APP_URL có hợp lệ không
        if (!appUrl || appUrl === "undefined") {
            console.error('Invalid APP_URL environment variable:', process.env.APP_URL);
            return res.status(500).json({ 
                success: false,
                httpcode: 500,
                error: "Server configuration error: Invalid APP_URL" 
            });
        }
        
        const qualityUrl = `${appUrl}/files/storage/quality/${datePath}/${timePath}/${fileName}`;
        const lowUrl = `${appUrl}/files/storage/low/${datePath}/${timePath}/${webpFileName}`;
        
        console.log(`Upload successful: ${req.file.originalname} -> Hash: ${hash}`);
        console.log(`Quality URL: ${qualityUrl}`);
        console.log(`Low URL: ${lowUrl}`);
        
        return res.json({ 
            success: true,
            httpcode: 200,
            original: {
                url: qualityUrl
            },
            compressed: {
                url: lowUrl
            }
        });

    } catch (error) {
        console.error('Upload error:', error);
        
        // Xử lý lỗi cụ thể
        if (error.message.includes('Input buffer contains unsupported image format')) {
            console.log('Upload failed: Unsupported image format');
            return res.status(400).json({ 
                success: false,
                httpcode: 400,
                error: "Unsupported image format or corrupted image file" 
            });
        }
        
        if (error.message.includes('ENOSPC')) {
            console.log('Upload failed: Insufficient storage space');
            return res.status(507).json({ 
                success: false,
                httpcode: 507,
                error: "Insufficient storage space" 
            });
        }
        
        console.log('Upload failed: Internal server error');
        return res.status(500).json({ 
            success: false,
            httpcode: 500,
            error: "Internal server error" 
        });
    }
});

// serve static with long cache (immutable)
app.use("/files", express.static(UPLOAD_DIR, {
    setHeaders: (res, filePath) => {
        if (/\.[a-f0-9]{16}\./i.test(filePath) || /\/[a-f0-9]{16}$/.test(filePath)) {
            res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        } else {
            res.setHeader("Cache-Control", "public, max-age=60, s-maxage=600, stale-while-revalidate=120");
        }
    },
    fallthrough: false
}));

const port = process.env.PORT || 6868;
app.listen(port, () => {
    console.log(`Image upload server running on port ${port}`);
    console.log(`Log file: ${logFile}`);
    console.log(`Upload directory: ${UPLOAD_DIR}`);
    console.log(`Quality directory: ${QUALITY_DIR}`);
    console.log(`Low directory: ${LOW_DIR}`);
            console.log(`APP_URL: ${process.env.APP_URL || 'http://localhost:6868'}`);
});
