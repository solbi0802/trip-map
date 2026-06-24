# Trip Map Project Notes

## Active application

- Runtime: React 19 + TypeScript + Vite.
- Entry point: `src/main.tsx`.
- Main application and state: `src/App.tsx`.
- Styling: `src/styles.css`.
- Map data: `src/data/skorea_municipalities_geo_simple.json`.
- Package manager: `pnpm@11.8.0`.

## Commands

```text
pnpm start
pnpm typecheck
pnpm build
pnpm preview
```

## Persistence

- Colored region IDs: `trip-map.visited-region-groups.v1`.
- Region records: `trip-map.region-records.v1`.
- Keep loaders defensive and migrate older fields when schemas change.
- A colored region without a `RegionRecord` has the effective status `visited`.

## Counting invariants

- `recorded = want + visited + revisit`.
- The header count, summary cards, status filters, record list, and region chips must use the same tracked-region set.
- A status filter must include colored regions with no explicit record under `visited`.

## Map data caveats

- The GeoJSON is older administrative data.
- `청원군` is grouped into `청주`.
- `울릉군` is displayed as `울릉도`.
- Metropolitan districts are grouped under their metropolitan city.
- City districts such as `수원시영통구` are grouped and displayed as `수원`.
- Remove only one trailing administrative suffix. For example, `양구군` must become `양구`, not `양`.
- Dense capital-area labels use manual position overrides and selected connector lines.

## PNG export

- Export the rendered SVG through Canvas without adding a dependency.
- Inline computed SVG presentation styles before serialization.
- Use a white background and a deterministic dated filename.
- Keep exported map colors consistent with visit status colors.
- Keep the status legend inside the SVG so the on-screen map and exported PNG include the same explanation.
