# 🔧 Save Trip Button - Complete Testing & Troubleshooting Guide

## Current Setup:

✅ **Database:** SQLite (already configured in settings.py)
✅ **Backend:** Django with Trip model (has `user` field)
✅ **Frontend:** Save Trip button with authentication check
✅ **API Endpoint:** PATCH `/api/trips/{id}/` to associate user

---

## How Save Trip Works:

### Step-by-Step Flow:

1. **User creates a trip** → Trip saved to database (initially without user)
2. **User clicks "💾 Save Trip"** → Frontend checks for login
3. **If logged in** → PATCH request sent to backend
4. **Backend assigns user** to trip via `perform_update()`
5. **Trip now belongs to user** → Appears in "My Trips"

---

## Testing the Save Trip Feature:

### **Test 1: Complete Flow (Recommended)**

```bash
# 1. Start Django server
cd backend
python manage.py runserver

# 2. Start React app (in new terminal)
cd AI-Trip-Planner
npm start
```

**Steps:**
1. Go to `http://localhost:3000/login`
2. Create account or login:
   - Username: `testuser`
   - Password: `testpass123`
3. Click "Plan a Trip" or go to `/create-trip`
4. Fill in trip details:
   - Destination: Paris
   - Dates: Any future dates
   - Budget: 100000
   - Preferences: (optional)
5. Click "Create My Trip ✨"
6. Wait for itinerary to generate
7. Click "💾 Save Trip" button
8. **Expected:** "✅ Trip saved successfully!"
9. Click "💾 My Trips" in navigation
10. **Expected:** Your trip appears in the list

---

### **Test 2: Verify in Database**

After saving a trip, check the database:

```bash
cd backend
python manage.py shell
```

```python
from trips.models import Trip
from django.contrib.auth.models import User

# Check all trips
trips = Trip.objects.all()
for trip in trips:
    print(f"Trip {trip.id}: {trip.destination} - User: {trip.user}")

# Check trips for specific user
user = User.objects.get(username='testuser')
user_trips = Trip.objects.filter(user=user)
print(f"User has {user_trips.count()} trips")
for trip in user_trips:
    print(f"  - {trip.destination}")
```

**Expected Output:**
```
Trip 1: Paris - User: testuser
User has 1 trips
  - Paris
```

---

### **Test 3: API Direct Test**

Test the API endpoints directly:

```bash
# 1. Login and get token
curl -X POST http://127.0.0.1:8000/api/login/ \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"testuser\",\"password\":\"testpass123\"}"

# Response: {"token":"abc123xyz","username":"testuser"}

# 2. Create a trip
curl -X POST http://127.0.0.1:8000/api/trips/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Token abc123xyz" \
  -d "{
    \"destination\":\"Tokyo\",
    \"start_date\":\"2025-12-01\",
    \"end_date\":\"2025-12-07\",
    \"budget\":150000,
    \"preferences\":\"Culture, Food\"
  }"

# Response: {"id":2,"user":"testuser","destination":"Tokyo",...}

# 3. Get user's trips
curl -H "Authorization: Token abc123xyz" \
     http://127.0.0.1:8000/api/trips/my_trips/

# Response: [{"id":2,"user":"testuser","destination":"Tokyo",...}]
```

---

## Common Issues & Solutions:

### Issue 1: "Save Trip" button does nothing

**Symptoms:**
- Click button, nothing happens
- No alert shown

**Solutions:**
1. **Check browser console** (F12) for errors
2. **Check Django terminal** for request logs
3. **Verify backend is running** on port 8000
4. **Check token exists:**
   ```javascript
   // In browser console
   localStorage.getItem('token')
   // Should return a token string
   ```

---

### Issue 2: Trips not showing in "My Trips"

**Symptoms:**
- Save Trip shows success
- But "My Trips" page is empty

**Possible Causes:**

**A. Not logged in with same account**
```javascript
// Check current user
localStorage.getItem('username')
```

