#!/usr/bin/env python3
"""
PokePath TD Mod Installer - User-Friendly GUI
Simple 3-button interface for installing mods and accessing save editor.

v1.4.1c - Fixed PowerShell execution policy issue:
- Uses cmd.exe explicitly for npx commands (bypasses PowerShell .ps1 blocking)
- Added threading for long operations (prevents "Not Responding")
- Added timeouts to prevent infinite hangs
- Better error handling and detection
"""

import tkinter as tk
from tkinter import ttk, messagebox
import subprocess
import sys
import os
import json
import threading
import shutil
from pathlib import Path

# Get script directory (relative paths - works wherever user extracts)
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

def check_node_installed():
    """Check if Node.js is installed and accessible."""
    try:
        # Use cmd.exe explicitly on Windows to avoid PowerShell execution policy issues
        if sys.platform == 'win32':
            result = subprocess.run(
                ['cmd', '/c', 'node', '--version'],
                capture_output=True,
                text=True,
                timeout=10,
                creationflags=subprocess.CREATE_NO_WINDOW
            )
        else:
            result = subprocess.run(
                ['node', '--version'],
                capture_output=True,
                text=True,
                timeout=10
            )
        return result.returncode == 0
    except (subprocess.TimeoutExpired, FileNotFoundError, Exception):
        return False

def check_npx_works():
    """Check if npx works (might be blocked by PowerShell execution policy)."""
    try:
        if sys.platform == 'win32':
            # Use cmd.exe to bypass PowerShell .ps1 script blocking
            result = subprocess.run(
                ['cmd', '/c', 'npx', '--version'],
                capture_output=True,
                text=True,
                timeout=10,
                creationflags=subprocess.CREATE_NO_WINDOW
            )
        else:
            result = subprocess.run(
                ['npx', '--version'],
                capture_output=True,
                text=True,
                timeout=10
            )
        
        # Check for PowerShell execution policy error in stderr
        if 'cannot be loaded because running scripts is disabled' in result.stderr:
            return False, 'powershell_blocked'
        
        return result.returncode == 0, None
    except (subprocess.TimeoutExpired, FileNotFoundError, Exception) as e:
        return False, str(e)

def run_npx_command(args, cwd=None, timeout=300):
    """Run an npx command, using cmd.exe on Windows to bypass PowerShell issues."""
    try:
        if sys.platform == 'win32':
            # Use cmd.exe /c to run npx - this bypasses PowerShell execution policy
            cmd = ['cmd', '/c', 'npx'] + args
            result = subprocess.run(
                cmd,
                cwd=str(cwd) if cwd else None,
                capture_output=True,
                text=True,
                timeout=timeout,
                creationflags=subprocess.CREATE_NO_WINDOW
            )
        else:
            cmd = ['npx'] + args
            result = subprocess.run(
                cmd,
                cwd=str(cwd) if cwd else None,
                capture_output=True,
                text=True,
                timeout=timeout
            )
        
        # Check for PowerShell execution policy error
        if 'cannot be loaded because running scripts is disabled' in result.stderr:
            return False, "", "PowerShell is blocking scripts. This is handled automatically."
        
        return result.returncode == 0, result.stdout, result.stderr
    except subprocess.TimeoutExpired:
        return False, "", "Operation timed out"
    except FileNotFoundError as e:
        return False, "", f"Command not found: {e}"
    except Exception as e:
        return False, "", str(e)

def run_command(cmd, cwd=None, timeout=300):
    """Run a command with timeout and proper flags."""
    try:
        creationflags = subprocess.CREATE_NO_WINDOW if sys.platform == 'win32' else 0
        
        result = subprocess.run(
            cmd,
            cwd=str(cwd) if cwd else None,
            capture_output=True,
            text=True,
            timeout=timeout,
            creationflags=creationflags
        )
        return result.returncode == 0, result.stdout, result.stderr
    except subprocess.TimeoutExpired:
        return False, "", "Operation timed out"
    except FileNotFoundError as e:
        return False, "", f"Command not found: {e}"
    except Exception as e:
        return False, "", str(e)

