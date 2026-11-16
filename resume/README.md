# Résumé source

`resume.html` is the source for `assets/Raghav-Raman-Resume.pdf`. Edit the HTML, then rebuild the PDF with Chrome:

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --no-pdf-header-footer \
  --print-to-pdf=assets/Raghav-Raman-Resume.pdf resume/resume.html
```

It uses Avenir Next, which ships with macOS; elsewhere it falls back to a similar sans-serif.
