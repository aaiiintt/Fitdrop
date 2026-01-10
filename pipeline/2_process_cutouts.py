import subprocess
import sys
from pathlib import Path
import os

# --- Configuration ---
# Relative paths from this script (pipeline/2_process_cutouts.py)
BASE_DIR = Path(__file__).parent.parent
INPUT_DIR = BASE_DIR / "generated" / "raw"
OUTPUT_DIR = BASE_DIR / "fitdrop_site" / "images"

def main():
    print("--- ✂️  The Cut (Background Removal) ✂️  ---")
    
    # Check if input directory exists and has images
    if not INPUT_DIR.exists():
        print(f"Error: Input directory not found: {INPUT_DIR}")
        return
        
    images = list(INPUT_DIR.glob("*.png"))
    if not images:
        print(f"No PNG images found in {INPUT_DIR}")
        print("Did you run Step 1 (Generation) first?")
        return

    # Ensure output directory exists
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    
    print(f"Found {len(images)} images in {INPUT_DIR.name}")
    print(f"Destination: {OUTPUT_DIR.name}")
    print("Running transparent-background...")
    
    # Construct the command
    # transparent-background --source [src] --dest [dest]
    # We add --fast for speed, though user didn't specify it, it's usually good for bulk.
    # Actually, sticking to user's exact command style:
    # transparent-background --source . --dest output_images
    
    cmd = [
        "transparent-background",
        "--source", str(INPUT_DIR),
        "--dest", str(OUTPUT_DIR),
        "--type", "rgba" # Ensure alpha channel
    ]
    
    try:
        # Check if tool is installed
        subprocess.run(["transparent-background", "--help"], capture_output=True, check=True)
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("\n❌ Error: 'transparent-background' tool not found.")
        print("Please install it running:")
        print("pip install transparent-background")
        sys.exit(1)

    try:
        # Run the tool
        subprocess.run(cmd, check=True)
        print("\n✅ Cutouts complete!")
        print(f"Images saved to: {OUTPUT_DIR}")
        
    except subprocess.CalledProcessError as e:
        print(f("\n❌ Error running transparent-background: {e}"))
        sys.exit(1)

if __name__ == "__main__":
    main()
