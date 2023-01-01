SYSTEM_FILE   ?= system.json
TEMPLATE_FILE ?= template.json
SYSTEM_NAME   ?= cyberpunk-red-core

install:
	@rm -rf node_modules; npm install

build:
	@npx gulp build

watch:
	@npx gulp watch

clean:
	@npx gulp clean

clean_watch: clean watch
