import React from "react";
import { Github, Mail } from "lucide-react";

export default function Footer() {
  return (
    <footer
      className="mt-10 border-t border-white/10 bg-gradient-to-r 
      from-slate-950 via-slate-900 to-slate-800 
      dark:from-slate-900 dark:via-slate-800 dark:to-slate-950 
      text-slate-300 py-6 px-4"
    >
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        
        {/* Left - Project info */}
        <div className="flex flex-col text-center md:text-left">
          <p className="text-lg font-semibold text-amber-300">
            LabMonitor Pro
          </p>
          <p className="text-sm text-slate-400">
            Smart Lab Monitoring & Activity Detection System.
          </p>
        </div>

        {/* Middle - Slogan + Team Members (centered) */}
        <div className="flex flex-col text-center text-sm">
          {/* Slogan */}
          <p className="text-slate-300 text-sm font-medium">
            “Making Labs Smarter, One Frame at a Time.”
          </p>

          {/* Team Names */}
          <div className="flex flex-wrap justify-center gap-2 text-slate-400 mt-2">
            <span>Darshan</span>
            <span>•</span>
            <span>Krutika</span>
            <span>•</span>
            <span>Namit</span>
            <span>•</span>
            <span>Sujal</span>
          </div>
        </div>

        {/* Right - Social icons */}
        <div className="flex items-center gap-4">
          <a
            href="mailto:dhiremath1836@gmail.com"
            className="hover:text-amber-300 transition"
          >
            <Mail size={18} />
          </a>

          <a
            href="https://github.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-amber-300 transition"
          >
            <Github size={18} />
          </a>
        </div>
      </div>
    </footer>
  );
}
