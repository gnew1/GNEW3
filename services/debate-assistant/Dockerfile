ARG PYTHON_VERSION=3.12-alpine 
FROM python:${PYTHON_VERSION} AS build 
WORKDIR /app 
RUN apk add --no-cache build-base git 
COPY requirements.in . 
RUN pip install --upgrade pip pip-tools && pip-compile --resolver 
backtracking --output-file=requirements.txt requirements.in || true 
RUN pip install --prefix /install -r requirements.txt || true 
FROM python:${PYTHON_VERSION} 
WORKDIR /app 
COPY --from=build /install /usr/local 
COPY . . 
EXPOSE 8000 
HEALTHCHECK --interval=30s CMD wget -qO- http://localhost:8000/healthz 
|| exit 1 
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"] 
