# API Authentication Documentation

## Base URL
```
https://proyek-hargapangan.vercel.app
```

## Credentials
- **Username:** `admin`
- **Password:** `PasswordKuat123!`

## Endpoints

### 1. POST `/api/node/login` - Login

**Request:**
```bash
POST /api/node/login
Content-Type: application/json

{
  "username": "admin",
  "password": "PasswordKuat123!"
}
```

**Success Response (200):**
```json
{
  "message": "Login berhasil",
  "token": "eyJ1c2VySWQiOiI2OGYzMmFhMGMyYTM1NTFhYTAwYjQ4NjMiLCJ1c2VybmFtZSI6ImFkbWluIiwicm9sZSI6ImFkbWluIiwiZXhwIjoxNzYxNDM4MTIzMDAwfQ==",
  "user": {
    "_id": "68f32aa0c2a3551aa00b4863",
    "nama_lengkap": "Administrator",
    "username": "admin",
    "role": "admin",
    "is_active": true,
    "phone": "...",
    "alamat": "...",
    "foto": "..."
  }
}
```

**Error Response (401):**
```json
{
  "message": "Username atau password salah"
}
```

**Error Response (403):**
```json
{
  "message": "Akun tidak aktif"
}
```

---

### 2. GET `/api/node/me` - Get Current User

**Request:**
```bash
GET /api/node/me
Authorization: Bearer <token>
```

Or with Cookie:
```bash
GET /api/node/me
Cookie: token=<token>
```

**Success Response (200):**
```json
{
  "user": {
    "_id": "68f32aa0c2a3551aa00b4863",
    "nama_lengkap": "Administrator",
    "username": "admin",
    "role": "admin",
    "is_active": true,
    "phone": "...",
    "alamat": "...",
    "foto": "..."
  }
}
```

**Error Response (401):**
```json
{
  "message": "Unauthorized - No token provided"
}
```

```json
{
  "message": "Token expired"
}
```

```json
{
  "message": "Invalid token"
}
```

---

## Usage in Frontend (React/JavaScript)

### Login Example
```javascript
async function login(username, password) {
  const response = await fetch('https://proyek-hargapangan.vercel.app/api/node/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include', // Important for cookies
    body: JSON.stringify({ username, password })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }

  const data = await response.json();
  
  // Save token to localStorage
  localStorage.setItem('token', data.token);
  localStorage.setItem('user', JSON.stringify(data.user));
  
  return data;
}
```

### Get Current User Example
```javascript
async function getCurrentUser() {
  const token = localStorage.getItem('token');
  
  const response = await fetch('https://proyek-hargapangan.vercel.app/api/node/me', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    credentials: 'include'
  });

  if (!response.ok) {
    // Token expired or invalid
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    throw new Error('Session expired');
  }

  const data = await response.json();
  return data.user;
}
```

### Protected API Requests Example
```javascript
async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('token');
  
  const response = await fetch(`https://proyek-hargapangan.vercel.app${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include'
  });

  if (response.status === 401) {
    // Redirect to login
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
    throw new Error('Session expired');
  }

  return response.json();
}

// Usage:
const markets = await apiRequest('/api/markets');
const prices = await apiRequest('/api/prices?year=2025&month=10');
```

---

## Token Details

- **Format:** Base64-encoded JSON
- **Expiration:** 7 days from creation
- **Storage:** Client-side (localStorage recommended)
- **Transmission:** Authorization header with Bearer scheme

**Token Payload (when decoded):**
```json
{
  "userId": "68f32aa0c2a3551aa00b4863",
  "username": "admin",
  "role": "admin",
  "exp": 1761438123000
}
```

---

## CORS Configuration

All endpoints support CORS with:
- **Allowed Origins:** `*` (or specific origin from request header)
- **Allowed Methods:** `GET, POST, OPTIONS`
- **Allowed Headers:** `Content-Type, Authorization`
- **Credentials:** Supported (`Access-Control-Allow-Credentials: true`)

---

## Environment Variables (for web-admin)

Create `.env` file in web-admin:
```env
VITE_API_URL=https://proyek-hargapangan.vercel.app
```

Or set in Netlify:
- Go to Site settings → Environment variables
- Add: `VITE_API_URL` = `https://proyek-hargapangan.vercel.app`

---

## Testing with curl (Linux/Mac)

```bash
# Login
curl -X POST https://proyek-hargapangan.vercel.app/api/node/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"PasswordKuat123!"}'

# Get current user
curl -X GET https://proyek-hargapangan.vercel.app/api/node/me \
  -H "Authorization: Bearer <YOUR_TOKEN>"
```

## Testing with PowerShell (Windows)

```powershell
# Login
$body = @{username='admin';password='PasswordKuat123!'} | ConvertTo-Json
Invoke-RestMethod -Uri 'https://proyek-hargapangan.vercel.app/api/node/login' -Method POST -Body $body -ContentType 'application/json'

# Get current user (replace <TOKEN> with actual token)
Invoke-RestMethod -Uri 'https://proyek-hargapangan.vercel.app/api/node/me' -Headers @{Authorization='Bearer <TOKEN>'}
```
