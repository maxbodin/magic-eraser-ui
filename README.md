# Magic Eraser AI - Image Editing Tool

> Advanced AI-powered object removal tool for images.

## Features

- **AI-Powered Object Removal**: Remove unwanted objects from images using inpainting model from Cloudflare AI Worker.
- **Multiple Variations**: Generate and compare multiple variations with different strength and guidance parameters.
- **Real-time Preview**: Instant preview of your edits with precise masking tools.
- **Optimized Performance**: Lightweight and fast, works on low-bandwidth connections.

## Project Structure

```
magic-eraser-ui/
├── public/                      # Static assets
├── src/
│   ├── assets/                  # Image and icon assets
│   ├── components/
│   │   ├── CanvasEditor.vue     # Drawing and masking interface with canvas controls
│   │   ├── ErrorAlert.vue       # Error notification component
│   │   ├── Footer.vue           # Footer component with links and info
│   │   ├── HeroSection.vue      # Modern landing section
│   │   └── ResultsPanel.vue     # Results grid and variation selection
│   ├── composables/
│   │   ├── useImageEditor.ts    # State management composable for image editing
│   │   └── useMouseTracking.ts  # Mouse position tracking composable
│   ├── services/
│   │   └── imageProcessingAPI.ts # API client service for image processing
│   ├── types/
│   │   └── variation.ts         # Image variation type definitions
│   ├── App.vue                  # Main application component with animation effects
│   ├── main.ts                  # Vue application entry point
│   └── style.css                # Global styles and animations
├── index.html                   # HTML entry point
├── package.json                 # Project dependencies and scripts
├── tsconfig.json                # TypeScript configuration
├── tsconfig.app.json            # TypeScript app-specific configuration
├── tsconfig.node.json           # TypeScript node-specific configuration
├── vite.config.ts               # Vite configuration with Vue and Tailwind
└── README.md                    # This file
```

## Technology Stack

- **Frontend Framework**: Vue 3 with Composition API
- **Language**: TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS 4 with Vite plugin
- **Image Processing**: Cloudflare AI Workers (@cf/runwayml/stable-diffusion-v1-5-inpainting)