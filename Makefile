REPORTER = spec

test:
	@NODE_ENV=test ./node_modules/.bin/mocha --reporter $(REPORTER) --ui tdd -s 100

test-w:
	@NODE_ENV=test ./node_modules/.bin/mocha --reporter $(REPORTER) --growl --ui tdd --watch

.PHONY: test test-w