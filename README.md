# Magic Eraser AI - Image Editing Tool

> Advanced AI-powered object removal tool for images.

## Features

- **AI-Powered Object Removal**: Remove unwanted objects from images using inpainting model from Cloudflare AI Worker.
- **Multiple Variations**: Generate and compare multiple variations with different strength and guidance parameters.
- **Real-time Preview**: Instant preview of your edits with precise masking tools.
- **Optimized Performance**: Lightweight and fast, works on low-bandwidth connections.

## Project Structure

```
src/
├── components/
│   ├── CanvasEditor.vue    # Drawing and masking interface
│   ├── ResultsPanel.vue    # Results grid and selection
│   ├── HeroSection.vue     # Modern landing section
│   └── ErrorAlert.vue      # Error notification component
├── composables/
│   └── useImageEditor.ts   # State management composable
├── services/
│   └── imageProcessingAPI.ts # API client service
├── types/
│   └── variation.ts        # Image variation type
├── App.vue              # Main application component
├── main.ts
└── style.css
```