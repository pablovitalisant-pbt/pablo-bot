import { useState, useEffect } from 'react';
import { Bot, CheckCircle, Clock, AlertCircle, MessageSquare, LayoutDashboard, FileJson, History, Settings, LogOut } from 'lucide-react';
import { motion } from 'motion/react';

export default function App() {
  const [status, setStatus] = useState<any>(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch('/api/status');
        const data = await res.json();
        setStatus(data);
      } catch (e) {
        console.error(e);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex min-h-screen bg-brand-bg">
      {/* Sidebar */}
      <aside className="w-60 bg-white border-r border-brand-gray-light p-6 flex flex-col gap-8 shrink-0">
        <div className="flex items-center gap-3 font-extrabold text-xl text-brand-primary">
          <div className="w-8 h-8 bg-brand-primary rounded-lg flex items-center justify-center">
            <Bot className="text-white w-5 h-5" />
          </div>
          PABLO BOT
        </div>
        
        <nav>
          <ul className="flex flex-col gap-2">
            <NavItem icon={<LayoutDashboard size={18} />} label="Dashboard" active />
            <NavItem icon={<FileJson size={18} />} label="Mensajes (.json)" />
            <NavItem icon={<History size={18} />} label="Logs de Envío" />
            <NavItem icon={<Settings size={18} />} label="Configuración" />
            <NavItem icon={<LogOut size={18} />} label="Cerrar Sesión" />
          </ul>
        </nav>

        <div className="mt-auto">
          <div className="bg-[#fff1eb] p-5 rounded-2xl">
            <div className="text-sm font-bold text-brand-primary mb-1">Próximo Envío</div>
            <div className="text-2xl font-extrabold text-brand-primary">22:14 min</div>
            <div className="text-[11px] text-brand-primary/70 mt-1">Intervalo: 25-45m</div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 flex flex-col gap-6 overflow-y-auto">
        <header className="flex justify-between items-center">
          <div>
            <h1 className="text-[28px] font-extrabold text-brand-text">Panel de Control</h1>
            <p className="text-[#65676b] text-sm">Automatización de prospección Zofri Iquique</p>
          </div>
          <div className="flex items-center gap-2 bg-[#e7f3ef] text-brand-secondary px-4 py-2 rounded-full text-sm font-semibold">
            <div className={`w-2 h-2 rounded-full bg-brand-secondary ${status ? 'animate-pulse' : 'opacity-50'}`} />
            WhatsApp Conectado ✓
          </div>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <StatCard 
            value="08 / 20" 
            label="Mensajes Hoy" 
            progress={40}
          />
          <StatCard 
            value="142" 
            label="Prospectos Fríos" 
          />
          <StatCard 
            value="45" 
            label="Convertidos a DM" 
          />
        </div>

        <div className="flex gap-6 flex-1 min-h-0">
          {/* Prospectos Table */}
          <div className="flex-1 bg-white rounded-2xl shadow-brand-card border border-brand-gray-light flex flex-col overflow-hidden">
            <div className="p-5 border-bottom border-brand-gray-light flex justify-between items-center">
              <h3 className="text-base font-bold text-brand-text">Últimos Prospectos Procesados</h3>
              <span className="text-xs text-brand-primary font-semibold">Hoja: Prospectos</span>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-[#fafafa] border-b border-brand-gray-light">
                    <th className="text-left px-5 py-3 text-[11px] uppercase text-[#65676b] font-bold">ID</th>
                    <th className="text-left px-5 py-3 text-[11px] uppercase text-[#65676b] font-bold">Nombre</th>
                    <th className="text-left px-5 py-3 text-[11px] uppercase text-[#65676b] font-bold">Estado</th>
                    <th className="text-left px-5 py-3 text-[11px] uppercase text-[#65676b] font-bold">Última Acción</th>
                  </tr>
                </thead>
                <tbody>
                  <TableRow id="#882" nombre="Juan Carlos Perez" status="DM" action="Enviado: f3.dm1 ✓" />
                  <TableRow id="#883" nombre="Maria Elena Soto" status="FRÍO" action="Pendiente..." />
                  <TableRow id="#884" nombre="Tienda Sport-X" status="DM" action="Enviado: f3.dm1 ✓" />
                  <TableRow id="#885" nombre="Distribuidora Loa" status="FRÍO" action="Pendiente..." />
                </tbody>
              </table>
            </div>

            <div className="p-5 bg-[#fafafa] mt-auto border-t border-brand-gray-light">
              <div className="text-[12px] font-bold text-[#65676b] mb-2 uppercase">ÚLTIMO MENSAJE SELECCIONADO (RANDOM ID: 4)</div>
              <div className="bg-[#f0f2f5] p-3 rounded-lg italic text-[#4b4b4b] border-l-4 border-brand-primary text-xs">
                "Hola {'{nombre}'}, ¿qué tal? Pablo de la Zofri por aquí. Una pregunta al grano: ¿están vendiendo por lives en Facebook o Instagram?"
              </div>
            </div>
          </div>

          {/* Config Panel */}
          <div className="w-[300px] flex flex-col gap-5 shrink-0">
            <ConfigCard title="Estado del Sistema">
              <ConfigItem label="Service Account" value="ACTIVE" valueColor="text-brand-secondary" />
              <ConfigItem label="Cron Scheduler" value="EVERY 1M" />
              <ConfigItem label="Timezone" value="CL/Santiago" />
            </ConfigCard>

            <ConfigCard title="Límites Diarios">
              <ConfigItem label="Máximo Diario" value="20" />
              <ConfigItem label="Enviados hoy" value="8" />
              <ConfigItem label="Restantes" value="12" />
            </ConfigCard>

            <div className="p-4 rounded-xl bg-[#1c1e21] text-[#00ff00] font-mono text-[11px] flex-1 overflow-y-auto leading-relaxed">
              <div>[09:14:02] Checking Sheet...</div>
              <div>[09:14:03] 2 leads found (frio).</div>
              <div>[09:14:05] Waiting 25-45m...</div>
              <div>[09:42:11] Sending to #882...</div>
              <div className="text-white">[09:42:14] Message sent!</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function NavItem({ icon, label, active = false }: any) {
  return (
    <li className={`flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer text-sm font-semibold transition-colors ${active ? 'bg-[#fff1eb] text-brand-primary' : 'text-[#65676b] hover:bg-slate-50'}`}>
      {icon}
      {label}
    </li>
  );
}

function StatCard({ value, label, progress }: any) {
  return (
    <div className="bg-white p-5 rounded-2xl shadow-brand-card border border-brand-gray-light">
      <div className="text-[32px] font-extrabold text-brand-text mb-1">{value}</div>
      <div className="text-[13px] text-[#65676b] uppercase tracking-wider font-medium">{label}</div>
      {progress !== undefined && (
        <div className="w-full h-1 bg-[#eee] rounded-full mt-2 overflow-hidden">
          <div className="h-full bg-brand-primary rounded-full" style={{ width: `${progress}%` }} />
        </div>
      )}
    </div>
  );
}

function TableRow({ id, nombre, status, action }: any) {
  const isDM = status === 'DM';
  return (
    <tr className="border-b border-brand-gray-light hover:bg-slate-50 transition-colors">
      <td className="px-5 py-4 text-sm font-medium text-[#65676b]">{id}</td>
      <td className="px-5 py-4 text-sm font-semibold text-brand-text">{nombre}</td>
      <td className="px-5 py-4">
        <span className={`px-2 py-1 rounded text-[11px] font-bold uppercase ${isDM ? 'bg-[#fff3e0] text-[#f57c00]' : 'bg-[#e3f2fd] text-[#1976d2]'}`}>
          {status}
        </span>
      </td>
      <td className="px-5 py-4 text-sm text-[#65676b]">{action}</td>
    </tr>
  );
}

function ConfigCard({ title, children }: any) {
  return (
    <div className="bg-white p-5 rounded-2xl shadow-brand-card border border-brand-gray-light border-t-4 border-t-brand-primary">
      <div className="text-sm font-bold text-brand-text mb-4 uppercase tracking-tight">{title}</div>
      <div className="flex flex-col gap-2">
        {children}
      </div>
    </div>
  );
}

function ConfigItem({ label, value, valueColor = 'text-brand-text' }: any) {
  return (
    <div className="flex justify-between items-center text-xs">
      <span className="text-[#65676b] font-medium">{label}</span>
      <span className={`font-bold font-mono ${valueColor}`}>{value}</span>
    </div>
  );
}
