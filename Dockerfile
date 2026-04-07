# 1. Use a newer Python version that supports contourpy 1.3.3
FROM python:3.12-slim

# 2. Install system dependencies for OpenCV and GUI elements
RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# 3. Standard setup
WORKDIR /app
COPY requirements.txt .

# 4. Install python dependencies
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# 5. Copy your project files
COPY . .

# 6. Set the port for deployment
ENV PORT=5000
EXPOSE 5000
CMD ["python", "app.py"]