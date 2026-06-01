# Home Assistant integration

splitjar embeds as a [`panel_iframe`](https://www.home-assistant.io/integrations/panel_iframe/) — a sidebar entry that renders the splitjar UI inside an iframe.

## 1. Run splitjar somewhere HA can reach

The Home Assistant host needs to be able to open splitjar's URL. The simplest setup is to run the container on the same machine as HA on a different port.

```bash
docker run -d --name splitjar \
  -p 8000:8000 \
  -v splitjar_data:/data \
  ghcr.io/marinswk/splitjar:latest
```

## 2. Allow your HA host as a frame ancestor

splitjar sends `Content-Security-Policy: frame-ancestors …` to control who can embed it. The default allows `http://homeassistant.local:8123` and `http://*.local:8123`. If your HA lives somewhere else, set `SPLITJAR_FRAME_ANCESTORS`:

```dotenv
# .env
SPLITJAR_FRAME_ANCESTORS='self' http://192.168.1.10:8123 https://ha.example.com
```

Restart the container.

## 3. Add the panel to HA

Edit `configuration.yaml`:

```yaml
panel_iframe:
  splitjar:
    title: "Splitjar"
    icon: mdi:cash-multiple
    url: "http://homeassistant.local:8000"
    require_admin: false
```

Restart Home Assistant. A "Splitjar" entry appears in the sidebar.

## Troubleshooting

- **Blank panel / "refused to connect"**: your HA host isn't in `frame-ancestors`. Check the browser console for the actual CSP error and update `SPLITJAR_FRAME_ANCESTORS`.
- **Mixed-content warning**: if HA is served over HTTPS, splitjar must also be HTTPS. Put it behind your existing reverse proxy.
- **Permissions / auth**: there is none. Anyone with sidebar access to your HA can use splitjar. That's the trade-off — see [SECURITY.md](../SECURITY.md).
