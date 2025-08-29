# Hướng dẫn Publish Package lên NPM

## 🚀 Chuẩn bị Publish

### 1. Đăng nhập NPM
```bash
npm login
```

### 2. Kiểm tra package
```bash
# Xem package sẽ publish
npm pack --dry-run

# Kiểm tra nội dung package
npm pack
tar -tf @ateo-cdn-origin-1.0.0.tgz
```

### 3. Publish package
```bash
npm publish --access public
```

## 📋 Checklist trước khi Publish

- [x] ✅ Package đã được build (`npm run build`)
- [x] ✅ Thư mục `dist/` chứa đầy đủ files
- [x] ✅ `package.json` có đầy đủ thông tin
- [x] ✅ `README.md` và `USAGE.md` đã hoàn thiện
- [x] ✅ `LICENSE` file đã có
- [x] ✅ `.npmignore` đã cấu hình đúng
- [x] ✅ Tên package không bị trùng lặp
- [x] ✅ Version number đã cập nhật

## 🔧 Cập nhật Version

### Patch version (bug fixes)
```bash
npm version patch
```

### Minor version (new features)
```bash
npm version minor
```

### Major version (breaking changes)
```bash
npm version major
```

## 📦 Publish Scoped Package

Vì package có tên `@ateo/cdn-origin`, bạn cần:

1. **Tạo organization trên npmjs.com** (nếu chưa có)
2. **Publish với quyền public**:
   ```bash
   npm publish --access public
   ```

## 🧪 Test Package trước khi Publish

### 1. Test local
```bash
# Link package locally
npm link

# Trong project khác
npm link @ateo/cdn-origin
```

### 2. Test với npm pack
```bash
# Tạo tarball
npm pack

# Cài đặt từ tarball
npm install ./@ateo-cdn-origin-1.0.0.tgz
```

## 🚨 Troubleshooting

### Lỗi thường gặp

1. **Package name already exists**
   - Đổi tên package trong `package.json`
   - Hoặc publish với scope khác

2. **Access denied**
   - Kiểm tra quyền publish
   - Sử dụng `--access public` cho scoped packages

3. **Build failed**
   - Chạy `npm run build` trước
   - Kiểm tra lỗi trong rollup config

### Commands hữu ích

```bash
# Xem thông tin package
npm info @ateo/cdn-origin

# Xem versions đã publish
npm view @ateo/cdn-origin versions

# Unpublish (chỉ trong 72h đầu)
npm unpublish @ateo/cdn-origin@1.0.0

# Deprecate package
npm deprecate @ateo/cdn-origin@1.0.0 "Use @new-package instead"
```

## 📈 Sau khi Publish

### 1. Kiểm tra package
- Truy cập: https://www.npmjs.com/package/@ateo/cdn-origin
- Kiểm tra README hiển thị đúng
- Test cài đặt: `npm install @ateo/cdn-origin`

### 2. Cập nhật documentation
- Cập nhật GitHub repository
- Tạo release notes
- Cập nhật changelog

### 3. Marketing
- Chia sẻ trên social media
- Viết blog post
- Tham gia cộng đồng Node.js

## 🔄 Quy trình Publish mới Version

1. **Cập nhật code**
2. **Cập nhật version**: `npm version patch|minor|major`
3. **Build package**: `npm run build`
4. **Test**: `npm pack --dry-run`
5. **Publish**: `npm publish --access public`
6. **Tag Git**: `git push --tags`

## 📝 Notes quan trọng

- **Scoped packages** cần `--access public` để publish
- **Version number** phải tăng mỗi lần publish
- **Build trước publish** để đảm bảo dist/ folder có đầy đủ
- **Test package** trước khi publish để tránh lỗi
- **Documentation** phải rõ ràng và đầy đủ

---

**Good luck với package của bạn! 🎉**
