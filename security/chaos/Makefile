SHELL := /bin/bash
export $(shell sed -e '/^\s*#/d' -e '/^\s*$$/d' .env 2>/dev/null | xargs -I{} echo {})
FOUNDRY?=forge

forge-deps:
	$(FOUNDRY) install OpenZeppelin/openzeppelin-contracts@v5.0.2 --no-commit

fork-test:
	$(FOUNDRY) test -vvv --fork-url $(FORK_URL) --match-path 'test/attack/*.t.sol' --gas-report

fuzz:
	$(FOUNDRY) test -vv --fork-url $(FORK_URL) --match-path 'test/fuzz/*.t.sol' --gas-report

k6-smoke:
	k6 run k6/backend-smoke.js --vus 5 --duration 10s

k6-chaos:
	BASE_URL?=http://localhost:8000
	k6 run k6/backend-chaos.js -e BASE_URL=$(BASE_URL) --vus 50 --duration 2m

report-dir:
	mkdir -p chaos-reports

