import { useState, useEffect, useCallback } from 'react';
import { Bot, LayoutDashboard, FileJson, History, Settings, LogOut } from 'lucide-react';

interface Lead {
  id: string;
  nombre: string | null;
  url: string;
  estado: string;
  updatedAt?: string;
}

interface BotStatus {
  running: boolean;
  dailyCount: number;
  maxDaily: number;
}

export default function App() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [botStatus, setBotStatus] = useState<BotStatus>({ running: false, dailyCount: 0, maxDaily: 20 });
  const [botLoading, setBotLoading] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [leadsRes, statusRes] = await Promise.all([
        fetch('/api/leads'),
        fetch('/api/bot/status'),
      ]);
      const leadsData = await leadsRes.json();
      const statusData = await statusRes.json();
      if (leadsData.ok) setLeads(leadsData.result);
      if (statusData.ok) setBotStatus({ running: statusData.running, dailyCount: statusData.dailyCount, maxDaily: statusData.maxDaily });
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleStartBot = async () => {
    setBotLoading(true);
    await fetch('/api/bot/start', { method: 'POST' });
    await fetchData();
    setBotLoading(false);
  };

  const handleStopBot = async () => {
    setBotLoading(true);
    await fetch('/api/bot/stop', { method: 'POST' });
    await fetchData();
    setBotLoading(false);
  };

  const frioCount = leads.filter(l => l.estado === 'frio').length;
  const dmCount = leads.filter(l => l.estado === 'dm').length;
  const lastProcessed = leads
    .filter(l => l.estado === 'dm')
    .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''))
    .slice(0, 10);

  const progressPct = botStatus.maxDaily > 0 ? Math.round((botStatus.dailyCount / botStatus.maxDaily) * 100) : 0;

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
            <div className="text-sm font-bold text-brand-primary mb-1">Intervalo</div>
            <div className="text-2xl font-extrabold text-brand-primary">25–45 min</div>
            <div className="text-[11px] text-brand-primary/70 mt-1">Entre mensajes</div>
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
          <div className="flex items-center gap-3">
            {botStatus.running ? (
              <button
                onClick={handleStopBot}
                disabled={botLoading}
                className="flex items-center gap-2 bg-red-100 text-red-700 px-4 py-2 rounded-full text-sm font-semibold hover:bg-red-200 transition-colors disabled:opacity-50"
              >
                <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
                ⏹ Detener Bot
              </button>
            ) : (
              <button
                onClick={handleStartBot}
                disabled={botLoading}
                className="flex items-center gap-2 bg-[#e7f3ef] text-brand-secondary px-4 py-2 rounded-full text-sm font-semibold hover:bg-green-100 transition-colors disabled:opacity-50"
              >
                <div className="w-2 h-2 rounded-full bg-brand-secondary" />
                ▶ Iniciar Bot
              </button>
            )}
          </div>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <StatCard
            value={`${botStatus.dailyCount} / ${botStatus.maxDaily}`}
            label="Mensajes Hoy"
            progress={progressPct}
          />
          <StatCard
            value={String(frioCount)}
            label="Prospectos Fríos"
          />
          <StatCard
            value={String(dmCount)}
            label="Convertidos a DM"
          />
        </div>

        <div className="flex gap-6 flex-1 min-h-0">
          {/* Prospectos Table */}
          <div className="flex-1 bg-white rounded-2xl shadow-brand-card border border-brand-gray-light flex flex-col overflow-hidden">
            <div className="p-5 border-b border-brand-gray-light flex justify-between items-center">
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
                  {lastProcessed.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-5 py-8 text-center text-sm text-[#65676b]">
                        No hay prospectos procesados aún
                      </td>
                    </tr>
                  ) : (
                    lastProcessed.map(l => (
                      <TableRow
                        key={l.id}
                        id={`#${l.id}`}
                        nombre={l.nombre || 'Sin nombre'}
                        status="DM"
                        action={l.updatedAt ? `Enviado: ${new Date(l.updatedAt).toLocaleString('es-CL')}` : 'Enviado: f3.dm1 ✓'}
                      />
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Config Panel */}
          <div className="w-[300px] flex flex-col gap-5 shrink-0">
            <ConfigCard title="Estado del Sistema">
              <ConfigItem label="Bot" value={botStatus.running ? 'ACTIVO' : 'DETENIDO'} valueColor={botStatus.running ? 'text-brand-secondary' : 'text-red-500'} />
              <ConfigItem label="Cron Scheduler" value="EVERY 1M" />
              <ConfigItem label="Timezone" value="CL/Santiago" />
            </ConfigCard>

            <ConfigCard title="Límites Diarios">
              <ConfigItem label="Máximo Diario" value={String(botStatus.maxDaily)} />
              <ConfigItem label="Enviados hoy" value={String(botStatus.dailyCount)} />
              <ConfigItem label="Restantes" value={String(Math.max(0, botStatus.maxDaily - botStatus.dailyCount))} />
            </ConfigCard>
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
