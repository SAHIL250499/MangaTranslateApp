# Stage 1: Build Next.js Application
FROM python:3.10-slim AS base

# Install required dependencies for Python (you can add more as required)
RUN apt-get update && apt-get install -y \
    nodejs \
    npm \
    build-essential \
    python3-dev \
    libpq-dev \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Stage 1: Build Next.js application
FROM base AS build-nextjs

WORKDIR /app

# Copy and install Node.js dependencies
COPY package.json package-lock.json ./
RUN npm install



# Copy the rest of the application files and build
COPY . .
RUN npm run build || { echo "Build failed. Check logs above for details."; exit 1; }


# Stage 2: Set up Python virtual environment
FROM base AS setup-python

# Create a directory for the app and Python virtual environment
WORKDIR /app

# Install virtualenv and create a virtual environment
RUN pip install --no-cache-dir virtualenv
RUN python -m venv /app/venv_main  # Create a virtual environment

# Install CPU-compatible PyTorch and torchvision explicitly
RUN /app/venv_main/bin/pip install --extra-index-url https://download.pytorch.org/whl/cpu ultralytics==8.3.27

# Install Python dependencies
COPY requirements.txt .
RUN /app/venv_main/bin/pip install --no-cache-dir --no-deps -r requirements.txt


# Stage 3: Final Image (combining Next.js and Python environments)
FROM base AS final

# Set up working directory
WORKDIR /app


# Disable CUDA for the container
ENV CUDA_VISIBLE_DEVICES=""

# Install Node.js dependencies (from the first build stage)
COPY --from=build-nextjs /app/node_modules ./node_modules
COPY --from=build-nextjs /app/.next ./.next
COPY --from=build-nextjs /app/public ./public
COPY --from=build-nextjs /app/package.json ./package.json
COPY --from=build-nextjs /app/main.py ./main.py
COPY --from=build-nextjs /app/fonts ./fonts
COPY --from=build-nextjs /app/utils ./utils
COPY --from=build-nextjs /app/best.pt ./best.pt

# Install Python dependencies (from the python-env stage)
COPY --from=setup-python /app /app

# Expose the port for the application (Next.js runs on 3000 by default)
EXPOSE 3000

# Install the necessary libraries or run your application (the command to run the Python script)
CMD ["npm", "start"]