REPORTER = spec

test:
	@NODE_ENV=test ./node_modules/.bin/mocha --reporter $(REPORTER) --ui tdd -s 100 --timeout 15000

test-w:
	@NODE_ENV=test ./node_modules/.bin/mocha --reporter $(REPORTER) --growl --ui tdd --watch --timeout 15000

.PHONY: test test-w