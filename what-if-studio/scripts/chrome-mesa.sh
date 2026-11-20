#!/data/data/com.termux/files/usr/bin/bash
export LIBGL_ALWAYS_SOFTWARE=1
export GALLIUM_DRIVER=llvmpipe
export MESA_LOADER_DRIVER_OVERRIDE=llvmpipe
exec /data/data/com.termux/files/usr/lib/chromium/chrome \
  --disable-dev-shm-usage \
  "$@"
