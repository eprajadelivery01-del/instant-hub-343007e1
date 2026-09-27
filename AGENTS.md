# Architecture Decisions

- Access Capacitor native plugins through `registerPlugin` when their web package entry is not required, preventing transient package-entry failures during Vite builds while preserving native registration.