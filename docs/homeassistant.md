# Home Assistant integration

splitjar embeds as a [`panel_iframe`](https://www.home-assistant.io/integrations/panel_iframe/) — a sidebar entry that renders the splitjar UI inside an iframe.

## 1. Run splitjar somewhere HA can reach

The Home Assistant host needs to be able to open splitjar's URL. The simplest setup is to run the container on the same machine as HA on a different port.

```bash
docker run -d --name splitjar \
  -p 8473:8473 \
  -v splitjar_data:/data \
  ghcr.io/marinswk/splitjar:latest
```

## 2. (Optional) Lock down who can embed splitjar

By default splitjar sets **no** iframe restrictions, so embedding works from any HA instance you point at it. If you want to restrict embedding to a specific origin, set `SPLITJAR_FRAME_ANCESTORS`:

```dotenv
# .env
SPLITJAR_FRAME_ANCESTORS='self' https://homeassistant.example.com
```

Restart the container. Skip this step if you don't need the restriction.

## 3. Add the panel to HA

Edit `configuration.yaml`:

```yaml
panel_iframe:
  splitjar:
    title: "Splitjar"
    icon: mdi:cash-multiple
    url: "http://homeassistant.local:8473"
    require_admin: false
```

Restart Home Assistant. A "Splitjar" entry appears in the sidebar.

## Troubleshooting

- **Blank panel / "refused to connect"**: if you set `SPLITJAR_FRAME_ANCESTORS`, your HA origin isn't in the allowlist. Check the browser console for the CSP error and update the env value, or unset it to allow embedding from anywhere.
- **Mixed-content warning**: if HA is served over HTTPS, splitjar must also be HTTPS. Put it behind your existing reverse proxy.
- **Permissions / auth**: there is none. Anyone with sidebar access to your HA can use splitjar. That's the trade-off — see [SECURITY.md](../SECURITY.md).
