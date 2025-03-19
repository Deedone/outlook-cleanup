XPI := safelinks-cleanup.xpi
SRC := README.md manifest.json $(wildcard src/*)

$(XPI): $(SRC)
	@zip -r $@ $^

clean:
	@rm -fv $(XPI)

.PHONY: clean
