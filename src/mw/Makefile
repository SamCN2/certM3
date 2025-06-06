.PHONY: build run stop build-signer run-signer stop-signer

run:	run-app run-signer
build:	build-app build-signer
stop:	stop-app stop-signer

build-app:
	go build -o bin/certm3-app ./cmd/certm3-app

build-signer:
	go build -o bin/certm3-signer ./cmd/certm3-signer

run-app:
	./bin/certm3-app -config ./config.yaml &
	@echo "certm3-app started in background (logs: see /var/log/certM3/mw/app.log)"

run-signer:
	./bin/certm3-signer -config ./config.yaml &
	@echo "certm3-signer started in background (logs: see /var/log/certM3/mw/signer.log)"

stop-app:
	@if pgrep -f "certm3-app" > /dev/null; then \
		pkill -f "certm3-app"; \
		echo "Stopped certm3-app"; \
	else \
		echo "certm3-app is not running"; \
	fi

stop-signer:
	@if pgrep -f "certm3-signer" > /dev/null; then \
		pkill -f "certm3-signer"; \
		echo "Stopped certm3-signer"; \
	else \
		echo "certm3-signer is not running"; \
	fi

test:  stop build run
	(cd test && npm run test:mw)