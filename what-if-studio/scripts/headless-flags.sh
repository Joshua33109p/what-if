#!/data/data/com.termux/files/usr/bin/bash
exec /data/data/com.termux/files/usr/lib/chromium/headless_shell \
  --enable-unsafe-swiftshader \
  --disable-dev-shm-usage \
  ${CHROME_EXTRA_FLAGS:-} \
  "$@"
