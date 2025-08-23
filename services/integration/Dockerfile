ARG PYTHON_VERSION=3.12-alpine 
FROM python:${PYTHON_VERSION} 
WORKDIR /app 
COPY requirements.in /app/requirements.in 
RUN pip install --no-cache-dir pip-tools && pip-compile 
requirements.in -o requirements.txt \ 
&& pip install --no-cache-dir -r requirements.txt 
COPY . /app 
EXPOSE 8000 
HEALTHCHECK --interval=30s CMD wget -qO- http://localhost:8000/health 
|| exit 1 
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"] 
