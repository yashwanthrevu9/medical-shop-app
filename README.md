# 🏥 Medical Shop Manager App

A simple frontend-based web application designed for local medical shopkeepers to manage medicine stock and billing efficiently using barcode scanning.

---

## 🚀 Live Demo

👉 (After deployment, add your link here)

```
https://Hari-544.github.io/medical-shop-app
```

---

## 📌 Features

* 🔐 Login system using Email + OTP (demo-based)
* 📦 Add medicine stock using barcode scanning or manual entry
* 📊 View available stock in real-time
* 📷 Scan medicine barcode to generate bill
* 🧾 Automatic invoice generation
* 🔄 Auto stock update after each sale
* 💾 Uses Local Storage (works offline)
* ⚡ Fast barcode scanning using device camera
* 🧠 Manual barcode fallback option

---

## 🛠️ Tech Stack

* HTML
* CSS
* JavaScript
* ZXing Barcode Scanner Library
* LocalStorage API

---

## 📁 Project Structure

```
medical-shop-app/
│
├── index.html      # Main dashboard
├── login.html      # Login page
├── style.css       # Styling
├── app.js          # Main app logic
├── auth.js         # Login & OTP logic
```

---

## ⚙️ How It Works

### 1️⃣ Login

* User enters email
* OTP is generated (demo)
* After verification → redirected to dashboard

### 2️⃣ Add Stock

* Scan barcode OR enter manually
* Enter quantity & price
* Stock saved in LocalStorage

### 3️⃣ View Stock

* Displays all medicines with quantity & price

### 4️⃣ Scan & Bill

* Scan barcode
* Enter quantity
* System calculates total price
* Stock automatically reduces
* Invoice generated

---

## 🌍 Deployment (GitHub Pages)

Follow these steps to deploy:

### Step 1: Upload Code

* Create a new repository on GitHub
* Upload all project files

### Step 2: Enable GitHub Pages

* Go to **Settings → Pages**
* Select branch: `main`
* Click **Save**

### Step 3: Access Your App

Your app will be live at:

```
https://your-username.github.io/medical-shop-app
```

---

## 📱 Usage Instructions

* Open the app in **mobile browser (Chrome recommended)**
* Allow camera permissions
* Use real barcode or sample barcode images
* Ensure good lighting for better scanning

---

## ⚠️ Limitations

* OTP is simulated (no real email service)
* Data stored locally (device-specific)
* Barcode scanning may be slower on laptops

---

## 🔮 Future Improvements

* Real authentication system (Firebase)
* Cloud database integration
* Medicine name auto-fetch
* Low stock alerts
* Expiry tracking
* Better UI/UX design

---

## 👨‍💻 Author

Developed by: **Hari Krishna**
B.Tech AI & ML Student

---

## ⭐ Project Purpose

This project was developed as part of a **Design Thinking & Innovation (DTI)** initiative to provide a simple digital solution for small-scale medical shop owners.

---

## 💡 Note

If camera scanning does not work, use manual barcode entry option.

---

⭐ If you like this project, give it a star!
