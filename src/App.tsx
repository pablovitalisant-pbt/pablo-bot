import { useState, useEffect, useCallback } from 'react';
import { Bot, LayoutDashboard, FileJson, History, Settings } from 'lucide-react';

type Section = 'dashboard' | 'messages' | 'logs' | 'config';

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

interface Message {
  id: number;
  con_nombre: string;
  generico: string;
}

interface LogEntry {
  timestamp: string;
  nombre: string | null;
  url: string;
  mensaje_id: number;
  estado: string;
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

function Dashboard({ leads, botStatus, onStartBot, onStopBot, botLoading }: {
  leads: Lead[];
  botStatus: BotStatus;
  onStartBot: () => void;
  onStopBot: () => void;
  botLoading: boolean;
}) {
  const frioCount = leads.filter(l => l.estado === 'frio').length;
  const dmCount = leads.filter(l => l.estado === 'dm').length;
  const lastProcessed = leads
    .filter(l => l.estado === 'dm')
    .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''))
    .slice(0, 10);
  const progressPct = botStatus.maxDaily > 0
    ? Math.round((botStatus.dailyCount / botStatus.maxDaily) * 100)
    : 0;

  return (
    <>
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-[28px] font-extrabold text-brand-text">Panel de Control</h1>
          <p className="text-[#65676b] text-sm">Automatización de prospección Zofri Iquique</p>
        </div>
        <div className="flex items-center gap-3">
          {botStatus.running ? (
            <button
              onClick={onStopBot}
              disabled={botLoading}
              className="flex items-center gap-2 bg-red-100 text-red-700 px-4 py-2 rounded-full text-sm font-semibold hover:bg-red-200 transition-colors disabled:opacity-50"
            >
              <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
              ⏹ Detener Bot
            </button>
          ) : (
            <button
              onClick={onStartBot}
              disabled={botLoading}
              className="flex items-center gap-2 bg-[#e7f3ef] text-brand-secondary px-4 py-2 rounded-full text-sm font-semibold hover:bg-green-100 transition-colors disabled:opacity-50"
            >
              <div className="w-2 h-2 rounded-full bg-brand-secondary" />
              ▶ Iniciar Bot
            </button>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <StatCard value={`${botStatus.dailyCount} / ${botStatus.maxDaily}`} label="Mensajes Hoy" progress={progressPct} />
        <StatCard value={String(frioCount)} label="Prospectos Fríos" />
        <StatCard value={String(dmCount)} label="Convertidos a DM" />
      </div>

      <div className="flex gap-6 flex-1 min-h-0">
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
                  <tr><td colSpan={4} className="px-5 py-8 text-center text-sm text-[#65676b]">No hay prospectos procesados aún</td></tr>
                ) : lastProcessed.map(l => (
                  <tr key={l.id} className="border-b border-brand-gray-light hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-4 text-sm font-medium text-[#65676b]">#{l.id}</td>
                    <td className="px-5 py-4 text-sm font-semibold text-brand-text">{l.nombre || 'Sin nombre'}</td>
                    <td className="px-5 py-4">
                      <span className="px-2 py-1 rounded text-[11px] font-bold uppercase bg-[#fff3e0] text-[#f57c00]">DM</span>
                    </td>
                    <td className="px-5 py-4 text-sm text-[#65676b]">
                      {l.updatedAt ? new Date(l.updatedAt).toLocaleString('es-CL') : 'Enviado ✓'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

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
    </>
  );
}

// ─── Mensajes ─────────────────────────────────────────────────────────────────

function MessagesView() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [editing, setEditing] = useState<Message | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/messages').then(r => r.json()).then(d => { if (d.ok) setMessages(d.result); });
  }, []);

  const openEdit = (msg: Message) => setEditing({ ...msg });

  const saveEdit = async () => {
    if (!editing) return;
    setSaving(true);
    const updated = messages.map(m => m.id === editing.id ? editing : m);
    const res = await fetch('/api/messages', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updated) });
    if ((await res.json()).ok) setMessages(updated);
    setEditing(null);
    setSaving(false);
  };

  return (
    <>
      <header>
        <h1 className="text-[28px] font-extrabold text-brand-text">Mensajes</h1>
        <p className="text-[#65676b] text-sm">Plantillas de mensaje almacenadas en data/messages.json</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {messages.length === 0 && (
          <div className="col-span-2 text-center py-12 text-[#65676b]">No hay mensajes cargados</div>
        )}
        {messages.map(msg => (
          <div key={msg.id} className="bg-white rounded-2xl border border-brand-gray-light shadow-brand-card p-5 flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-brand-primary bg-[#fff1eb] px-2 py-1 rounded">ID: {msg.id}</span>
              <button
                onClick={() => openEdit(msg)}
                className="text-xs font-semibold text-brand-primary hover:underline"
              >
                Editar
              </button>
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-[#65676b] mb-1">Con nombre</div>
              <p className="text-sm text-brand-text bg-[#f0f2f5] rounded-lg px-3 py-2 italic">"{msg.con_nombre}"</p>
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-[#65676b] mb-1">Genérico</div>
              <p className="text-sm text-brand-text bg-[#f0f2f5] rounded-lg px-3 py-2 italic">"{msg.generico}"</p>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-brand-text">Editar Mensaje ID: {editing.id}</h2>
              <button onClick={() => setEditing(null)} className="text-[#65676b] hover:text-brand-text text-xl leading-none">×</button>
            </div>
            <div>
              <label className="text-xs font-bold text-[#65676b] uppercase mb-1 block">Con nombre</label>
              <textarea
                className="w-full border border-brand-gray-light rounded-lg p-3 text-sm resize-none focus:outline-none focus:border-brand-primary"
                rows={4}
                value={editing.con_nombre}
                onChange={e => setEditing({ ...editing, con_nombre: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-[#65676b] uppercase mb-1 block">Genérico</label>
              <textarea
                className="w-full border border-brand-gray-light rounded-lg p-3 text-sm resize-none focus:outline-none focus:border-brand-primary"
                rows={4}
                value={editing.generico}
                onChange={e => setEditing({ ...editing, generico: e.target.value })}
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setEditing(null)} className="px-4 py-2 text-sm font-semibold text-[#65676b] hover:bg-slate-50 rounded-lg">Cancelar</button>
              <button
                onClick={saveEdit}
                disabled={saving}
                className="px-4 py-2 text-sm font-semibold bg-brand-primary text-white rounded-lg hover:opacity-90 disabled:opacity-50"
              >
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Logs ─────────────────────────────────────────────────────────────────────

function LogsView() {
  const [logs, setLogs] = useState<LogEntry[]>([]);

  useEffect(() => {
    fetch('/api/logs').then(r => r.json()).then(d => { if (d.ok) setLogs(d.result); });
    const iv = setInterval(() => {
      fetch('/api/logs').then(r => r.json()).then(d => { if (d.ok) setLogs(d.result); });
    }, 30000);
    return () => clearInterval(iv);
  }, []);

  return (
    <>
      <header>
        <h1 className="text-[28px] font-extrabold text-brand-text">Logs de Envío</h1>
        <p className="text-[#65676b] text-sm">Historial de mensajes enviados — actualiza cada 30s</p>
      </header>

      <div className="bg-white rounded-2xl shadow-brand-card border border-brand-gray-light overflow-hidden flex-1">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[#fafafa] border-b border-brand-gray-light">
                <th className="text-left px-5 py-3 text-[11px] uppercase text-[#65676b] font-bold">Fecha / Hora</th>
                <th className="text-left px-5 py-3 text-[11px] uppercase text-[#65676b] font-bold">Nombre / Número</th>
                <th className="text-left px-5 py-3 text-[11px] uppercase text-[#65676b] font-bold">Msg ID</th>
                <th className="text-left px-5 py-3 text-[11px] uppercase text-[#65676b] font-bold">Estado</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr><td colSpan={4} className="px-5 py-12 text-center text-sm text-[#65676b]">No hay envíos registrados aún</td></tr>
              ) : logs.map((log, i) => (
                <tr key={i} className="border-b border-brand-gray-light hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-4 text-sm text-[#65676b] font-mono">
                    {new Date(log.timestamp).toLocaleString('es-CL')}
                  </td>
                  <td className="px-5 py-4 text-sm font-semibold text-brand-text">
                    {log.nombre || log.url.split('/').pop()}
                  </td>
                  <td className="px-5 py-4 text-sm text-[#65676b] font-mono">#{log.mensaje_id}</td>
                  <td className="px-5 py-4">
                    <span className="px-2 py-1 rounded text-[11px] font-bold uppercase bg-[#e7f3ef] text-brand-secondary">
                      {log.estado}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

// ─── Configuración ────────────────────────────────────────────────────────────

function ConfigView({ botStatus, onSaved }: { botStatus: BotStatus; onSaved: () => void }) {
  const [maxDaily, setMaxDaily] = useState(String(botStatus.maxDaily));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => { setMaxDaily(String(botStatus.maxDaily)); }, [botStatus.maxDaily]);

  const handleSave = async () => {
    setSaving(true);
    await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ maxDaily: parseInt(maxDaily) }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    onSaved();
  };

  return (
    <>
      <header>
        <h1 className="text-[28px] font-extrabold text-brand-text">Configuración</h1>
        <p className="text-[#65676b] text-sm">Ajustes del bot en tiempo real</p>
      </header>

      <div className="flex flex-col gap-5 max-w-lg">
        <div className="bg-white rounded-2xl border border-brand-gray-light shadow-brand-card p-6 flex flex-col gap-5">
          <div className="text-sm font-bold text-brand-text uppercase tracking-tight border-b border-brand-gray-light pb-3">
            Límites de Envío
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-[#65676b] uppercase">Máximo mensajes por día</label>
            <input
              type="number"
              min={1}
              max={100}
              value={maxDaily}
              onChange={e => setMaxDaily(e.target.value)}
              className="border border-brand-gray-light rounded-lg px-4 py-3 text-sm font-mono focus:outline-none focus:border-brand-primary w-32"
            />
            <p className="text-xs text-[#65676b]">Actualmente: {botStatus.dailyCount} enviados hoy</p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="self-start px-5 py-2 bg-brand-primary text-white text-sm font-semibold rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {saved ? '✓ Guardado' : saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-brand-gray-light shadow-brand-card p-6 flex flex-col gap-4">
          <div className="text-sm font-bold text-brand-text uppercase tracking-tight border-b border-brand-gray-light pb-3">
            Horario Activo
          </div>
          <div className="flex flex-col gap-2 text-sm text-brand-text">
            <div className="flex justify-between"><span className="text-[#65676b]">Días</span><span className="font-semibold">Lunes – Viernes</span></div>
            <div className="flex justify-between"><span className="text-[#65676b]">Horario</span><span className="font-semibold">09:00 – 18:00</span></div>
            <div className="flex justify-between"><span className="text-[#65676b]">Zona horaria</span><span className="font-semibold">America/Santiago</span></div>
            <div className="flex justify-between"><span className="text-[#65676b]">Intervalo entre envíos</span><span className="font-semibold">25 – 45 min</span></div>
          </div>
          <p className="text-[11px] text-[#65676b] mt-1">El horario no es configurable desde la UI en esta versión.</p>
        </div>
      </div>
    </>
  );
}

// ─── Shell / App ──────────────────────────────────────────────────────────────

export default function App() {
  const [section, setSection] = useState<Section>('dashboard');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [botStatus, setBotStatus] = useState<BotStatus>({ running: false, dailyCount: 0, maxDaily: 20 });
  const [botLoading, setBotLoading] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    try {
      const [leadsRes, statusRes] = await Promise.all([fetch('/api/leads'), fetch('/api/bot/status')]);
      const leadsData = await leadsRes.json();
      const statusData = await statusRes.json();
      if (leadsData.ok) setLeads(leadsData.result);
      if (statusData.ok) setBotStatus({ running: statusData.running, dailyCount: statusData.dailyCount, maxDaily: statusData.maxDaily });
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => {
    fetchDashboardData();
    const iv = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(iv);
  }, [fetchDashboardData]);

  const handleStartBot = async () => { setBotLoading(true); await fetch('/api/bot/start', { method: 'POST' }); await fetchDashboardData(); setBotLoading(false); };
  const handleStopBot = async () => { setBotLoading(true); await fetch('/api/bot/stop', { method: 'POST' }); await fetchDashboardData(); setBotLoading(false); };

  const navItems: { id: Section; icon: JSX.Element; label: string }[] = [
    { id: 'dashboard', icon: <LayoutDashboard size={18} />, label: 'Dashboard' },
    { id: 'messages', icon: <FileJson size={18} />, label: 'Mensajes (.json)' },
    { id: 'logs', icon: <History size={18} />, label: 'Logs de Envío' },
    { id: 'config', icon: <Settings size={18} />, label: 'Configuración' },
  ];

  return (
    <div className="flex min-h-screen bg-brand-bg">
      <aside className="w-60 bg-white border-r border-brand-gray-light p-6 flex flex-col gap-8 shrink-0">
        <div className="flex items-center gap-3 font-extrabold text-xl text-brand-primary">
          <div className="w-8 h-8 bg-brand-primary rounded-lg flex items-center justify-center">
            <Bot className="text-white w-5 h-5" />
          </div>
          PABLO BOT
        </div>

        <nav>
          <ul className="flex flex-col gap-2">
            {navItems.map(item => (
              <li
                key={item.id}
                onClick={() => setSection(item.id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer text-sm font-semibold transition-colors ${
                  section === item.id ? 'bg-[#fff1eb] text-brand-primary' : 'text-[#65676b] hover:bg-slate-50'
                }`}
              >
                {item.icon}
                {item.label}
              </li>
            ))}
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

      <main className="flex-1 p-8 flex flex-col gap-6 overflow-y-auto">
        {section === 'dashboard' && (
          <Dashboard
            leads={leads}
            botStatus={botStatus}
            onStartBot={handleStartBot}
            onStopBot={handleStopBot}
            botLoading={botLoading}
          />
        )}
        {section === 'messages' && <MessagesView />}
        {section === 'logs' && <LogsView />}
        {section === 'config' && <ConfigView botStatus={botStatus} onSaved={fetchDashboardData} />}
      </main>
    </div>
  );
}

// ─── Shared components ────────────────────────────────────────────────────────

function StatCard({ value, label, progress }: { value: string; label: string; progress?: number }) {
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

function ConfigCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white p-5 rounded-2xl shadow-brand-card border border-brand-gray-light border-t-4 border-t-brand-primary">
      <div className="text-sm font-bold text-brand-text mb-4 uppercase tracking-tight">{title}</div>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
}

function ConfigItem({ label, value, valueColor = 'text-brand-text' }: { label: string; value: string; valueColor?: string }) {
  return (
    <div className="flex justify-between items-center text-xs">
      <span className="text-[#65676b] font-medium">{label}</span>
      <span className={`font-bold font-mono ${valueColor}`}>{value}</span>
    </div>
  );
}
