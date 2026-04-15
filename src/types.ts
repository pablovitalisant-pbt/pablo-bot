export interface Message {
  id: number;
  con_nombre: string;
  generico: string;
}

export interface Lead {
  id: number;
  nombre: string;
  pais: string;
  url: string;
  comentarios: number;
  producto: string;
  caos: string;
  notas: string;
  estado: string;
  fecha: string;
  f1: any;
  f2: any;
  f3: {
    dm1_enviado: boolean;
    dm1_respondio: boolean;
    fechaEnvio: string | null;
  };
  f4: {
    dms: Array<{
      e: boolean;
      r: boolean;
      fechaEnvio: string | null;
    }>;
  };
  f5: {
    descartado: boolean;
  };
  historial: any[];
  updatedAt: string;
}

export interface DailyCount {
  date: string;
  count: number;
}

export interface LastSent {
  timestamp: string;
}
