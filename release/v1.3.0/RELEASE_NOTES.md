# GoMeter Release v1.3.0

## Highlights
- **Folder Structures in Test Plans Explorer**:
  - Replaced the flat test plans list with a clean hierarchical tree view showing folders and subdirectories containing test plans.
  - Test plans are categorized logically by their workspace location (e.g., `examples/`, `tests/auth/`, etc.).
  - Added new folder action buttons: **New Folder**, **New Test Plan in Folder**, **Refresh**, and **Delete**.
- **Interactive Drag & Drop**:
  - Implemented `vscode.TreeDragAndDropController` for Test Plans:
    - Drag & drop test plans across folders or into subfolders.
    - Drag multiple test plan files simultaneously.
    - Drag external `.yaml`/`.yml` files directly from VS Code Explorer or the OS desktop into test plan folders.
    - Drag folders into other folders with cycle prevention.
- **Redesigned "View Run" Dropdown UI**:
  - Completely overhauled the native browser select into a custom floating dropdown menu with dark mode styling, subtle animations, and accessible keyboard support.
  - Real-time indicator: displays a pulsing live dot with a `LIVE` tag during active tests.
  - Rich Run Item Cards: displays test plan name, formatted timestamp, run ID, pass/fail status badge, total request counts, throughput (RPS), and latency percentiles.
  - Synchronized selection across the dashboard, live chart, metrics summary, and historical runs table.
