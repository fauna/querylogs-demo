#!/bin/bash

set -e

if [ -z "$DD_API_KEY" ]; then
  echo "Define env var DD_API_KEY with datadog api key"
  exit 2;
fi

export LOG_DIR=$1

if [ -z "$LOG_DIR" ]; then
  echo "usage: run-vector-snowflake-in-docker.sh [path_to_directory_containing_log_files]"
  exit 2;
fi

# fire up vector inside of docker container, mapping the logs directory into the image
docker run -i \
  -e DD_API_KEY=$DD_API_KEY \
  -e VECTOR_LOG=debug \
  -v $(pwd)/vector.yml:/etc/vector/vector.yml \
  -v $(pwd)/$LOG_DIR:/var/log/querylog -v $(pwd)/$LOG_DIR/../vector-state:/var/lib/vector \
  -v $(pwd)/vector.console_output.yml:/etc/vector/vector.console_output.yml --rm timberio/vector:0.24.1-debian --config /etc/vector/vector.yml --config /etc/vector/vector.console_output.yml --require-healthy true
