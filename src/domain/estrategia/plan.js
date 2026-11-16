// Plan estratégico 2027–2031: identidad, objetivos, iniciativas y catálogo de
// KPI. Aquí solo hay TEXTO y DEFINICIONES, nunca montos en pesos: el
// presupuesto y todo lo que se decide después viven en Supabase (clave
// macaco:estrategia). Este repositorio es público.
//
// Estados de una meta:
//   referencia  — escenario acordado, no una obligación
//   propuesta   — provisional, falta la firma de ambos socios
//   pendiente   — sin valor definido (nunca se muestra como 0)
//   aprobada    — firmada por ambos socios (se guarda en macaco:estrategia)

export const VERSION_ESTRATEGIA = '1.0';

export const IDENTIDAD = {
  vision2031: 'Consolidarnos como una de las empresas líderes en Chile en importación, distribución y comercialización de suplementos nutricionales, mediante una sólida presencia mayorista, tiendas físicas y comercio electrónico, destacándonos por nuestro crecimiento rentable, reconocimiento de marca, calidad y compromiso con el bienestar de las personas.',
  mision: 'Facilitar el acceso a suplementos nutricionales de calidad, brindando una experiencia de compra confiable y cercana, mientras promovemos la nutrición equilibrada, la actividad física, la disciplina y los hábitos que contribuyen al bienestar físico y mental de las personas.',
  proposito: 'Impulsar a las personas a construir su mejor versión a través de hábitos saludables, bienestar y desarrollo personal.',
  objetivoGeneral: { codigo: 'OG-01', texto: 'Consolidar a Macaco Suplementos como una empresa competitiva, rentable y reconocida a nivel nacional, desarrollando progresivamente sus capacidades de comercialización, distribución mayorista, importación directa y comercio electrónico, mediante una gestión profesional, innovadora y basada en datos.' },
  // Propuestos: NO están aprobados formalmente.
  valores: { estado: 'propuesto', lista: ['confianza', 'disciplina', 'compromiso', 'mejora continua', 'integridad', 'bienestar'] },
};

export const PERSPECTIVAS = {
  financiera: 'Financiera',
  clientes: 'Clientes y mercado',
  procesos: 'Procesos internos',
  aprendizaje: 'Aprendizaje y desarrollo',
};

// Los códigos son estables: no se renumeran.
export const OBJETIVOS = [
  { codigo: 'OE-01', perspectiva: 'financiera', nombre: 'Rentabilidad y sostenibilidad financiera',
    texto: 'Incrementar la rentabilidad y sostenibilidad financiera de Macaco, optimizando márgenes, costos, liquidez y capital de trabajo para financiar su crecimiento.' },
  { codigo: 'OE-02', perspectiva: 'financiera', nombre: 'Crecimiento comercial',
    texto: 'Desarrollar un crecimiento comercial sostenido y diversificado, fortaleciendo los canales actuales e incorporando progresivamente nuevos mercados y fuentes de ingresos.' },
  { codigo: 'OE-03', perspectiva: 'clientes', nombre: 'Posicionamiento de marca',
    texto: 'Fortalecer el reconocimiento y posicionamiento de Macaco en el mercado de suplementos, construyendo una marca confiable, diferenciada y con presencia física y digital consistente.' },
  { codigo: 'OE-04', perspectiva: 'clientes', nombre: 'Fidelización de clientes',
    texto: 'Incrementar la satisfacción, fidelización y valor de los clientes, mejorando su experiencia de compra, atención y relación comercial.' },
  { codigo: 'OE-05', perspectiva: 'procesos', nombre: 'Excelencia operativa',
    texto: 'Optimizar la eficiencia de los procesos comerciales, logísticos y administrativos, mejorando el abastecimiento, inventario, compras y gestión de pedidos.' },
  { codigo: 'OE-06', perspectiva: 'procesos', nombre: 'Distribución e importación',
    texto: 'Desarrollar las capacidades comerciales, logísticas y financieras necesarias para expandir Macaco hacia la distribución mayorista y la importación directa.' },
  { codigo: 'OE-07', perspectiva: 'aprendizaje', nombre: 'Transformación digital y control de gestión',
    texto: 'Consolidar un sistema integrado de gestión estratégica basado en datos e inteligencia artificial, conectando planificación, operaciones, indicadores y decisiones empresariales.' },
  { codigo: 'OE-08', perspectiva: 'aprendizaje', nombre: 'Desarrollo organizacional',
    texto: 'Fortalecer la estructura organizacional y la continuidad operativa de Macaco, formalizando responsabilidades, desarrollando capacidades y reduciendo la dependencia de un solo socio.' },
];

