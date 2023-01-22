SYSTEM_FILE   ?= system.json
TEMPLATE_FILE ?= template.json
SYSTEM_NAME   ?= cyberpunk-red-core

CI_JOBS ?= $(shell ./.gitlab/pipeline_utils/get-jobs.sh)
CI_COMMIT_BRANCH = dev

install:
	@rm -rf node_modules; npm install

build:
	@npx gulp build

watch:
	@npx gulp watch

clean:
	@npx gulp clean

clean_watch: clean watch

ci:
	@if [[ "$(CI_JOBS)" == "none" ]]; then \
		echo "Please install node dependencies with 'make install'"; \
	else \
		npx gitlab-ci-local \
		  --variable \
		    CI_COMMIT_BRANCH=$(CI_COMMIT_BRANCH) \
		    CI_DEFAULT_BRANCH=$(CI_COMMIT_BRANCH) \
		  --needs $(CI_JOBS); \
		rm -rf vars.env; \
	fi

lint:
	@if [[ "$(CI_JOBS)" == "none" ]]; then \
		echo "Please install node dependencies with 'make install'"; \
	else \
		npx gitlab-ci-local \
		  --variable \
		    CI_COMMIT_BRANCH=$(CI_COMMIT_BRANCH) \
		    CI_DEFAULT_BRANCH=$(CI_COMMIT_BRANCH) \
		  --needs init lint-code; \
		rm -rf vars.env; \
	fi
