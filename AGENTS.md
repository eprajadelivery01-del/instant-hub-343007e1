# Architecture Decisions

- Access Capacitor native plugins through `registerPlugin` when their web package entry is not required, preventing transient package-entry failures during Vite builds while preserving native registration.
- Featured-offer artwork must prefer the notification's supplied image; category-specific illustrative fallback artwork is only shown for matching campaigns, so unrelated offers are not visually misrepresented.