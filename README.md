# Ticket Organizer

A personal Kanban board and todo list for Linux desktops, with optional Jira sync. The UI is in Greek.

- Kanban board with project spaces, drag-and-drop cards, priorities, due dates and sprints
- PR, branch, and Jenkins links on every card
- A todo list with reminders, plus desktop notifications when a card enters a column
- Optional Jira sync: tickets matching your JQL query are added to the board automatically
- Light, dark, Catppuccin, and custom themes

All data stays on your machine.

## Install

Builds are for **x86_64 / amd64** Linux only.

### Option 1: APT (Debian, Ubuntu, Mint, Pop!_OS, …), recommended

You get updates through `apt upgrade` with the rest of your system.

```bash
# 1. Add the repository's signing key
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://leuterkilschoox.github.io/ticket-organizer/ticket-organizer.gpg \
  | sudo tee /etc/apt/keyrings/ticket-organizer.gpg > /dev/null

# 2. Add the repository
echo "deb [signed-by=/etc/apt/keyrings/ticket-organizer.gpg] https://leuterkilschoox.github.io/ticket-organizer ./" \
  | sudo tee /etc/apt/sources.list.d/ticket-organizer.list

# 3. Install
sudo apt update
sudo apt install ticket-organizer
```

To update later, run `sudo apt update && sudo apt upgrade`.

### Option 2: `.deb` package

Download `ticket-organizer_<version>_amd64.deb` from the [latest release](https://github.com/leuterkilSchoox/ticket-organizer/releases/latest), then:

```bash
sudo apt install ./ticket-organizer_*_amd64.deb
```

Installing it this way doesn't give you automatic updates. Download each new release again, or use Option 1.

### Option 3: AppImage (any distro, no install)

Download `ticket-organizer_<version>_x86_64.AppImage` from the [latest release](https://github.com/leuterkilSchoox/ticket-organizer/releases/latest), then:

```bash
chmod +x ticket-organizer_*_x86_64.AppImage
./ticket-organizer_*_x86_64.AppImage
```

If it fails with `dlopen(): error loading libfuse.so.2`, install FUSE 2 (`sudo apt install libfuse2t64` on Ubuntu 24.04+, `libfuse2` on older versions).

## Launch

Open **Ticket Organizer** from your applications menu, or run `ticket-organizer` in a terminal (APT and `.deb` installs).

## First-time setup

The links and Jira sync need your own URLs. Open the **Ρυθμίσεις** (Settings) tab and fill in:

| Setting | Example |
|---|---|
| Jira URL | `https://your-company.atlassian.net/browse/` |
| PR URL (default repo) | `https://github.com/your-org/your-repo/pull/` |
| Jenkins URL | `https://jenkins.example.com/job/your-repo/job/` |
| Jira email + API token | needed only for Jira sync |

You can also paste a full link to any ticket, PR, or Jenkins job, and the app trims it to the base URL.

To use Jira sync, create an API token at <https://id.atlassian.com/manage-profile/security/api-tokens>. The token is encrypted with your system keyring and is never shown in the UI again.

## Your data

Boards, todos, and settings are stored locally in `~/.config/Ticket Organizer/`. Uninstalling doesn't delete them. To start fresh, delete that folder.

## Uninstall

```bash
# APT / .deb
sudo apt remove ticket-organizer

# also remove the APT repository
sudo rm /etc/apt/sources.list.d/ticket-organizer.list /etc/apt/keyrings/ticket-organizer.gpg
```

For the AppImage, delete the file.

## Development

```bash
npm install
npm start       # run the app
npm run dist    # build .deb + .AppImage into dist/
```

If `npm start` aborts with *"SUID sandbox helper binary … not configured correctly"*, run this once:

```bash
sudo chown root:root node_modules/electron/dist/chrome-sandbox
sudo chmod 4755 node_modules/electron/dist/chrome-sandbox
```

### Releasing

Push a version tag:

```bash
git tag v1.2.0 && git push origin v1.2.0
```

GitHub Actions (`.github/workflows/release.yml`) then builds the `.deb` and AppImage, publishes them as a GitHub Release, and updates the signed APT repository on GitHub Pages. The version number comes from the tag, so there's no need to edit `package.json`. The workflow needs the repository secret `APT_GPG_PRIVATE_KEY`, an ASCII-armored GPG private key without a passphrase.
