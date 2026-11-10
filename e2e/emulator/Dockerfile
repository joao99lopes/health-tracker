# Firebase Auth emulator for the browser tests (scripts/e2e.sh).
# Development only: never part of what runs on the Pi.
FROM node:22-bookworm
RUN npm install -g firebase-tools@15.34.1 && npm cache clean --force
WORKDIR /emu
RUN printf '{ "emulators": { "auth": { "host": "0.0.0.0", "port": 9099 }, "ui": { "enabled": false }, "singleProjectMode": true } }\n' > firebase.json
EXPOSE 9099
CMD ["firebase", "emulators:start", "--only", "auth", "--project", "demo-health"]
