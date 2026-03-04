# 📱 Mobile Testing Setup Guide (Same WiFi Method)

## ✅ Prerequisites Completed
- Django backend configured to accept mobile connections
- CORS enabled for all origins
- Ready for mobile testing!

---

## 🚀 Step-by-Step Instructions

### **Step 1: Find Your Computer's IP Address**

1. Open **Command Prompt** (Press `Win + R`, type `cmd`, press Enter)
2. Type: `ipconfig` and press Enter
3. Look for **"Wireless LAN adapter Wi-Fi"** section
4. Find the line: **IPv4 Address. . . . . . . . . . . : 192.168.x.x**
5. **Write down this IP** (e.g., `192.168.1.100`)

---

### **Step 2: Start Your Backend Server**

Open a terminal in the `backend` folder and run:

```bash
cd backend
python manage.py runserver 0.0.0.0:8000
```

**Important:** The `0.0.0.0:8000` makes it accessible from your phone!

You should see:
```
Starting development server at http://0.0.0.0:8000/
```

---

### **Step 3: Start Your Frontend Server**

Open another terminal in the project root and run:

```bash
npm start
```

Wait for it to open at `http://localhost:3000`

---

### **Step 4: Test on Your Android Phone**

1. **Make sure your phone is on the SAME WiFi as your computer**
2. Open **Chrome** browser on your phone
3. Type in the address bar: `http://YOUR_IP:3000`
   - Replace `YOUR_IP` with the IP from Step 1
   - Example: `http://192.168.1.100:3000`
4. Press Go!

---

## 🎯 What You Should See

✅ Your website should load on your phone!
✅ You can navigate, click buttons, test forms
✅ Check how it looks on mobile screen
✅ Test touch interactions

---

## 🐛 Troubleshooting

### Problem: "This site can't be reached"
**Solution:**
- Make sure both devices are on the SAME WiFi
- Check if your firewall is blocking port 3000 and 8000
- Try turning off Windows Firewall temporarily

### Problem: Website loads but API calls fail
**Solution:**
- Make sure backend is running with `0.0.0.0:8000`
- Check if you see backend logs when you interact with the site

### Problem: Slow loading
**Solution:**
- This is normal on local network
- WiFi speed affects loading time

---

## 📝 Quick Command Reference

**Find IP:**
```bash
ipconfig
```

**Start Backend:**
```bash
cd backend
python manage.py runserver 0.0.0.0:8000
```

**Start Frontend:**
```bash
npm start
```

**Access on Phone:**
```
http://YOUR_IP:3000
```

---

## 🔒 Security Note

**IMPORTANT:** After testing, you should change back:
- `ALLOWED_HOSTS = ['*']` → `ALLOWED_HOSTS = []`
- `CORS_ALLOW_ALL_ORIGINS = True` → Use specific origins

These settings are ONLY for development/testing!

---

## ✨ Tips for Mobile Testing

1. **Test Different Orientations:** Rotate your phone to test portrait and landscape
2. **Test Touch Targets:** Make sure buttons are easy to tap
3. **Test Forms:** Check if keyboard doesn't cover input fields
4. **Test Navigation:** Ensure the hamburger menu works smoothly
5. **Test Scrolling:** Check if all content is accessible

---

## 🎉 You're All Set!

Your website is now configured for mobile testing. Just follow the steps above and you'll be able to test on your actual Android device!

**Need help?** Check the troubleshooting section or ask for assistance.
