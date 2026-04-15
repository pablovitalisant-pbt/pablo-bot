export interface Message {
  id: number;
  con_nombre: string;
  generico: string;
}

export interface Lead {
  id: string;
  nombre: string | null;
  url: string;
  estado: string;
  fases: string; // JSON string
}

export interface Fases {
  f3: {
    dm1_enviado: boolean;
    fechaEnvio?: string;
  };
}

export interface DailyCount {
  date: string;
  count: number;
}

export interface LastSent {
  timestamp: string;
}
