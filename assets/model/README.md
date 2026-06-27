# Infrastructure 3D model

The bundled critical-infrastructure model (a refinery / tank farm) is **third-party**
and fetched locally via `scripts/fetch_model.py` — it is **not** committed to this
repository (see `.gitignore`). Its own license and attribution are recorded in
`MANIFEST.json` next to the downloaded mesh after fetching.

Default model: *"Gas / Oil Tank / Refinery / Storage"* by **burnedhrum** (Sketchfab),
licensed **CC&nbsp;Attribution&nbsp;4.0** — attribution is preserved in `MANIFEST.json`
and surfaced in the dashboard credits.

To populate this directory:

```bash
python scripts/fetch_model.py        # see the script for sourcing options
```
