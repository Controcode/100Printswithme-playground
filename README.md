# 100PrintsWithMe Browser SDK Playground

The official interactive playground and reference implementation for the **100PrintsWithMe Browser SDK**.

This project demonstrates how to integrate the Browser SDK into a real React application and showcases every major SDK feature.

---

## Features

- 🔐 Browser SDK authentication
- 🎨 Live template preview
- 📄 Render PDF documents
- 🖼️ Render PNG images
- 📦 Bulk document generation
- ⚡ Progress callbacks
- 📝 Variable editing
- 🖥️ Interactive developer console
- 🚀 Production-ready React integration
- 💯 Best practices for SDK usage

---

## Tech Stack

- React
- TypeScript
- Vite
- 100PrintsWithMe Browser SDK

---

## Getting Started

Clone the repository.

```bash
git clone https://github.com/Controcode/100printswithme-browser-sdk-playground.git
```

Install dependencies.

```bash
npm install
```

Start the development server.

```bash
npm run dev
```

Open your browser.

```
http://localhost:5173
```

---

## Configure the SDK

Open the application and provide:

- Publishable API Key
- Template ID

Example:

```ts
const sdk = new BrowserSDK({
    key: "pk_live_xxxxxxxxxxxxxxxxx"
});
```

---

## What You Can Test

### Live Preview

Render templates directly inside the browser while editing variables.

```ts
await sdk.preview({
    templateId,
    payload,
    container,
});
```

---

### PDF Rendering

Generate print-ready PDF documents.

```ts
const { blob } = await sdk.render({
    templateId,
    payload,
    format: "pdf",
});
```

---

### PNG Rendering

Generate high-quality PNG images.

```ts
const { blob } = await sdk.render({
    templateId,
    payload,
    format: "png",
});
```

---

### Bulk Rendering

Generate hundreds or thousands of personalized documents.

```ts
await sdk.renderBulk({
    templateId,
    rows,
    format: "pdf",
    mode: "merged",
});
```

---

## Playground Sections

The application demonstrates:

- SDK Initialization
- Authentication
- Template Loading
- Live Preview
- Variable Editing
- PDF Rendering
- PNG Rendering
- Bulk Rendering
- Progress Tracking
- Error Handling
- Developer Console

---

## Repository Purpose

This repository serves as the official reference implementation for integrating the Browser SDK into React applications.

It is intended to help developers:

- Learn the SDK
- Experiment with rendering
- Understand best practices
- Explore production integration patterns

---

## Related Repositories

### Browser SDK

https://github.com/Controcode/100printswithme-browser-sdk

Official Browser SDK source code.

---

### Documentation

https://100printswith.me/docs

Complete SDK documentation.

---

### Website

https://100printswith.me

---

## Contributing

Bug reports, feature requests, and pull requests are welcome.

Please open an issue before submitting major changes.

---

## License

Copyright © 2026 100PrintsWithMe.

This playground is provided as a reference implementation for the 100PrintsWithMe Browser SDK.

See the LICENSE file for details.
