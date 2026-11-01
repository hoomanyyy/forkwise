FROM mcr.microsoft.com/playwright/python:v1.49.1-noble

ENV DEBIAN_FRONTEND=noninteractive \
    PIP_BREAK_SYSTEM_PACKAGES=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    NPM_CONFIG_UPDATE_NOTIFIER=false \
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

RUN apt-get update && apt-get install -y --no-install-recommends \
        curl wget git jq zip unzip ripgrep ffmpeg imagemagick sqlite3 build-essential \
        python3-venv procps lsof htop nano less ca-certificates gnupg \
    && curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && npm install -g pnpm yarn serve \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir \
        requests httpx beautifulsoup4 lxml pandas numpy matplotlib openpyxl \
        fastapi uvicorn flask pillow python-docx reportlab pypdf yt-dlp

RUN mkdir -p /home/agent /opt/forkwise /workspace && chmod 1777 /home/agent /workspace
COPY shot.py /opt/forkwise/shot.py

WORKDIR /workspace
CMD ["sleep", "infinity"]
