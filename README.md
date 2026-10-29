# Carvis

> **Disclaimer:** this is a starter version of the project, made to show my skills with Vue. It is a demo, not a finished product.

A vehicle expense diary: fuel, service, parts and any other costs in one place, with reports that show where the money goes.

**Demo:** [vedernikov.site/carvis](https://vedernikov.site/carvis/). Log in as `user` with the password `user123`. The demo account already has a car and a motorcycle with a year of expenses.

## About

Features:

- expense log with filters, search, pagination and CSV/XLSX export
- fuel consumption calculated between full-tank fill-ups, including EV charging
- vehicles with a service book that can be printed or saved as PDF
- dashboard, reports by category and month, and cost calculators
- CSV import, custom categories and a pre-sale vehicle passport link

The app has no server. The backend (routing, validation, SQL queries) runs right in the browser on top of PGlite, which is PostgreSQL compiled to WebAssembly, and all data is stored in the browser's IndexedDB. Because of this, data and passport links are only available in the browser where they were created.

## Stack

- Vue 3, Vue Router, Pinia
- Vite, SCSS
- Axios with a custom adapter that sends requests to the in-browser backend
- PGlite, Zod, bcryptjs
- write-excel-file for XLSX export

---

<sub>© 2026 Alexey Vedernikov. All rights reserved. This code is published only so that it can be reviewed as part of my portfolio. You may not copy, modify, distribute or use it, in whole or in part, in any personal or commercial project without my written permission.</sub>
