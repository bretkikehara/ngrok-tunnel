#!/bin/sh

if [[ -f .bin/ngrok ]]; then
	echo ngrok already exists. skipping ngrok download
	exit 0
fi

if [[ "$(uname)" == "Darwin" ]]; then
	curl https://bin.equinox.io/c/4VmDzA7iaHb/ngrok-stable-darwin-amd64.zip -o /tmp/ngrok.zip;
elif [[ "$(uname)" == "Linux" ]]; then
	curl https://bin.equinox.io/c/4VmDzA7iaHb/ngrok-stable-linux-amd64.zip -o /tmp/ngrok.zip;
fi;
unzip -o /tmp/ngrok.zip -d .bin
rm -f /tmp/ngrok.zip