// Hipótesis de gestión, no causalidad demostrada.
export const MAPA_ESTRATEGICO = {
  tipo: 'hipotesis',
  cadena: [['OE-07', 'OE-08'], ['OE-05', 'OE-06'], ['OE-03', 'OE-04'], ['OE-01', 'OE-02']],
  nota: 'OE-07 y OE-08 habilitan OE-05 y OE-06; estos favorecen OE-03 y OE-04 y, finalmente, OE-01 y OE-02.',
};

export const INICIATIVAS = [
  { codigo: 'IE-01', nombre: 'Apertura y estabilización tienda gimnasio', oe: ['OE-01', 'OE-02', 'OE-03', 'OE-05'], responsablePropuesto: 'Socio comercial', horizonte: 'Nov–dic 2026 y 2027' },
  { codigo: 'IE-02', nombre: 'Marketing, guiones, contenido y campañas', oe: ['OE-02', 'OE-03'], responsablePropuesto: 'Socio comercial', horizonte: 'Desde nov 2026' },
  { codigo: 'IE-03', nombre: 'Optimización de Shopify', oe: ['OE-02', 'OE-03', 'OE-04'], responsablePropuesto: 'Socio comercial', horizonte: '2027' },
  { codigo: 'IE-04', nombre: 'Optimización de Mercado Libre', oe: ['OE-01', 'OE-02'], responsablePropuesto: 'Socio comercial', horizonte: '2027' },
  { codigo: 'IE-05', nombre: 'Compras, inventario, reposición', oe: ['OE-01', 'OE-05'], responsablePropuesto: 'Socio comercial; revisión financiera', horizonte: '2027' },
  { codigo: 'IE-06', nombre: 'Clientes, canales y atribución', oe: ['OE-04', 'OE-07'], responsablePropuesto: 'Socio comercial y tecnología', horizonte: '2027' },
  { codigo: 'IE-07', nombre: 'Control estratégico, reportes, corteza', oe: ['OE-07', 'OE-08'], responsablePropuesto: 'Socio comercial/tecnología', horizonte: '2027' },
  { codigo: 'IE-08', nombre: 'Evaluación de contratación', oe: ['OE-01', 'OE-05', 'OE-08'], responsablePropuesto: 'Ambos socios', horizonte: 'Según viabilidad' },
  { codigo: 'IE-09', nombre: 'Canal mayorista', oe: ['OE-02', 'OE-06'], responsablePropuesto: 'Ambos socios', horizonte: '2027–2028' },
  { codigo: 'IE-10', nombre: 'Estudio de importación directa', oe: ['OE-01', 'OE-06'], responsablePropuesto: 'Ambos socios', horizonte: 'Según viabilidad' },
];
export const ESTADOS_INICIATIVA = ['planificada', 'en_curso', 'completada', 'pausada'];

export const SOCIOS = ['Felipe', 'Papá'];

