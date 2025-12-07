# Contributing Guide

Thank you for your interest in ggMCP4VSCode! We welcome and encourage community members to participate in the development and improvement of this project. This document will guide you on how to contribute to the project.

## Code of Conduct

All contributors to this project should follow these basic open-source community guidelines:
- Respect all project participants
- Use friendly and inclusive language
- Respect different viewpoints and experiences
- Gracefully accept constructive criticism
- Focus on what is best for the community

## How to Contribute

### Submitting Issues

If you find a bug or have a suggestion for a new feature, please submit it through GitHub Issues:

1. Use our provided Issue templates
2. Clearly describe the problem or suggestion
3. Provide steps to reproduce (if applicable)
4. Add relevant logs and screenshots (if applicable)
5. Specify your environment (VSCode version, operating system, etc.)

### Contributing Code

If you want to contribute code directly, please follow these steps:

1. Fork this repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Submit a Pull Request

### Development Environment Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/n2ns/ggMCP4VSCode.git
   cd ggMCP4VSCode
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Compile the code:
   ```bash
   npm run compile
   ```

4. Debugging:
   Press F5 in VSCode to launch a new VSCode window for debugging.

### Code Style Guide

- Follow the official TypeScript style guide
- All new code must have appropriate comments
- Keep code concise and readable
- Follow the existing project structure

## Pull Request Process

1. Ensure your PR description clearly explains the changes and the reasons for them
2. If the PR is related to an Issue, reference that Issue in the PR description
3. Update relevant documentation (e.g., README.md)
4. All CI checks must pass
5. Code review approval is required before merging

## Release Process

Project maintainers are responsible for releasing new versions, following this process:

1. Update the version number (follow Semantic Versioning)
2. Update CHANGELOG.md
3. Create a release branch
4. Create a tag and GitHub Release
5. Publish to the VSCode extension marketplace

## Acknowledgements

Thank you again for your contributions to the project! Your participation is essential for improving ggMCP4VSCode.

If you have any questions, please contact us through GitHub Issues.
