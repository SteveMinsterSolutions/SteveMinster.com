# SteveMinster.com

**Automate the boring. Build the interesting.**

Personal portfolio and sandbox site for Steve Minster — InsurTech product leader, builder, and automation enthusiast.

## Tech Stack

- **Framework:** [Astro](https://astro.build) 5
- **Styling:** [Tailwind CSS](https://tailwindcss.com) 3
- **Fonts:** Space Grotesk, Inter, JetBrains Mono (via Google Fonts)
- **Hosting:** [Vercel](https://vercel.com)
- **Domain:** steveminster.com (Cloudflare DNS)

## Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Project Structure

```
src/
├── components/     # Reusable UI components
├── content/        # Markdown content (portfolio case studies)
├── layouts/        # Page layouts
├── pages/          # Routes (Home, Portfolio, Sandbox, About, Contact)
└── styles/         # Global CSS and Tailwind config
```

## Deployment

Pushes to `main` branch auto-deploy to production via Vercel.
