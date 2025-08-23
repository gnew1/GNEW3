ARG PYTHON_VERSION=3.12-alpine
FROM python:${PYTHON_VERSION}
WORKDIR /app
COPY pyproject.toml ./
RUN pip install --no-cache-dir --upgrade pip && pip install -e .
COPY . .
EXPOSE 8000
HEALTHCHECK --interval=30s CMD wget -qO- http://localhost:8000/healthz || exit 1
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]

