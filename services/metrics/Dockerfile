ARG PYTHON_VERSION=3.12-alpine 
FROM python:${PYTHON_VERSION} 
WORKDIR /app 
COPY services/metrics/requirements.txt /app/requirements.txt 
RUN apk add --no-cache build-base && pip install -r 
