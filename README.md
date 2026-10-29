# FEC Circuit Lab — Circuit Analysis Website

A responsive, static website for the FEC 203/203L project on circuit analysis using the **Node Voltage Method** or **Mesh Current Method**.

## Features

- Guided flow matching the project flowchart: start → method selection → input format → unknown count → results.
- Choose **System of Equations** or **Matrix Notation**.
- Solve square linear systems with 3–8 unknowns.
- Object-oriented JavaScript solver using Gaussian elimination with partial pivoting.
- Validation for missing inputs and singular systems.
- Solution values, equation residual check, and an elimination walkthrough.
- Element table for voltage, current, power absorbed, and power delivered.
- Power-balance consistency check and text-report export.
- Responsive interface for desktop and mobile.
- Optional Python/OOP reference solver in `solver.py`.

## Publish on GitHub Pages

1. Create a GitHub repository (for example, `fec-circuit-lab`).
2. Upload `index.html`, `style.css`, `script.js`, `solver.py`, and `README.md` to the repository root.
3. Open **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Select the `main` branch and `/ (root)`, then save.
6. Wait for GitHub Pages to publish the site. The Pages URL will appear in that settings section.

No build step, package installation, API key, or server is required.

## Local preview

Open `index.html` in a modern browser. For a local server, run:

```bash
python -m http.server 8000
```

Then visit `http://localhost:8000`.

## Important engineering note

The equation solver computes the unknown vector from the coefficient matrix and constants. The element power table is a separate user-entered accounting table; the solver cannot infer every element's voltage/current from an arbitrary linear system alone. Use a complete, correctly signed element list for the power check.

The website reports whether the entered element powers balance within a tolerance of the larger of 0.01 W or 1%. That is a **power-consistency check**, not proof of dynamic circuit stability. To assess stability in the control-systems sense, a circuit's dynamic model and relevant poles/eigenvalues or transient response are needed.

## Example system

The built-in sample generator creates a nonsingular system with a known solution. It is a demonstration input, not a claim about a specific physical circuit.

## Files

- `index.html` — semantic page structure and views
- `style.css` — responsive visual design
- `script.js` — UI flow, validation, Gaussian elimination, power calculations, and report export
- `solver.py` — equivalent Python/OOP reference implementation
