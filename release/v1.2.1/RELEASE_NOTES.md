# GoMeter Release v1.2.1

## Summary
Patch release resolving process cancellation lifecycle synchronization and webview state transitions.

## Key Changes
- **Graceful Stop Lifecycle**: Fixed test cancellation tracking in `GoMeterBridge` so user-initiated stops (`⏹ Stop Test` / `gometer.stopActiveTest`) cleanly terminate worker goroutines, transition status to `STOPPED`, and suppress spurious exit error notifications (`Process exited with code null`).
- **Dashboard Status Synchronization**: Resolved webview badge staying on `RUNNING` after short test runs completed by dispatching explicit terminal statuses (`PASSED`, `FAILED`, `STOPPED`) upon execution completion.
- **Run Again Context Recovery**: Updated `gometer.runActiveTest` to persist and re-execute the last active test plan path when focus is inside the dashboard webview.
- **Extended Test Plan Durations**: Updated `real-dummy-apis.gometer.yaml` and `comprehensive-http-methods-auth.gometer.yaml` scenario durations to 20s to allow real-time observation and user stop verification.

