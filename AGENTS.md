# Architecture Decisions

- Access Capacitor native plugins through `registerPlugin` when their web package entry is not required, preventing transient package-entry failures during Vite builds while preserving native registration.
- Keep featured-offer presentation in the existing notification component and use CSS-only decoration, so visual updates do not alter notification delivery or audience filtering.