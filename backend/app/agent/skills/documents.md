---
name: documents
title: Word, Excel, PowerPoint and PDF files
category: Documents
description: Create professional docx, xlsx, pptx and pdf files with Python and check them visually before handing over. Use when the user wants a document file.
---
# Word, Excel, PowerPoint and PDF files

The sandbox has python-docx, openpyxl, xlsxwriter, python-pptx, reportlab, pypdf, pandoc and poppler (pdftoppm) installed.

## Word (python-docx)
- Use real heading styles (Heading 1, 2) so the document has a navigation pane and a table of contents works. Set the base font and size once in the Normal style.
- Tables with a header row style, consistent column widths, no empty paragraphs used as spacing (use paragraph spacing instead).
- For Persian or Arabic text set right-to-left on paragraphs (w:bidi) and use a font that supports the script.
- Quick route for text heavy documents: write Markdown and convert with pandoc to docx, then adjust styles.

## Excel (openpyxl or xlsxwriter)
- One table per sheet starting at A1, bold frozen header row, autofilter, column widths that fit, number formats for money, percent and dates.
- Use real formulas for totals so the sheet stays live, and named ranges or a separate Inputs sheet for assumptions.
- Charts with xlsxwriter when the user wants them inside Excel.

## PowerPoint (python-pptx)
- One idea per slide, a title that states the point, at most five short bullets, large type (title 32 to 40pt, body 18 to 24pt).
- Consistent layout: same margins, one accent color, images and charts aligned to a grid. Put detail in the speaker notes.

## PDF
- From HTML or Markdown: pandoc, or reportlab for precise layouts and generated reports.
- Merge, split or extract with pypdf. Read text with pdftotext.

## Always check the result
Render pages to images and look at them before sending: libreoffice is not installed, so for PDF use pdftoppm -png -r 80 file.pdf page, and for pptx and docx check the structure in code (count slides, read back text) and keep layouts simple. Then give the user the file.