// calculo: 'auto'    — se calcula con los datos de la app
//          'manual'  — lo registra un socio (con fecha y evidencia)
//          'no_medible' — hoy faltan datos para medirlo
// meta: { valor, estado, nota } — valor null = pendiente (nunca 0).
export const KPIS = [
  { code: 'FIN-01', oe: 'OE-02', nombre: 'Crecimiento mensual de ventas', unidad: '%', direccion: 'mayor', calculo: 'auto', fuente: 'macaco:ventas', grano: 'mes', frecuencia: 'mensual', responsablePropuesto: 'Socio comercial',
    definicion: '(ventas del mes actual / ventas del mes anterior − 1) × 100, solo entre meses comparables (completos y con datos cuadrados).',
    meta: { valor: 10, estado: 'referencia', nota: '+10% mensual como referencia acordada; ajustar por estacionalidad. No es una predicción ni una obligación.' } },
  { code: 'FIN-02', oe: 'OE-01', nombre: 'Margen bruto', unidad: '%', direccion: 'mayor', calculo: 'auto', fuente: 'macaco:ventas', grano: 'mes', frecuencia: 'mensual', responsablePropuesto: 'Padre (finanzas)',
    definicion: '(ventas − costo de lo vendido) / ventas × 100, con el costo unitario de cada línea. Falta confirmar la convención tributaria y descontar descuentos y devoluciones.',
    meta: { valor: 31, estado: 'propuesta', nota: '≥31% provisional; revisar por canal.' } },
  { code: 'FIN-03', oe: 'OE-01', nombre: 'Margen de contribución', unidad: '$', direccion: 'mayor', calculo: 'no_medible', fuente: 'ventas + costos variables', grano: 'canal', frecuencia: 'mensual', responsablePropuesto: 'Padre (finanzas)',
    definicion: 'Ventas − costo de lo vendido − costos variables específicos del canal (comisiones, envíos, pasarela, devoluciones).',
    razon: 'Faltan comisiones, envíos y devoluciones por canal.',
    meta: { valor: null, estado: 'pendiente', nota: 'Positivo por canal; monto objetivo pendiente.' } },
  { code: 'FIN-04', oe: 'OE-01', nombre: 'Resultado operativo', unidad: '$', direccion: 'mayor', calculo: 'no_medible', fuente: 'contribución + gastos devengados', grano: 'mes', frecuencia: 'mensual', responsablePropuesto: 'Padre (finanzas)',
    definicion: 'Margen de contribución − gastos operativos devengados.',
    razon: 'Dependen de la contribución y de tener todos los gastos fijos registrados.',
    meta: { valor: null, estado: 'pendiente', nota: 'Positivo; condicionado a gastos completos.' } },
  { code: 'FIN-05', oe: 'OE-01', nombre: 'Flujo de caja operativo', unidad: '$', direccion: 'mayor', calculo: 'no_medible', fuente: 'libro de caja', grano: 'mes', frecuencia: 'mensual', responsablePropuesto: 'Padre (finanzas)',
    definicion: 'Cobros operativos − pagos operativos del período.',
    razon: 'Hoy solo existe el saldo de caja puntual, no un libro de movimientos; un saldo no es un flujo.',
    meta: { valor: null, estado: 'pendiente', nota: 'Positivo acumulado.' } },
  { code: 'FIN-06', oe: 'OE-01', nombre: 'Cobertura de gastos fijos', unidad: 'veces', direccion: 'mayor', calculo: 'no_medible', fuente: 'contribución / gastos fijos', grano: 'mes', frecuencia: 'mensual', responsablePropuesto: 'Padre (finanzas)',
    definicion: 'Margen de contribución / gastos fijos. Requiere el denominador completo.',
    razon: 'Sin margen de contribución ni gastos fijos completos. Mientras tanto se muestra el punto de equilibrio PARCIAL en Presupuesto.',
    meta: { valor: 1.0, estado: 'propuesta', nota: '≥1,0 provisional.' } },
  { code: 'COM-01', oe: 'OE-02', nombre: 'Ventas del mes y por canal', unidad: '$', direccion: 'mayor', calculo: 'auto', fuente: 'macaco:ventas', grano: 'canal', frecuencia: 'mensual', responsablePropuesto: 'Socio comercial',
    definicion: 'Ventas totales del mes y desglose por canal de transacción, sin duplicados. Mercado Libre y Shopify se suman solo tras conciliar contra la app.',
    meta: { valor: null, estado: 'pendiente', nota: 'Presupuesto mensual por canal pendiente.' } },
  { code: 'COM-02', oe: 'OE-02', nombre: 'Concentración del producto líder', unidad: '%', direccion: 'menor', calculo: 'auto', fuente: 'macaco:ventas', grano: 'producto', frecuencia: 'mensual', responsablePropuesto: 'Socio comercial',
    definicion: 'Ventas del producto líder / ventas totales del mes × 100.',
    meta: { valor: null, estado: 'pendiente', nota: 'Monitorear; meta numérica pendiente.' } },
  { code: 'MKT-01', oe: 'OE-03', nombre: 'Consultas comerciales atribuibles a marketing', unidad: 'consultas', direccion: 'mayor', calculo: 'manual', fuente: 'registro manual', grano: 'mes', frecuencia: 'semanal', responsablePropuesto: 'Socio comercial',
    definicion: 'Consultas de clientes que llegaron por una acción de marketing.',
    meta: { valor: null, estado: 'pendiente', nota: 'Línea base pendiente.' } },
  { code: 'MKT-02', oe: 'OE-03', nombre: 'Piezas de contenido por semana', unidad: 'piezas', direccion: 'mayor', calculo: 'manual', fuente: 'registro manual', grano: 'semana', frecuencia: 'semanal', responsablePropuesto: 'Socio comercial',
    definicion: 'Piezas de contenido publicadas en la semana. Mide actividad, no posicionamiento.',
    meta: { valor: 4, estado: 'propuesta', nota: '4 por semana, propuesta operativa.' } },
  { code: 'CLI-01', oe: 'OE-04', nombre: 'Tasa de recompra', unidad: '%', direccion: 'mayor', calculo: 'no_medible', fuente: 'clientes identificados', grano: 'mes', frecuencia: 'mensual', responsablePropuesto: 'Socio comercial',
    definicion: 'Clientes con 2 o más compras en la ventana / clientes compradores identificados en la ventana.',
    razon: 'Ninguna venta registrada tiene cliente; no se puede calcular la recompra ni hacia atrás.',
    meta: { valor: null, estado: 'pendiente', nota: 'Meta pendiente.' } },
  { code: 'CLI-02', oe: 'OE-04', nombre: 'Ventas con cliente identificado', unidad: '%', direccion: 'mayor', calculo: 'auto', fuente: 'macaco:ventas', grano: 'mes', frecuencia: 'mensual', responsablePropuesto: 'Socio comercial',
    definicion: '% de líneas de venta del mes con cliente anotado. Admite excepciones legítimas y debe respetar la privacidad.',
    meta: { valor: 90, estado: 'propuesta', nota: '≥90% propuesta, con excepciones.' } },
  { code: 'OPS-01', oe: 'OE-05', nombre: 'SKU prioritarios en quiebre', unidad: 'SKU', direccion: 'menor', calculo: 'auto', fuente: 'macaco:productos + macaco:ventas', grano: 'producto', frecuencia: 'semanal', responsablePropuesto: 'Socio comercial; revisión financiera',
    definicion: 'Productos que se vendieron en los últimos 60 días y hoy tienen stock 0. Provisional hasta tener clasificación ABC.',
    meta: { valor: null, estado: 'pendiente', nota: 'Reducir; fijar meta tras la clasificación ABC.' } },
  { code: 'OPS-02', oe: 'OE-05', nombre: 'Cobertura de stock y rotación', unidad: 'días', direccion: 'rango', calculo: 'auto', fuente: 'macaco:productos + macaco:ventas', grano: 'producto', frecuencia: 'semanal', responsablePropuesto: 'Socio comercial; revisión financiera',
    definicion: 'Inventario a costo / (costo de lo vendido de los últimos 30 días / 30). Rotación = costo vendido 30 días / inventario.',
    meta: { valor: null, estado: 'pendiente', nota: 'Umbrales por demanda y plazo de reposición.' } },
  { code: 'EXP-01', oe: 'OE-06', nombre: 'Avance del estudio mayorista e importación', unidad: '% de hitos', direccion: 'hito', calculo: 'manual', fuente: 'hitos verificados', grano: 'mes', frecuencia: 'mensual', responsablePropuesto: 'Ambos socios',
    definicion: 'Porcentaje de hitos del estudio de viabilidad verificados.',
    meta: { valor: null, estado: 'pendiente', nota: 'Completar estudios de viabilidad; fechas por acordar.' } },
  { code: 'DAT-01', oe: 'OE-07', nombre: 'Ventas con canal registrado', unidad: '%', direccion: 'mayor', calculo: 'auto', fuente: 'macaco:ventas', grano: 'mes', frecuencia: 'mensual', responsablePropuesto: 'Socio comercial y tecnología',
    definicion: '% de líneas de venta del mes con un canal de transacción válido.',
    meta: { valor: 100, estado: 'propuesta', nota: '100% de los registros nuevos.' } },
  { code: 'DAT-02', oe: 'OE-07', nombre: 'Registros críticos válidos y conciliados', unidad: '%', direccion: 'mayor', calculo: 'manual', fuente: 'auditoría de datos', grano: 'mes', frecuencia: 'mensual', responsablePropuesto: 'Socio comercial y tecnología',
    definicion: '% de registros críticos que pasan las validaciones y están conciliados.',
    meta: { valor: null, estado: 'pendiente', nota: 'Umbrales por campo; definir tras la auditoría.' } },
  { code: 'ORG-01', oe: 'OE-08', nombre: 'Procesos críticos documentados con responsable', unidad: '%', direccion: 'mayor', calculo: 'manual', fuente: 'inventario de procesos', grano: 'mes', frecuencia: 'mensual', responsablePropuesto: 'Ambos socios',
    definicion: '% de procesos críticos documentados y con responsable asignado.',
    meta: { valor: null, estado: 'pendiente', nota: 'Inventariar primero; objetivo cuantitativo pendiente.' } },
  { code: 'ORG-02', oe: 'OE-08', nombre: 'Tareas e hitos estratégicos a tiempo', unidad: '%', direccion: 'mayor', calculo: 'manual', fuente: 'registro manual', grano: 'mes', frecuencia: 'mensual', responsablePropuesto: 'Ambos socios',
    definicion: '% de tareas e hitos estratégicos completados dentro de su plazo.',
    meta: { valor: null, estado: 'pendiente', nota: 'Línea base y objetivo pendientes.' } },
].map(k => ({ formulaVersion: VERSION_ESTRATEGIA, ...k }));

export const kpiPorCodigo = (code) => KPIS.find(k => k.code === code) || null;
export const kpisDeObjetivo = (oe) => KPIS.filter(k => k.oe === oe);
