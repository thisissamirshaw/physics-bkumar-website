#!/usr/bin/env bash
# Print the current public address of the quick Cloudflare tunnel.
journalctl --user -u physics-tunnel --no-pager 2>/dev/null | grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' | tail -1
