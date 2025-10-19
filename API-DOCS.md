# 🔐 API Authentication Documentation

**Version:** 2.0.0  
**Updated:** October 19, 2025

---

## 🏗️ Architecture

### Backend Structure
```
api/
├── auth.js              → All auth endpoints (login, me, logout)
└── utils/
    ├── mongo.js         → MongoDB connection utility
    ├── cors.js          → CORS handling
    └── auth.js          → JWT authentication utility
```

### Technology Stack
- **Runtime:** Node.js 18.x (serverless functions)
- **Database:** MongoDB Atlas
- **Authentication:** JWT (JSON Web Tokens)
- **Password Hashing:** bcrypt
- **Deployment:** Vercel

---

## 🔑 Authentication Flow

### 1. Login
**Endpoint:** `POST /auth/login`

**Request:**
```json
{
  "username": "admin",
  "password": "PasswordKuat123!"
}
```

**Response (Success):**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "username": "admin",
    "role": "admin",
    "nama_lengkap": "Administrator",
    "email": "admin@example.com"
  }
}
```

**Response (Error):**
```json
{
  "error": "Invalid credentials"
}
```

**Status Codes:**
- `200` - Login successful
- `400` - Missing username or password
- `401` - Invalid credentials
- `500` - Server error

---

### 2. Get Current User
**Endpoint:** `GET /auth/me`

**Headers:**
```
Authorization: Bearer <token>
```

**Response (Success):**
```json
{
  "success": true,
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "username": "admin",
    "role": "admin",
    "nama_lengkap": "Administrator",
    "email": "admin@example.com"
  }
}
```

**Response (Error):**
```json
{
  "error": "No token provided"
}
```

**Status Codes:**
- `200` - User data retrieved
- `401` - Invalid or missing token
- `404` - User not found
- `500` - Server error

---

### 3. Logout
**Endpoint:** `POST /auth/logout`

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

**Note:** JWT-based auth doesn't require server-side logout. Client should delete the token.

---

## 🌐 CORS Configuration

**Allowed Origins:**
- `https://proyek-hargapangan-admin.netlify.app` (production)
- `*.netlify.app` (preview deployments)
- `http://localhost:5173` (local development)

**Allowed Methods:**
- `GET`, `POST`, `PUT`, `DELETE`, `OPTIONS`

**Allowed Headers:**
- `Content-Type`, `Authorization`

**Credentials:**
- `true` (allows cookies and authorization headers)

---

## 🔒 Security Features

### JWT Token
- **Algorithm:** HS256
- **Expiration:** 7 days
- **Secret:** Stored in `JWT_SECRET` environment variable

### Password Hashing
- **Algorithm:** bcrypt
- **Salt Rounds:** 10 (default)

### Environment Variables
```env
# MongoDB
MONGODB_URI=mongodb+srv://...
MONGODB_DB=harga_pasar_mongo

# JWT
JWT_SECRET=your-super-secret-key-min-32-chars

# CORS
ALLOWED_ORIGINS=https://proyek-hargapangan-admin.netlify.app,netlify.app,localhost:5173
```

---

## 📝 Usage Examples

### JavaScript/Fetch
```javascript
// Login
const response = await fetch('https://proyek-hargapangan.vercel.app/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: 'admin', password: 'PasswordKuat123!' })
});
const { token, user } = await response.json();

// Get current user
const meResponse = await fetch('https://proyek-hargapangan.vercel.app/auth/me', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const { user: currentUser } = await meResponse.json();

// Logout
await fetch('https://proyek-hargapangan.vercel.app/auth/logout', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` }
});
```

### React (with Context)
```javascript
// Store token in localStorage
localStorage.setItem('token', token);

// Add to all requests
const token = localStorage.getItem('token');
fetch(url, {
  headers: { 'Authorization': `Bearer ${token}` }
});

// Remove on logout
localStorage.removeItem('token');
```

---

## 🧪 Testing

### PowerShell
```powershell
# Test login
$body = @{username='admin';password='PasswordKuat123!'} | ConvertTo-Json
$response = Invoke-RestMethod -Uri 'https://proyek-hargapangan.vercel.app/auth/login' `
  -Method POST -ContentType 'application/json' -Body $body
$token = $response.token

# Test me
Invoke-RestMethod -Uri 'https://proyek-hargapangan.vercel.app/auth/me' `
  -Headers @{Authorization="Bearer $token"}
```

### cURL
```bash
# Login
curl -X POST https://proyek-hargapangan.vercel.app/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"PasswordKuat123!"}'

# Get current user
curl https://proyek-hargapangan.vercel.app/auth/me \
  -H "Authorization: Bearer <token>"
```

---

## 🐛 Troubleshooting

### "No token provided"
- Make sure to include `Authorization: Bearer <token>` header
- Check token is not expired (7 days validity)

### "Invalid credentials"
- Verify username and password are correct
- Check user exists in MongoDB `users` collection
- Ensure password is hashed with bcrypt in database

### CORS errors
- Verify origin is in `ALLOWED_ORIGINS` env var
- Check browser console for specific CORS error
- Ensure preflight (OPTIONS) request returns 204

### "JWT_SECRET environment variable is not set"
- Add `JWT_SECRET` to Vercel environment variables
- Generate secure secret: `openssl rand -base64 32`
- Redeploy after adding env var

---

## 📚 Additional Resources

- **Frontend (Web Admin):** `web-admin/`
- **Frontend (Mobile):** `aplikasi-mobile/`
- **Deployment:** https://vercel.com/nikmatrmt/proyek-hargapangan
- **Database:** MongoDB Atlas

---

**Last Updated:** October 19, 2025  
**Maintained by:** Development Team
