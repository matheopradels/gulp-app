import React from 'react';
import { Map as MapIcon, Beer, Timer, Trophy, User, Gamepad2 } from 'lucide-react';

function NavIcon({ active, icon: IconComponent, label, onClick }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      aria-current={active ? 'page' : undefined}
      className={`w-12 h-12 flex flex-col items-center justify-center gap-0.5 rounded-xl transition-colors ${
        active ? 'text-[#CEFF00]' : 'text-zinc-500'
      }`}
    >
      <IconComponent size={22} />
      <span className="text-[9px] font-bold uppercase tracking-wide leading-none">{label}</span>
    </button>
  );
}

export default function Navbar({ activeTab, setActiveTab }) {
  return (
    <nav className="relative shrink-0 z-40 bg-black border-t border-zinc-900 px-3 pt-2 nav-safe flex justify-between items-center">
      <NavIcon active={activeTab === 'discover'} icon={MapIcon} label="Carte" onClick={() => setActiveTab('discover')} />
      <NavIcon active={activeTab === 'groups'} icon={Beer} label="Clans" onClick={() => setActiveTab('groups')} />
      <div className="relative -top-6 w-14 h-12">
        <button
          onClick={() => setActiveTab('gulp')}
          aria-label="Chrono"
          aria-current={activeTab === 'gulp' ? 'page' : undefined}
          className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg shadow-[#CEFF00]/20 transition-all ${
            activeTab === 'gulp' ? 'bg-[#CEFF00] text-black scale-110' : 'bg-zinc-800 text-white'
          }`}
        >
          <Timer size={28} />
        </button>
      </div>
      <NavIcon active={activeTab === 'jeux'} icon={Gamepad2} label="Jeux" onClick={() => setActiveTab('jeux')} />
      <NavIcon active={activeTab === 'ranking'} icon={Trophy} label="Top" onClick={() => setActiveTab('ranking')} />
      <NavIcon active={activeTab === 'profile'} icon={User} label="Profil" onClick={() => setActiveTab('profile')} />
    </nav>
  );
}
