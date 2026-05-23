# GIMS Project Development Protocol

This document serves as a mandatory guideline for all development actions in this repository. 

## 1. Design Lock (CRITICAL)
- **DO NOT** modify the existing UI layout, colors, or spacing without explicit user instruction.
- **Theme**: Minimalist "Cyber-Industrial" (Dark/Black backgrounds).
- **Control Layout**: All camera controls (Power, Switch, AI) must remain at the **top** of the camera viewport.
- **No Clutter**: No dummy data, FPS metrics, or unnecessary logs in the main UI.

## 2. Camera Logic & Stability
- **Mirroring**: Horizontal flip (`-scale-x-100`) must **ONLY** be applied to the front camera (`facingMode: 'user'`).
- **Switching**: Always stop existing tracks (`stream.getTracks().forEach(track => track.stop())`) before initiating a new `getUserMedia` request to prevent camera freeze.
- **Power Control**: The camera power toggle must fully stop and release the camera hardware stream.

## 3. Deployment & Integration
- Future integrations (ESP32, Groq) must be added as modular extensions without disrupting the core camera display stability.

---
*Note: Any violation of these rules is considered a critical regression.*
