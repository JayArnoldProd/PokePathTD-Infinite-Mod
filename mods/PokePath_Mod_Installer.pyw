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
        if sys.platform == 'win32':
            # Try cmd.exe first (bypasses PowerShell execution policy issues)
            try:
                result = subprocess.run(
                    ['cmd', '/c', 'node', '--version'],
                    capture_output=True,
                    text=True,
                    timeout=10,
                    creationflags=subprocess.CREATE_NO_WINDOW
                )
                if result.returncode == 0:
                    return True
            except (subprocess.TimeoutExpired, FileNotFoundError, Exception):
                pass
            # Fallback: try node directly (handles cases where cmd /c fails
            # but node is on PATH, e.g. pythonw.exe environment differences)
            result = subprocess.run(
                ['node', '--version'],
                capture_output=True,
                text=True,
                timeout=10,
                creationflags=subprocess.CREATE_NO_WINDOW
            )
            return result.returncode == 0
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
            # Try cmd.exe first (bypasses PowerShell .ps1 script blocking)
            try:
                result = subprocess.run(
                    ['cmd', '/c', 'npx', '--version'],
                    capture_output=True,
                    text=True,
                    timeout=10,
                    creationflags=subprocess.CREATE_NO_WINDOW
                )
                if 'cannot be loaded because running scripts is disabled' in result.stderr:
                    return False, 'powershell_blocked'
                if result.returncode == 0:
                    return True, None
            except (subprocess.TimeoutExpired, FileNotFoundError, Exception):
                pass
            # Fallback: try npx directly (handles pythonw.exe environment differences)
            result = subprocess.run(
                ['npx', '--version'],
                capture_output=True,
                text=True,
                timeout=10,
                creationflags=subprocess.CREATE_NO_WINDOW
            )
            if 'cannot be loaded because running scripts is disabled' in result.stderr:
                return False, 'powershell_blocked'
            return result.returncode == 0, None
        else:
            result = subprocess.run(
                ['npx', '--version'],
                capture_output=True,
                text=True,
                timeout=10
            )
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

