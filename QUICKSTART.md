# marronMerge - Quick Start Guide

## ⚡ 5-Minute Setup

Press Ctrl+C in the terminal to stop the server.

### 1. Open Terminal in Backend Directory
```bash
cd backend
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Start Server
```bash
npm start
```

You should see:
```
╔════════════════════════════════════╗
║      marronMerge Backend Server    ║
╠════════════════════════════════════╣
║  Server running on port 3000...       
║  Frontend: http://localhost:3000
║  API: http://localhost:3000/api/pdf/health
╚════════════════════════════════════╝
```

### 4. Open in Browser
Go to: **http://localhost:3000**

## 🎯 First Use

1. **Upload PDFs** - Click the upload area or drag-drop
2. **See Previews** - Thumbnails load automatically
3. **Reorder Pages** - Drag pages to new positions
4. **Merge** - Click "✨ Merge & Download PDF"
5. **Download** - Your merged PDF downloads automatically

## 🔗 Useful Links

- Frontend: http://localhost:3000
- API Health: http://localhost:3000/api/pdf/health
- Full Documentation: See README.md

## 📋 Common Issues

| Issue | Solution |
|-------|----------|
| Port 3000 in use | Set `PORT=3001` in .env |
| npm not found | Install Node.js from nodejs.org |
| Previews not loading | Wait for async loading, check console |
| Merge fails | Re-upload files and try again |

## 📚 Learn More

See **README.md** for:
- Complete API documentation
- Advanced features
- Troubleshooting guide
- Technical architecture

---

**Need Help?** Check the README.md Troubleshooting section!
