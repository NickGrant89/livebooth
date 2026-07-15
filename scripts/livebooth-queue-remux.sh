#!/bin/bash
# Queue a path for remux (called from MediaMTX runOnUnPublish inside docker).
echo "$MTX_PATH $(date +%s)" >> /recordings/.remux-queue
