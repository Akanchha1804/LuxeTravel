# AI Trip Planner - Server Restart Guide

## Issue: Create Trip Button Not Working

**Root Cause:** Django backend server is not responding at http://127.0.0.1:8000

## Solution:

### Step 1: Stop Current Server
In the terminal running Django server, press `Ctrl + C`

### Step 2: Restart Django Server
```bash
cd backend
.\venv\Scripts\python manage.py runserver
```

### Step 3: Verify Server is Running
Open browser and go to: http://127.0.0.1:8000/api/trips/
You should see: `[]` (empty list) or existing trips

### Step 4: Test Create Trip
1. Go to http://localhost:3000
2. Click "Create Trip"
3. Fill in details
4. Click "Create My Trip ✨"
5. Check browser console (F12) for logs

## What's Fixed:

✅ **Enhanced error handling** - Now shows detailed error messages
✅ **Console logging** - See exactly what's happening
✅ **Preferences** - All 16 categories working
✅ **Detailed itineraries** - Kerala, Goa, Jaipur, etc. with specific restaurants
✅ **Map** - Working for all destinations

## If Server Still Won't Start:

Check for port conflicts:
```bash
netstat -ano | findstr :8000
```

If port 8000 is in use, kill the process or use a different port:
```bash
.\venv\Scripts\python manage.py runserver 8001
```

Then update frontend to use port 8001 in CreateTrip.js line 104.

## Expected Console Output When Working:

```
Creating trip with data: {destination: "Kerala", start_date: "2025-12-01", ...}
Sending payload: {destination: "Kerala", ...}
Response status: 201
Trip created successfully: {id: 31, destination: "Kerala", ...}
```

## If You See Errors:

1. **Network error: Failed to fetch** = Django server not running
2. **Response status: 400** = Invalid data format
3. **Response status: 500** = Server error (check Django console)
4. **CORS error** = CORS not configured (should be fixed already)
