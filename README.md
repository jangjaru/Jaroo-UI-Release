# Jaroo's Company · UI Auto-Update Release

**2026-11-23 · Dracula Neon RESTORED to the latest main branch**

The user's requested last pre-Neo Dracula Neon UI is restored from sanitized public commit `af603c9f929d6e51d71a232b57701116674318c6`. Neo code remains recoverable in Git history. The only modifications to the restored ChatGPT source are higher update version labels and corresponding Clock/Status runtime version reports.

| Component | Latest release | Restored visual/functional baseline |
|---|---|---|
| ChatGPT Clock | 3.10.0 | Dracula 3.7.3 |
| ChatGPT Status | 6.8.0 | Dracula 6.5.3 |
| ChatGPT Mapper | 1.3.6 | Dracula 1.3.2 |
| ChatGPT UserCSS | 8.3.0 | Dracula 7.3.0 |
| Google Calendar Companion | 1.3.7 | unchanged |
| Google Calendar UserCSS | 1.2.2 | unchanged |

**Install/update:** [한국어 안내](docs/INSTALLATION_KO.md). **Change details:** [Dracula restoration release notes](docs/RELEASE_v8.3.0_DRACULA_RESTORE_KO.md). **Integrity:** [SHA256.json](SHA256.json).

Automatic update URLs remain on `main`. A previously installed `frozen` copy does not automatically follow `main`; replace it using main URLs. Individual Life Clock profile data is never included in these published files. Real logged-in Chrome visual validation and actual extension auto-update tests remain pending.