class FeatureSelectionDialog(tk.Toplevel):
    """Dialog for selecting which mod features to install."""
    
    def __init__(self, parent, on_confirm_callback):
        super().__init__(parent)
        self.parent = parent
        self.on_confirm = on_confirm_callback
        
        self.title("Select Mod Features")
        self.geometry("450x500")
        self.resizable(False, False)
        self.configure(bg='#1a1a2e')
        self.transient(parent)
        self.grab_set()
        
        # Center on parent
        self.update_idletasks()
        x = parent.winfo_x() + (parent.winfo_width() - 450) // 2
        y = parent.winfo_y() + (parent.winfo_height() - 500) // 2
        self.geometry(f"+{x}+{y}")
        
        # Import MOD_FEATURES
        try:
            sys.path.insert(0, str(SCRIPT_DIR))
            from apply_mods import MOD_FEATURES
            self.mod_features = MOD_FEATURES
        except ImportError as e:
            messagebox.showerror("Error", f"Could not load mod features:\n{e}")
            self.destroy()
            return
        
        self.feature_vars = {}
        self.create_widgets()
    
    def create_widgets(self):
        # Header
        header = tk.Label(
            self,
            text="Select Features to Install",
            font=('Segoe UI', 16, 'bold'),
            fg='#e94560',
            bg='#1a1a2e'
        )
        header.pack(pady=(15, 5))
        
        subtitle = tk.Label(
            self,
            text="Uncheck any features you don't want",
            font=('Segoe UI', 10),
            fg='#888888',
            bg='#1a1a2e'
        )
        subtitle.pack(pady=(0, 10))
        
        # Select All / Deselect All buttons
        btn_frame = tk.Frame(self, bg='#1a1a2e')
        btn_frame.pack(fill='x', padx=20, pady=5)
        
        tk.Button(
            btn_frame, text="Select All", 
            command=self.select_all,
            bg='#4ecca3', fg='#1a1a2e',
            font=('Segoe UI', 10, 'bold'),
            relief='flat', cursor='hand2'
        ).pack(side='left', padx=5)
        
        tk.Button(
            btn_frame, text="Deselect All",
            command=self.deselect_all,
            bg='#666666', fg='white',
            font=('Segoe UI', 10, 'bold'),
            relief='flat', cursor='hand2'
        ).pack(side='left', padx=5)
        
        # Scrollable frame for features
        container = tk.Frame(self, bg='#1a1a2e')
        container.pack(fill='both', expand=True, padx=20, pady=10)
        
        canvas = tk.Canvas(container, bg='#252540', highlightthickness=0)
        scrollbar = tk.Scrollbar(container, orient='vertical', command=canvas.yview)
        self.features_frame = tk.Frame(canvas, bg='#252540')
        
        self.features_frame.bind('<Configure>', lambda e: canvas.configure(scrollregion=canvas.bbox('all')))
        canvas.create_window((0, 0), window=self.features_frame, anchor='nw', width=390)
        canvas.configure(yscrollcommand=scrollbar.set)
        
        canvas.pack(side='left', fill='both', expand=True)
        scrollbar.pack(side='right', fill='y')
        
        # Bind mousewheel
        def on_mousewheel(event):
            canvas.yview_scroll(int(-1 * (event.delta / 120)), 'units')
        canvas.bind_all('<MouseWheel>', on_mousewheel)
        
        # Create checkboxes for each feature
        for feature_key, feature_info in self.mod_features.items():
            var = tk.BooleanVar(value=feature_info.get('default', True))
            self.feature_vars[feature_key] = var
            
            frame = tk.Frame(self.features_frame, bg='#252540')
            frame.pack(fill='x', pady=5, padx=10)
            
            cb = tk.Checkbutton(
                frame, 
                text=feature_info['name'],
                variable=var,
                command=self.update_install_button,
                font=('Segoe UI', 11, 'bold'),
                fg='#4ecca3',
                bg='#252540',
                selectcolor='#1a1a2e',
                activebackground='#252540',
                activeforeground='#4ecca3',
                cursor='hand2'
            )
            cb.pack(anchor='w')
            
            desc = tk.Label(
                frame, 
                text=feature_info['description'],
                font=('Segoe UI', 9),
                fg='#888888',
                bg='#252540',
                wraplength=340,
                justify='left',
                anchor='w'
            )
            desc.pack(anchor='w', padx=(25, 10), fill='x')
        
        # Install button
        self.install_btn = tk.Button(
            self,
            text="⚡ Install Selected",
            font=('Segoe UI', 14, 'bold'),
            bg='#4ecca3',
            fg='#1a1a2e',
            activebackground='#3db892',
            relief='flat',
            cursor='hand2',
            width=20,
            height=2,
            command=self.confirm_install
        )
        self.install_btn.pack(pady=15)
    
    def select_all(self):
        for var in self.feature_vars.values():
            var.set(True)
        self.update_install_button()
    
    def deselect_all(self):
        for var in self.feature_vars.values():
            var.set(False)
        self.update_install_button()
    
    def update_install_button(self):
        """Update install button text based on selection state."""
        any_selected = any(var.get() for var in self.feature_vars.values())
        if any_selected:
            self.install_btn.config(text="⚡ Install Selected", bg='#4ecca3', fg='#1a1a2e')
        else:
            self.install_btn.config(text="🔄 Restore Vanilla", bg='#e94560', fg='white')
    
    def confirm_install(self):
        selected = [key for key, var in self.feature_vars.items() if var.get()]
        
        if not selected:
            confirm = messagebox.askyesno(
                "Restore Vanilla?", 
                "No features selected.\n\n"
                "This will restore the game to its original unmodded state.\n"
                "Your save data is safe.\n\n"
                "Continue?"
            )
            if not confirm:
                return
        
        self.destroy()
        self.on_confirm(selected)


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
        
        # Restore Vanilla button (red) - only shown when modded
        self.restore_btn = tk.Button(
            btn_frame,
            text="🔄 Restore Vanilla",
            bg='#e94560',
            fg='white',
            activebackground='#d83550',
            activeforeground='white',
            command=self.restore_vanilla_async,
            **btn_style
        )
        
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
        
        # Show/hide restore button based on mod state
        self.update_restore_button()
        
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
    
    def update_restore_button(self):
        """Show restore button only when game is modded."""
        try:
            sys.path.insert(0, str(SCRIPT_DIR))
            from save_manager import is_modded
            if is_modded():
                self.restore_btn.pack(pady=8, before=self.editor_btn)
                self.geometry("400x420")
            else:
                self.restore_btn.pack_forget()
                self.geometry("400x350")
        except Exception:
            self.restore_btn.pack_forget()
    
    def restore_vanilla_async(self):
        """Restore game to vanilla state."""
        if self.is_working:
            return
        
        confirm = messagebox.askyesno(
            "Restore Vanilla?",
            "This will restore the game to its original unmodded state.\n\n"
            "Your modded save data will be kept for future use.\n\n"
            "Continue?"
        )
        if not confirm:
            return
        
        self.is_working = True
        self.set_buttons_enabled(False)
        self.set_status("Restoring vanilla...", '#e94560')
        
        def worker():
            try:
                from save_manager import restore_vanilla
                success, msg = restore_vanilla()
                if success:
                    self.after(0, lambda: self.set_status("✅ Game restored to vanilla!", '#4ecca3'))
                    self.after(0, lambda: messagebox.showinfo("Restored!", "Game restored to vanilla.\nRestart PokePath TD to play."))
                    self.after(0, self.update_restore_button)
                else:
                    self.after(0, lambda: self.set_status(f"❌ {msg}", '#e94560'))
                    self.after(0, lambda m=msg: messagebox.showerror("Error", m))
            except Exception as e:
                self.after(0, lambda: self.set_status(f"❌ {e}", '#e94560'))
            finally:
                self.is_working = False
                self.after(0, lambda: self.set_buttons_enabled(True))
        
        threading.Thread(target=worker, daemon=True).start()
    
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
        bg_restore = '#e94560' if enabled else '#666666'
        
        self.mod_btn.config(state=state, bg=bg_mod)
        self.editor_btn.config(state=state, bg=bg_editor)
        self.restore_btn.config(state=state, bg=bg_restore)
    
    def install_mods_async(self):
        """Open feature selection dialog, then run mod installation."""
        if self.is_working:
            return
        
        # Open feature selection dialog
        FeatureSelectionDialog(self, self.start_installation)
    
    def start_installation(self, selected_features):
        """Start installation with selected features."""
        if self.is_working:
            return
        
        self.selected_features = selected_features
        self.is_working = True
        self.set_buttons_enabled(False)
        self.set_status("Starting installation...", '#4ecca3')
        
        thread = threading.Thread(target=self.install_mods_worker, daemon=True)
        thread.start()
    
    def install_mods_worker(self):
        """Worker thread for mod installation."""
        try:
            # Step 0: Ensure node_modules are installed
            node_modules = SCRIPT_DIR / "node_modules"
            if not node_modules.exists() or not (node_modules / "@electron" / "asar").exists():
                self.after(0, lambda: self.set_status("Installing dependencies (first run only)...", '#4ecca3'))
                
                # Use cmd /c on Windows - npm is a .cmd batch file, not an .exe
                npm_cmd = ['cmd', '/c', 'npm', 'install', '--production'] if sys.platform == 'win32' else ['npm', 'install', '--production']
                success, stdout, stderr = run_command(
                    npm_cmd,
                    cwd=SCRIPT_DIR,
                    timeout=120
                )
                
                if not success:
                    raise Exception(f"Failed to install dependencies.\n\nRun manually in mods folder:\n  npm install\n\nError: {stderr[:200]}")
            
            # Verify app.asar exists
            app_asar = RESOURCES / "app.asar"
            if not app_asar.exists():
                raise Exception(f"app.asar not found!\n\nExpected at: {app_asar}\n\nMake sure the mods folder is inside the game directory.")
            
            # Steps 1 & 2 are now handled by apply_selected_mods():
            # - ensure_vanilla_backup() creates app.asar.vanilla if needed
            # - extract_from_vanilla() re-extracts every time for clean slate
            
            # Apply selected mods (includes backup + extraction)
            self.after(0, lambda: self.set_status("Preparing vanilla backup...", '#4ecca3'))
            
            # Import and run apply_selected_mods with selected features
            sys.path.insert(0, str(SCRIPT_DIR))
            from apply_mods import apply_selected_mods
            
            def progress_callback(current, total, message):
                self.after(0, lambda m=message: self.set_status(m, '#4ecca3'))
            
            success, applied, failed = apply_selected_mods(
                self.selected_features, 
                progress_callback
            )
            
            if not success:
                # Check for specific error messages from backup/extract
                if failed:
                    first_error = failed[0]
                    if "vanilla backup" in first_error.lower() or "reinstall" in first_error.lower():
                        raise Exception(first_error)
                    elif "extraction" in first_error.lower():
                        raise Exception(first_error)
                raise Exception(f"Failed to apply mods. Applied: {len(applied)}, Failed: {len(failed)}")
            
            # Check for failures
            if failed:
                self.after(0, lambda: self.set_status(f"Some mods failed ({len(failed)}), continuing...", '#ffaa00'))
            
            # Step 3: Finalize
            self.after(0, lambda: self.set_status("Finalizing...", '#4ecca3'))
            
            # Success!
            self.after(0, self.on_install_success)
            
        except Exception as e:
            error_msg = str(e)
            # Log error to file for debugging
            try:
                log_file = SCRIPT_DIR / "install_error.log"
                with open(log_file, 'w') as f:
                    f.write(f"Installation Error:\n{error_msg}\n\n")
                    f.write(f"SCRIPT_DIR: {SCRIPT_DIR}\n")
                    f.write(f"GAME_ROOT: {GAME_ROOT}\n")
                    f.write(f"RESOURCES: {RESOURCES}\n")
                    f.write(f"RESOURCES exists: {RESOURCES.exists()}\n")
                    if RESOURCES.exists():
                        f.write(f"app.asar exists: {(RESOURCES / 'app.asar').exists()}\n")
            except:
                pass
            self.after(0, lambda: self.on_install_error(error_msg))
        
        finally:
            self.is_working = False
            self.after(0, lambda: self.set_buttons_enabled(True))
    
    def on_install_success(self):
        """Handle successful installation."""
        if hasattr(self, 'selected_features') and not self.selected_features:
            self.set_status("✅ Game restored to vanilla! Restart the game.", '#4ecca3')
            messagebox.showinfo(
                "Restored!", 
                "Game restored to vanilla (unmodded) state!\n\nRestart PokePath TD to play."
            )
        else:
            self.set_status("✅ Mods installed successfully! Restart the game.", '#4ecca3')
            messagebox.showinfo(
                "Success!", 
                "Mods installed successfully!\n\nRestart PokePath TD to play."
            )
        self.update_restore_button()
    
    def on_install_error(self, error_msg):
        """Handle installation error."""
        short_msg = error_msg[:80] + "..." if len(error_msg) > 80 else error_msg
        self.set_status(f"❌ Error: {short_msg}", '#e94560')
        
        # Build helpful message
        help_text = (
            f"Error during installation:\n\n{error_msg}\n\n"
            "Common fixes:\n"
            "• Run 'diagnose.py' to check your setup\n"
            "• Make sure Node.js is installed (nodejs.org)\n"
            "• Make sure the game is completely closed\n"
            "• Try running as Administrator\n\n"
            "Error details saved to: install_error.log"
        )
        
        messagebox.showerror("Installation Failed", help_text)
    
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
