"""Launch OptionDesk 98 — opens browser and starts Flask."""
import subprocess, sys, time, threading, webbrowser

def open_browser():
    time.sleep(1.5)
    webbrowser.open("http://localhost:5000/boot")

if __name__ == "__main__":
    threading.Thread(target=open_browser, daemon=True).start()
    subprocess.run([sys.executable, "app.py"])
