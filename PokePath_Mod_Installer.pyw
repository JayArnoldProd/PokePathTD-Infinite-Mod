#!/usr/bin/env python3
"""
PokePath TD Mod Installer - User-Friendly GUI
Simple 3-button interface for installing mods and accessing save editor.
"""

import tkinter as tk
from tkinter import ttk, messagebox
import subprocess
import sys
import os
import json
from pathlib import Path

# Get script directory
SCRIPT_DIR = Path(__file__).parent.resolve()
GAME_ROOT = SCRIPT_DIR.parent
RESOURCES = GAME_ROOT / "resources"

# Load version from version.json
def get_version():
    version_file = SCRIPT_DIR / "version.json"
    if version_file.exists():
        with open(version_file, 'r') as f:
            return json.load(f).get('version', '1.4.1')
    return '1.4.1'

MOD_VERSION = get_version()

class ModInstaller(tk.Tk):
    def __init__(self):
        super().__init__()
        
        self.title("PokePath TD Mod Installer")
        self.geometry("400x320")
        self.resizable(False, False)
        self.configure(bg='#1a1a2e')
        
        # Center window
        self.update_idletasks()
        x = (self.winfo_screenwidth() - 400) // 2
        y = (self.winfo_screenheight() - 320) // 2
        self.geometry(f"+{x}+{y}")
        
        self.create_widgets()
        self.check_requirements()
    
    def create_widgets(self):
        # Title
        title = tk.Label(
            self, 
            text="🎮 PokePath TD",
            font=('Segoe UI', 24, 'bold'),
            fg='#e94560',
            bg='#1a1a2e'
        )
        title.pack(pady=(25, 5))
        
        subtitle = tk.Label(
            self,
            text=f"Mod Installer v{MOD_VERSION}",
            font=('Segoe UI', 12),
            fg='#888888',
            bg='#1a1a2e'
        )
        subtitle.pack(pady=(0, 20))
        
        # Button frame
        btn_frame = tk.Frame(self, bg='#1a1a2e')
        btn_frame.pack(pady=10)
        
        # Style for buttons
        btn_style = {
            'font': ('Segoe UI', 14, 'bold'),
            'width': 20,
            'height': 2,
            'cursor': 'hand2',
            'relief': 'flat',
            'bd': 0
        }
        
        # Mod Game button (green)
        self.mod_btn = tk.Button(
            btn_frame,
            text="⚡ Install Mods",
            bg='#4ecca3',
            fg='#1a1a2e',
            activebackground='#3db892',
            activeforeground='#1a1a2e',
            command=self.install_mods,
            **btn_style
        )
        self.mod_btn.pack(pady=8)
        
        # Save Editor button (blue)
        self.editor_btn = tk.Button(
            btn_frame,
            text="💾 Save Editor",
            bg='#4a90d9',
            fg='white',
            activebackground='#3a7fc8',
            activeforeground='white',
            command=self.open_save_editor,
            **btn_style
        )
        self.editor_btn.pack(pady=8)
        
        # Exit button (gray)
        self.exit_btn = tk.Button(
            btn_frame,
            text="❌ Exit",
            bg='#444444',
            fg='white',
            activebackground='#333333',
            activeforeground='white',
            command=self.quit,
            **btn_style
        )
        self.exit_btn.pack(pady=8)
        
        # Status label
        self.status = tk.Label(
            self,
            text="Ready",
            font=('Segoe UI', 10),
            fg='#666666',
            bg='#1a1a2e'
        )
        self.status.pack(side='bottom', pady=15)
    
    def check_requirements(self):
        """Check if game folder is correct and install dependencies."""
        # Install npm dependencies if needed (for save editor)
        node_modules = SCRIPT_DIR / "node_modules"
        if not node_modules.exists():
            self.status.config(text="Installing dependencies...", fg='#4ecca3')
            self.update()
            subprocess.run(
                ['npm', 'install'],
                cwd=str(SCRIPT_DIR),
                capture_output=True,
                shell=True
            )
            self.status.config(text="Ready", fg='#666666')
        
        if not RESOURCES.exists():
            self.status.config(text="⚠️ Game folder not detected", fg='#e94560')
            self.mod_btn.config(state='disabled', bg='#666666')
    
    def set_status(self, text, color='#666666'):
        self.status.config(text=text, fg=color)
        self.update()
    
    def install_mods(self):
        """Run the mod installation process."""
        self.set_status("Installing mods...", '#4ecca3')
        self.mod_btn.config(state='disabled')
        self.update()
        
        try:
            # Check if game is extracted
            app_extracted = RESOURCES / "app_extracted"
            if not app_extracted.exists():
                self.set_status("Extracting game files...", '#4ecca3')
                result = subprocess.run(
                    ['npx', 'asar', 'extract', 'app.asar', 'app_extracted'],
                    cwd=str(RESOURCES),
                    capture_output=True,
                    text=True,
                    shell=True
                )
                if result.returncode != 0:
                    raise Exception("Failed to extract game files")
            
            # Run apply_mods.py
            self.set_status("Applying mods...", '#4ecca3')
            apply_script = SCRIPT_DIR / "apply_mods.py"
            
            result = subprocess.run(
                [sys.executable, str(apply_script)],
                cwd=str(SCRIPT_DIR),
                capture_output=True,
                text=True
            )
            
            if result.returncode == 0 and ("Failed:" not in result.stdout or "Failed:  0" in result.stdout):
                # Note: Shiny sprites are now pre-packaged in patches/shiny_sprites/
                # and installed automatically by apply_mods.py
                
                # Repack
                self.set_status("Repacking game...", '#4ecca3')
                subprocess.run(
                    ['npx', 'asar', 'pack', 'app_extracted', 'app.asar'],
                    cwd=str(RESOURCES),
                    capture_output=True,
                    shell=True
                )
                
                self.set_status("✅ Mods installed! Restart the game.", '#4ecca3')
                messagebox.showinfo(
                    "Success!", 
                    "Mods installed successfully!\n\nRestart PokePath TD to play."
                )
            else:
                raise Exception(result.stderr or "Unknown error")
                
        except Exception as e:
            self.set_status(f"❌ Error: {str(e)[:40]}", '#e94560')
            messagebox.showerror("Error", f"Installation failed:\n{str(e)}")
        
        finally:
            self.mod_btn.config(state='normal')
    
    def open_save_editor(self):
        """Launch the save editor."""
        self.set_status("Opening Save Editor...", '#4a90d9')
        
        editor_script = SCRIPT_DIR / "save_editor.py"
        if editor_script.exists():
            subprocess.Popen([sys.executable, str(editor_script)], cwd=str(SCRIPT_DIR))
            self.set_status("Save Editor opened", '#666666')
        else:
            messagebox.showerror("Error", "save_editor.py not found!")
            self.set_status("❌ Save Editor not found", '#e94560')

def main():
    # Check Python version
    if sys.version_info < (3, 7):
        messagebox.showerror("Error", "Python 3.7+ required")
        return
    
    app = ModInstaller()
    app.mainloop()

if __name__ == "__main__":
    main()
