## Goal

Remove the refresh button from the Dashboard entirely (no pull-to-refresh either) and restore the older read behavior where the four sensor values update on every poll, not on a 5-second throttle.

## Changes

### 1. `src/pages/DashboardScreen.tsx`

- Delete the `<button>` containing the `RefreshCw` icon in the header (lines 152–159).
- Remove the `RefreshCw` import and drop `refreshSensors` from the `useArduinoSensors` import.
- Keep the `Arduino Live / Offline` status pill as-is.

### 2. `src/hooks/useArduinoSensors.ts` — restore older reading behavior

Today `tick()` runs every 1s but throttles `readings` and history updates to `DATA_UPDATE_MS = 5000`. Revert that:

- Remove `DATA_UPDATE_MS` and the `lastDataUpdateAt` throttle gate.
- On every successful 1s poll, recompute the normalized readings and call `setState({ readings, connected: true, lastUpdated, … })`.
- Continue to `pushHistory()` on every update (this is what the older version did before throttling was introduced).
- `refreshSensors()` export can stay (harmless, unused after the button is removed) or be deleted. Plan: remove it to keep the surface area clean, since no caller remains.

Result: temp, humidity, pH, TDS update once per second as Firebase changes, matching the pre-throttle behavior. No manual refresh control anywhere.

## Out of scope

- No pull-to-refresh gesture.
- No changes to the edge function, polling interval (stays at 1s), or staleness threshold (stays at 7s).
- Other screens unchanged.
