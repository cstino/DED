import fitz  # PyMuPDF
import os

source_dir = "materiale-sorgente"

pdfs = [
    "Dungeon and Dragons Manuale del giocatore (1).pdf",
    "esplorando eberron.pdf",
]

for pdf_name in pdfs:
    pdf_path = os.path.join(source_dir, pdf_name)
    txt_name = os.path.splitext(pdf_name)[0] + ".txt"
    txt_path = os.path.join(source_dir, txt_name)
    
    if os.path.exists(txt_path):
        print(f"SKIP (already exists): {txt_name}")
        continue
    
    print(f"Converting: {pdf_name} ...")
    try:
        doc = fitz.open(pdf_path)
        with open(txt_path, "w", encoding="utf-8") as f:
            for i, page in enumerate(doc):
                text = page.get_text()
                f.write(f"\n--- PAGE {i+1} ---\n")
                f.write(text)
        doc.close()
        size_mb = os.path.getsize(txt_path) / (1024*1024)
        print(f"  -> Done: {txt_name} ({size_mb:.1f} MB)")
    except Exception as e:
        print(f"  -> ERROR: {e}")

print("\nAll done!")
