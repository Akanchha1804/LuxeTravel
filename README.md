# LuxeTravel: AI Trip Planner

An intelligent, AI-powered travel planning application that automatically generates comprehensive, elegant itineraries for international and domestic destinations. Check out the beautiful, dynamic React frontend connected to a robust Django backend.

---

## 🚀 How to Run LuxeTravel on a New Machine

This guide will walk you through setting up both the Frontend (React) and Backend (Django) environments to run LuxeTravel locally.

### Prerequisites
Before you start, make sure you have the following installed on your machine:
- **Node.js & npm** (v16+ recommended) - [Download here](https://nodejs.org/)
- **Python** (v3.10+ recommended) - [Download here](https://www.python.org/downloads/)
- **PostgreSQL** (Optional, but recommended. By default, the app can run on SQLite if no Postgres is provided).
- **Git** - [Download here](https://git-scm.com/)

---

### Step 1: Clone the Repository
Open your terminal or command prompt and run:
```bash
git clone https://github.com/Akanchha1804/LuxeTravel.git
cd LuxeTravel
```

---

### Step 2: Set up the Backend (Django)

1. **Navigate to the backend folder:**
   ```bash
   cd backend
   ```

2. **Create a Python Virtual Environment:**
   This isolates the project dependencies from your system's Python.
   ```bash
   python -m venv venv
   ```

3. **Activate the Virtual Environment:**
   - **On Windows (PowerShell):**
     ```powershell
     .\venv\Scripts\Activate.ps1
     ```
   - **On Windows (Command Prompt):**
     ```cmd
     venv\Scripts\activate.bat
     ```
   - **On Mac/Linux:**
     ```bash
     source venv/bin/activate
     ```

4. **Install the Required Python Packages:**
   ```bash
   pip install -r requirements.txt
   ```

5. **Configure Environment Variables:**
   - In the `backend/` folder, create a new file named `.env`.
   - Copy the contents from `.env.example` into your new `.env` file.
   - Fill in your actual Database credentials, Secret key, and API keys (OpenAI, Gemini, Google Maps) in the `.env` file.
   > **Note:** If you don't configure PostgreSQL in the `.env`, Django will automatically fallback to a local SQLite database for development.

6. **Initialize the Database:**
   Run the following commands to create the database tables:
   ```bash
   python manage.py makemigrations
   python manage.py migrate
   ```

7. **Start the Backend Server:**
   ```bash
   python manage.py runserver
   ```
   The backend API will now be running at `http://localhost:8000`. Keep this terminal window open!

---

### Step 3: Set up the Frontend (React)

1. **Open a NEW terminal window/tab** and navigate to the project root directory (the main `LuxeTravel` folder):
   ```bash
   # If you are still in the backend folder:
   cd ..
   ```

2. **Install Node Dependencies:**
   ```bash
   npm install
   ```

3. **Start the Frontend Development Server:**
   ```bash
   npm start
   ```

   The application should automatically open in your default web browser at `http://localhost:3000`.

---

## 🎉 You're Done!
You can now start using the LuxeTravel AI Trip Planner locally. 

### Project Structure Overview
- `src/`, `public/`, `package.json`: Contains all the frontend React code and UI components.
- `backend/`: Contains the Django server, API endpoints, AI logic, and database models.
- `docs/`: Contains development history, configuration guides, and historical markdown logs.