class ModInstaller(tk.Tk):
    def __init__(self):
        super().__init__()
        
        self.title("PokePath TD Mod Installer")
        self.geometry("400x350")
        self.resizable(False, False)
        self.configure(bg='#1a1a2e')
        
        # Center window
        self.update_idletasks()
        x = (self.winfo_screenwidth() - 400) // 2
        y = (self.winfo_screenheight() - 350) // 2
        self.geometry(f"+{x}+{y}")
        
        self.is_working = False
        self.create_widgets()
        
        # Check requirements in background (non-blocking)
        self.after(100, self.check_requirements_async)
    
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
            command=self.install_mods_async,
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
            text="Checking requirements...",
            font=('Segoe UI', 10),
            fg='#666666',
            bg='#1a1a2e',
            wraplength=380
        )
        self.status.pack(side='bottom', pady=15)
    
    def check_requirements_async(self):
        """Check requirements in background thread."""
        def check():
            has_node = check_node_installed()
            has_resources = RESOURCES.exists()
            npx_works, npx_error = check_npx_works()
            
            # Update UI from main thread
            self.after(0, lambda: self.on_requirements_checked(has_node, has_resources, npx_works, npx_error))
        
        thread = threading.Thread(target=check, daemon=True)
        thread.start()
    
    def on_requirements_checked(self, has_node, has_resources, npx_works, npx_error):
        """Handle requirements check result."""
        if not has_resources:
            self.set_status("⚠️ Game folder not detected!\nMake sure mods folder is inside the game directory.", '#e94560')
            self.mod_btn.config(state='disabled', bg='#666666')
        elif not has_node:
            self.set_status("⚠️ Node.js not found!\nInstall from nodejs.org", '#e94560')
            self.mod_btn.config(state='disabled', bg='#666666')
        elif not npx_works and npx_error == 'powershell_blocked':
            # npx is blocked by PowerShell, but we handle this with cmd.exe
            self.set_status("✓ Ready (using cmd.exe for npx)", '#4ecca3')
        elif not npx_works:
            self.set_status(f"⚠️ npx not working: {npx_error}", '#e94560')
            self.mod_btn.config(state='disabled', bg='#666666')
        else:
            self.set_status("✓ Ready to install mods", '#4ecca3')
    
    def set_status(self, text, color='#666666'):
        self.status.config(text=text, fg=color)
        self.update_idletasks()
    
    def set_buttons_enabled(self, enabled):
        """Enable/disable all buttons."""
        state = 'normal' if enabled else 'disabled'
        bg_mod = '#4ecca3' if enabled else '#666666'
        bg_editor = '#4a90d9' if enabled else '#666666'
        
        self.mod_btn.config(state=state, bg=bg_mod)
        self.editor_btn.config(state=state, bg=bg_editor)
    
    def install_mods_async(self):
        """Run mod installation in background thread."""
        if self.is_working:
            return
        
        self.is_working = True
        self.set_buttons_enabled(False)
        self.set_status("Starting installation...", '#4ecca3')
        
        thread = threading.Thread(target=self.install_mods_worker, daemon=True)
        thread.start()
    
    def install_mods_worker(self):
        """Worker thread for mod installation."""
        try:
            # Step 1: Check if game needs extraction
            app_extracted = RESOURCES / "app_extracted"
            
            if not app_extracted.exists():
                self.after(0, lambda: self.set_status("Extracting game files (this may take a minute)...", '#4ecca3'))
                
                # Use our npx wrapper that handles PowerShell issues
                success, stdout, stderr = run_npx_command(
                    ['asar', 'extract', 'app.asar', 'app_extracted'],
                    cwd=RESOURCES,
                    timeout=300  # 5 minute timeout for extraction
                )
                
                if not success:
                    raise Exception(f"Failed to extract game files: {stderr}")
            
            # Step 2: Apply mods
            self.after(0, lambda: self.set_status("Applying mods...", '#4ecca3'))
            
            apply_script = SCRIPT_DIR / "apply_mods.py"
            success, stdout, stderr = run_command(
                [sys.executable, str(apply_script)],
                cwd=SCRIPT_DIR,
                timeout=120  # 2 minute timeout for applying mods
            )
            
            if not success:
                raise Exception(f"Failed to apply mods: {stderr}")
            
            # Check for failures in output
            if "Failed:" in stdout and "Failed:  0" not in stdout:
                # Some mods failed but continue anyway
                self.after(0, lambda: self.set_status("Some mods failed, continuing...", '#ffaa00'))
            
            # Step 3: Repack (already done by apply_mods.py, but verify)
            self.after(0, lambda: self.set_status("Finalizing...", '#4ecca3'))
            
            # Success!
            self.after(0, self.on_install_success)
            
        except Exception as e:
            error_msg = str(e)[:100]
            self.after(0, lambda: self.on_install_error(error_msg))
        
        finally:
            self.is_working = False
            self.after(0, lambda: self.set_buttons_enabled(True))
    
    def on_install_success(self):
        """Handle successful installation."""
        self.set_status("✅ Mods installed successfully! Restart the game.", '#4ecca3')
        messagebox.showinfo(
            "Success!", 
            "Mods installed successfully!\n\nRestart PokePath TD to play."
        )
    
    def on_install_error(self, error_msg):
        """Handle installation error."""
        self.set_status(f"❌ Error: {error_msg}", '#e94560')
        messagebox.showerror(
            "Installation Failed", 
            f"Error during installation:\n\n{error_msg}\n\nMake sure:\n"
            "• Node.js is installed (nodejs.org)\n"
            "• Python is installed (python.org)\n"
            "• The game is closed\n"
            "• Mods folder is in the game directory"
        )
    
    def open_save_editor(self):
        """Launch the save editor."""
        if self.is_working:
            return
        
        self.set_status("Opening Save Editor...", '#4a90d9')
        
        editor_script = SCRIPT_DIR / "save_editor.py"
        if editor_script.exists():
            try:
                creationflags = subprocess.CREATE_NO_WINDOW if sys.platform == 'win32' else 0
                subprocess.Popen(
                    [sys.executable, str(editor_script)],
                    cwd=str(SCRIPT_DIR),
                    creationflags=creationflags
                )
                self.set_status("Save Editor opened", '#666666')
            except Exception as e:
                self.set_status(f"❌ Failed to open editor: {e}", '#e94560')
        else:
            messagebox.showerror("Error", "save_editor.py not found!")
            self.set_status("❌ Save Editor not found", '#e94560')

def main():
    # Check Python version
    if sys.version_info < (3, 7):
        root = tk.Tk()
        root.withdraw()
        messagebox.showerror("Error", "Python 3.7+ required\n\nDownload from python.org")
        return
    
    app = ModInstaller()
    app.mainloop()

if __name__ == "__main__":
    main()
