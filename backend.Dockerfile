# Backend Dockerfile for Crypto Trading Bot
FROM python:3.12-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements from root
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY . .

# Ensure logs and data directories exist
RUN mkdir -p /app/logs /app/data

# Expose FastAPI port
EXPOSE 8000

# Run with uvicorn
CMD ["python", "run.py"]
