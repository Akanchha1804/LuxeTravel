# 🔧 Fixing "Server IP Not Found" Error

## Common Causes & Solutions

### **Solution 1: Check Your WiFi Connection**

**On Computer:**
1. Make sure you're connected to WiFi (not Ethernet)
2. Check WiFi icon in taskbar - should show connected

**On Phone:**
1. Go to Settings → WiFi
2. Make sure you're connected to the SAME WiFi network as your computer
3. Check the WiFi name matches exactly

---

### **Solution 2: Find the Correct IP Address**

Run this command in Command Prompt:

```bash
ipconfig
```

**Look for this section:**
```
Wireless LAN adapter Wi-Fi:

   Connection-specific DNS Suffix  . :
   Link-local IPv6 Address . . . . . : fe80::xxxx
   IPv4 Address. . . . . . . . . . . : 192.168.1.100  ← THIS ONE!
   Subnet Mask . . . . . . . . . . . : 255.255.255.0
   Default Gateway . . . . . . . . . : 192.168.1.1
```

**Use the IPv4 Address that starts with:**
- `192.168.x.x` (most common)
- `10.0.x.x` (some routers)
- `172.16.x.x` to `172.31.x.x` (less common)

**❌ DON'T use:**
- `127.0.0.1` (localhost - won't work)
- `169.254.x.x` (no network connection)

---

### **Solution 3: Test the Connection**

**On your phone, try these URLs one by one:**

1. **Test if computer is reachable:**
   ```
   http://YOUR_IP:3000
   ```
   Example: `http://192.168.1.100:3000`

2. **If that doesn't work, try:**
   ```
   http://YOUR_IP:8000
   ```
   This tests if backend is accessible

3. **If nothing works, try:**
   ```
   http://YOUR_IP
   ```
   Just the IP without port

---

### **Solution 4: Check Firewall**

Windows Firewall might be blocking the connection.

**Quick Test - Temporarily Disable Firewall:**
1. Press `Win + R`
2. Type: `firewall.cpl`
3. Click "Turn Windows Defender Firewall on or off"
4. Select "Turn off" for Private networks
5. Try accessing from phone again
6. **IMPORTANT:** Turn it back on after testing!

**Better Solution - Add Firewall Rules:**

Run these commands in Command Prompt (as Administrator):

```bash
netsh advfirewall firewall add rule name="React Dev Server" dir=in action=allow protocol=TCP localport=3000

netsh advfirewall firewall add rule name="Django Dev Server" dir=in action=allow protocol=TCP localport=8000
```

---

### **Solution 5: Verify Servers are Running**

**Check Backend:**
```bash
cd backend
python manage.py runserver 0.0.0.0:8000
```

You should see:
```
Starting development server at http://0.0.0.0:8000/
Quit the server with CTRL-BREAK.
```

**Check Frontend:**
```bash
npm start
```

You should see:
```
Compiled successfully!

You can now view trip-planner in the browser.

  Local:            http://localhost:3000
  On Your Network:  http://192.168.1.100:3000  ← Look for this line!
```

**The "On Your Network" line shows the exact URL to use on your phone!**

---

### **Solution 6: Alternative - Use React's Network URL**

When you run `npm start`, React automatically shows you the network URL.

**Look for this in the terminal:**
```
On Your Network:  http://192.168.1.100:3000
```

**Use that EXACT URL on your phone!**

---

### **Solution 7: Check Router Settings**

Some routers have "AP Isolation" or "Client Isolation" enabled, which prevents devices from talking to each other.

**To check:**
1. Open router admin page (usually `192.168.1.1` or `192.168.0.1`)
2. Look for "Wireless Settings" or "Advanced Settings"
3. Find "AP Isolation" or "Client Isolation"
4. Make sure it's **DISABLED**

---

## 🎯 Step-by-Step Debugging

Try these in order:

### **Step 1: Verify IP**
```bash
ipconfig | findstr "IPv4"
```
Write down the IP that starts with 192.168

### **Step 2: Start Backend**
```bash
cd backend
python manage.py runserver 0.0.0.0:8000
```
Leave this running!

### **Step 3: Start Frontend**
```bash
npm start
```
Look for "On Your Network" line - use that URL!

### **Step 4: Test on Computer First**
Open browser on your computer and go to:
```
http://YOUR_IP:3000
```
If this doesn't work on your computer, it won't work on phone either!

### **Step 5: Test on Phone**
Use the same URL from Step 4

---

## 📱 Quick Checklist

Before trying on phone, verify:

- [ ] Computer and phone on same WiFi network
- [ ] Backend running with `0.0.0.0:8000`
- [ ] Frontend running (npm start)
- [ ] Firewall allows ports 3000 and 8000
- [ ] Using correct IP (starts with 192.168)
- [ ] URL works on computer browser first

---

## 🆘 Still Not Working?

### **Try This Alternative Method:**

1. **On your computer, run:**
   ```bash
   npm start
   ```

2. **Look at the terminal output - find this line:**
   ```
   On Your Network:  http://192.168.x.x:3000
   ```

3. **Copy that EXACT URL**

4. **On your phone:**
   - Open Chrome
   - Paste the URL
   - Press Go

This should work because React automatically detects the correct network IP!

---

## 💡 Pro Tip

If you see this when running `npm start`:
```
On Your Network:  http://192.168.1.100:3000
```

That's your answer! Use `http://192.168.1.100:3000` on your phone.

If you DON'T see "On Your Network" line, your computer might not be on WiFi or there's a network issue.
