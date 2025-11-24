import os
from dotenv import load_dotenv

load_dotenv()

DB_PATH = os.path.abspath(os.getenv("DB_PATH", "../backend/prisma/dev.db"))
UPLOAD_DIR = os.path.abspath(os.getenv("UPLOAD_DIR", "../backend/uploads"))
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3")
