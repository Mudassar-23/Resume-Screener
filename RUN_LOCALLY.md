# 🚀 How to Run AI Resume Analyzer Locally

Follow this complete step-by-step guide to run the **AI Resume Analyzer** website on any machine after cloning the repository from GitHub.

---

## 📋 Prerequisites

Make sure you have these installed:
- **Python 3.10 or higher** — [https://www.python.org/downloads/](https://www.python.org/downloads/)
- **Git** — [https://git-scm.com/](https://git-scm.com/)

---

## 📥 Step 1: Clone the Repository

Open your terminal or command prompt and run:

```bash
git clone https://github.com/Mudassar-23/AI-Resume-Analyzer.git
cd AI-Resume-Analyzer
```

---

## 🐍 Step 2: Create & Activate Virtual Environment

**On Windows (PowerShell / CMD):**
```bash
python -m venv venv
venv\Scripts\activate
```

**On macOS / Linux:**
```bash
python3 -m venv venv
source venv/bin/activate
```

---

## 📦 Step 3: Install Required Dependencies

```bash
pip install -r backend/requirements.txt
```

---

## ⚙️ Step 4: Create `.env` Configuration File

Create your `backend/.env` file from the included template:

**On Windows:**
```cmd
copy backend\.env.example backend\.env
```

**On macOS / Linux:**
```bash
cp backend/.env.example backend/.env
```

> 💡 **Offline Mock Mode**: You do **NOT** need an API key to run or test the project! If `AZURE_OPENAI_API_KEY` is left blank, the application automatically runs in **Offline Mock Mode** using 11 job-specific keyword profiles.

---

## 🌐 Step 5: Start the Web Application Server

Run the server with Uvicorn:

```bash
python -m uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

---

## 🖥️ Step 6: Open the Website in Your Browser

Visit **[http://localhost:8000](http://localhost:8000)** in your web browser.

- **Main Web Application**: `http://localhost:8000`
- **Interactive Swagger API Docs**: `http://localhost:8000/docs`
- **ReDoc API Documentation**: `http://localhost:8000/redoc`

---

## 🧪 Optional: Test with Included Sample Resumes

Sample resume files are included in the project root for testing:
- `sample_resume_john.txt` (Senior Python / Cloud Developer)
- `sample_resume_jane.txt` (Software Engineer)

### How to test:
1. Go to `http://localhost:8000`.
2. Click **"+ Add job position"** &rarr; Enter title & description &rarr; Save.
3. Drag & drop `sample_resume_john.txt` into the upload dropzone.
4. View real-time parsing, scoring breakdown, matched/missing keywords, and draft emails!
