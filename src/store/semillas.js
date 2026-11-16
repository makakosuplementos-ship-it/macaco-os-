// Claves de app_data (también son las de localStorage) y datos iniciales.
import { calcStatus } from '../domain/ledger.js';

// estado → clave en app_data.
export const CLAVES = {
  productos:   'macaco:productos',
  ventas:      'macaco:ventas',
  deudas:      'macaco:deudas',
  caja:        'macaco:caja',
  config:      'macaco:config',
  movimientos: 'macaco:movimientos',
  gastos:      'macaco:gastos',
  pedidos:     'macaco:pedidos',
  corteza:     'macaco:corteza',
  estrategia:  'macaco:estrategia',
};

export const PRODUCTOS_INICIAL = [
  { id: 'pg',  name: 'Proteína Grizzly',          stock: 8,  cost: 20000, price: 36000 },
  { id: 'cdp', name: 'Creatina Dragón Pharma',    stock: 12, cost: 9000,  price: 17500 },
  { id: 'cia', name: 'Creatina Inner Armour',     stock: 6,  cost: 8000,  price: 15000 },
  { id: 'om3', name: 'Omega 3',                   stock: 5,  cost: 7000,  price: 13000 },
  { id: 'ash', name: 'Ashwaganda',                stock: 3,  cost: 8000,  price: 15000 },
  { id: 'mag', name: 'Glicinato de Magnesio',     stock: 7,  cost: 8000,  price: 15000 },
  { id: 'col', name: 'Colágeno 90 tabs',          stock: 4,  cost: 9500,  price: 18000 },
  { id: 'pre', name: 'Pre-entreno Edge Insanity', stock: 6,  cost: 14000, price: 28000 },
  { id: 'cgm', name: 'Creatina Gummy',            stock: 0,  cost: 9000,  price: 16000 },
  { id: 'cra', name: 'Crema de arroz',            stock: 5,  cost: 4000,  price: 8000  },
].map(p => ({ ...p, status: calcStatus(p.stock) }));

export const DEUDAS_INICIAL = [
  { id: 'd1', who: 'Benjamín',  amt: 500_000,   rate: 10, level: 'urgent', order: 1, label: 'PAGAR PRIMERO' },
  { id: 'd2', who: 'Valcárce',  amt: 700_000,   rate: 10, level: 'urgent', order: 2, label: 'PAGAR SEGUNDO' },
  { id: 'd3', who: 'Alejandro', amt: 150_000,   rate: 0,  level: 'medium', label: 'Sin interés' },
  { id: 'd4', who: 'Roxana',    amt: 1_800_000, rate: 0,  level: 'low',    label: 'Sin interés · largo plazo' },
];

export const CONFIG_INICIAL = {
  metaMensual: 10_000_000, metaDiaria: 700_000,
  colchonMinimo: 300_000,  alertaStockBajo: 3,
};

export const SEMILLAS = {
  productos:   PRODUCTOS_INICIAL,
  ventas:      [],
  deudas:      DEUDAS_INICIAL,
  caja:        503_000,
  config:      CONFIG_INICIAL,
  movimientos: [],
  gastos:      [],
  pedidos:     [],
  corteza:     {},
  estrategia:  {},
};
