# 🔧 Troubleshooting: "Unexpected token '<', "<!DOCTYPE "... is not valid JSON"

## What This Error Means:

Your frontend is receiving **HTML** instead of **JSON** from the backend. This happens when:

1. ❌ Django server is not running
2. ❌ Wrong URL (404 error page)
3. ❌ Server error (500 error page)
4. ❌ CORS issue (browser blocking request)

---

## Quick Fix Steps:

### Step 1: Check if Django Server is Running

**Check for running Django process:**
```bash
# Windows PowerShell
Get-Process | Where-Object {$_.ProcessName -like "*python*"}

# Or check if port 8000 is in use
netstat -ano | findstr :8000
```

**If NOT running, start it:**
```bash
cd backend
python manage.py runserver
```

You should see:
```
Starting development server at http://127.0.0.1:8000/
Quit the server with CTRL-BREAK.
```

---

### Step 2: Apply Migrations

**Run these commands:**
```bash
cd backend
python manage.py makemigrations
python manage.py migrate
```

Expected output:
```
Migrations for 'trips':
  trips\migrations\0004_trip_user_booking.py
    - Add field user to trip
    - Create model Booking

Running migrations:
  Applying trips.0004_trip_user_booking... OK
```

---

### Step 3: Test Backend Endpoints

**Test if backend is responding:**

**1. Test signup endpoint:**
```bash
curl -X POST http://127.0.0.1:8000/api/signup/ \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"testuser\",\"email\":\"test@example.com\",\"password\":\"testpass123\"}"
```

**2. Test login endpoint:**
```bash
curl -X POST http://127.0.0.1:8000/api/login/ \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"testuser\",\"password\":\"testpass123\"}"
```

**3. Test trips endpoint:**
```bash
curl http://127.0.0.1:8000/api/trips/
```

If you get HTML instead of JSON, there's a server error.

---

### Step 4: Check Django Logs

Look at the terminal where Django is running. You should see:
```
[26/Nov/2025 08:10:52] "POST /api/login/ HTTP/1.1" 200 85
```

If you see **500** or **404**, there's an error.

---

### Step 5: Common Issues & Fixes

#### Issue 1: ImportError in views.py

**Error:**
```
ImportError: cannot import name 'Booking' from 'trips.models'
```

**Fix:**
Make sure `Booking` is in `trips/models.py` and migrations are applied.

#### Issue 2: CORS Error

**Error in browser console:**
```
Access to fetch at 'http://localhost:8000/api/...' from origin 'http://localhost:3000' has been blocked by CORS policy
```

**Fix:**
Check `backend/backend/settings.py`:
```python
INSTALLED_APPS = [
    ...
    'corsheaders',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',  # Add this FIRST
    'django.middleware.common.CommonMiddleware',
    ...
]

CORS_ALLOWED_ORIGINS = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
]
```

Install if missing:
```bash
pip install django-cors-headers
```

#### Issue 3: Wrong URL in Frontend

**Check your frontend code:**
```javascript
// ❌ Wrong
fetch('http://localhost:8000/api/trips/')

// ✅ Correct
fetch('http://127.0.0.1:8000/api/trips/')
```

Some systems treat `localhost` and `127.0.0.1` differently.

---

### Step 6: Restart Everything

**1. Stop Django server** (Ctrl+C)

**2. Stop React dev server** (Ctrl+C)

**3. Restart Django:**
```bash
cd backend
python manage.py runserver
```

**4. Restart React:**
```bash
cd AI-Trip-Planner
npm start
```

---

## Testing the Full Flow:

### 1. Backend Test (Terminal):

```bash
# Login and get token
curl -X POST http://127.0.0.1:8000/api/login/ \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"testuser\",\"password\":\"testpass123\"}"

# Expected response:
# {"token":"abc123xyz","username":"testuser"}

# Use token to get trips
curl -H "Authorization: Token abc123xyz" \
     http://127.0.0.1:8000/api/trips/my_trips/

# Expected response:
# [{"id":1,"destination":"Paris",...}]
```

### 2. Frontend Test (Browser Console):

```javascript
// Test login
fetch('http://127.0.0.1:8000/api/login/', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({username: 'testuser', password: 'testpass123'})
})
.then(r => r.json())
.then(d => console.log(d));

// Expected: {token: "...", username: "testuser"}
```

---

## Quick Checklist:

- [ ] Django server running on port 8000
- [ ] Migrations applied (`python manage.py migrate`)
- [ ] CORS headers installed and configured
- [ ] Frontend using correct URL (`127.0.0.1:8000`)
- [ ] Token stored in localStorage after login
- [ ] Authorization header included in requests

---

## Still Getting Errors?

**Check Django terminal for exact error:**

If you see:
```
AttributeError: 'Booking' object has no attribute 'xyz'
```

Or:
```
OperationalError: no such table: trips_booking
```

Then migrations didn't apply correctly. Run:
```bash
python manage.py migrate --run-syncdb
```

**Check browser Network tab:**

1. Open DevTools (F12)
2. Go to Network tab
3. Try the action that fails
4. Click on the failed request
5. Check "Response" tab - it will show the actual HTML error page

---

## Need More Help?

Share the exact error from:
1. Django terminal output
2. Browser console (F12)
3. Network tab response

This will help identify the specific issue! 🔍
