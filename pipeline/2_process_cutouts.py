from pathlib import Path
from rembg import remove
from PIL import Image
import concurrent.futures
import time
import os

# --- Configuration ---
INPUT_DIR = Path(__file__).parent.parent / "generated" / "raw"
OUTPUT_DIR = Path(__file__).parent.parent / "generated" / "cutouts"
# We also copy/move to site? For now, just generate to output. 
# Creating a dedicated output keeps it clean. User can copy to site.
# Or we can output directly to fitdrop_site/images? 
# Let's output to generated/cutouts so it's inspection-ready.

SITE_ASSETS_DIR = Path(__file__).parent.parent / "fitdrop_site" / "images"

# --- Setup ---
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
SITE_ASSETS_DIR.mkdir(parents=True, exist_ok=True)

def process_image(img_path):
    try:
        if img_path.name.startswith('.'): return # Skip hidden files
        
        # Determine output filename (add _rgba suffix as per convention)
        if "_rgba" in img_path.stem:
            out_name = img_path.name # Already processed naming?
        else:
            out_name = f"{img_path.stem}_rgba.png"
            
        out_path = OUTPUT_DIR / out_name
        site_path = SITE_ASSETS_DIR / out_name
        
        if out_path.exists() and site_path.exists():
            print(f"Skipping {img_path.name} (already exists)")
            return

        print(f"Processing {img_path.name}...")
        
        # Load and remove background
        inp = Image.open(img_path)
        output = remove(inp)
        
        # Save to generated/cutouts (Source of truth for assets)
        output.save(out_path)
        
        # Copy to site (Deployment ready)
        output.save(site_path)
        
        print(f"✓ Saved {out_name}")

    except Exception as e:
        print(f"Error processing {img_path.name}: {e}")

def main():
    print(f"Looking for images in {INPUT_DIR}...")
    images = list(INPUT_DIR.glob("*.png"))
    
    if not images:
        print("No images found to process.")
        return

    print(f"Found {len(images)} images. processing...")
    
    # Process in parallel for speed
    with concurrent.futures.ThreadPoolExecutor() as executor:
        executor.map(process_image, images)
        
    print("Done! Check 'generated/cutouts' and 'fitdrop_site/images'.")

if __name__ == "__main__":
    main()
