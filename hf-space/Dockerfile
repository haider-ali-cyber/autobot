# HuggingFace Spaces Docker - Trading Bot Backend
FROM python:3.12-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy all code
COPY . .

# Ensure logs directory exists
RUN mkdir -p /app/logs /app/data

# HuggingFace Spaces uses port 7860
ENV PORT=7860
EXPOSE 7860

# Run with uvicorn
CMD ["python", "run.py"]
