# AI Agent Skills

A collection of open-source skills for AI coding agents by **[PURPLE ORCA](https://orcaportfolio.vercel.app/)**.

Each skill is a self-contained module of specialized knowledge—best practices, patterns, and implementation guides for specific technologies and workflows.

---

## Available Skills

| Skill | Description |
|-------|-------------|
| `expo-i18n` | Complete i18n/localization for React Native Expo apps |
| `modern-inertia` | Inertia.js v3 best practices with Laravel + React |
| `modern-laravel` | Laravel 12 and PHP 8.4/8.5 modern patterns |
| `modern-nextjs` | Next.js 16.2 best practices, App Router, React 19.2 |
| `universal-docs` | Documentation generator for READMEs, ADRs, API refs |

---

## Installation

### Using the Skills CLI (Recommended)

Install any skill directly using the [skills CLI](https://github.com/vercel-labs/skills) — works with all supported agents, no setup required:

```bash
# Add the entire collection
npx skills add PURPLE-ORCA/skills

# Add a specific skill
npx skills add PURPLE-ORCA/skills/modern-nextjs
```

### Manual Installation

Clone the repository and copy individual skill directories to your agent's skills folder:

```bash
git clone https://github.com/PURPLE-ORCA/skills.git
cp -r skills/skills/<skill-name> ~/.agents/skills/
```

---

## Usage

Once installed, skills are automatically triggered by the AI agent based on keywords in your requests. Each skill contains:

- **SKILL.md** — Core documentation, patterns, and guidelines
- **examples/** — Code samples and templates (when applicable)
- **reference/** — Quick reference sheets and cheat sheets (when applicable)

---

## Contributing

Contributions are welcome! To add a new skill or improve an existing one:

1. Fork the repository
2. Create your skill directory with a `SKILL.md` file
3. Follow the existing structure and formatting
4. Submit a pull request

### Skill Structure

```
skill-name/
├── SKILL.md          # Main documentation (required)
├── examples/         # Code examples (optional)
└── reference/        # Quick reference sheets (optional)
```

---

## License

MIT © [PURPLE ORCA](https://orcaportfolio.vercel.app/)

---

## Support

- **Portfolio:** [orcaportfolio.vercel.app](https://orcaportfolio.vercel.app/)
- **Issues:** [GitHub Issues](https://github.com/PURPLE-ORCA/skills/issues)
- **Skills CLI:** [vercel-labs/skills](https://github.com/vercel-labs/skills)