**B. Trip not associated with user**
```bash
# Check in Django shell
python manage.py shell
```
```python
from trips.models import Trip
Trip.objects.filter(user__isnull=True).count()  # Should be 0
```

**C. Backend not restarted after migration**
```bash
# Restart Django
cd backend
python manage.py runserver
```

---

### Issue 3: "Session expired" error

**Symptoms:**
- Click Save Trip → "Session expired"
- Redirected to login

**Solution:**
```bash
# Login again
# Token might have been cleared or is invalid
```

---

### Issue 4: Database not updating

**Check migrations:**
```bash
cd backend
python manage.py showmigrations trips
```

**Expected:**
```
trips
 [X] 0001_initial
 [X] 0002_...
 [X] 0003_...
 [X] 0004_trip_user_booking
```

**If not all checked:**
```bash
python manage.py migrate
```

---

## Manual Database Check:

### SQLite Browser Method:

1. Download **DB Browser for SQLite**
2. Open `backend/db.sqlite3`
3. Browse Data → `trips_trip` table
4. Check `user_id` column
5. Should see user IDs for saved trips

### Django Admin Method:

```bash
# Create superuser if not exists
python manage.py createsuperuser

# Start server
python manage.py runserver

# Go to http://127.0.0.1:8000/admin/
# Login with superuser credentials
# Click "Trips" → See all trips with users
```

---

## Expected Behavior Summary:

| Action | Expected Result |
|--------|----------------|
| Click "Save Trip" (not logged in) | Alert: "Please log in" → Redirect to /login |
| Click "Save Trip" (logged in) | Alert: "Trip saved!" → Trip appears in My Trips |
| Go to "My Trips" (not logged in) | Redirect to /login |
| Go to "My Trips" (logged in) | Shows list of user's trips |
| Create trip while logged in | Trip automatically associated with user |
| Create trip while not logged in | Trip created without user (can save later) |

---

## Quick Debug Checklist:

- [ ] Django server running on port 8000
- [ ] React app running on port 3000
- [ ] User logged in (check `localStorage.getItem('token')`)
- [ ] Migrations applied (`python manage.py migrate`)
- [ ] CORS configured (`CORS_ALLOWED_ORIGINS` in settings.py)
- [ ] No errors in browser console (F12)
- [ ] No errors in Django terminal

---

## If Still Not Working:

### 1. Check Django logs:

Look at the terminal where Django is running. When you click "Save Trip", you should see:

```
[26/Nov/2025 08:30:00] "PATCH /api/trips/43/ HTTP/1.1" 200 ...
```

If you see `404` or `500`, there's an error.

### 2. Check browser Network tab:

1. Open DevTools (F12)
2. Go to Network tab
3. Click "Save Trip"
4. Look for the PATCH request
5. Check:
   - **Status:** Should be 200
   - **Headers:** Should have `Authorization: Token ...`
   - **Response:** Should show updated trip data

### 3. Verify backend code:

```bash
cd backend
grep -n "perform_update" trips/views.py
```

Should show the method exists in TripViewSet.

---

## PostgreSQL Setup (Optional):

If you want to use PostgreSQL instead of SQLite:

### 1. Install PostgreSQL:
```bash
# Install psycopg2
pip install psycopg2-binary
```

### 2. Update settings.py:
```python
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'trip_planner_db',
        'USER': 'postgres',
        'PASSWORD': 'your_password',
        'HOST': 'localhost',
        'PORT': '5432',
    }
}
```

### 3. Create database:
```sql
CREATE DATABASE trip_planner_db;
```

### 4. Run migrations:
```bash
python manage.py migrate
```

**Note:** SQLite works perfectly fine for development and small-scale production. PostgreSQL is only needed for large-scale deployments.

---

## Summary:

The Save Trip feature is **fully implemented** and should work with the current SQLite database. If trips aren't showing:

1. **Verify you're logged in** with the same account
2. **Check Django terminal** for errors
3. **Check browser console** for errors
4. **Verify migrations** are applied
5. **Restart Django server** if needed

The database (SQLite) is already configured and working! 🎉
