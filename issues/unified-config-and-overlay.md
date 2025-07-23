# Issue: Unified Config System with Overlay Support

## Background
Currently, configuration is managed via a single `config.yaml` file, which sometimes gets pushed to GitHub with environment-specific or sensitive values. This has led to:
- Accidental exposure of secrets or local paths
- Developers (e.g., Jules) assuming defaults (like localhost ports) that don't match deployment
- Difficulty keeping example configs in sync with code

## Proposal
Adopt a unified configuration system with overlay support, following best practices from the [Twelve-Factor App](https://12factor.net/config):

- **default-config.yaml**: Checked in, contains all options and safe defaults
- **local-config.yaml**: In `.gitignore`, overrides anything in default, never checked in
- Application loads both, merges with `local-config.yaml` taking precedence
- Optionally, support an environment variable (e.g., `CONFIG_PATH`) for further flexibility

## Benefits
- No secrets or local settings in git
- All config options are always present and up-to-date in `default-config.yaml`
- Local overrides are easy and never get pushed to git
- New config options are always visible to all devs
- Safe for CI/CD: can use only `default-config.yaml` or inject a `local-config.yaml` at deploy time

## Next Steps
- Design a unified config structure for all components (app, signer, etc.)
- Implement overlay/merge logic in config loader
- Update documentation and `.gitignore`
- Remove real config files from git history if needed

---
*Created via AI assistant, based on team discussion and best practices.* 