#!/data/data/com.termux/files/usr/bin/bash
exec /data/data/com.termux/files/usr/lib/chromium/chrome \
  --enable-unsafe-swiftshader \
  --disable-dev-shm-usage \
  "$@"
