.PHONY: install train forecast serve test
install:
\tpython -m venv .venv && . .venv/bin/activate && pip install -r requirements.txt
train:
\tpython train.py
forecast:
\tpython forecast.py
serve:
\tuvicorn api:app --host 0.0.0.0 --port 8030
test:
\tpytest -q

 
12) Tests
