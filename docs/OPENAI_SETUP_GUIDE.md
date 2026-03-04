# OpenAI API Key Setup Guide

## Step 1: Get Your OpenAI API Key

1. Go to https://platform.openai.com/api-keys
2. Sign up or login with your account
3. Click "Create new secret key"
4. Give it a name (e.g., "Trip Planner")
5. Copy the key (starts with `sk-proj-...` or `sk-...`)
   ⚠️ **IMPORTANT:** Save it immediately - you can only see it once!

## Step 2: Add Key to Your Project

Create a file named `.env` in the `backend` folder with this content:

```
OPENAI_API_KEY=sk-your-actual-key-here
```

Replace `sk-your-actual-key-here` with your real API key.

## Step 3: Restart Django Server

1. Stop the current server (Ctrl+C in terminal)
2. Start it again: `python manage.py runserver`

## Step 4: Test It!

Create a trip to ANY destination (e.g., "Iceland", "Morocco", "Singapore")
- You'll get AI-generated specific itineraries
- With real restaurant suggestions
- Actual landmarks and activities
- Customized to your budget and dates

## How It Works

**Without API Key (Current):**
- Paris, Tokyo, Dubai → Detailed pre-saved itineraries ✅
- Other destinations → Generic template ⚠️

**With API Key (After setup):**
- **ALL destinations** → AI-generated specific itineraries ✨
- Real restaurant names
- Actual attractions
- Customized to preferences
- Works for literally any place on Earth!

## Cost

OpenAI charges per API call:
- ~$0.002 per itinerary (very cheap!)
- First $5 is usually free for new accounts
- You can set spending limits in OpenAI dashboard

## Troubleshooting

**If itineraries are still generic:**
1. Check `.env` file exists in `backend` folder
2. Check API key is correct (no extra spaces)
3. Restart Django server
4. Check Django console for errors

**If you see "OpenAI Error":**
- API key might be invalid
- You might have hit rate limits
- Check OpenAI dashboard for issues

## Alternative: Use Mock Data

If you don't want to use OpenAI (or want to save costs), I can add detailed itineraries for specific destinations manually. Just tell me which destinations you want detailed itineraries for!
