# LuxeTravel: AI Trip Planner

## Project Structure
- `src/`, `public/`, `package.json`: Frontend (React)
- `backend/`: Backend (Django)

## Setup Instructions

### Backend
1. Navigate to `backend/`
2. Create virtual environment: `python -m venv venv`
3. Activate virtual environment:
   - Windows: `venv\Scripts\activate`
   - Mac/Linux: `source venv/bin/activate`
4. Install requirements: `pip install -r requirements.txt`
5. Run migrations: `python manage.py migrate`
6. Start server: `python manage.py runserver`

### Frontend (Root)
1. Ensure you are in the project root directory.
2. Install dependencies: `npm install`
3. Start development server: `npm start`

## Configuration
- Update `backend/.env` with your API keys and Database credentials.
