# Politickin — Courier-inspired newsroom

A responsive, static newsroom homepage inspired by the editorial structure and high-contrast visual language requested for Courier Newsroom.

## Run locally

No build step or package manager is required. Open `index.html` in a browser, or serve the directory with any static web server:

```bash
python3 -m http.server 4173
```

Then visit http://localhost:4173.

## Included

- Sticky desktop navigation and responsive mobile menu
- Lead story and supporting story rail
- Illustrated local-network map and affiliate labels
- National news and analysis feed
- Four-card national series grid
- Newsletter sign-up interaction (presentation-only until an email provider is connected)
- Responsive layouts for mobile, tablet, and desktop

## Notes

Story headlines, dates, and editorial copy are demo content. Portrait photography is illustrative and is not intended to identify the named hosts. Images are loaded from Unsplash URLs and require an internet connection.

The newsletter form currently validates input and displays a confirmation note; it does not store addresses or send email. Connect an email service before collecting real subscriptions.
