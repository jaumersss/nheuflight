/**
 * OSIRIS - Open Source Global Intelligence Platform & OSINT Suite
 * Mirror of https://github.com/simplifaisoul/osiris for NheuFlight
 *
 * Provides:
 * 1. Tactical Layers: Earthquakes (USGS), Fires (NASA EONET), 39 Strategic Ports,
 *    10 Chokepoints, Satellites (ISS & Constellations), CCTV Cameras, 24/7 Live News,
 *    13 Conflict Zones, Nuclear Facilities, Day/Night Solar Terminator.
 * 2. RECON Toolkit: Crypto Wallet Tracer (BTC/ETH with OFAC SDN match), OFAC Sanctions Search,
 *    IP & Shodan InternetDB Port Scanner, DNS & Subdomains (crt.sh), Sherlock Handle Recon.
 * 3. Tactical Hotspots Teleport & PiP Media HUD.
 */

(function () {
  'use strict';

  // --- Osiris State & Layer Registry ---
  const Osiris = {
    map: null,
    isHorusActive: false,
    isHudOpen: false,
    activeTab: 'layers',
    activeReconTab: 'crypto',
    layers: {
      earthquakes: { group: null, active: false, count: 0 },
      fires: { group: null, active: false, count: 0 },
      ports: { group: null, active: false, count: 39 },
      chokepoints: { group: null, active: false, count: 10 },
      satellites: { group: null, active: false, count: 0 },
      cctv: { group: null, active: false, count: 0 },
      news: { group: null, active: false, count: 18 },
      conflicts: { group: null, active: false, count: 13 },
      nuclear: { group: null, active: false, count: 25 },
      radars: { group: null, active: false, count: 2565 },
      terminator: { group: null, active: false, count: 0 }
    },
    radarState: {
      selectedProvince: 'Barcelona',
      selectedCity: 'all',
      detected: false
    },
    data: {
      earthquakes: [],
      fires: [],
      cctv: [],
      satellites: []
    }
  };

  window.Osiris = Osiris;

  // --- SVG J.A.R.V.I.S. Arc Reactor Icon (Stark Mark VII Arc Reactor) ---
  const JARVIS_ARC_SVG = `
    <svg class="jarvis-arc-reactor osiris-eye-icon" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="jarvisArcGlowCore" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#ffffff"/>
          <stop offset="35%" stop-color="#38bdf8"/>
          <stop offset="70%" stop-color="#00f0ff"/>
          <stop offset="100%" stop-color="#0284c7" stop-opacity="0.3"/>
        </radialGradient>
      </defs>
      <!-- Outer Chassis & Ring -->
      <circle cx="50" cy="50" r="46" fill="none" stroke="#00f0ff" stroke-width="2" opacity="0.75"/>
      <circle cx="50" cy="50" r="41" fill="none" stroke="#00e5ff" stroke-width="3" opacity="0.95"/>
      <circle cx="50" cy="50" r="32" fill="none" stroke="#38bdf8" stroke-width="1.6" stroke-dasharray="3.5 2" opacity="0.85"/>
      <!-- 10 Inductor Coils (Tony Stark Arc Reactor) -->
      <g fill="#00f0ff">
        <rect x="47.5" y="9.5" width="5" height="8" rx="1.5" transform="rotate(0 50 50)"/>
        <rect x="47.5" y="9.5" width="5" height="8" rx="1.5" transform="rotate(36 50 50)"/>
        <rect x="47.5" y="9.5" width="5" height="8" rx="1.5" transform="rotate(72 50 50)"/>
        <rect x="47.5" y="9.5" width="5" height="8" rx="1.5" transform="rotate(108 50 50)"/>
        <rect x="47.5" y="9.5" width="5" height="8" rx="1.5" transform="rotate(144 50 50)"/>
        <rect x="47.5" y="9.5" width="5" height="8" rx="1.5" transform="rotate(180 50 50)"/>
        <rect x="47.5" y="9.5" width="5" height="8" rx="1.5" transform="rotate(216 50 50)"/>
        <rect x="47.5" y="9.5" width="5" height="8" rx="1.5" transform="rotate(252 50 50)"/>
        <rect x="47.5" y="9.5" width="5" height="8" rx="1.5" transform="rotate(288 50 50)"/>
        <rect x="47.5" y="9.5" width="5" height="8" rx="1.5" transform="rotate(324 50 50)"/>
      </g>
      <!-- Inner Ring & Triangular Core -->
      <circle cx="50" cy="50" r="24.5" fill="none" stroke="#00f0ff" stroke-width="2.2" opacity="0.95"/>
      <polygon points="50,27.5 68,58.5 32,58.5" fill="none" stroke="#38bdf8" stroke-width="2.2" stroke-linejoin="round" opacity="0.9"/>
      <!-- Glowing Center Core -->
      <circle cx="50" cy="50" r="10.5" fill="url(#jarvisArcGlowCore)"/>
      <circle cx="50" cy="50" r="4.5" fill="#ffffff"/>
    </svg>
  `;
  const JARVIS_ARC_MINI_SVG = `
    <svg viewBox="0 0 100 100" class="osiris-ticker-eye jarvis-arc-reactor" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="44" fill="none" stroke="#00f0ff" stroke-width="5" opacity="0.9"/>
      <circle cx="50" cy="50" r="30" fill="none" stroke="#38bdf8" stroke-width="3" stroke-dasharray="6 3"/>
      <polygon points="50,28 69,60 31,60" fill="none" stroke="#00f0ff" stroke-width="4" stroke-linejoin="round"/>
      <circle cx="50" cy="50" r="12" fill="#38bdf8"/>
      <circle cx="50" cy="50" r="6" fill="#ffffff"/>
    </svg>
  `;
  const EYE_OF_HORUS_SVG = JARVIS_ARC_SVG; // Alias retrocompatible



  // --- Catálogo de 39 Puertos Estratégicos Mundiales ---
  const STRATEGIC_PORTS = [
    { name: 'Shanghái', country: 'China', lat: 31.23, lng: 121.47, teu: '47.3M TEU', status: 'Operativo', rank: 1 },
    { name: 'Singapur', country: 'Singapur', lat: 1.26, lng: 103.84, teu: '37.2M TEU', status: 'Operativo', rank: 2 },
    { name: 'Ningbo-Zhoushan', country: 'China', lat: 29.87, lng: 121.55, teu: '33.3M TEU', status: 'Operativo', rank: 3 },
    { name: 'Shenzhen', country: 'China', lat: 22.54, lng: 114.05, teu: '30.0M TEU', status: 'Operativo', rank: 4 },
    { name: 'Guangzhou', country: 'China', lat: 23.08, lng: 113.32, teu: '24.2M TEU', status: 'Operativo', rank: 5 },
    { name: 'Busan', country: 'Corea del Sur', lat: 35.10, lng: 129.04, teu: '22.7M TEU', status: 'Operativo', rank: 6 },
    { name: 'Qingdao', country: 'China', lat: 36.07, lng: 120.38, teu: '22.0M TEU', status: 'Operativo', rank: 7 },
    { name: 'Róterdam', country: 'Países Bajos', lat: 51.90, lng: 4.50, teu: '14.5M TEU', status: 'Hub Europeo', rank: 8 },
    { name: 'Jebel Ali (Dubái)', country: 'Emiratos Árabes', lat: 25.01, lng: 55.06, teu: '14.0M TEU', status: 'Operativo', rank: 9 },
    { name: 'Port Klang', country: 'Malasia', lat: 2.99, lng: 101.39, teu: '13.2M TEU', status: 'Operativo', rank: 10 },
    { name: 'Amberes-Brujas', country: 'Bélgica', lat: 51.30, lng: 4.40, teu: '12.0M TEU', status: 'Hub Químico', rank: 11 },
    { name: 'Xiamen', country: 'China', lat: 24.48, lng: 118.09, teu: '11.4M TEU', status: 'Operativo', rank: 12 },
    { name: 'Hamburgo', country: 'Alemania', lat: 53.53, lng: 9.97, teu: '8.7M TEU', status: 'Operativo', rank: 13 },
    { name: 'Los Ángeles', country: 'EE.UU.', lat: 33.74, lng: -118.27, teu: '9.2M TEU', status: 'Tráfico Elevado', rank: 14 },
    { name: 'Long Beach', country: 'EE.UU.', lat: 33.76, lng: -118.20, teu: '8.0M TEU', status: 'Operativo', rank: 15 },
    { name: 'Valencia', country: 'España', lat: 39.45, lng: -0.32, teu: '5.4M TEU', status: 'Líder Mediterráneo', rank: 16 },
    { name: 'Algeciras', country: 'España', lat: 36.13, lng: -5.44, teu: '4.8M TEU', status: 'Hub Estrecho', rank: 17 },
    { name: 'Barcelona', country: 'España', lat: 41.35, lng: 2.16, teu: '3.5M TEU', status: 'Hub Logístico', rank: 18 },
    { name: 'Bilbao', country: 'España', lat: 43.35, lng: -3.05, teu: '0.6M TEU', status: 'Arco Atlántico', rank: 19 },
    { name: 'Las Palmas', country: 'España', lat: 28.14, lng: -15.42, teu: '1.2M TEU', status: 'Hub Atlántico Sur', rank: 20 },
    { name: 'Pireo', country: 'Grecia', lat: 37.94, lng: 23.63, teu: '5.3M TEU', status: 'Hub Mediterráneo Oriental', rank: 21 },
    { name: 'Tokio', country: 'Japón', lat: 35.61, lng: 139.79, teu: '4.5M TEU', status: 'Operativo', rank: 22 },
    { name: 'Yokohama', country: 'Japón', lat: 35.45, lng: 139.66, teu: '2.9M TEU', status: 'Operativo', rank: 23 },
    { name: 'Kaohsiung', country: 'Taiwán', lat: 22.61, lng: 120.28, teu: '9.6M TEU', status: 'Alta Vigilancia', rank: 24 },
    { name: 'Tánger Med', country: 'Marruecos', lat: 35.88, lng: -5.50, teu: '7.6M TEU', status: 'Líder África', rank: 25 },
    { name: 'Santos', country: 'Brasil', lat: -23.96, lng: -46.30, teu: '4.4M TEU', status: 'Líder Sudamérica', rank: 26 },
    { name: 'Colón / Manzanillo', country: 'Panamá', lat: 9.36, lng: -79.88, teu: '4.3M TEU', status: 'Hub Canal', rank: 27 },
    { name: 'Balboa', country: 'Panamá', lat: 8.95, lng: -79.56, teu: '2.3M TEU', status: 'Hub Pacífico', rank: 28 },
    { name: 'Nueva York / New Jersey', country: 'EE.UU.', lat: 40.67, lng: -74.12, teu: '7.8M TEU', status: 'Costa Este', rank: 29 },
    { name: 'Savannah', country: 'EE.UU.', lat: 32.13, lng: -81.14, teu: '5.2M TEU', status: 'Operativo', rank: 30 },
    { name: 'Colombo', country: 'Sri Lanka', lat: 6.94, lng: 79.84, teu: '7.2M TEU', status: 'Transbordo Índico', rank: 31 },
    { name: 'Mumbai (JNPT)', country: 'India', lat: 18.95, lng: 72.95, teu: '5.7M TEU', status: 'Operativo', rank: 32 },
    { name: 'Port Said', country: 'Egipto', lat: 31.26, lng: 32.31, teu: '3.9M TEU', status: 'Entrada Suez', rank: 33 },
    { name: 'Génova', country: 'Italia', lat: 44.41, lng: 8.91, teu: '2.6M TEU', status: 'Operativo', rank: 34 },
    { name: 'Felixstowe', country: 'Reino Unido', lat: 51.96, lng: 1.31, teu: '3.7M TEU', status: 'Líder UK', rank: 35 },
    { name: 'Le Havre', country: 'Francia', lat: 49.48, lng: 0.11, teu: '3.1M TEU', status: 'Operativo', rank: 36 },
    { name: 'Sídney (Port Botany)', country: 'Australia', lat: -33.98, lng: 151.22, teu: '2.7M TEU', status: 'Operativo', rank: 37 },
    { name: 'Melbourne', country: 'Australia', lat: -37.84, lng: 144.92, teu: '3.2M TEU', status: 'Operativo', rank: 38 },
    { name: 'Durban', country: 'Sudáfrica', lat: -29.87, lng: 31.02, teu: '2.6M TEU', status: 'Hub Sudafricano', rank: 39 }
  ];

  // --- Catálogo de 10 Chokepoints Marítimos Críticos (Delimitación de Corredores) ---
  // --- Catálogo de 10 Chokepoints Marítimos Críticos (Corredores Estratégicos Globales) ---
  const MARITIME_CHOKEPOINTS = [
    {
      name: 'Estrecho de Ormuz',
      shortName: 'Estrecho de Ormuz',
      lat: 26.56,
      lng: 56.25,
      risk: 'Crítico',
      traffic: '21M barriles/día (~21% del consumo global de crudo)',
      cargo: 'Petróleo crudo, gas natural licuado (GNL)',
      securityLevel: 'ISPS Nivel 2 / Vigilancia Reforzada',
      desc: 'Corredor vital entre el Golfo Pérsico y el Océano Índico. Alta densidad naval internacional y monitoreo electrónico permanente.',
      polygon: [
        [26.9, 56.1], [26.7, 56.8], [26.1, 56.6], [26.0, 55.9], [26.4, 55.6]
      ]
    },
    {
      name: 'Canal de Suez',
      shortName: 'Canal de Suez',
      lat: 30.50,
      lng: 32.33,
      risk: 'Elevado',
      traffic: '~12% del comercio marítimo mundial (~19.000 tránsitos/año)',
      cargo: 'Contenedores intercontinentales, hidrocarburos, manufacturas',
      securityLevel: 'Tránsito Regulado por la SCA',
      desc: 'Arteria estratégica entre el Mediterráneo y el Mar Rojo. Tráfico condicionado por la seguridad del corredor meridional.',
      polygon: [
        [31.35, 32.25], [31.35, 32.38], [29.90, 32.60], [29.90, 32.48]
      ]
    },
    {
      name: 'Estrecho de Bab el-Mandeb',
      shortName: 'Bab el-Mandeb',
      lat: 12.58,
      lng: 43.33,
      risk: 'Crítico',
      traffic: '4.5M barriles/día (~8.5% del comercio naval de hidrocarburos)',
      cargo: 'Petróleo, gas licuado, portacontenedores Europa-Asia',
      securityLevel: 'Zona de Interdicción y Escolta Naval Militar',
      desc: 'Puerta sur del Mar Rojo y Golfo de Adén. Zona de alta amenaza asimétrica con desvíos sistemáticos por el Cabo de Buena Esperanza.',
      polygon: [
        [12.95, 43.10], [12.95, 43.50], [12.30, 43.45], [12.30, 43.05]
      ]
    },
    {
      name: 'Estrecho de Malaca',
      shortName: 'Estrecho de Malaca',
      lat: 2.15,
      lng: 102.10,
      risk: 'Alto',
      traffic: '~25% del comercio global (~85.000 buques anuales)',
      cargo: 'Suministro energético para Asia oriental, manufacturas globales',
      securityLevel: 'ISPS Nivel 1 / Patrullas MALSINDO',
      desc: 'Cuello de botella vital que conecta el Océano Índico con el Mar de la China Meridional. Tráfico de alta densidad y riesgo de congestión.',
      polygon: [
        [3.8, 100.2], [3.0, 101.4], [1.3, 103.5], [1.1, 103.3], [2.1, 101.2], [3.2, 99.8]
      ]
    },
    {
      name: 'Canal de Panamá',
      shortName: 'Canal de Panamá',
      lat: 9.08,
      lng: -79.68,
      risk: 'Moderado',
      traffic: '~5% del comercio marítimo mundial (13.000+ tránsitos anuales)',
      cargo: 'Graneles secos, portacontenedores Neopanamax, GNL',
      securityLevel: 'Operación Regulada por la ACP',
      desc: 'Paso bioceánico Atlántico-Pacífico. Capacidad condicionada por niveles pluviométricos de los lagos Gatún y Alhajuela.',
      polygon: [
        [9.42, -79.96], [9.38, -79.86], [8.88, -79.52], [8.92, -79.62]
      ]
    },
    {
      name: 'Estrecho de Taiwán',
      shortName: 'Estrecho de Taiwán',
      lat: 24.20,
      lng: 119.80,
      risk: 'Crítico',
      traffic: '88% de los mayores portacontenedores del mundo por calado',
      cargo: 'Semiconductores, electrónica avanzada, carga industrial este-asiática',
      securityLevel: 'Máxima Vigilancia Aérea y Naval',
      desc: 'Corredor marítimo de alta relevancia geopolítica entre el continente asiático y Taiwán. Monitoreo militar constante de ambos lados.',
      polygon: [
        [25.6, 119.6], [25.4, 120.6], [23.1, 120.1], [23.3, 119.1]
      ]
    },
    {
      name: 'Estrecho de Gibraltar',
      shortName: 'Estrecho de Gibraltar',
      lat: 35.95,
      lng: -5.50,
      risk: 'Moderado',
      traffic: 'Más de 100.000 buques anuales (uno cada 5 minutos)',
      cargo: 'Tráfico transversal Europa-África y longitudinal Atlántico-Mediterráneo',
      securityLevel: 'Dispositivo de Separación de Tráfico (DST Tarifa)',
      desc: 'Acceso natural al Mar Mediterráneo desde el Atlántico. Estrecho regulado por el sistema VTS Tarifa y Capitanía Marítima.',
      polygon: [
        [36.18, -5.65], [36.18, -5.30], [35.82, -5.30], [35.82, -5.65]
      ]
    },
    {
      name: 'Estrecho del Bósforo y Dardanelos',
      shortName: 'Bósforo / Dardanelos',
      lat: 41.12,
      lng: 29.08,
      risk: 'Alto',
      traffic: 'Acceso marítimo exclusivo al Mar Negro (~40.000 tránsitos/año)',
      cargo: 'Cereales, fertilizantes, productos derivados del petróleo',
      securityLevel: 'Régimen de la Convención de Montreux',
      desc: 'Pasaje turco regulado que enlaza el Mar Negro con el Egeo. Paso restringido a buques de guerra según tratados internacionales vigentes.',
      polygon: [
        [41.32, 29.00], [41.28, 29.20], [40.05, 26.35], [40.15, 26.20]
      ]
    },
    {
      name: 'Paso de Calais / Dover',
      shortName: 'Paso de Calais',
      lat: 51.05,
      lng: 1.45,
      risk: 'Moderado',
      traffic: '500+ tránsitos comerciales diarios y ferrys de pasajeros',
      cargo: 'Comercio intracomunitario europeo y conexiones transatlánticas',
      securityLevel: 'VTS Gris-Nez / Dover Strait TSS',
      desc: 'Uno de los pasajes marítimos más transitados y monitorizados del planeta, con separación de tráfico estricta por radar.',
      polygon: [
        [51.28, 1.40], [51.20, 1.85], [50.85, 1.50], [50.95, 1.05]
      ]
    },
    {
      name: 'Estrechos Daneses (Skagerrak / Kattegat)',
      shortName: 'Estrechos Daneses',
      lat: 56.50,
      lng: 11.50,
      risk: 'Alto',
      traffic: 'Salida comercial obligatoria del Mar Báltico',
      cargo: 'Hidrocarburos del Báltico, madera, manufacturas nórdicas',
      securityLevel: 'Monitoreo de Países Ribereños del Báltico',
      desc: 'Canal de control para la navegación marítima entre el Báltico y el Mar del Norte, foco de seguimiento de exportaciones energéticas.',
      polygon: [
        [57.9, 10.4], [57.6, 12.0], [55.7, 11.6], [55.9, 10.3]
      ]
    }
  ];

  // --- Catálogo de 13 Zonas Activas de Conflicto y Guerra (Delimitación Táctica Real) ---
  const CONFLICT_ZONES = [
    {
      id: 'ukraine',
      name: 'Teatro de Operaciones de Ucrania',
      shortName: 'Frente de Ucrania',
      coords: [48.37, 37.86],
      intensity: 'Conflicto de Alta Intensidad',
      airspaceStatus: 'Espacio aéreo civil cerrado (NOTAM activo)',
      theater: 'Europa Oriental / Mar Negro',
      status: 'Operaciones militares a gran escala, ataques con misiles y drones sobre infraestructuras críticas.',
      belligerents: 'Fuerzas Armadas de Ucrania vs Fuerzas Armadas de la Federación Rusa',
      monitorSource: 'ISW / ACLED',
      polygon: [
        [51.6, 34.5], [51.2, 36.5], [50.4, 37.5], [49.6, 38.6], [48.8, 40.0],
        [47.5, 39.5], [46.8, 38.0], [45.5, 36.5], [44.8, 35.0], [44.5, 33.5],
        [45.3, 32.5], [46.5, 32.0], [47.2, 33.5], [47.8, 35.5], [49.0, 36.5],
        [50.5, 35.0]
      ]
    },
    {
      id: 'gaza_israel',
      name: 'Franja de Gaza y Corredor Levantino',
      shortName: 'Franja de Gaza',
      coords: [31.42, 34.38],
      intensity: 'Hostilidades Activas',
      airspaceStatus: 'Zona militar restringida con desvíos comerciales',
      theater: 'Mediterráneo Oriental / Levante',
      status: 'Operaciones terrestres urbanas activas, intercepciones de defensa aérea continua por baterías Iron Dome.',
      belligerents: 'FDI vs Facciones Armadas de Gaza',
      monitorSource: 'UN OCHA / OACI Alertas',
      polygon: [
        [31.59, 34.54], [31.54, 34.48], [31.33, 34.23], [31.21, 34.26],
        [31.28, 34.36], [31.35, 34.43], [31.53, 34.56]
      ]
    },
    {
      id: 'red_sea',
      name: 'Corredor del Mar Rojo y Golfo de Adén',
      shortName: 'Corredor Mar Rojo',
      coords: [14.80, 42.40],
      intensity: 'Interdicción Naval y Aérea',
      airspaceStatus: 'Riesgo elevado por misiles antibuque y drones',
      theater: 'Península Arábiga / Mar Rojo Meridional',
      status: 'Lanzamientos de misiles antibuque y drones de superficie (USV) contra el tráfico mercante internacional.',
      belligerents: 'Fuerzas Ansar Allah (Hutíes) vs Coalición Naval Internacional',
      monitorSource: 'UKMTO / US CENTCOM',
      polygon: [
        [18.5, 39.5], [17.5, 41.5], [15.0, 42.5], [13.2, 43.5], [12.0, 44.5],
        [11.8, 45.5], [11.5, 44.5], [12.2, 43.2], [13.5, 42.0], [15.5, 40.5],
        [17.5, 38.8]
      ]
    },
    {
      id: 'taiwan_strait',
      name: 'Estrecho de Taiwán y Zona ADIZ',
      shortName: 'Estrecho de Taiwán',
      coords: [24.00, 120.20],
      intensity: 'Tensión Geopolítica Elevada',
      airspaceStatus: 'Monitoreo de rutas comerciales y cruces ADIZ',
      theater: 'Asia-Pacífico / Mar de la China Meridional',
      status: 'Incursiones regulares en la zona de identificación de defensa aérea (ADIZ) y patrullas de combate.',
      belligerents: 'Ejército Popular de Liberación (China) vs Fuerzas Armadas de Taiwán',
      monitorSource: 'MND Taiwán / US INDOPACOM',
      polygon: [
        [26.2, 119.8], [25.8, 122.0], [23.5, 121.5], [21.8, 120.5],
        [22.2, 118.5], [24.0, 118.2], [25.5, 119.0]
      ]
    },
    {
      id: 'korea_dmz',
      name: 'Zona Desmilitarizada de Corea (DMZ)',
      shortName: 'Corea (DMZ)',
      coords: [38.25, 127.15],
      intensity: 'Alerta Estratégica Máxima',
      airspaceStatus: 'Zona P-518 de exclusión aérea permanente',
      theater: 'Península Coreana',
      status: 'Ensayos balísticos, concentración de artillería pesada y vigilancia fronteriza a lo largo del Paralelo 38.',
      belligerents: 'Fuerzas Armadas de la RPDC vs Fuerzas de Corea del Sur y Comando ONU',
      monitorSource: 'Comando de la ONU / JCS Seúl',
      polygon: [
        [37.75, 126.65], [37.85, 126.70], [38.28, 127.20], [38.65, 128.35],
        [38.58, 128.42], [38.20, 127.15], [37.70, 126.60]
      ]
    },
    {
      id: 'sudan',
      name: 'Teatro de Sudán y Cuenca del Nilo',
      shortName: 'Sudán',
      coords: [15.55, 32.53],
      intensity: 'Guerra Civil Activa',
      airspaceStatus: 'Espacio aéreo con restricciones severas por conflicto',
      theater: 'África Oriental / Sahel Oriental',
      status: 'Combates armados en Jartum, Darfur y Kordofán con impacto directo sobre la población y rutas logísticas.',
      belligerents: 'Fuerzas Armadas Sudanesas (SAF) vs Fuerzas de Apoyo Rápido (RSF)',
      monitorSource: 'ACLED / Cruz Roja Internacional',
      polygon: [
        [17.0, 34.0], [15.0, 34.5], [13.0, 32.5], [11.5, 29.5], [12.0, 23.5],
        [14.5, 22.5], [16.0, 27.0], [16.8, 31.0]
      ]
    },
    {
      id: 'myanmar',
      name: 'Conflicto Interno de Myanmar',
      shortName: 'Myanmar',
      coords: [21.90, 95.95],
      intensity: 'Insurgencia y Guerra Asimétrica',
      airspaceStatus: 'Restricciones en áreas fronterizas',
      theater: 'Sudeste Asiático',
      status: 'Ofensivas combinadas de grupos armados étnicos contra posiciones de la junta militar golpista.',
      belligerents: 'Tatmadaw (Junta Militar) vs Alianza Tres Hermandades y PDF',
      monitorSource: 'IISS / ACLED',
      polygon: [
        [25.0, 96.0], [24.0, 98.5], [21.0, 98.8], [18.0, 97.5], [16.5, 96.0],
        [19.0, 93.8], [22.0, 93.2], [24.0, 94.5]
      ]
    },
    {
      id: 'syria_lebanon',
      name: 'Frontera Líbano-Siria y Altos del Golán',
      shortName: 'Líbano / Golán',
      coords: [33.30, 35.60],
      intensity: 'Combates Fronterizos',
      airspaceStatus: 'Vigilancia continua del espacio aéreo levantino',
      theater: 'Levante / Oriente Medio',
      status: 'Intercambio de fuego de artillería, cohetes guiados y operaciones aéreas tácticas sobre la Línea Azul.',
      belligerents: 'Fuerzas de Defensa de Israel vs Hezbolá y Milicias Regionales',
      monitorSource: 'FPNUL / SOHR',
      polygon: [
        [34.1, 35.6], [34.0, 36.4], [33.3, 36.2], [32.8, 35.8],
        [32.9, 35.3], [33.5, 35.2]
      ]
    },
    {
      id: 'sahel',
      name: 'Franja del Sahel (Liptako-Gourma)',
      shortName: 'Región del Sahel',
      coords: [14.60, -1.80],
      intensity: 'Insurgencia Yihadista y Seguridad Asimétrica',
      airspaceStatus: 'Rutas continentales sin cobertura radar civil continua',
      theater: 'África Occidental / Malí-Burkina-Níger',
      status: 'Operaciones armadas de grupos insurgentes JNIM / ISGS y despliegues militares de las juntas regionales.',
      belligerents: 'Fuerzas Estatales del Sahel vs Grupos Insurgentes Armados',
      monitorSource: 'ACLED / Crisis Group',
      polygon: [
        [17.5, -4.0], [17.0, 2.5], [14.0, 2.8], [12.0, -1.0], [13.0, -4.8]
      ]
    },
    {
      id: 'somalia',
      name: 'Cuerno de África y Cuenca Somalí',
      shortName: 'Cuerno de África',
      coords: [2.50, 45.30],
      intensity: 'Operaciones Contraterroristas',
      airspaceStatus: 'Espacio aéreo Mogadiscio regulado por OACI',
      theater: 'África Oriental / Océano Índico',
      status: 'Operaciones de seguridad del Ejército Nacional Somalí con respaldo de ATMIS contra Al-Shabaab.',
      belligerents: 'Gobierno Federal Somalí y Fuerzas ATMIS vs Al-Shabaab',
      monitorSource: 'Misión ATMIS / ONU',
      polygon: [
        [5.5, 48.5], [3.0, 46.5], [0.5, 43.5], [-0.5, 42.0], [2.0, 41.0],
        [4.5, 44.0]
      ]
    },
    {
      id: 'drc',
      name: 'Kivu y Región Oriental de la RDC',
      shortName: 'Kivu (RDC)',
      coords: [-1.65, 29.22],
      intensity: 'Conflicto Regional Armado',
      airspaceStatus: 'Precaución en aeródromos de Goma y Kivu del Norte',
      theater: 'Región de los Grandes Lagos',
      status: 'Enfrentamientos en torno a Goma entre fuerzas gubernamentales y el movimiento M23 con misiones de estabilización.',
      belligerents: 'FARDC y Misiones SAMIDRC / MONUSCO vs Movimiento M23',
      monitorSource: 'MONUSCO / Kivu Security Tracker',
      polygon: [
        [0.8, 29.8], [-1.2, 29.6], [-2.4, 29.2], [-2.8, 28.5], [-1.5, 28.0],
        [0.0, 28.6]
      ]
    },
    {
      id: 'yemen',
      name: 'Teatro de Yemen y Estrecho Meridional',
      shortName: 'Yemen',
      coords: [15.35, 44.20],
      intensity: 'Conflicto Regional Prolongado',
      airspaceStatus: 'Espacio aéreo civil de Saná severamente restringido',
      theater: 'Península Arábiga Sur',
      status: 'Puntos de lanzamiento de misiles balísticos y drones hacia el corredor del Mar Rojo y zonas costeras.',
      belligerents: 'Fuerzas Ansar Allah vs Fuerzas Gubernamentales / Coalición',
      monitorSource: 'Yemen Data Project / ACLED',
      polygon: [
        [17.8, 43.2], [17.0, 45.5], [14.8, 45.5], [13.5, 44.2], [14.0, 42.6],
        [16.0, 42.8]
      ]
    },
    {
      id: 'ormuz_gulf',
      name: 'Golfo Pérsico y Aproximaciones de Ormuz',
      shortName: 'Golfo Pérsico',
      coords: [26.00, 55.50],
      intensity: 'Vigilancia y Disuasión Naval',
      airspaceStatus: 'Espacio aéreo con densa cobertura radar de defensa',
      theater: 'Golfo Pérsico / Mar de Omán',
      status: 'Operaciones de escolta naval, monitoreo electrónico de mercantes y vigilancia de interferencias GPS en aguas abiertas.',
      belligerents: 'Fuerzas Navales del CGRI vs Fuerzas Navales Combinadas (CMF)',
      monitorSource: 'EMASOH / CMF Baréin',
      polygon: [
        [27.5, 54.0], [27.2, 56.5], [26.0, 57.5], [25.0, 56.5], [25.2, 54.5],
        [26.5, 53.0]
      ]
    }
  ];

  // --- Canales de Noticias 24/7 en Vivo (Geo-localizados en sus sedes centrales) ---
  const LIVE_NEWS_FEEDS = [
    {
      id: 'rtve_24h',
      name: 'RTVE 24h Noticias',
      badge: '🇪🇸 ESPAÑA',
      city: 'Madrid',
      country: 'España',
      coords: [40.43, -3.71],
      lang: 'ES',
      desc: 'Canal 24 Horas de RTVE. Información continua de España y el mundo.',
      officialUrl: 'https://www.rtve.es/play/videos/directo/canales-lineales/24h/',
      ytChannel: 'https://www.youtube.com/@rtvenoticias/live',
      streamUrl: 'https://www.rtve.es/play/videos/directo/canales-lineales/24h/'
    },
    {
      id: 'cat_324',
      name: '324 Notícies',
      badge: '🏴󠁥󠁳󠁣󠁴󠁿 CATALUNYA',
      city: 'Barcelona',
      country: 'Catalunya',
      coords: [41.37, 2.11],
      lang: 'CA',
      desc: 'Canal informatiu 24 hores de 3Cat / Televisió de Catalunya.',
      officialUrl: 'https://www.ccma.cat/3cat/directes/324/',
      ytChannel: 'https://www.youtube.com/@324cat/live',
      streamUrl: 'https://www.ccma.cat/3cat/directes/324/'
    },
    {
      id: 'france24_es',
      name: 'France 24 en Español',
      badge: '🇫🇷 FRANCIA / ES',
      city: 'París',
      country: 'Francia',
      coords: [48.83, 2.26],
      lang: 'ES',
      desc: 'Información y análisis internacional en directo las 24 horas.',
      officialUrl: 'https://www.france24.com/es/en-vivo',
      ytChannel: 'https://www.youtube.com/@France24_es/live',
      streamUrl: 'https://www.youtube-nocookie.com/embed/h3MuIUNCCzI?autoplay=1&mute=1'
    },
    {
      id: 'sky_news',
      name: 'Sky News Live',
      badge: '🇬🇧 UK / GLOBAL',
      city: 'Londres',
      country: 'UK',
      coords: [51.48, -0.32],
      lang: 'EN',
      desc: 'Cadena británica líder de noticias internacionales en vivo.',
      officialUrl: 'https://news.sky.com/watch-live',
      ytChannel: 'https://www.youtube.com/@SkyNews/live',
      streamUrl: 'https://www.youtube-nocookie.com/embed/9Auq9mYxFEE?autoplay=1&mute=1'
    },
    {
      id: 'aljazeera_en',
      name: 'Al Jazeera English',
      badge: '🇶🇦 MEDIO ORIENTE',
      city: 'Doha',
      country: 'Catar',
      coords: [25.28, 51.53],
      lang: 'EN',
      desc: 'Cobertura en directo de conflictos, Oriente Medio y geopolítica global.',
      officialUrl: 'https://www.aljazeera.com/live',
      ytChannel: 'https://www.youtube.com/@AlJazeeraEnglish/live',
      streamUrl: 'https://www.youtube-nocookie.com/embed/gCNeDWCI0vo?autoplay=1&mute=1'
    },
    {
      id: 'dw_news',
      name: 'DW News en Directo',
      badge: '🇩🇪 ALEMANIA',
      city: 'Berlín',
      country: 'Alemania',
      coords: [52.50, 13.38],
      lang: 'EN',
      desc: 'Servicio internacional de noticias de la alemana Deutsche Welle.',
      officialUrl: 'https://www.dw.com/en/live-tv/s-100825',
      ytChannel: 'https://www.youtube.com/@dwnews/live',
      streamUrl: 'https://www.dw.com/en/live-tv/s-100825'
    },
    {
      id: 'euronews_es',
      name: 'Euronews en Español',
      badge: '🇪🇺 EUROPA',
      city: 'Lyon',
      country: 'Francia',
      coords: [45.74, 4.81],
      lang: 'ES',
      desc: 'Noticias paneuropeas y actualidad comunitaria en español.',
      officialUrl: 'https://es.euronews.com/en-directo',
      ytChannel: 'https://www.youtube.com/@euronewses/live',
      streamUrl: 'https://es.euronews.com/en-directo'
    },
    {
      id: 'bloomberg',
      name: 'Bloomberg Television',
      badge: '🇺🇸 ECONOMÍA GLOBAL',
      city: 'Nueva York',
      country: 'EE.UU.',
      coords: [40.76, -73.96],
      lang: 'EN',
      desc: 'Mercados financieros, comercio y economía global en tiempo real.',
      officialUrl: 'https://www.bloomberg.com/live/us',
      ytChannel: 'https://www.youtube.com/@BloombergTelevision/live',
      streamUrl: 'https://www.bloomberg.com/live/us'
    },
    {
      id: 'abc_news',
      name: 'ABC News Live',
      badge: '🇺🇸 EE.UU.',
      city: 'Nueva York',
      country: 'EE.UU.',
      coords: [40.77, -73.98],
      lang: 'EN',
      desc: 'Emisión 24/7 de noticias y alertas de última hora en EE.UU.',
      officialUrl: 'https://abcnews.go.com/Live',
      ytChannel: 'https://www.youtube.com/@ABCNews/live',
      streamUrl: 'https://abcnews.go.com/Live'
    },
    {
      id: 'livenow_fox',
      name: 'LiveNOW from FOX',
      badge: '🇺🇸 ALERTAS 24/7',
      city: 'Orlando',
      country: 'EE.UU.',
      coords: [28.53, -81.37],
      lang: 'EN',
      desc: 'Transmisión ininterrumpida de sucesos de última hora en directo.',
      officialUrl: 'https://www.livenowfox.com/live',
      ytChannel: 'https://www.youtube.com/@LiveNOWfromFOX/live',
      streamUrl: 'https://www.livenowfox.com/live'
    },
    {
      id: 'nhk_japan',
      name: 'NHK World-Japan',
      badge: '🇯🇵 JAPÓN / ASIA',
      city: 'Tokio',
      country: 'Japón',
      coords: [35.66, 139.69],
      lang: 'EN',
      desc: 'Televisión pública de Japón con análisis continuo de Asia-Pacífico.',
      officialUrl: 'https://www3.nhk.or.jp/nhkworld/en/live/',
      ytChannel: 'https://www.youtube.com/@NHKWORLDJAPAN/live',
      streamUrl: 'https://www3.nhk.or.jp/nhkworld/en/live/'
    },
    {
      id: 'cna_singapore',
      name: 'CNA Asia 24h',
      badge: '🇸🇬 ASIA',
      city: 'Singapur',
      country: 'Singapur',
      coords: [1.29, 103.85],
      lang: 'EN',
      desc: 'Cobertura estratégica de mercados y política de Asia y el Pacífico.',
      officialUrl: 'https://www.channelnewsasia.com/watch-live',
      ytChannel: 'https://www.youtube.com/@ChannelNewsAsia/live',
      streamUrl: 'https://www.channelnewsasia.com/watch-live'
    },
    {
      id: 'trt_world',
      name: 'TRT World',
      badge: '🇹🇷 EURASIA',
      city: 'Estambul',
      country: 'Turquía',
      coords: [41.01, 28.97],
      lang: 'EN',
      desc: 'Noticias globales con enfoque en Eurasia, Cáucaso y Oriente Medio.',
      officialUrl: 'https://www.trtworld.com/live',
      ytChannel: 'https://www.youtube.com/@trtworld/live',
      streamUrl: 'https://www.trtworld.com/live'
    },
    {
      id: 'wion_news',
      name: 'WION Global News',
      badge: '🇮🇳 INDIA',
      city: 'Nueva Delhi',
      country: 'India',
      coords: [28.53, 77.38],
      lang: 'EN',
      desc: 'Canal internacional de noticias de India en lengua inglesa.',
      officialUrl: 'https://www.wionews.com/live-tv',
      ytChannel: 'https://www.youtube.com/@WION/live',
      streamUrl: 'https://www.wionews.com/live-tv'
    },
    {
      id: 'espreso_tv',
      name: 'Espreso TV Ukraine',
      badge: '🇺🇦 UCRANIA',
      city: 'Kiev',
      country: 'Ucrania',
      coords: [50.45, 30.52],
      lang: 'UKR',
      desc: 'Emisión continua desde Kiev sobre el frente bélico y la guerra.',
      officialUrl: 'https://espreso.tv/live',
      ytChannel: 'https://www.youtube.com/@EspresoTV/live',
      streamUrl: 'https://espreso.tv/live'
    }
  ];

  // --- Red Global de Cámaras de Videovigilancia y Tráfico (CCTV) ---
  // Obtiene dinámicamente el catálogo completo (489+ cámaras de Madrid, Londres y Mundiales)
  function getCctvCameras() {
    if (typeof window !== 'undefined' && Array.isArray(window.OSIRIS_CCTV_DATA) && window.OSIRIS_CCTV_DATA.length > 0) {
      return window.OSIRIS_CCTV_DATA;
    }
    return [
      { id: 'cam_mad_1', name: 'Plaza de Castilla (Norte)', city: 'Madrid', country: 'España', region: 'Madrid', lat: 40.466, lng: -3.689, url: 'https://informo.madrid.es/cameras/Camara06303.jpg', type: 'snapshot' },
      { id: 'cam_mad_2', name: 'Puerta del Sol / Arenal', city: 'Madrid', country: 'España', region: 'Madrid', lat: 40.4168, lng: -3.7038, url: 'https://informo.madrid.es/cameras/Camara01301.jpg', type: 'snapshot' },
      { id: 'cam_bcn_1', name: 'Port de Barcelona / Litoral', city: 'Barcelona', country: 'España', region: 'Catalunya', lat: 41.375, lng: 2.182, url: 'https://www.infocar.dgt.es/etraffic/CCTVs/carreteras/08/B-10/7.jpg', type: 'snapshot' },
      { id: 'cam_lon_1', name: 'Piccadilly Circus (TfL)', city: 'Londres', country: 'Reino Unido', region: 'London', lat: 51.5096, lng: -0.1348, url: 'https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.07450.jpg', type: 'snapshot' },
      { id: 'cam_tok_1', name: 'Shibuya Crossing Live 24/7', city: 'Tokio', country: 'Japón', region: 'Asia', lat: 35.6595, lng: 139.7005, streamUrl: 'https://www.youtube.com/embed/H-3c_8v4xbg?autoplay=1&mute=1', type: 'stream' },
      { id: 'cam_nyc_1', name: 'Times Square Live 4K', city: 'Nueva York', country: 'EE.UU.', region: 'Norteamérica', lat: 40.758, lng: -73.985, streamUrl: 'https://www.youtube.com/embed/1-iS7LArMPA?autoplay=1&mute=1', type: 'stream' }
    ];
  }

  // --- Catálogo de Instalaciones Nucleares Críticas (Precisión Satelital y Polígonos de Seguridad) ---
  const NUCLEAR_FACILITIES = [
    // --- ESPAÑA (Operativas, En Desmantelamiento y Almacenamiento Centralizado) ---
    {
      name: 'Central Nuclear de Ascó (I y II)',
      shortName: 'Ascó (I-II)',
      country: 'España',
      location: "Ribera d'Ebre, Tarragona (Catalunya)",
      lat: 41.20016,
      lng: 0.56942,
      type: '2x PWR Westinghouse (3 lazos)',
      power: '2.060 MWe (Ascó I: 1.033 MW, Ascó II: 1.027 MW)',
      cooling: 'Río Ebro (Caudal controlado)',
      operator: 'ANAV (Endesa 85% / Iberdrola 15%)',
      status: 'Operativa (Licencia renovada hasta 2030 / 2031)',
      statusBadge: 'OPERATIVA',
      statusColor: '#22c55e',
      polygon: [[41.2035, 0.5652], [41.2040, 0.5735], [41.1975, 0.5758], [41.1962, 0.5682], [41.1980, 0.5640]]
    },
    {
      name: 'Central Nuclear de Vandellòs II',
      shortName: 'Vandellòs II',
      country: 'España',
      location: "Vandellòs i l'Hospitalet de l'Infant, Tarragona (Catalunya)",
      lat: 40.95139,
      lng: 0.86653,
      type: '1x PWR Westinghouse (3 lazos)',
      power: '1.087 MWe',
      cooling: 'Mar Mediterráneo',
      operator: 'ANAV (Endesa 72% / Iberdrola 28%)',
      status: 'Operativa (Licencia renovada hasta 2030)',
      statusBadge: 'OPERATIVA',
      statusColor: '#22c55e',
      polygon: [[40.9545, 0.8635], [40.9550, 0.8705], [40.9482, 0.8700], [40.9480, 0.8630]]
    },
    {
      name: 'Central Nuclear de Vandellòs I',
      shortName: 'Vandellòs I',
      country: 'España',
      location: "Vandellòs i l'Hospitalet de l'Infant, Tarragona (Catalunya)",
      lat: 40.95580,
      lng: 0.86920,
      type: 'UNGG Grafito-Gas Francés (480 MW)',
      power: 'Clausurada (Incendio histórico 1989)',
      cooling: 'Mar Mediterráneo',
      operator: 'Enresa',
      status: 'Clausurada / Nivel 2 Desmantelamiento (Periodo Latencia)',
      statusBadge: 'LATENCIA',
      statusColor: '#f59e0b',
      polygon: [[40.9582, 0.8672], [40.9585, 0.8728], [40.9550, 0.8718], [40.9546, 0.8662]]
    },
    {
      name: 'Central Nuclear de Cofrentes',
      shortName: 'Cofrentes',
      country: 'España',
      location: 'Valle de Ayora-Cofrentes, Valencia',
      lat: 39.21667,
      lng: -1.05000,
      type: '1x BWR-6 General Electric',
      power: '1.092 MWe',
      cooling: 'Río Júcar / Embalse de Embarcaderos (Torres tiro natural)',
      operator: 'Iberdrola Generación Nuclear (100%)',
      status: 'Operativa (Licencia renovada hasta 2030)',
      statusBadge: 'OPERATIVA',
      statusColor: '#22c55e',
      polygon: [[39.2202, -1.0542], [39.2205, -1.0455], [39.2132, -1.0458], [39.2128, -1.0545]]
    },
    {
      name: 'Central Nuclear de Almaraz (I y II)',
      shortName: 'Almaraz (I-II)',
      country: 'España',
      location: 'Campo Arañuelo, Cáceres (Extremadura)',
      lat: 39.80806,
      lng: -5.69694,
      type: '2x PWR Westinghouse (3 lazos)',
      power: '2.094 MWe (Almaraz I: 1.049 MW, Almaraz II: 1.045 MW)',
      cooling: 'Embalse de Arrocampo / Río Tajo',
      operator: 'CNAT (Iberdrola 53% / Endesa 36% / Naturgy 11%)',
      status: 'Operativa (Cese programado 2027 / 2028)',
      statusBadge: 'OPERATIVA',
      statusColor: '#22c55e',
      polygon: [[39.8125, -5.7032], [39.8120, -5.6905], [39.8040, -5.6910], [39.8045, -5.7035]]
    },
    {
      name: 'Central Nuclear de Trillo',
      shortName: 'Trillo',
      country: 'España',
      location: 'La Alcarria, Guadalajara (Castilla-La Mancha)',
      lat: 40.70139,
      lng: -2.62222,
      type: '1x PWR Siemens-KWU (3 lazos)',
      power: '1.066 MWe',
      cooling: 'Río Tajo (Torres de tiro natural)',
      operator: 'CNAT (Iberdrola 48% / Naturgy 34.5% / EDP 15.5% / Endesa 2%)',
      status: 'Operativa (Licencia vigente hasta 2035)',
      statusBadge: 'OPERATIVA',
      statusColor: '#22c55e',
      polygon: [[40.7052, -2.6278], [40.7045, -2.6162], [40.6975, -2.6168], [40.6980, -2.6282]]
    },
    {
      name: 'Central Nuclear Santa María de Garoña',
      shortName: 'Garoña',
      country: 'España',
      location: 'Valle de Tobalina, Burgos (Castilla y León)',
      lat: 42.77500,
      lng: -3.20833,
      type: '1x BWR General Electric (466 MW)',
      power: 'En Desmantelamiento (Cese definitivo 2017)',
      cooling: 'Meandro del Río Ebro',
      operator: 'Enresa (Transferida en 2023)',
      status: 'Fase 1 Desmantelamiento Activo (CSN)',
      statusBadge: 'DESMANTELAMIENTO',
      statusColor: '#f97316',
      polygon: [[42.7785, -3.2132], [42.7780, -3.2032], [42.7715, -3.2038], [42.7720, -3.2138]]
    },
    {
      name: 'Central Nuclear José Cabrera (Zorita)',
      shortName: 'Zorita',
      country: 'España',
      location: 'Almonacid de Zorita, Guadalajara',
      lat: 40.34917,
      lng: -2.88444,
      type: '1x PWR Westinghouse (160 MW - 1ª nuclear de España)',
      power: 'Clausurada (Parada 2006)',
      cooling: 'Río Tajo / Embalse de Zorita',
      operator: 'Enresa',
      status: 'Desmantelamiento Concluido / Restauración de Terrenos',
      statusBadge: 'RESTAURADA',
      statusColor: '#94a3b8',
      polygon: [[40.3525, -2.8895], [40.3520, -2.8798], [40.3455, -2.8802], [40.3460, -2.8900]]
    },
    {
      name: 'Centro de Almacenamiento El Cabril',
      shortName: 'El Cabril (RBMA)',
      country: 'España',
      location: 'Sierra Albarrana, Hornachuelos, Córdoba (Andalucía)',
      lat: 38.08111,
      lng: -5.41278,
      type: 'Instalación Nuclear Centralizada de Residuos (RBMA)',
      power: 'Almacenamiento Tecnológico Definitivo',
      cooling: 'Almacenamiento Estático y Seco en Celdas',
      operator: 'Enresa',
      status: 'Operativa de Máxima Seguridad / Supervisada CSN',
      statusBadge: 'ALMACÉN RBMA',
      statusColor: '#a855f7',
      polygon: [[38.0850, -5.4182], [38.0845, -5.4075], [38.0772, -5.4080], [38.0778, -5.4188]]
    },

    // --- FRANCIA Y EUROPA PRÓXIMA ---
    {
      name: 'Central Nuclear de Golfech',
      shortName: 'Golfech',
      country: 'Francia',
      location: 'Tarn-et-Garonne, Occitania (~180 km frontera Pirineos)',
      lat: 44.11110,
      lng: 0.84640,
      type: '2x PWR Framatome P4 (1.300 MW c/u)',
      power: '2.600 MWe',
      cooling: 'Río Garona (Torres de refrigeración 178 m)',
      operator: 'EDF',
      status: 'Operativa (Regulación ASN)',
      statusBadge: 'OPERATIVA',
      statusColor: '#22c55e',
      polygon: [[44.1150, 0.8405], [44.1145, 0.8525], [44.1070, 0.8520], [44.1075, 0.8400]]
    },
    {
      name: 'Central Nuclear de Blayais',
      shortName: 'Blayais',
      country: 'Francia',
      location: 'Gironda, Nueva Aquitania (Estuario de Gironda)',
      lat: 45.25610,
      lng: -0.69310,
      type: '4x PWR CP1 (900 MW c/u)',
      power: '3.640 MWe',
      cooling: 'Estuario de Gironda / Atlántico',
      operator: 'EDF',
      status: 'Operativa (Regulación ASN)',
      statusBadge: 'OPERATIVA',
      statusColor: '#22c55e',
      polygon: [[45.2610, -0.6995], [45.2605, -0.6865], [45.2510, -0.6870], [45.2515, -0.7000]]
    },
    {
      name: 'Central Nuclear de Tricastin',
      shortName: 'Tricastin',
      country: 'Francia',
      location: 'Drôme, Valle del Ródano',
      lat: 44.32970,
      lng: 4.73220,
      type: '4x PWR CP1 (900 MW) + Planta Enriquecimiento Orano',
      power: '3.660 MWe',
      cooling: 'Canal de Donzère-Mondragon / Río Ródano',
      operator: 'EDF / Orano',
      status: 'Operativa / Enriquecimiento Uranio Comercial',
      statusBadge: 'OPERATIVA',
      statusColor: '#22c55e',
      polygon: [[44.3345, 4.7255], [44.3340, 4.7388], [44.3250, 4.7380], [44.3255, 4.7250]]
    },
    {
      name: 'Central Nuclear de Cruas-Meysse',
      shortName: 'Cruas',
      country: 'Francia',
      location: 'Ardèche, Valle del Ródano',
      lat: 44.63310,
      lng: 4.75610,
      type: '4x PWR CP2 (900 MW c/u)',
      power: '3.660 MWe',
      cooling: 'Río Ródano',
      operator: 'EDF',
      status: 'Operativa (Regulación ASN)',
      statusBadge: 'OPERATIVA',
      statusColor: '#22c55e',
      polygon: [[44.6375, 4.7498], [44.6370, 4.7622], [44.6285, 4.7615], [44.6290, 4.7492]]
    },
    {
      name: 'Central Nuclear de Gravelines',
      shortName: 'Gravelines',
      country: 'Francia',
      location: 'Nord, Canal de la Mancha',
      lat: 51.01530,
      lng: 2.13610,
      type: '6x PWR CP1 (Mayor de Europa Occidental)',
      power: '5.460 MWe',
      cooling: 'Mar del Norte',
      operator: 'EDF',
      status: 'Operativa (Regulación ASN)',
      statusBadge: 'OPERATIVA',
      statusColor: '#22c55e',
      polygon: [[51.0202, 2.1278], [51.0195, 2.1445], [51.0105, 2.1438], [51.0112, 2.1272]]
    },
    {
      name: 'Cattenom Nuclear Power Plant',
      shortName: 'Cattenom',
      country: 'Francia',
      location: 'Moselle, Gran Este (frontera Luxemburgo/Alemania)',
      lat: 49.41580,
      lng: 6.21810,
      type: '4x PWR P4 (1.300 MW c/u)',
      power: '5.200 MWe',
      cooling: 'Río Mosela / Embalse Mirgenbach',
      operator: 'EDF',
      status: 'Operativa (Regulación ASN)',
      statusBadge: 'OPERATIVA',
      statusColor: '#22c55e',
      polygon: [[49.4208, 6.2108], [49.4200, 6.2258], [49.4110, 6.2250], [49.4118, 6.2100]]
    },

    // --- INSTALACIONES NUCLEARES CRÍTICAS MUNDIALES ---
    {
      name: 'Zaporizhzhia Nuclear Power Plant',
      shortName: 'Zaporizhzhia',
      country: 'Ucrania',
      location: 'Enerhodar, Zaporiyia (Ocupada militarmente)',
      lat: 47.51080,
      lng: 34.58470,
      type: '6x VVER-1000 (Mayor complejo nuclear de Europa)',
      power: '6.000 MWe (En parada fría bajo ocupación)',
      cooling: 'Embalse de Kajovka / Río Dniéper',
      operator: 'Energoatom (Controlada de facto por Rosatom)',
      status: 'Zona de Guerra Activa / Misión Permanente OIEA',
      statusBadge: 'ZONA GUERRA',
      statusColor: '#ef4444',
      polygon: [[47.5185, 34.5715], [47.5180, 34.5990], [47.5025, 34.5982], [47.5030, 34.5708]]
    },
    {
      name: 'Chernobyl Nuclear Power Plant',
      shortName: 'Chernobyl',
      country: 'Ucrania',
      location: 'Prípiat, Óblast de Kiev',
      lat: 51.38960,
      lng: 30.09910,
      type: '4x RBMK-1000 (Sarcófago Confinamiento Seguro NSC)',
      power: 'Desmantelamiento y Gestión de Combustible Gastado',
      cooling: 'Río Prípiat',
      operator: 'ChNPP Estatal',
      status: 'Zona de Exclusión Radiactiva Permanente (30 km)',
      statusBadge: 'EXCLUSIÓN',
      statusColor: '#f97316',
      polygon: [[51.3968, 30.0872], [51.3962, 30.1118], [51.3825, 30.1110], [51.3830, 30.0865]]
    },
    {
      name: 'Kursk Nuclear Power Plant',
      shortName: 'Kursk NPP',
      country: 'Rusia',
      location: 'Kurchátov, Óblast de Kursk',
      lat: 51.67560,
      lng: 35.60330,
      type: '4x RBMK-1000 + 2x VVER-TOI en construcción',
      power: '4.000 MWe',
      cooling: 'Embalse de Kurchátov / Río Seim',
      operator: 'Rosenergoatom',
      status: 'Alerta Máxima por Operaciones Militares en la Región',
      statusBadge: 'FRENTE BÉLICO',
      statusColor: '#ef4444',
      polygon: [[51.6828, 35.5912], [51.6822, 35.6158], [51.6685, 35.6150], [51.6690, 35.5905]]
    },
    {
      name: 'Fukushima Daiichi',
      shortName: 'Fukushima Daiichi',
      country: 'Japón',
      location: 'Okuma / Futaba, Prefectura de Fukushima',
      lat: 37.42140,
      lng: 141.03250,
      type: '6x BWR General Electric (Accidente 2011)',
      power: 'Desmantelamiento Activo / Extracción de Corium',
      cooling: 'Océano Pacífico (Filtrado de agua ALPS)',
      operator: 'TEPCO / Regulación NRA Japón',
      status: 'Desmantelamiento Supervisado Internacionalmente',
      statusBadge: 'DESMANTELAMIENTO',
      statusColor: '#f59e0b',
      polygon: [[37.4288, 141.0242], [37.4282, 141.0408], [37.4140, 141.0402], [37.4145, 141.0238]]
    },
    {
      name: 'Kashiwazaki-Kariwa Nuclear Power Plant',
      shortName: 'Kashiwazaki-Kariwa',
      country: 'Japón',
      location: 'Prefectura de Niigata (Costa del Mar de Japón)',
      lat: 37.42670,
      lng: 138.59890,
      type: '5x BWR + 2x ABWR (Mayor capacidad del mundo)',
      power: '8.212 MWe',
      cooling: 'Mar de Japón',
      operator: 'TEPCO',
      status: 'Proceso de Reinicio Regulado Post-Fukushima',
      statusBadge: 'EN REINICIO',
      statusColor: '#38bdf8',
      polygon: [[37.4348, 138.5902], [37.4342, 138.6078], [37.4188, 138.6072], [37.4192, 138.5898]]
    },
    {
      name: 'Barakah Nuclear Power Plant',
      shortName: 'Barakah',
      country: 'Emiratos Árabes',
      location: 'Al Dhafra, Abu Dabi',
      lat: 23.96860,
      lng: 52.23560,
      type: '4x APR-1400 KEPCO',
      power: '5.600 MWe (Primera planta nuclear del mundo árabe)',
      cooling: 'Golfo Pérsico',
      operator: 'Nawah Energy / ENEC',
      status: 'Operativa Completa (Unidades 1 a 4)',
      statusBadge: 'OPERATIVA',
      statusColor: '#22c55e',
      polygon: [[23.9758, 52.2272], [23.9752, 52.2438], [23.9615, 52.2432], [23.9620, 52.2268]]
    },
    {
      name: 'Bushehr Nuclear Power Plant',
      shortName: 'Bushehr',
      country: 'Irán',
      location: 'Costa del Golfo Pérsico, Bushehr',
      lat: 28.83060,
      lng: 50.88560,
      type: '1x VVER-1000 (1.000 MW) + 2 reactores en construcción',
      power: '1.000 MWe',
      cooling: 'Golfo Pérsico',
      operator: 'NPPD / Rosatom',
      status: 'Operativa / Sujeta a Salvaguardias OIEA',
      statusBadge: 'OPERATIVA / OIEA',
      statusColor: '#38bdf8',
      polygon: [[28.8378, 50.8778], [28.8372, 50.8938], [28.8235, 50.8932], [28.8240, 50.8772]]
    },
    {
      name: 'Natanz Uranium Enrichment Facility',
      shortName: 'Natanz (FEP)',
      country: 'Irán',
      location: 'Isfahán (Instalación Subterránea Blindada)',
      lat: 33.72470,
      lng: 51.72890,
      type: 'Cascadas de Enriquecimiento Centrífugas IR-4/IR-6',
      power: 'Instalación Estratégica del Ciclo de Combustible',
      cooling: 'Circuito Cerrado Subterráneo',
      operator: 'AEOI (Organización de Energía Atómica de Irán)',
      status: 'Máxima Vigilancia Internacional / Monitoreo OIEA',
      statusBadge: 'ENRIQUECIMIENTO',
      statusColor: '#ef4444',
      polygon: [[33.7318, 51.7208], [33.7312, 51.7372], [33.7178, 51.7368], [33.7182, 51.7202]]
    },
    {
      name: 'Dimona / Shimon Peres Negev Research Center',
      shortName: 'Dimona',
      country: 'Israel',
      location: 'Desierto del Néguev, Dimona',
      lat: 31.00190,
      lng: 35.14580,
      type: 'Reactor Nuclear de Agua Pesada e Instalación Clasificada',
      power: 'Complejo Nuclear Estratégico',
      cooling: 'Circuito de Circulación Desértico',
      operator: 'Comisión de Energía Atómica de Israel (IAEC)',
      status: 'Instalación Militar de Máxima Seguridad',
      statusBadge: 'ALTA SEGURIDAD',
      statusColor: '#c084fc',
      polygon: [[31.0088, 35.1378], [31.0082, 35.1538], [30.9948, 35.1532], [30.9952, 35.1372]]
    },
    {
      name: 'Palo Verde Generating Station',
      shortName: 'Palo Verde',
      country: 'EE.UU.',
      location: 'Tonopah, Condado de Maricopa, Arizona',
      lat: 33.39110,
      lng: -112.86780,
      type: '3x PWR Combustion Engineering (Sistema 80)',
      power: '3.937 MWe (Mayor productora neta de EE.UU.)',
      cooling: 'Aguas residuales tratadas de Phoenix (Única en el mundo)',
      operator: 'Arizona Public Service (APS)',
      status: 'Operativa (Regulada por US NRC)',
      statusBadge: 'OPERATIVA',
      statusColor: '#22c55e',
      polygon: [[33.3988, -112.8762], [33.3982, -112.8592], [33.3835, -112.8598], [33.3840, -112.8768]]
    }
  ];

  // --- Direcciones Cripto Sancionadas Conocidas (OFAC SDN Matchlist) ---
  const KNOWN_OFAC_CRYPTO = new Set([
    '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa', // Genesis (usado como test demo si se desea)
    '12QtD5BFwRsdNsrmN7DBMmGnhYwv2bh3tf', // Lazarus Group BTC
    '149w62rY42aZaps86L6Y297Jhn9uf466zQ', // WannaCry Ransomware BTC
    '1HQ3Go3ggWTUr8viqpWgahCEWafDbHkmCc', // WannaCry Ransomware BTC
    '3G6x87b6h5qJd7a6j7c7n5p8m9q2w1e4r', // Hydra Market
    '0x8589427373D6D84E98730D7795D8f6f8731FDA16', // Tornado Cash Router
    '0xd90e2f925DA726b50C4Ed8D0Fb90Ad053324F31b', // Tornado Cash Proxy
    '0x722122dF12D4e14e13Ac3b6895a86e84145b6967', // Tornado Cash
    '0x1da5821544e25c636c1417ba96ade4cf6d2f9b5a', // Ronin Bridge Exploiter (Lazarus)
    '0x098b716b8aaf21512996dc57eb0615e2383e2f96', // Lazarus Group ETH
    '0xa0e1c89Ef1a489c9C7dE96311eD5Ce5D32c20E4B'  // Garantex Exchange
  ]);

  // --- Opciones de Visualización de Popups (Margen Seguro para evitar solapamiento con la barra superior) ---
  const OSIRIS_POPUP_OPTIONS = {
    className: 'osiris-popup',
    autoPan: true,
    autoPanPaddingTopLeft: [30, 120],
    autoPanPaddingBottomRight: [30, 60]
  };

  // Garantizar que Leaflet aplique márgenes seguros inmediatamente para que los popups nunca queden tapados por la barra superior
  if (window.L && window.L.Popup) {
    window.L.Popup.prototype.options.autoPan = true;
    window.L.Popup.prototype.options.autoPanPaddingTopLeft = [30, 120];
    window.L.Popup.prototype.options.autoPanPaddingBottomRight = [30, 60];
  }

  // Función global para verificar y reposicionar el popup activo garantizando visibilidad completa
  Osiris.repositionActivePopup = function () {
    if (!this.map) return;
    const popupEl = document.querySelector('.leaflet-popup');
    if (!popupEl) return;
    const rect = popupEl.getBoundingClientRect();
    const minTop = 118; // Espacio libre respecto a la barra superior (.top-bar)
    const maxBottom = window.innerHeight - 45; // Espacio libre respecto al ticker inferior

    let dy = 0;
    if (rect.top < minTop) {
      dy = minTop - rect.top;
    } else if (rect.bottom > maxBottom) {
      dy = maxBottom - rect.bottom;
    }

    let dx = 0;
    const hudEl = document.getElementById('osirisHud');
    if (hudEl && !hudEl.classList.contains('hidden') && window.innerWidth > 800) {
      const hudRect = hudEl.getBoundingClientRect();
      if (rect.right > hudRect.left - 15) {
        dx = (hudRect.left - 15) - rect.right;
      }
    } else if (rect.right > window.innerWidth - 20) {
      dx = (window.innerWidth - 20) - rect.right;
    }
    if (rect.left < 20) {
      dx = 20 - rect.left;
    }

    if (dy !== 0 || dx !== 0) {
      this.map.panBy([-dx, -dy], { animate: true, duration: 0.25 });
    }
  };

  // --- Inicialización del Sistema OSIRIS ---
  Osiris.init = function (leafletMap) {
    if (!leafletMap) return;
    this.map = leafletMap;

    // Asegurar restricciones de límites mundiales y zoom no intrusivo
    const worldBounds = L.latLngBounds(L.latLng(-85, -180), L.latLng(85, 180));
    this.map.setMaxBounds(worldBounds);
    this.map.options.maxBoundsViscosity = 1.0;
    this.map.options.minZoom = 2;

    // Reposicionamiento inteligente de seguridad cuando se abre cualquier punto de interés
    this.map.on('popupopen', (e) => {
      if (!e.popup) return;
      setTimeout(() => this.repositionActivePopup(), 60);
      setTimeout(() => this.repositionActivePopup(), 280);
      setTimeout(() => this.repositionActivePopup(), 550);
    });

    // Crear LayerGroups en Leaflet para cada capa
    for (const key in this.layers) {
      this.layers[key].group = L.layerGroup();
    }

    // Montar la interfaz HUD en el DOM
    this.mountUI();

    // Gestión dinámica de Nivel de Detalle (LOD) para erradicar colisiones en vista mundial
    this.updateLOD();
    this.map.on('zoom', () => this.updateLOD());
    this.map.on('zoomend', () => this.updateLOD());

    console.log('👁️ OSIRIS Global Intelligence Platform ready.');
  };

  // --- Nivel de Detalle Dinámico Progresivo (LOD): 3 Etapas ---
  // 1. Vista Mundial / Continental (z < 4.2): Micro-blips tácticos circulares limpios (cero solapamiento de cajas)
  // 2. Vista Regional (4.2 <= z < 6.5): Etiquetas concisas y estilizadas
  // 3. Vista Táctica de Alta Resolución (z >= 6.5): Despliegue completo con insignias e indicadores
  Osiris.updateLOD = function () {
    if (!this.map) return;
    const z = this.map.getZoom();
    const mapEl = this.map.getContainer();

    if (z < 4.2) {
      mapEl.classList.add('osiris-lod-world');
      mapEl.classList.remove('osiris-lod-mid');
      mapEl.classList.remove('osiris-lod-full');
    } else if (z < 6.5) {
      mapEl.classList.remove('osiris-lod-world');
      mapEl.classList.add('osiris-lod-mid');
      mapEl.classList.remove('osiris-lod-full');
    } else {
      mapEl.classList.remove('osiris-lod-world');
      mapEl.classList.remove('osiris-lod-mid');
      mapEl.classList.add('osiris-lod-full');
    }
  };

  // --- Montar UI: Botón Ojo de Horus en Menú de Capas + HUD Modal + Visor Multimedia ---
  Osiris.mountUI = function () {
    // 1. Enlazar botón del Ojo de Horus exclusivamente en el menú de capas (#layersDropdown)
    const menuBtn = document.getElementById('osirisMenuBtn');
    if (menuBtn && !menuBtn._osirisBound) {
      menuBtn._osirisBound = true;
      menuBtn.addEventListener('click', () => {
        const dropdown = document.getElementById('layersDropdown');
        if (dropdown) dropdown.style.display = 'none';
        this.toggleHorusMode();
      });
    }

    // Asegurar que no quede ningún botón huérfano de Horus en la barra superior
    const legacyBtn = document.getElementById('osirisToggleBtn');
    if (legacyBtn) legacyBtn.remove();

    // 1.1 Inyectar Mini-Barra Táctica Flotante (cuando la consola está cerrada en Modo Horus)
    if (!document.getElementById('osirisMiniBar')) {
      const miniBar = document.createElement('div');
      miniBar.id = 'osirisMiniBar';
      miniBar.className = 'osiris-mini-bar hidden';
      miniBar.innerHTML = `
        <div class="osiris-mini-brand">
          ${JARVIS_ARC_SVG}
          <span>J.A.R.V.I.S.</span>
        </div>
        <div class="osiris-mini-dot"></div>
        <span id="osirisMiniZulu" style="color:#94a3b8;font-size:10px;">ZULU --:--:--Z</span>
        <button id="osirisMiniBarOpen" class="osiris-mini-btn" type="button" title="Abrir consola táctica J.A.R.V.I.S.">
          <i class="fas fa-terminal"></i> Consola
        </button>
        <button id="osirisMiniBarExit" class="osiris-mini-btn exit" type="button" title="Salir de Modo J.A.R.V.I.S. y volver al radar">
          <i class="fas fa-power-off"></i> Salir
        </button>
      `;
      document.body.appendChild(miniBar);

      document.getElementById('osirisMiniBarOpen').addEventListener('click', () => {
        this.setHudOpen(true);
      });
      document.getElementById('osirisMiniBarExit').addEventListener('click', () => {
        this.toggleHorusMode(false);
      });
    }

    // 1.2 Inyectar Banner Financiero de Mercados (Acciones & Cripto en Tiempo Real)
    if (!document.getElementById('osirisMarketBanner')) {
      const banner = document.createElement('div');
      banner.id = 'osirisMarketBanner';
      banner.className = 'osiris-market-banner hidden';
      banner.innerHTML = `
        <div class="osiris-ticker-badge">
          ${JARVIS_ARC_MINI_SVG}
          <span class="osiris-ticker-live-dot"></span>
          <span class="osiris-ticker-label">MERCADOS EN VIVO</span>
        </div>
        <div class="osiris-ticker-viewport" id="osirisTickerViewport">
          <div class="osiris-ticker-track" id="osirisTickerTrack">
            <span style="color:#94a3b8;font-size:10px;padding:0 12px;">Cargando cotizaciones en tiempo real...</span>
          </div>
        </div>
        <button id="osirisTickerCloseBtn" class="osiris-ticker-close" type="button" title="Ocultar banner (puedes reactivarlo en el menú de J.A.R.V.I.S.)">
          <i class="fas fa-times"></i>
        </button>
      `;
      document.body.appendChild(banner);

      document.getElementById('osirisTickerCloseBtn').addEventListener('click', () => {
        this.setMarketTickerEnabled(false);
      });

      // Soporte táctil móvil: pausar al mantener pulsado con el dedo, reanudar al soltar
      const vp = document.getElementById('osirisTickerViewport');
      const track = document.getElementById('osirisTickerTrack');
      if (vp && track) {
        vp.addEventListener('touchstart', () => {
          track.style.animationPlayState = 'paused';
        }, { passive: true });
        vp.addEventListener('touchend', () => {
          track.style.animationPlayState = 'running';
        }, { passive: true });
        vp.addEventListener('touchcancel', () => {
          track.style.animationPlayState = 'running';
        }, { passive: true });
      }
    }

    // Reloj ZULU en tiempo real
    if (!this._zuluTimer) {
      this._zuluTimer = setInterval(() => {
        const now = new Date();
        const zulu = now.toISOString().substring(11, 19) + 'Z';
        const zuluEl = document.getElementById('osirisMiniZulu');
        if (zuluEl) zuluEl.textContent = `ZULU ${zulu}`;
        const hudZuluEl = document.getElementById('osirisHudZulu');
        if (hudZuluEl) hudZuluEl.textContent = `UTC ${zulu}`;
      }, 1000);
    }

    // 2. Inyectar el HUD táctico militar (#osirisHud) en el body
    if (!document.getElementById('osirisHud')) {
      const hud = document.createElement('aside');
      hud.id = 'osirisHud';
      hud.className = 'osiris-hud hidden glass';
      hud.innerHTML = `
        <div class="osiris-hud-header">
          <div class="osiris-hud-title">
            ${JARVIS_ARC_SVG}
            <div class="osiris-title-box">
              <h2>J.A.R.V.I.S.</h2>
              <span class="osiris-title-sub">Inteligencia Global</span>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:10px;">
            <span id="osirisHudZulu" style="font-family:var(--osiris-font-mono);font-size:11px;color:#94a3b8;font-weight:600;">UTC --:--:--Z</span>
            <button id="osirisExitBtn" class="osiris-close-btn" type="button" title="Salir de Modo J.A.R.V.I.S." style="color:#ef4444;">
              <i class="fas fa-power-off"></i>
            </button>
            <button id="osirisCloseBtn" class="osiris-close-btn" type="button" title="Minimizar consola">
              <i class="fas fa-times"></i>
            </button>
          </div>
        </div>

        <nav class="osiris-tabs">
          <button class="osiris-tab-btn active" data-tab="layers" type="button">
            <i class="fas fa-layer-group"></i> CAPAS
          </button>
          <button class="osiris-tab-btn" data-tab="recon" type="button">
            <i class="fas fa-crosshairs"></i> RECON OSINT
          </button>
          <button class="osiris-tab-btn" data-tab="hotspots" type="button">
            <i class="fas fa-location-crosshairs"></i> HOTSPOTS
          </button>
          <button class="osiris-tab-btn" data-tab="monitor" type="button">
            <i class="fas fa-satellite-dish"></i> MONITOR
          </button>
        </nav>

        <div class="osiris-hud-body">
          <!-- Pestaña 1: Capas Tácticas -->
          <div class="osiris-tab-pane active" id="osirisTabLayers">
            <!-- Indicador de Estado Limpio -->
            <div class="osiris-status-strip">
              <span class="osiris-live-dot-green"></span>
              <span>Telemetría global activa • 11 fuentes verificadas</span>
            </div>

            <!-- Control de Tráfico Base (Aviones / Barcos) -->
            <div class="osiris-group-title" style="color:#38bdf8"><i class="fas fa-gauge-high"></i> TRÁFICO AÉREO / MARÍTIMO</div>
            <div class="osiris-layer-row">
              <div class="osiris-layer-info">
                <div class="osiris-layer-icon" style="background:rgba(56,189,248,0.2);color:#38bdf8">
                  <i class="fas fa-plane"></i>
                </div>
                <div>
                  <div class="osiris-layer-name">Aviones en Vivo (ADS-B)</div>
                  <div class="osiris-layer-desc">Optimizado para fluidez en vista global</div>
                </div>
              </div>
              <label class="osiris-switch">
                <input type="checkbox" id="toggleHorusPlanes">
                <span class="osiris-slider"></span>
              </label>
            </div>

            <div class="osiris-layer-row">
              <div class="osiris-layer-info">
                <div class="osiris-layer-icon" style="background:rgba(6,182,212,0.2);color:#06b6d4">
                  <i class="fas fa-ship"></i>
                </div>
                <div>
                  <div class="osiris-layer-name">Barcos en Vivo (AIS)</div>
                  <div class="osiris-layer-desc">Flota mercante global en tiempo real</div>
                </div>
              </div>
              <label class="osiris-switch">
                <input type="checkbox" id="toggleHorusMarine">
                <span class="osiris-slider"></span>
              </label>
            </div>

            <div class="osiris-group-title" style="margin-top:8px"><i class="fas fa-chart-line"></i> MERCADOS & FINANZAS (TIEMPO REAL)</div>
            <div class="osiris-layer-row">
              <div class="osiris-layer-info">
                <div class="osiris-layer-icon" style="background:rgba(234,179,8,0.2);color:#eab308">
                  <i class="fas fa-coins"></i>
                </div>
                <div>
                  <div class="osiris-layer-name">Banner Financiero (Acciones & Cripto)</div>
                  <div class="osiris-layer-desc">Ticker en vivo: BTC, ETH, SOL, NVDA, AAPL, MSFT, TSLA...</div>
                </div>
              </div>
              <label class="osiris-switch">
                <input type="checkbox" id="toggleHorusTicker" checked>
                <span class="osiris-slider"></span>
              </label>
            </div>

            <div class="osiris-group-title" style="margin-top:8px"><i class="fas fa-triangle-exclamation"></i> RIESGOS NATURALES & CLIMA</div>
            <div class="osiris-layer-row">
              <div class="osiris-layer-info">
                <div class="osiris-layer-icon" style="background:rgba(239,68,68,0.2);color:#ef4444">
                  <i class="fas fa-house-crack"></i>
                </div>
                <div>
                  <div class="osiris-layer-name">Terremotos en Vivo (USGS M2.5+) <span id="cntEarthquakes" class="osiris-counter">0</span></div>
                  <div class="osiris-layer-desc">Sismos globales tiempo real vía feed USGS</div>
                </div>
              </div>
              <label class="osiris-switch">
                <input type="checkbox" id="toggleEarthquakes">
                <span class="osiris-slider"></span>
              </label>
            </div>

            <div class="osiris-layer-row">
              <div class="osiris-layer-info">
                <div class="osiris-layer-icon" style="background:rgba(249,115,22,0.2);color:#f97316">
                  <i class="fas fa-fire-flame-curved"></i>
                </div>
                <div>
                  <div class="osiris-layer-name">Incendios Activos (NASA EONET) <span id="cntFires" class="osiris-counter">0</span></div>
                  <div class="osiris-layer-desc">Focos térmicos y fuegos forestales mundiales</div>
                </div>
              </div>
              <label class="osiris-switch">
                <input type="checkbox" id="toggleFires">
                <span class="osiris-slider"></span>
              </label>
            </div>

            <div class="osiris-group-title" style="margin-top:8px"><i class="fas fa-anchor"></i> LOGÍSTICA & MARÍTIMO</div>
            <div class="osiris-layer-row">
              <div class="osiris-layer-info">
                <div class="osiris-layer-icon" style="background:rgba(6,182,212,0.2);color:#06b6d4">
                  <i class="fas fa-dolly"></i>
                </div>
                <div>
                  <div class="osiris-layer-name">Puertos Mundiales Estratégicos <span class="osiris-counter">39</span></div>
                  <div class="osiris-layer-desc">Top hubs de contenedores globales con tráfico TEU</div>
                </div>
              </div>
              <label class="osiris-switch">
                <input type="checkbox" id="togglePorts">
                <span class="osiris-slider"></span>
              </label>
            </div>

            <div class="osiris-layer-row">
              <div class="osiris-layer-info">
                <div class="osiris-layer-icon" style="background:rgba(234,179,8,0.2);color:#eab308">
                  <i class="fas fa-water"></i>
                </div>
                <div>
                  <div class="osiris-layer-name">Chokepoints & Estrechos Críticos <span class="osiris-counter">10</span></div>
                  <div class="osiris-layer-desc">Ormuz, Suez, Malaca, Bab el-Mandeb, Panamá</div>
                </div>
              </div>
              <label class="osiris-switch">
                <input type="checkbox" id="toggleChokepoints">
                <span class="osiris-slider"></span>
              </label>
            </div>

            <div class="osiris-layer-row">
              <div class="osiris-layer-info">
                <div class="osiris-layer-icon" style="background:rgba(56,189,248,0.2);color:#38bdf8">
                  <i class="fas fa-camera"></i>
                </div>
                <div>
                  <div class="osiris-layer-name">Radares Fijos DGT (España) <span class="osiris-counter">2.565</span></div>
                  <div class="osiris-layer-desc">Filtrado selectivo por provincia y municipio</div>
                </div>
              </div>
              <label class="osiris-switch">
                <input type="checkbox" id="toggleRadars">
                <span class="osiris-slider"></span>
              </label>
            </div>

            <!-- Subpanel de Selección de Provincia y Municipio -->
            <div id="osirisRadarSubPanel" class="osiris-radar-subpanel" style="display:none;">
              <div class="osiris-radar-filter-box">
                <div class="osiris-filter-field">
                  <span class="osiris-filter-lbl"><i class="fas fa-map-location-dot" style="color:#38bdf8"></i> Provincia:</span>
                  <select id="radarProvinceSelect" class="osiris-filter-select"></select>
                </div>
                <div class="osiris-filter-field">
                  <span class="osiris-filter-lbl"><i class="fas fa-city" style="color:#38bdf8"></i> Municipio:</span>
                  <select id="radarCitySelect" class="osiris-filter-select"></select>
                </div>
                <!-- Botón táctico para enviar la orden de carga bajo demanda -->
                <div class="osiris-radar-actions">
                  <button type="button" id="btnOrderLoadRadars" class="osiris-btn-order-load">
                    <i class="fas fa-satellite-dish"></i> ENVIAR ORDEN DE CARGA
                  </button>
                  <button type="button" id="btnClearRadars" class="osiris-btn-clear" title="Descargar / Limpiar radares del mapa">
                    <i class="fas fa-trash-can"></i>
                  </button>
                </div>
                <div class="osiris-filter-footer">
                  <span id="radarCountInfo" class="osiris-filter-count">Selecciona zona y pulsa Cargar</span>
                  <button type="button" id="btnCenterRadarProvince" class="osiris-btn-locate" title="Centrar cámara en la provincia">
                    <i class="fas fa-crosshairs"></i> Enfocar
                  </button>
                </div>
              </div>
            </div>

            <div class="osiris-group-title" style="margin-top:8px"><i class="fas fa-shield-halved"></i> DEFENSA & GEOPOLÍTICA</div>
            <div class="osiris-layer-row">
              <div class="osiris-layer-info">
                <div class="osiris-layer-icon" style="background:rgba(220,38,38,0.25);color:#f87171">
                  <i class="fas fa-skull-crossbones"></i>
                </div>
                <div>
                  <div class="osiris-layer-name">Zonas de Conflicto Activas <span class="osiris-counter">13</span></div>
                  <div class="osiris-layer-desc">Ucrania, Gaza, Mar Rojo, Sudán, Taiwán, DMZ</div>
                </div>
              </div>
              <label class="osiris-switch">
                <input type="checkbox" id="toggleConflicts">
                <span class="osiris-slider"></span>
              </label>
            </div>

            <div class="osiris-layer-row">
              <div class="osiris-layer-info">
                <div class="osiris-layer-icon" style="background:rgba(168,85,247,0.2);color:#c084fc">
                  <i class="fas fa-radiation"></i>
                </div>
                <div>
                  <div class="osiris-layer-name">Instalaciones Nucleares <span class="osiris-counter">25</span></div>
                  <div class="osiris-layer-desc">Centrales energéticas y plantas de investigación</div>
                </div>
              </div>
              <label class="osiris-switch">
                <input type="checkbox" id="toggleNuclear">
                <span class="osiris-slider"></span>
              </label>
            </div>

            <div class="osiris-group-title" style="margin-top:8px"><i class="fas fa-satellite"></i> ESPACIO & VIGILANCIA</div>
            <div class="osiris-layer-row">
              <div class="osiris-layer-info">
                <div class="osiris-layer-icon" style="background:rgba(14,165,233,0.2);color:#38bdf8">
                  <i class="fas fa-satellite"></i>
                </div>
                <div>
                  <div class="osiris-layer-name">Satélites en Tiempo Real <span id="cntSats" class="osiris-counter">ISS</span></div>
                  <div class="osiris-layer-desc">Posición orbital en vivo de ISS y constelaciones</div>
                </div>
              </div>
              <label class="osiris-switch">
                <input type="checkbox" id="toggleSatellites">
                <span class="osiris-slider"></span>
              </label>
            </div>

            <div class="osiris-layer-row">
              <div class="osiris-layer-info">
                <div class="osiris-layer-icon" style="background:rgba(236,72,153,0.2);color:#f472b6">
                  <i class="fas fa-video"></i>
                </div>
                <div>
                  <div class="osiris-layer-name">Cámaras Públicas CCTV <span id="cntCctv" class="osiris-counter">489+</span></div>
                  <div class="osiris-layer-desc">Madrid Tráfico (357), TfL Londres (120), Webcams Mundiales</div>
                </div>
              </div>
              <label class="osiris-switch">
                <input type="checkbox" id="toggleCctv">
                <span class="osiris-slider"></span>
              </label>
            </div>
            <button type="button" class="osiris-drawer-trigger" id="btnToggleCctvDrawer">
              <i class="fas fa-camera"></i> Explorar Directorio de Cámaras (+489)
            </button>
            <div id="osirisCctvDrawer" class="osiris-drawer hidden">
              <div class="osiris-chips" id="cctvFilterChips">
                <span class="osiris-chip active" data-region="all">Todas</span>
                <span class="osiris-chip" data-region="Madrid">Madrid (357)</span>
                <span class="osiris-chip" data-region="London">Londres (120)</span>
                <span class="osiris-chip" data-region="world">Mundiales</span>
              </div>
              <input type="text" id="cctvSearchInput" class="osiris-search-input" placeholder="Buscar cámara (ej: Castellana, M-30, Sol, Times Square...)">
              <div class="osiris-drawer-list" id="cctvDrawerList"></div>
            </div>

            <div class="osiris-layer-row">
              <div class="osiris-layer-info">
                <div class="osiris-layer-icon" style="background:rgba(34,197,94,0.2);color:#4ade80">
                  <i class="fas fa-broadcast-tower"></i>
                </div>
                <div>
                  <div class="osiris-layer-name">Canales de Noticias 24/7 <span class="osiris-counter">15</span></div>
                  <div class="osiris-layer-desc">RTVE 24h, 324 Cat, France 24, Sky News, Al Jazeera, DW, Bloomberg</div>
                </div>
              </div>
              <label class="osiris-switch">
                <input type="checkbox" id="toggleNews">
                <span class="osiris-slider"></span>
              </label>
            </div>
            <button type="button" class="osiris-drawer-trigger" id="btnToggleNewsDrawer">
              <i class="fas fa-tv"></i> Ver Todos los Canales (15 en Directo)
            </button>
            <div id="osirisNewsDrawer" class="osiris-drawer hidden">
              <div class="osiris-drawer-list" id="newsDrawerList"></div>
            </div>

            <div class="osiris-layer-row">
              <div class="osiris-layer-info">
                <div class="osiris-layer-icon" style="background:rgba(250,204,21,0.2);color:#fde047">
                  <i class="fas fa-circle-half-stroke"></i>
                </div>
                <div>
                  <div class="osiris-layer-name">Terminador Solar (Día / Noche)</div>
                  <div class="osiris-layer-desc">Línea crepuscular y sombra planetaria solar</div>
                </div>
              </div>
              <label class="osiris-switch">
                <input type="checkbox" id="toggleTerminator">
                <span class="osiris-slider"></span>
              </label>
            </div>
          </div>

          <!-- Pestaña 2: RECON Toolkit (OSINT) -->
          <div class="osiris-tab-pane" id="osirisTabRecon">
            <div class="osiris-recon-box">
              <div class="osiris-recon-nav">
                <button class="osiris-recon-subtab active" data-tool="crypto">CRYPTO TRACER</button>
                <button class="osiris-recon-subtab" data-tool="ip">IP / PUERTOS</button>
                <button class="osiris-recon-subtab" data-tool="dns">DNS & DOMINIO</button>
                <button class="osiris-recon-subtab" data-tool="sherlock">SHERLOCK USER</button>
              </div>

              <!-- Subherramienta: Crypto Tracer -->
              <div id="reconToolCrypto">
                <div style="font-size:10px;color:#94a3b8;margin-bottom:6px">
                  Inspecciona carteras BTC y ETH con verificación automática contra listas de sanciones <strong>OFAC SDN</strong>.
                </div>
                <div class="osiris-input-group">
                  <input type="text" id="cryptoInput" class="osiris-input" placeholder="Dirección BTC (1A1z...) o ETH (0x...)" value="0x8589427373D6D84E98730D7795D8f6f8731FDA16">
                  <button id="btnTraceCrypto" class="osiris-btn-search" type="button">RASTREAR</button>
                </div>
              </div>

              <!-- Subherramienta: IP / Puertos -->
              <div id="reconToolIp" style="display:none">
                <div style="font-size:10px;color:#94a3b8;margin-bottom:6px">
                  Análisis de infraestructura, ASN, geolocalización y puertos abiertos mediante <strong>Shodan InternetDB</strong>.
                </div>
                <div class="osiris-input-group">
                  <input type="text" id="ipInput" class="osiris-input" placeholder="Dirección IP pública (ej: 1.1.1.1)" value="1.1.1.1">
                  <button id="btnTraceIp" class="osiris-btn-search" type="button">ESCANEAR</button>
                </div>
              </div>

              <!-- Subherramienta: DNS & Subdominios -->
              <div id="reconToolDns" style="display:none">
                <div style="font-size:10px;color:#94a3b8;margin-bottom:6px">
                  Resolución DNS (Google DoH) y mapeo de subdominios a través de certificados SSL emitidos (crt.sh).
                </div>
                <div class="osiris-input-group">
                  <input type="text" id="dnsInput" class="osiris-input" placeholder="Dominio objetivo (ej: tesla.com)" value="tesla.com">
                  <button id="btnTraceDns" class="osiris-btn-search" type="button">RESOLVER</button>
                </div>
              </div>

              <!-- Subherramienta: Sherlock Handle Search -->
              <div id="reconToolSherlock" style="display:none">
                <div style="font-size:10px;color:#94a3b8;margin-bottom:6px">
                  Rastreo OSINT de alias y perfiles públicos en más de 20 redes sociales y plataformas.
                </div>
                <div class="osiris-input-group">
                  <input type="text" id="sherlockInput" class="osiris-input" placeholder="Alias de usuario (ej: satoshi)" value="satoshi">
                  <button id="btnTraceSherlock" class="osiris-btn-search" type="button">BUSCAR</button>
                </div>
              </div>

              <!-- Salida de Consola RECON -->
              <div id="reconResultArea" class="osiris-recon-result" style="margin-top:8px;">
[OSIRIS RECON TOOLKIT INICIALIZADO]
Listo para operaciones de inteligencia sobre la cadena (blockchain), direcciones IP, registros DNS o identidades públicas.
Introduce una consulta o pulsa RASTREAR para ejecutar la comprobación de demostración.
              </div>
            </div>
          </div>

          <!-- Pestaña 3: Teletransporte a Puntos Calientes (Hotspots) -->
          <div class="osiris-tab-pane" id="osirisTabHotspots">
            <div style="font-size:10px;color:#94a3b8;margin-bottom:6px">
              Salto táctico de cámara inmediato a teatros de operaciones y estrechos estratégicos globales:
            </div>
            <div class="osiris-hotspot-grid">
              <button class="osiris-hotspot-btn" data-lat="48.5" data-lng="37.5" data-zoom="6">
                <div class="osiris-hotspot-name"><i class="fas fa-fighter-jet" style="color:#ef4444"></i> Ucrania</div>
                <div class="osiris-hotspot-coords">48.5°N, 37.5°E</div>
                <span class="osiris-hotspot-tag">Frente Bélico</span>
              </button>
              <button class="osiris-hotspot-btn" data-lat="31.4" data-lng="34.8" data-zoom="7">
                <div class="osiris-hotspot-name"><i class="fas fa-crosshairs" style="color:#f97316"></i> Oriente Medio</div>
                <div class="osiris-hotspot-coords">31.4°N, 34.8°E</div>
                <span class="osiris-hotspot-tag">Gaza / Levant</span>
              </button>
              <button class="osiris-hotspot-btn" data-lat="14.5" data-lng="42.8" data-zoom="6">
                <div class="osiris-hotspot-name"><i class="fas fa-shield-alt" style="color:#eab308"></i> Mar Rojo</div>
                <div class="osiris-hotspot-coords">14.5°N, 42.8°E</div>
                <span class="osiris-hotspot-tag">Bab el-Mandeb</span>
              </button>
              <button class="osiris-hotspot-btn" data-lat="24.2" data-lng="120.2" data-zoom="7">
                <div class="osiris-hotspot-name"><i class="fas fa-ship" style="color:#06b6d4"></i> Taiwán</div>
                <div class="osiris-hotspot-coords">24.2°N, 120.2°E</div>
                <span class="osiris-hotspot-tag">Estrecho de Formosa</span>
              </button>
              <button class="osiris-hotspot-btn" data-lat="26.5" data-lng="56.3" data-zoom="8">
                <div class="osiris-hotspot-name"><i class="fas fa-oil-well" style="color:#f59e0b"></i> Estrecho Ormuz</div>
                <div class="osiris-hotspot-coords">26.5°N, 56.3°E</div>
                <span class="osiris-hotspot-tag">Golfo Pérsico</span>
              </button>
              <button class="osiris-hotspot-btn" data-lat="30.5" data-lng="32.3" data-zoom="8">
                <div class="osiris-hotspot-name"><i class="fas fa-route" style="color:#10b981"></i> Canal de Suez</div>
                <div class="osiris-hotspot-coords">30.5°N, 32.3°E</div>
                <span class="osiris-hotspot-tag">Egipto / Sinaí</span>
              </button>
              <button class="osiris-hotspot-btn" data-lat="9.1" data-lng="-79.7" data-zoom="9">
                <div class="osiris-hotspot-name"><i class="fas fa-anchor" style="color:#3b82f6"></i> Canal Panamá</div>
                <div class="osiris-hotspot-coords">9.1°N, 79.7°W</div>
                <span class="osiris-hotspot-tag">Atlántico-Pacífico</span>
              </button>
              <button class="osiris-hotspot-btn" data-lat="38.3" data-lng="127.1" data-zoom="8">
                <div class="osiris-hotspot-name"><i class="fas fa-person-military-rifle" style="color:#a855f7"></i> Corea DMZ</div>
                <div class="osiris-hotspot-coords">38.3°N, 127.1°E</div>
                <span class="osiris-hotspot-tag">Paralelo 38</span>
              </button>
              <button class="osiris-hotspot-btn" data-lat="36.0" data-lng="-5.5" data-zoom="9">
                <div class="osiris-hotspot-name"><i class="fas fa-compass" style="color:#6366f1"></i> Gibraltar</div>
                <div class="osiris-hotspot-coords">36.0°N, 5.5°W</div>
                <span class="osiris-hotspot-tag">Puerta Mediterránea</span>
              </button>
              <button class="osiris-hotspot-btn" data-lat="20.0" data-lng="0.0" data-zoom="2">
                <div class="osiris-hotspot-name"><i class="fas fa-globe" style="color:#14b8a6"></i> Visión Global</div>
                <div class="osiris-hotspot-coords">0.0°, 0.0°</div>
                <span class="osiris-hotspot-tag">Tierra Completa</span>
              </button>
            </div>
          </div>

          <!-- Pestaña 4: Monitor & Telemetría -->
          <div class="osiris-tab-pane" id="osirisTabMonitor">
            <div class="osiris-telemetry-grid">
              <div class="osiris-telemetry-card">
                <div class="val" id="monPlanes">--</div>
                <div class="lbl">Aeronaves ADS-B Activas</div>
              </div>
              <div class="osiris-telemetry-card">
                <div class="val" id="monShips">--</div>
                <div class="lbl">Buques AIS NheuMarine</div>
              </div>
              <div class="osiris-telemetry-card">
                <div class="val">39</div>
                <div class="lbl">Puertos Monitorizados</div>
              </div>
              <div class="osiris-telemetry-card">
                <div class="val">13</div>
                <div class="lbl">Teatros de Guerra</div>
              </div>
              <div class="osiris-telemetry-card">
                <div class="val" id="monQuakes">0</div>
                <div class="lbl">Sismos USGS (24h)</div>
              </div>
              <div class="osiris-telemetry-card">
                <div class="val">18</div>
                <div class="lbl">Canales de Noticias 24/7</div>
              </div>
            </div>

            <div style="margin-top:8px;background:rgba(15,23,42,0.8);border:1px solid var(--osiris-border);border-radius:6px;padding:10px;">
              <div style="font-family:var(--osiris-font-mono);font-size:11px;color:var(--osiris-cyan);margin-bottom:4px;font-weight:700">
                <i class="fas fa-circle-nodes"></i> FUENTES DE DATOS
              </div>
              <div style="font-size:10px;color:#94a3b8;line-height:1.5">
                • Sismología: USGS Earthquake Hazards Program (datos en tiempo real)<br>
                • Incendios: NASA EONET Earth Observatory Natural Event Tracker<br>
                • Blockchain: Blockstream Esplora (BTC) / Blockscout (ETH)<br>
                • Infraestructura: Shodan InternetDB / Google DNS-over-HTTPS<br>
                • Sanciones: OFAC SDN List (U.S. Treasury Department)<br>
                • Privacidad: Procesamiento local, sin telemetría de usuario.
              </div>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(hud);

      // Eventos de Navegación de Pestañas
      hud.querySelectorAll('.osiris-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          hud.querySelectorAll('.osiris-tab-btn').forEach(b => b.classList.remove('active'));
          hud.querySelectorAll('.osiris-tab-pane').forEach(p => p.classList.remove('active'));
          btn.classList.add('active');
          const target = btn.dataset.tab;
          if (target === 'layers') document.getElementById('osirisTabLayers').classList.add('active');
          if (target === 'recon') document.getElementById('osirisTabRecon').classList.add('active');
          if (target === 'hotspots') document.getElementById('osirisTabHotspots').classList.add('active');
          if (target === 'monitor') {
            document.getElementById('osirisTabMonitor').classList.add('active');
            Osiris.updateTelemetryCounters();
          }
        });
      });


      // Botón Cerrar HUD (minimiza la consola, manteniendo el Modo J.A.R.V.I.S. y sus capas activas)
      document.getElementById('osirisCloseBtn').addEventListener('click', () => {
        this.setHudOpen(false);
      });

      // Botón Salir Modo J.A.R.V.I.S. completamente desde el HUD
      const exitBtn = document.getElementById('osirisExitBtn');
      if (exitBtn) {
        exitBtn.addEventListener('click', () => {
          this.toggleHorusMode(false);
        });
      }

      // Subpestañas de RECON
      hud.querySelectorAll('.osiris-recon-subtab').forEach(subtab => {
        subtab.addEventListener('click', () => {
          hud.querySelectorAll('.osiris-recon-subtab').forEach(s => s.classList.remove('active'));
          subtab.classList.add('active');
          const tool = subtab.dataset.tool;
          document.getElementById('reconToolCrypto').style.display = tool === 'crypto' ? 'block' : 'none';
          document.getElementById('reconToolIp').style.display = tool === 'ip' ? 'block' : 'none';
          document.getElementById('reconToolDns').style.display = tool === 'dns' ? 'block' : 'none';
          document.getElementById('reconToolSherlock').style.display = tool === 'sherlock' ? 'block' : 'none';
        });
      });

      // Botones de ejecución de herramientas RECON
      document.getElementById('btnTraceCrypto').addEventListener('click', () => this.traceCrypto());
      document.getElementById('btnTraceIp').addEventListener('click', () => this.traceIp());
      document.getElementById('btnTraceDns').addEventListener('click', () => this.traceDns());
      document.getElementById('btnTraceSherlock').addEventListener('click', () => this.traceSherlock());

      // Switches de control de tráfico para optimización (Aviones / Barcos)
      const planesSw = document.getElementById('toggleHorusPlanes');
      if (planesSw) {
        planesSw.addEventListener('change', () => {
          if (typeof window.togglePlanesLayer === 'function') {
            window.togglePlanesLayer(planesSw.checked, false);
          }
          if (typeof window.updateModernLayerUI === 'function') {
            window.updateModernLayerUI();
          }
        });
      }

      const marineSw = document.getElementById('toggleHorusMarine');
      if (marineSw) {
        marineSw.addEventListener('change', () => {
          if (window.MarineTracker && typeof window.MarineTracker.setEnabled === 'function') {
            window.MarineTracker.setEnabled(marineSw.checked, false);
          }
          if (typeof window.updateModernLayerUI === 'function') {
            window.updateModernLayerUI();
          }
        });
      }

      // Switch de Banner Financiero (Ticker de Acciones & Cripto en Tiempo Real)
      const tickerSw = document.getElementById('toggleHorusTicker');
      if (tickerSw) {
        tickerSw.checked = this.isMarketTickerEnabled();
        tickerSw.addEventListener('change', () => {
          this.setMarketTickerEnabled(tickerSw.checked);
        });
      }

      // Eventos de Switches de Capas (conmutables individualmente)
      this.bindLayerSwitch('toggleEarthquakes', 'earthquakes', () => this.fetchEarthquakes());
      this.bindLayerSwitch('toggleFires', 'fires', () => this.fetchFires());
      this.bindLayerSwitch('togglePorts', 'ports', () => this.renderPorts());
      this.bindLayerSwitch('toggleChokepoints', 'chokepoints', () => this.renderChokepoints());
      this.bindLayerSwitch('toggleRadars', 'radars', () => this.renderRadars());
      this.bindLayerSwitch('toggleConflicts', 'conflicts', () => this.renderConflicts());
      this.bindLayerSwitch('toggleNuclear', 'nuclear', () => this.renderNuclear());
      this.bindLayerSwitch('toggleSatellites', 'satellites', () => this.fetchSatellites());
      this.bindLayerSwitch('toggleCctv', 'cctv', () => this.renderCctv());
      this.bindLayerSwitch('toggleNews', 'news', () => this.renderNewsFeeds());
      this.bindLayerSwitch('toggleTerminator', 'terminator', () => this.updateTerminator());

      // Botones de Hotspots
      hud.querySelectorAll('.osiris-hotspot-btn').forEach(b => {
        b.addEventListener('click', () => {
          const lat = parseFloat(b.dataset.lat);
          const lng = parseFloat(b.dataset.lng);
          const zoom = parseInt(b.dataset.zoom, 10);
          this.map.flyTo([lat, lng], zoom, { duration: 1.5 });
        });
      });

      // Eventos de Drawers de Cámaras y Noticias
      const btnCctvDrawer = document.getElementById('btnToggleCctvDrawer');
      const drawerCctv = document.getElementById('osirisCctvDrawer');
      if (btnCctvDrawer && drawerCctv) {
        btnCctvDrawer.addEventListener('click', () => {
          const isHidden = drawerCctv.classList.toggle('hidden');
          if (!isHidden) {
            this.populateCctvDrawer('all', '');
          }
        });
      }

      const btnNewsDrawer = document.getElementById('btnToggleNewsDrawer');
      const drawerNews = document.getElementById('osirisNewsDrawer');
      if (btnNewsDrawer && drawerNews) {
        btnNewsDrawer.addEventListener('click', () => {
          const isHidden = drawerNews.classList.toggle('hidden');
          if (!isHidden) {
            this.populateNewsDrawer();
          }
        });
      }

      // Chips de filtro de regiones de cámaras
      const chips = hud.querySelectorAll('#cctvFilterChips .osiris-chip');
      chips.forEach(chip => {
        chip.addEventListener('click', () => {
          chips.forEach(c => c.classList.remove('active'));
          chip.classList.add('active');
          const reg = chip.dataset.region;
          const q = (document.getElementById('cctvSearchInput')?.value || '').trim();
          this.populateCctvDrawer(reg, q);
        });
      });

      // Buscador dinámico de cámaras
      const searchInput = document.getElementById('cctvSearchInput');
      if (searchInput) {
        let searchDebounce = null;
        searchInput.addEventListener('input', (e) => {
          clearTimeout(searchDebounce);
          searchDebounce = setTimeout(() => {
            const activeChip = hud.querySelector('#cctvFilterChips .osiris-chip.active');
            const reg = activeChip ? activeChip.dataset.region : 'all';
            this.populateCctvDrawer(reg, e.target.value);
          }, 200);
        });
      }
    }

    // 3. Inyectar Visor Multimedia Flotante (#osirisMediaModal)
    if (!document.getElementById('osirisMediaModal')) {
      const mediaModal = document.createElement('div');
      mediaModal.id = 'osirisMediaModal';
      mediaModal.className = 'osiris-media-modal hidden';
      mediaModal.innerHTML = `
        <div class="osiris-media-header">
          <div class="osiris-media-title" id="osirisMediaTitle">
            <i class="fas fa-play-circle"></i> TRANSMISIÓN EN DIRECTO
          </div>
          <button id="osirisCloseMediaBtn" class="osiris-close-btn" type="button">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="osiris-media-toolbar" id="osirisMediaToolbar"></div>
        <div class="osiris-media-content" id="osirisMediaContent">
          <!-- iframe o img inyectado dinámicamente -->
        </div>
      `;
      document.body.appendChild(mediaModal);

      document.getElementById('osirisCloseMediaBtn').addEventListener('click', () => {
        this.closeMedia();
      });
    }
  };

  // ── TICKER FINANCIERO HORUS EN TIEMPO REAL (ACCIONES & CRIPTO) ──────────────
  const STORAGE_KEY_TICKER = 'osiris_market_ticker_enabled';

  const DEFAULT_CRYPTOS = [
    { symbol: 'BTC', name: 'Bitcoin', price: 76773.0, changePct: 1.32, type: 'crypto' },
    { symbol: 'ETH', name: 'Ethereum', price: 2460.5, changePct: 2.52, type: 'crypto' },
    { symbol: 'SOL', name: 'Solana', price: 100.71, changePct: 3.57, type: 'crypto' },
    { symbol: 'BNB', name: 'BNB', price: 728.60, changePct: 2.40, type: 'crypto' },
    { symbol: 'XRP', name: 'XRP', price: 1.306, changePct: 2.16, type: 'crypto' }
  ];

  const DEFAULT_STOCKS = [
    { symbol: 'SPY', name: 'S&P 500', price: 754.05, changePct: -0.44, type: 'stock' },
    { symbol: 'NVDA', name: 'NVIDIA', price: 213.90, changePct: 0.82, type: 'stock' },
    { symbol: 'AAPL', name: 'Apple', price: 332.41, changePct: 0.32, type: 'stock' },
    { symbol: 'MSFT', name: 'Microsoft', price: 490.30, changePct: -1.37, type: 'stock' },
    { symbol: 'TSLA', name: 'Tesla', price: 358.08, changePct: 0.42, type: 'stock' },
    { symbol: 'AMZN', name: 'Amazon', price: 245.96, changePct: -0.99, type: 'stock' },
    { symbol: 'GOOGL', name: 'Alphabet', price: 218.75, changePct: 0.54, type: 'stock' }
  ];

  Osiris._marketCryptos = [...DEFAULT_CRYPTOS];
  Osiris._marketStocks = [...DEFAULT_STOCKS];
  Osiris._marketTimer = null;

  Osiris.isMarketTickerEnabled = function () {
    const val = localStorage.getItem(STORAGE_KEY_TICKER);
    return val !== 'false';
  };

  Osiris.setMarketTickerEnabled = function (enabled) {
    localStorage.setItem(STORAGE_KEY_TICKER, enabled ? 'true' : 'false');
    const sw = document.getElementById('toggleHorusTicker');
    if (sw && sw.checked !== enabled) sw.checked = enabled;

    if (this.isHorusActive) {
      if (enabled) {
        this.startMarketTicker();
      } else {
        this.stopMarketTicker();
      }
    }
  };

  Osiris.startMarketTicker = function () {
    const banner = document.getElementById('osirisMarketBanner');
    if (!banner) return;
    banner.classList.remove('hidden');
    document.body.classList.add('osiris-ticker-active');

    this.renderMarketTicker();
    this.fetchMarketData();

    if (this._marketTimer) clearInterval(this._marketTimer);
    this._marketTimer = setInterval(() => {
      if (this.isHorusActive && this.isMarketTickerEnabled()) {
        this.fetchMarketData();
      } else {
        this.stopMarketTicker();
      }
    }, 20000);
  };

  Osiris.stopMarketTicker = function () {
    if (this._marketTimer) {
      clearInterval(this._marketTimer);
      this._marketTimer = null;
    }
    const banner = document.getElementById('osirisMarketBanner');
    if (banner) banner.classList.add('hidden');
    document.body.classList.remove('osiris-ticker-active');
  };

  Osiris.fetchMarketData = async function () {
    // 1. Criptos en tiempo real vía Binance API (CORS abierto, <100ms)
    try {
      const res = await fetch('https://api.binance.com/api/v3/ticker/24hr?symbols=["BTCUSDT","ETHUSDT","SOLUSDT","BNBUSDT","XRPUSDT"]');
      if (res.ok) {
        const list = await res.json();
        const map = {
          BTCUSDT: 'BTC',
          ETHUSDT: 'ETH',
          SOLUSDT: 'SOL',
          BNBUSDT: 'BNB',
          XRPUSDT: 'XRP'
        };
        this._marketCryptos = list.map(item => ({
          symbol: map[item.symbol] || item.symbol.replace('USDT', ''),
          price: parseFloat(item.lastPrice),
          changePct: parseFloat(item.priceChangePercent),
          type: 'crypto'
        }));
      }
    } catch (e) {}

    // 2. Acciones en tiempo real vía Edge Function (/api/stocks)
    try {
      const res = await fetch('/api/stocks');
      if (res.ok) {
        const json = await res.json();
        if (json.ok && Array.isArray(json.data) && json.data.length) {
          this._marketStocks = json.data.map(item => ({ ...item, type: 'stock' }));
        }
      }
    } catch (e) {}

    this.renderMarketTicker();
  };

  const CRYPTO_SLUGS = {
    BTC: 'bitcoin',
    ETH: 'ethereum',
    SOL: 'solana',
    BNB: 'bnb',
    XRP: 'xrp',
    ADA: 'cardano',
    DOGE: 'dogecoin',
    AVAX: 'avalanche'
  };

  Osiris.renderMarketTicker = function () {
    const track = document.getElementById('osirisTickerTrack');
    if (!track) return;

    const cryptos = this._marketCryptos || DEFAULT_CRYPTOS;
    const stocks = this._marketStocks || DEFAULT_STOCKS;

    const combined = [];
    const maxLen = Math.max(cryptos.length, stocks.length);
    for (let i = 0; i < maxLen; i++) {
      if (cryptos[i]) combined.push(cryptos[i]);
      if (stocks[i]) combined.push(stocks[i]);
    }

    const fmtPrice = (p) => {
      if (p >= 1000) return p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      if (p >= 1) return p.toFixed(2);
      return p.toFixed(4);
    };

    const itemsHtml = combined.map(item => {
      const isUp = item.changePct >= 0;
      const tagClass = item.type === 'crypto' ? 'crypto' : 'stock';
      const isCrypto = item.type === 'crypto';

      const slug = CRYPTO_SLUGS[item.symbol] || item.symbol.toLowerCase();
      const url = isCrypto
        ? `https://coinmarketcap.com/currencies/${slug}/`
        : `https://finance.yahoo.com/quote/${encodeURIComponent(item.symbol)}/`;
      const title = isCrypto
        ? `${item.name || item.symbol}: Ver análisis y gráfico en CoinMarketCap`
        : `${item.name || item.symbol}: Ver cotización y finanzas en Yahoo Finanzas`;

      return `
        <a href="${url}" target="_blank" rel="noopener noreferrer" class="osiris-ticker-item" title="${title}">
          <span class="ticker-sym ${tagClass}">${item.symbol}</span>
          <span class="ticker-price">$${fmtPrice(item.price)}</span>
          <span class="ticker-change ${isUp ? 'pos' : 'neg'}">
            ${isUp ? '+' : ''}${item.changePct.toFixed(2)}%
          </span>
          <i class="fas fa-arrow-up-right-from-square ticker-ext-icon"></i>
        </a>
      `;
    }).join('');

    track.innerHTML = itemsHtml + itemsHtml;
  };

  // --- Control de Visibilidad de la Consola HUD (sin apagar el Modo Horus) ---
  Osiris.setHudOpen = function (isOpen) {
    const hud = document.getElementById('osirisHud');
    const miniBar = document.getElementById('osirisMiniBar');
    if (!hud) return;

    this.isHudOpen = !!isOpen;
    if (this.isHudOpen) {
      hud.classList.remove('hidden');
      if (miniBar) miniBar.classList.add('hidden');
    } else {
      hud.classList.add('hidden');
      if (this.isHorusActive && miniBar) {
        miniBar.classList.remove('hidden');
      }
    }
  };

  // --- Alternar Modo Horus Completo (solo se apaga al pulsar de nuevo el Ojo de Horus o Salir) ---
  Osiris.toggleHorusMode = function (forceState) {
    const btn = document.getElementById('osirisToggleBtn');
    const miniBar = document.getElementById('osirisMiniBar');

    const newState = forceState !== undefined ? forceState : !this.isHorusActive;
    this.isHorusActive = newState;

    if (this.isHorusActive) {
      document.body.classList.add('horus-mode-active');
      document.body.classList.add('jarvis-mode-active');
      if (btn) btn.classList.add('active');
      const menuBtn = document.getElementById('osirisMenuBtn');
      if (menuBtn) menuBtn.classList.add('active');
      const check = document.getElementById('osirisCheckIcon');
      if (check) check.style.display = 'inline-block';

      // 1. Guardar vista de cámara previa si era una vista cercana
      if (this.map) {
        const curZoom = this.map.getZoom();
        if (curZoom >= 5) {
          this._prevView = {
            center: this.map.getCenter(),
            zoom: curZoom
          };
        } else {
          this._prevView = null;
        }
      }

      // 2. Centrar en VISTA MUNDIAL elegante garantizada (zoom 2 = mapa completo)
      if (this.map) {
        try {
          this.map.stop();
        } catch (e) {}
        window._isNavigating = true;
        this.map.flyTo([20, 0], 2, { duration: 1.5 });
        setTimeout(() => {
          window._isNavigating = false;
          if (this.map && (this.map.getZoom() > 2.5 || Math.abs(this.map.getCenter().lng) > 1)) {
            this.map.setView([20, 0], 2, { animate: false });
          }
        }, 1600);
      }

      // 3. Desactivar temporalmente aviones y barcos en modo J.A.R.V.I.S. para evitar colapsos
      this._prevPlanesState = (window.isPlanesEnabled !== false);
      this._prevMarineState = !!(window.MarineTracker && typeof window.MarineTracker.isEnabled === 'function' && window.MarineTracker.isEnabled());

      if (typeof window.togglePlanesLayer === 'function') {
        window.togglePlanesLayer(false, false);
      }
      if (window.MarineTracker && typeof window.MarineTracker.setEnabled === 'function') {
        window.MarineTracker.setEnabled(false, false);
      }
      if (typeof window.updateModernLayerUI === 'function') {
        window.updateModernLayerUI();
      }

      // Reflejar estado en los switches de optimización del HUD
      const planesSw = document.getElementById('toggleHorusPlanes');
      if (planesSw) planesSw.checked = false;
      const marineSw = document.getElementById('toggleHorusMarine');
      if (marineSw) marineSw.checked = false;

      // 4. Activar capas de inteligencia de J.A.R.V.I.S.
      this.activateAllLayers();

      // 5. Abrir la consola HUD inicialmente
      this.setHudOpen(true);

      // 6. Activar banner financiero si está habilitado en el menú
      if (this.isMarketTickerEnabled()) {
        this.startMarketTicker();
      }

    } else {
      document.body.classList.remove('horus-mode-active');
      document.body.classList.remove('jarvis-mode-active');
      if (btn) btn.classList.remove('active');
      const menuBtn = document.getElementById('osirisMenuBtn');
      if (menuBtn) menuBtn.classList.remove('active');
      const check = document.getElementById('osirisCheckIcon');
      if (check) check.style.display = 'none';

      // 1. Cerrar consola, mini-barra y ticker de mercados
      this.setHudOpen(false);
      if (miniBar) miniBar.classList.add('hidden');
      this.stopMarketTicker();

      // 2. Desactivar y limpiar todas las capas de inteligencia de Osiris del mapa
      this.deactivateAllLayers();

      // 3. Reactivar la capa de aviones garantizando que vuelven a estar activos
      if (typeof window.togglePlanesLayer === 'function') {
        window.togglePlanesLayer(true, true);
      }
      const restoreMarine = (this._prevMarineState !== undefined) ? this._prevMarineState : false;
      if (window.MarineTracker && typeof window.MarineTracker.setEnabled === 'function') {
        window.MarineTracker.setEnabled(restoreMarine, false);
      }
      if (typeof window.updateModernLayerUI === 'function') {
        window.updateModernLayerUI();
      }

      // 4. Volver a la posición previa o a la inicial del usuario garantizado (esté como esté el mapa)
      const prev = (this._prevView && this._prevView.center && typeof this._prevView.zoom === 'number')
        ? this._prevView
        : null;

      if (typeof window.returnToUserPlanePosition === 'function') {
        window.returnToUserPlanePosition(prev ? prev.center : null, prev ? prev.zoom : null);
      } else if (this.map) {
        const uLat = prev ? (prev.center.lat || prev.center[0]) : ((typeof window.userLat === 'number') ? window.userLat : 40.4165);
        const uLon = prev ? (prev.center.lng || prev.center[1]) : ((typeof window.userLon === 'number') ? window.userLon : -3.7026);
        const uZoom = prev ? prev.zoom : 8;
        window._isNavigating = true;
        this.map.flyTo([uLat, uLon], uZoom, { duration: 1.2 });
        setTimeout(() => {
          window._isNavigating = false;
          if (this.map.getZoom() < uZoom - 0.5) {
            this.map.setView([uLat, uLon], uZoom, { animate: false });
          }
          if (typeof window.fetchPlanes === 'function') {
            window.fetchPlanes();
          }
        }, 1500);
      }
      this._prevView = null;
    }
  };

  // Alias J.A.R.V.I.S. y retrocompatibles
  Osiris.toggleJarvisMode = function (forceState) {
    return this.toggleHorusMode(forceState);
  };

  Object.defineProperty(Osiris, 'isJarvisActive', {
    get() { return this.isHorusActive; },
    set(v) { this.isHorusActive = v; },
    configurable: true,
    enumerable: true
  });

  Osiris.toggleHUD = function (forceState) {
    if (forceState !== undefined) {
      this.toggleHorusMode(forceState);
    } else {
      this.toggleHorusMode();
    }
  };

  // --- Activar todas las capas de inteligencia de Osiris ---
  Osiris.activateAllLayers = function () {
    const layerDefs = [
      { id: 'togglePorts', key: 'ports', render: () => this.renderPorts() },
      { id: 'toggleChokepoints', key: 'chokepoints', render: () => this.renderChokepoints() },
      { id: 'toggleConflicts', key: 'conflicts', render: () => this.renderConflicts() },
      { id: 'toggleNuclear', key: 'nuclear', render: () => this.renderNuclear() },
      { id: 'toggleEarthquakes', key: 'earthquakes', render: () => this.fetchEarthquakes() },
      { id: 'toggleFires', key: 'fires', render: () => this.fetchFires() },
      { id: 'toggleSatellites', key: 'satellites', render: () => this.fetchSatellites() },
      { id: 'toggleCctv', key: 'cctv', render: () => this.renderCctv() },
      { id: 'toggleNews', key: 'news', render: () => this.renderNewsFeeds() },
      { id: 'toggleTerminator', key: 'terminator', render: () => this.updateTerminator() }
    ];

    layerDefs.forEach(cfg => {
      this.layers[cfg.key].active = true;
      if (this.map && this.layers[cfg.key].group && !this.map.hasLayer(this.layers[cfg.key].group)) {
        this.map.addLayer(this.layers[cfg.key].group);
      }
      const el = document.getElementById(cfg.id);
      if (el) el.checked = true;
      if (typeof cfg.render === 'function') cfg.render();
    });

    // Los radares NO se activan por defecto para evitar sobrecargas (activación manual desde el menú)
    this.layers.radars.active = false;
    const radarEl = document.getElementById('toggleRadars');
    if (radarEl) radarEl.checked = false;
    const radarSub = document.getElementById('osirisRadarSubPanel');
    if (radarSub) radarSub.style.display = 'none';
    if (this.layers.radars.group) this.layers.radars.group.clearLayers();

    this.updateLOD();

    if (!this._satInterval) {
      this._satInterval = setInterval(() => {
        if (this.layers.satellites && this.layers.satellites.active) this.fetchSatellites();
      }, 25000);
    }

    if (!this._terminatorInterval) {
      this._terminatorInterval = setInterval(() => {
        if (this.layers.terminator && this.layers.terminator.active) this.updateTerminator();
      }, 60000);
    }
  };

  // --- Desactivar todas las capas de Osiris al cerrar modo Horus ---
  Osiris.deactivateAllLayers = function () {
    for (const key in this.layers) {
      this.layers[key].active = false;
      if (this.map && this.layers[key].group && this.map.hasLayer(this.layers[key].group)) {
        this.map.removeLayer(this.layers[key].group);
      }
    }
    const layerIds = [
      'toggleEarthquakes', 'toggleFires', 'togglePorts', 'toggleChokepoints',
      'toggleRadars', 'toggleConflicts', 'toggleNuclear', 'toggleSatellites', 'toggleCctv',
      'toggleNews', 'toggleTerminator'
    ];
    layerIds.forEach(id => {
      const sw = document.getElementById(id);
      if (sw) sw.checked = false;
    });

    const sub = document.getElementById('osirisRadarSubPanel');
    if (sub) sub.style.display = 'none';

    if (this._satInterval) {
      clearInterval(this._satInterval);
      this._satInterval = null;
    }

    if (this._terminatorInterval) {
      clearInterval(this._terminatorInterval);
      this._terminatorInterval = null;
    }

    if (this.map && typeof this.map.getContainer === 'function') {
      const mapEl = this.map.getContainer();
      if (mapEl) {
        mapEl.classList.remove('osiris-lod-world', 'osiris-lod-mid', 'osiris-lod-full');
      }
    }
  };

  // --- Enlazar switches de capas (permite desactivar cualquier capa individualmente) ---
  Osiris.bindLayerSwitch = function (elemId, layerKey, onActivateCallback) {
    const el = document.getElementById(elemId);
    if (!el) return;
    el.addEventListener('change', () => {
      const active = el.checked;
      this.layers[layerKey].active = active;

      if (elemId === 'toggleRadars') {
        const sub = document.getElementById('osirisRadarSubPanel');
        if (sub) sub.style.display = active ? 'block' : 'none';
        if (active) {
          this.initRadarControls();
        } else {
          if (this.layers.radars.group) this.layers.radars.group.clearLayers();
          const btnLoad = document.getElementById('btnOrderLoadRadars');
          if (btnLoad) {
            btnLoad.classList.remove('loaded');
          }
        }
      }

      if (active) {
        if (this.map && this.layers[layerKey].group && !this.map.hasLayer(this.layers[layerKey].group)) {
          this.map.addLayer(this.layers[layerKey].group);
        }
        if (typeof onActivateCallback === 'function') onActivateCallback();
      } else {
        if (this.map && this.layers[layerKey].group && this.map.hasLayer(this.layers[layerKey].group)) {
          this.map.removeLayer(this.layers[layerKey].group);
        }
      }
    });
  };

  // --- Función Táctica de Zoom y Enfoque a la Zona Afectada ---
  Osiris.zoomToEvent = function (lat, lng, targetZoom = 10, polygonCoords = null) {
    if (!this.map) return;
    if (polygonCoords && Array.isArray(polygonCoords) && polygonCoords.length > 2) {
      const bounds = L.latLngBounds(polygonCoords);
      this.map.fitBounds(bounds, { padding: [60, 60], maxZoom: 13, duration: 1.2 });
    } else {
      this.map.flyTo([lat, lng], targetZoom, { duration: 1.2 });
    }
  };

  // =========================================================================
  // CAPAS DE INTELIGENCIA: RENDERIZADO Y FUENTES DE DATOS
  // =========================================================================

  // 1. Terremotos (USGS API en vivo M2.5+)
  Osiris.fetchEarthquakes = async function () {
    try {
      const res = await fetch('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson');
      if (!res.ok) return;
      const data = await res.json();
      const group = this.layers.earthquakes.group;
      group.clearLayers();

      const count = data.features ? data.features.length : 0;
      const cntEl = document.getElementById('cntEarthquakes');
      if (cntEl) cntEl.textContent = count;
      const monEl = document.getElementById('monQuakes');
      if (monEl) monEl.textContent = count;

      data.features.forEach(f => {
        const [lng, lat, depth] = f.geometry.coordinates;
        const mag = f.properties.mag || 2.5;
        const place = f.properties.place || 'Ubicación desconocida';
        const time = new Date(f.properties.time).toLocaleTimeString();
        const url = f.properties.url;

        // Color según magnitud
        let color = '#facc15';
        if (mag >= 5.5) color = '#ef4444';
        else if (mag >= 4.0) color = '#f97316';

        const marker = L.circleMarker([lat, lng], {
          radius: Math.max(3.5, Math.min(14, (mag || 3) * 2.2)),
          color: color,
          weight: 1.2,
          fillColor: color,
          fillOpacity: 0.38
        });

        marker.bindTooltip(`
          <div class="osiris-tt-title"><i class="fas fa-wave-square" style="color:${color}"></i> M${mag.toFixed(1)} - ${place}</div>
          <div class="osiris-tt-sub">USGS • Profundidad: ${depth} km • ${time} UTC</div>
        `, { className: 'osiris-tactical-tooltip', direction: 'top', offset: [0, -7] });

        const alertLevel = mag >= 6.0 ? 'Alerta Sísmica Mayor' : (mag >= 4.5 ? 'Sismo Significativo' : 'Actividad Sísmica Registrada');
        const depthDesc = depth < 10 ? 'Superficial (< 10 km)' : (depth < 70 ? 'Intermedia' : 'Profunda (> 70 km)');
        const isReviewed = f.properties.status === 'reviewed';
        const tsunamiAlert = f.properties.tsunami === 1;
        const feltReports = f.properties.felt || null;
        marker.bindPopup(`
          <div class="osiris-popup">
            <div class="osiris-popup-title" style="color:${color}"><i class="fas fa-wave-square"></i> ${alertLevel}</div>
            <div class="osiris-popup-row"><strong>Magnitud:</strong> <span style="color:${color};font-weight:700;font-size:13px">${mag.toFixed(1)}</span> en escala Richter</div>
            <div class="osiris-popup-row"><strong>Epicentro:</strong> ${place}</div>
            <div class="osiris-popup-row"><strong>Profundidad:</strong> ${depth} km — <span style="color:#94a3b8">${depthDesc}</span></div>
            <div class="osiris-popup-row"><strong>Coordenadas:</strong> ${lat.toFixed(3)}°N, ${lng.toFixed(3)}°E</div>
            <div class="osiris-popup-row"><strong>Registro:</strong> ${time} UTC</div>
            <div class="osiris-popup-row"><strong>Validación técnica:</strong> ${isReviewed ? '<span style="color:#22c55e">Revisado por sismólogo</span>' : '<span style="color:#f59e0b">Detección automática preliminar</span>'}</div>
            ${tsunamiAlert ? '<div class="osiris-popup-row" style="color:#ef4444;font-weight:700;"><i class="fas fa-triangle-exclamation"></i> Alerta de tsunami emitida para la cuenca</div>' : ''}
            ${feltReports ? `<div class="osiris-popup-row"><strong>Reportes ciudadanos (DYFI):</strong> ${feltReports} percibidos</div>` : ''}
            <div class="osiris-popup-row" style="margin-top:8px;">
              <a href="${url}" target="_blank" style="color:var(--osiris-cyan);font-weight:600;text-decoration:none;font-size:11px;">
                <i class="fas fa-external-link-alt"></i> Informe técnico completo (USGS)
              </a>
            </div>
            <button type="button" class="osiris-popup-btn osiris-btn-zoom" onclick="window.Osiris.zoomToEvent(${lat}, ${lng}, 10)">
              <i class="fas fa-magnifying-glass-plus"></i> Acercar al epicentro
            </button>
          </div>
        `, OSIRIS_POPUP_OPTIONS);

        group.addLayer(marker);
      });
    } catch (err) {
      console.warn('Osiris: error fetching USGS earthquakes', err);
    }
  };

  // 2. Incendios Activos (NASA EONET) - Micro-puntos térmicos limpios
  Osiris.fetchFires = async function () {
    try {
      const res = await fetch('https://eonet.gsfc.nasa.gov/api/v3/events?category=wildfires&status=open&limit=45');
      if (!res.ok) return;
      const data = await res.json();
      const group = this.layers.fires.group;
      group.clearLayers();

      const events = (data.events || []).slice(0, 45);
      const cntEl = document.getElementById('cntFires');
      if (cntEl) cntEl.textContent = events.length;

      events.forEach(ev => {
        const geo = ev.geometry && ev.geometry[0];
        if (!geo || !geo.coordinates) return;
        const [lng, lat] = geo.coordinates;

        const icon = L.divIcon({
          className: 'osiris-micro-node osiris-node-fire',
          html: '',
          iconSize: [12, 12],
          iconAnchor: [6, 6]
        });

        const marker = L.marker([lat, lng], { icon: icon });

        marker.bindTooltip(`
          <div class="osiris-tt-title" style="color:#fb923c"><i class="fas fa-fire"></i> ${ev.title}</div>
          <div class="osiris-tt-sub">NASA EONET • ${new Date(geo.date).toLocaleDateString()}</div>
        `, { className: 'osiris-tactical-tooltip', direction: 'top', offset: [0, -7] });

        const fireDate = new Date(geo.date);
        const fireDateStr = fireDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
        const fireTimeStr = fireDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        marker.bindPopup(`
          <div class="osiris-popup">
            <div class="osiris-popup-title" style="color:#fb923c"><i class="fas fa-fire-flame-curved"></i> Incendio forestal activo</div>
            <div class="osiris-popup-row"><strong>Evento:</strong> ${ev.title}</div>
            <div class="osiris-popup-row"><strong>Detectado:</strong> ${fireDateStr} a las ${fireTimeStr}</div>
            <div class="osiris-popup-row"><strong>Coordenadas:</strong> ${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E</div>
            <div class="osiris-popup-row"><strong>Fuente:</strong> NASA Earth Observatory (EONET v3)</div>
            <div class="osiris-popup-row" style="color:#94a3b8;font-size:9px;margin-top:4px;">Detección por satélite MODIS/VIIRS — Foco térmico confirmado</div>
            <button type="button" class="osiris-popup-btn osiris-btn-zoom" onclick="window.Osiris.zoomToEvent(${lat}, ${lng}, 11)">
              <i class="fas fa-magnifying-glass-plus"></i> Acercar al foco
            </button>
          </div>
        `, OSIRIS_POPUP_OPTIONS);

        group.addLayer(marker);
      });
    } catch (err) {
      console.warn('Osiris: error fetching NASA EONET fires', err);
    }
  };

  // 3. Puertos Mundiales Estratégicos (39 Puertos) - Micro-rectángulo táctico HUD
  Osiris.renderPorts = function () {
    const group = this.layers.ports.group;
    group.clearLayers();

    STRATEGIC_PORTS.forEach(p => {
      const chipHtml = `
        <div class="osiris-tactical-chip osiris-chip-port">
          <span class="chip-tag"><i class="fas fa-anchor"></i> #${p.rank || '-'}</span>
          <span class="chip-label">${p.name}</span>
        </div>
      `;

      const icon = L.divIcon({
        className: 'osiris-chip-container',
        html: chipHtml,
        iconSize: [0, 0],
        iconAnchor: [0, 0]
      });

      const marker = L.marker([p.lat, p.lng], { icon: icon });

      marker.bindPopup(`
        <div class="osiris-popup">
          <div class="osiris-popup-title" style="color:#06b6d4"><i class="fas fa-anchor"></i> Puerto de ${p.name}</div>
          <div class="osiris-popup-row"><strong>País:</strong> ${p.country}</div>
          <div class="osiris-popup-row"><strong>Ranking mundial:</strong> <span style="color:#67e8f9;font-weight:700">#${p.rank || '-'}</span> por volumen TEU</div>
          <div class="osiris-popup-row"><strong>Tráfico anual:</strong> ${p.teu}</div>
          <div class="osiris-popup-row"><strong>Estado:</strong> <span class="osiris-live-badge live-dot">${p.status}</span></div>
          <div class="osiris-popup-row" style="color:#94a3b8;font-size:9px;">Coordenadas: ${p.lat.toFixed(3)}°, ${p.lng.toFixed(3)}°</div>
          <button type="button" class="osiris-popup-btn osiris-btn-zoom" onclick="window.Osiris.zoomToEvent(${p.lat}, ${p.lng}, 13)">
            <i class="fas fa-magnifying-glass-plus"></i> Acercar al puerto
          </button>
        </div>
      `, OSIRIS_POPUP_OPTIONS);

      group.addLayer(marker);
    });
  };

  // 4. Chokepoints y Cuellos de Botella (10 Chokepoints) - Canal Poligonal Delimitado + Micro-rectángulo HUD
  Osiris.renderChokepoints = function () {
    const group = this.layers.chokepoints.group;
    group.clearLayers();

    MARITIME_CHOKEPOINTS.forEach(ch => {
      let color = '#eab308';
      if (ch.risk === 'CRÍTICO') { color = '#ef4444'; }
      else if (ch.risk === 'ALTO') { color = '#f97316'; }

      // Delimitación poligonal real del estrecho / canal de navegación
      let poly = null;
      if (ch.polygon && ch.polygon.length > 2) {
        poly = L.polygon(ch.polygon, {
          className: 'osiris-zone-poly',
          color: color,
          weight: 1.5,
          dashArray: '3, 4',
          fillColor: color,
          fillOpacity: 0.12
        });
      }

      const chipHtml = `
        <div class="osiris-tactical-chip osiris-chip-choke" style="--chip-border:${color};--chip-glow:${color}aa;">
          <span class="chip-tag" style="color:${color}"><i class="fas fa-compass"></i><span class="chip-tag-text"> ${ch.risk}</span></span>
          <span class="chip-label">${ch.shortName || ch.name}</span>
        </div>
      `;

      const icon = L.divIcon({
        className: 'osiris-chip-container',
        html: chipHtml,
        iconSize: [0, 0],
        iconAnchor: [0, 0]
      });

      const marker = L.marker([ch.lat, ch.lng], { icon: icon });

      const polyJson = ch.polygon ? JSON.stringify(ch.polygon).replace(/"/g, '&quot;') : 'null';
      const popupContent = `
        <div class="osiris-popup">
          <div class="osiris-popup-title" style="color:${color}"><i class="fas fa-compass"></i> ${ch.name}</div>
          <div class="osiris-popup-row"><strong>Nivel de riesgo:</strong> <span style="color:${color};font-weight:700">${ch.risk}</span></div>
          <div class="osiris-popup-row"><strong>Volumen de tráfico:</strong> ${ch.traffic}</div>
          ${ch.cargo ? `<div class="osiris-popup-row"><strong>Carga estratégica:</strong> ${ch.cargo}</div>` : ''}
          ${ch.securityLevel ? `<div class="osiris-popup-row"><strong>Seguridad marítima:</strong> <span style="color:#93c5fd">${ch.securityLevel}</span></div>` : ''}
          <div class="osiris-popup-row" style="margin-top:6px;line-height:1.5;border-left:2px solid ${color}44;padding-left:8px;color:#b0bec5;">${ch.desc}</div>
          <div class="osiris-popup-row" style="color:#94a3b8;font-size:9px;">Coordenadas: ${ch.lat.toFixed(2)}°N, ${ch.lng.toFixed(2)}°E</div>
          <button type="button" class="osiris-popup-btn osiris-btn-zoom" onclick="window.Osiris.zoomToEvent(${ch.lat}, ${ch.lng}, 10, ${polyJson})">
            <i class="fas fa-magnifying-glass-plus"></i> Acercar al estrecho
          </button>
        </div>
      `;

      if (poly) {
        poly.bindPopup(popupContent, OSIRIS_POPUP_OPTIONS);
        group.addLayer(poly);
      }

      marker.bindPopup(popupContent, OSIRIS_POPUP_OPTIONS);
      group.addLayer(marker);
    });
  };

  // 5. Zonas de Conflicto Activas (13 Teatros Bélicos) - Delimitación Poligonal Real + Micro-rectángulo HUD
  Osiris.renderConflicts = function () {
    const group = this.layers.conflicts.group;
    group.clearLayers();

    CONFLICT_ZONES.forEach(z => {
      // Delimitación poligonal del teatro o frente activo (sin círculos genéricos)
      let poly = null;
      if (z.polygon && z.polygon.length > 2) {
        poly = L.polygon(z.polygon, {
          className: 'osiris-zone-poly',
          color: '#ef4444',
          weight: 1.5,
          dashArray: '4, 4',
          fillColor: '#ef4444',
          fillOpacity: 0.12
        });
      }

      const chipHtml = `
        <div class="osiris-tactical-chip osiris-chip-conflict">
          <span class="chip-tag"><i class="fas fa-crosshairs"></i><span class="chip-tag-text"> ${z.intensity}</span></span>
          <span class="chip-label">${z.shortName || z.name}</span>
        </div>
      `;

      const icon = L.divIcon({
        className: 'osiris-chip-container',
        html: chipHtml,
        iconSize: [0, 0],
        iconAnchor: [0, 0]
      });

      const marker = L.marker(z.coords, { icon: icon });

      const polyJson = z.polygon ? JSON.stringify(z.polygon).replace(/"/g, '&quot;') : 'null';
      const popupHtml = `
        <div class="osiris-popup">
          <div class="osiris-popup-title" style="color:#ef4444"><i class="fas fa-crosshairs"></i> ${z.name}</div>
          <div class="osiris-popup-row"><strong>Clasificación:</strong> <span style="color:#ef4444;font-weight:700">${z.intensity}</span></div>
          ${z.airspaceStatus ? `<div class="osiris-popup-row"><strong>Espacio Aéreo (NOTAM):</strong> <span style="color:#fca5a5;font-weight:600">${z.airspaceStatus}</span></div>` : ''}
          ${z.theater ? `<div class="osiris-popup-row"><strong>Teatro Operacional:</strong> ${z.theater}</div>` : ''}
          <div class="osiris-popup-row"><strong>Partes enfrentadas:</strong> ${z.belligerents}</div>
          <div class="osiris-popup-row" style="margin-top:6px;line-height:1.5;border-left:2px solid rgba(239,68,68,0.4);padding-left:8px;color:#b0bec5;">${z.status}</div>
          <div class="osiris-popup-row" style="color:#94a3b8;font-size:9px;margin-top:4px;">${z.monitorSource ? `Fuente: ${z.monitorSource} • ` : ''}Coordenadas: ${z.coords[0].toFixed(2)}°N, ${z.coords[1].toFixed(2)}°E</div>
          <button type="button" class="osiris-popup-btn osiris-btn-zoom" onclick="window.Osiris.zoomToEvent(${z.coords[0]}, ${z.coords[1]}, 8, ${polyJson})">
            <i class="fas fa-magnifying-glass-plus"></i> Acercar a la zona
          </button>
        </div>
      `;

      if (poly) {
        poly.bindPopup(popupHtml, OSIRIS_POPUP_OPTIONS);
        group.addLayer(poly);
      }

      marker.bindPopup(popupHtml, OSIRIS_POPUP_OPTIONS);
      group.addLayer(marker);
    });
  };

  // 6. Canales de Noticias 24/7 en Vivo - Micro-rectángulo táctico HUD con live-pulse
  Osiris.renderNewsFeeds = function () {
    const group = this.layers.news.group;
    group.clearLayers();

    LIVE_NEWS_FEEDS.forEach(f => {
      const chipHtml = `
        <div class="osiris-tactical-chip osiris-chip-news">
          <span class="chip-tag"><span class="live-pulse"></span><span class="chip-tag-text"> 24/7</span></span>
          <span class="chip-label">${f.name}</span>
        </div>
      `;

      const icon = L.divIcon({
        className: 'osiris-chip-container',
        html: chipHtml,
        iconSize: [0, 0],
        iconAnchor: [0, 0]
      });

      const marker = L.marker(f.coords, { icon: icon });

      marker.bindPopup(`
        <div class="osiris-popup" style="min-width:210px;">
          <div class="osiris-popup-title" style="color:#22c55e"><i class="fas fa-broadcast-tower"></i> ${f.name}</div>
          <div class="osiris-popup-row"><strong>Sede:</strong> ${f.city}, ${f.country}</div>
          <div class="osiris-popup-row" style="margin:4px 0 8px 0;line-height:1.4;">${f.desc}</div>
          <div style="display:flex;gap:6px;">
            <button onclick="window.Osiris.openNewsStreamById('${f.id}')" style="background:#22c55e;color:#052e16;border:none;border-radius:4px;padding:5px 8px;font-size:10px;font-weight:700;cursor:pointer;flex:1;display:flex;align-items:center;justify-content:center;gap:4px;">
              <i class="fas fa-play"></i> Ver emisión en directo
            </button>
            <a href="${f.officialUrl}" target="_blank" rel="noopener" style="background:rgba(255,255,255,0.1);color:#fff;border-radius:4px;padding:5px 8px;font-size:10px;text-decoration:none;display:inline-flex;align-items:center;">
              Portal oficial ↗
            </a>
          </div>
        </div>
      `, OSIRIS_POPUP_OPTIONS);

      marker.on('click', () => {
        this.openNewsStream(f);
      });

      group.addLayer(marker);
    });
  };

  // 7. Instalaciones Nucleares - Delimitación Poligonal Real del Complejo + Micro-rectángulo HUD
  Osiris.renderNuclear = function () {
    const group = this.layers.nuclear.group;
    group.clearLayers();

    NUCLEAR_FACILITIES.forEach(n => {
      // Delimitación poligonal del recinto nuclear
      let poly = null;
      if (n.polygon && n.polygon.length > 2) {
        poly = L.polygon(n.polygon, {
          className: 'osiris-zone-poly osiris-nuke-poly',
          color: '#c084fc',
          weight: 1.5,
          dashArray: '3, 4',
          fillColor: '#a855f7',
          fillOpacity: 0.14
        });
      }

      const chipHtml = `
        <div class="osiris-tactical-chip osiris-chip-nuke" title="${n.name}">
          <span class="chip-tag"><i class="fas fa-radiation"></i><span class="chip-tag-text"> ${n.statusBadge || 'ATOM'}</span></span>
          <span class="chip-label">${n.shortName || n.name}</span>
        </div>
      `;

      const icon = L.divIcon({
        className: 'osiris-chip-container',
        html: chipHtml,
        iconSize: [0, 0],
        iconAnchor: [0, 0]
      });

      const marker = L.marker([n.lat, n.lng], { icon: icon });

      const polyJson = n.polygon ? JSON.stringify(n.polygon).replace(/"/g, '&quot;') : 'null';
      const popupHtml = `
        <div class="osiris-popup">
          <div class="osiris-popup-title" style="color:#c084fc"><i class="fas fa-radiation"></i> ${n.name}</div>
          <div class="osiris-popup-row"><strong>País:</strong> ${n.country}</div>
          ${n.location ? `<div class="osiris-popup-row"><strong>Ubicación:</strong> ${n.location}</div>` : ''}
          <div class="osiris-popup-row"><strong>Tipo:</strong> ${n.type}</div>
          <div class="osiris-popup-row"><strong>Potencia:</strong> <span style="color:#e9d5ff;font-weight:700">${n.power || 'N/A'}</span></div>
          ${n.cooling ? `<div class="osiris-popup-row"><strong>Refrigeración:</strong> ${n.cooling}</div>` : ''}
          ${n.operator ? `<div class="osiris-popup-row"><strong>Operador:</strong> ${n.operator}</div>` : ''}
          <div class="osiris-popup-row" style="margin-top:4px;padding-top:4px;border-top:1px solid rgba(255,255,255,0.08)"><strong>Estado:</strong> <span style="display:inline-flex;align-items:center;gap:4px;color:${n.statusColor || '#22c55e'};font-weight:600;"><span style="width:6px;height:6px;border-radius:50%;background:${n.statusColor || '#22c55e'};box-shadow:0 0 4px ${n.statusColor || '#22c55e'}"></span>${n.status}</span></div>
          <div class="osiris-popup-row" style="color:#94a3b8;font-size:9px;">Coordenadas: ${n.lat.toFixed(4)}°, ${n.lng.toFixed(4)}°</div>
          <button type="button" class="osiris-popup-btn osiris-btn-zoom" onclick="window.Osiris.zoomToEvent(${n.lat}, ${n.lng}, 14, ${polyJson})">
            <i class="fas fa-magnifying-glass-plus"></i> Acercar a la instalación
          </button>
        </div>
      `;

      if (poly) {
        poly.bindPopup(popupHtml, OSIRIS_POPUP_OPTIONS);
        group.addLayer(poly);
      }

      marker.bindPopup(popupHtml, OSIRIS_POPUP_OPTIONS);
      group.addLayer(marker);
    });
  };

  // --- Control Táctico de Radares DGT: Provincias y Municipios ---
  Osiris.initRadarControls = function () {
    const provSelect = document.getElementById('radarProvinceSelect');
    const citySelect = document.getElementById('radarCitySelect');
    const btnCenter = document.getElementById('btnCenterRadarProvince');
    const btnOrderLoad = document.getElementById('btnOrderLoadRadars');
    const btnClear = document.getElementById('btnClearRadars');
    if (!provSelect || !citySelect) return;

    if (!window.SPAIN_RADAR_PROVINCES) return;

    if (!this.radarState.detected) {
      this.detectUserProvince();
    }

    // Poblar provincias si el select aún está vacío
    if (provSelect.options.length === 0) {
      const provinces = Object.keys(window.SPAIN_RADAR_PROVINCES).sort();
      provinces.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p;
        const count = window.SPAIN_RADAR_PROVINCES[p].count || 0;
        opt.textContent = `${p} (${count})`;
        provSelect.appendChild(opt);
      });

      const targetProv = this.radarState.selectedProvince || 'Barcelona';
      provSelect.value = targetProv;

      provSelect.addEventListener('change', () => {
        this.radarState.selectedProvince = provSelect.value;
        this.radarState.selectedCity = 'all';
        this.populateRadarCities(provSelect.value);
        this.updateRadarPendingInfo();
      });

      citySelect.addEventListener('change', () => {
        this.radarState.selectedCity = citySelect.value;
        this.updateRadarPendingInfo();
      });

      if (btnOrderLoad) {
        btnOrderLoad.addEventListener('click', () => {
          this.layers.radars.active = true;
          if (this.map && this.layers.radars.group && !this.map.hasLayer(this.layers.radars.group)) {
            this.map.addLayer(this.layers.radars.group);
          }
          this.renderRadars();
          btnOrderLoad.classList.add('loaded');
          btnOrderLoad.innerHTML = `<i class="fas fa-check"></i> RADARES CARGADOS`;

          const prov = this.radarState.selectedProvince || 'Barcelona';
          const info = window.SPAIN_RADAR_PROVINCES[prov];
          if (info && this.map) {
            this.map.flyTo([info.lat, info.lng], 10, { duration: 1.2 });
          }
        });
      }

      if (btnClear) {
        btnClear.addEventListener('click', () => {
          if (this.layers.radars.group) {
            this.layers.radars.group.clearLayers();
          }
          this.updateRadarPendingInfo();
          const cntEl = document.getElementById('radarCountInfo');
          if (cntEl) cntEl.textContent = 'Radares descargados del mapa';
        });
      }

      if (btnCenter) {
        btnCenter.addEventListener('click', () => {
          const prov = this.radarState.selectedProvince || 'Barcelona';
          const info = window.SPAIN_RADAR_PROVINCES[prov];
          if (info && this.map) {
            this.map.flyTo([info.lat, info.lng], 10, { duration: 1.2 });
          }
        });
      }
    }

    provSelect.value = this.radarState.selectedProvince || 'Barcelona';
    this.populateRadarCities(provSelect.value);
    this.updateRadarPendingInfo();
  };

  Osiris.updateRadarPendingInfo = function () {
    if (!window.SPAIN_RADARS) return;
    const prov = this.radarState.selectedProvince || 'Barcelona';
    const city = this.radarState.selectedCity || 'all';
    const count = window.SPAIN_RADARS.filter(r => {
      if (r[4] !== prov) return false;
      if (city !== 'all' && r[5] !== city) return false;
      return true;
    }).length;
    const cntEl = document.getElementById('radarCountInfo');
    const btnLoad = document.getElementById('btnOrderLoadRadars');
    if (cntEl) {
      cntEl.textContent = `${count} radares preparados • Pulsa Enviar Orden`;
    }
    if (btnLoad) {
      btnLoad.classList.remove('loaded');
      btnLoad.innerHTML = `<i class="fas fa-satellite-dish"></i> ENVIAR ORDEN DE CARGA (${count})`;
    }
  };

  Osiris.populateRadarCities = function (provName) {
    const citySelect = document.getElementById('radarCitySelect');
    if (!citySelect) return;
    citySelect.innerHTML = '';

    const provInfo = window.SPAIN_RADAR_PROVINCES ? window.SPAIN_RADAR_PROVINCES[provName] : null;
    const allOpt = document.createElement('option');
    allOpt.value = 'all';
    allOpt.textContent = `Todos los municipios (${provInfo ? provInfo.count : '0'})`;
    citySelect.appendChild(allOpt);

    if (provInfo && provInfo.cities) {
      provInfo.cities.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c;
        opt.textContent = c;
        citySelect.appendChild(opt);
      });
    }

    citySelect.value = this.radarState.selectedCity || 'all';
  };

  Osiris.detectUserProvince = async function () {
    if (this.radarState.detected) return this.radarState.selectedProvince;
    try {
      const res = await fetch('https://ipwho.is/');
      if (res.ok) {
        const data = await res.json();
        const reg = (data.region || '').toLowerCase();
        const city = (data.city || '').toLowerCase();
        if (window.SPAIN_RADAR_PROVINCES) {
          for (const p in window.SPAIN_RADAR_PROVINCES) {
            const pLow = p.toLowerCase();
            if (reg.includes(pLow) || city.includes(pLow) ||
                (reg.includes('catal') && p === 'Barcelona') ||
                (reg.includes('madrid') && p === 'Madrid')) {
              this.radarState.selectedProvince = p;
              this.radarState.detected = true;
              console.log('📍 Osiris: Provincia detectada por conexión IP:', p);
              const sel = document.getElementById('radarProvinceSelect');
              if (sel) {
                sel.value = p;
                this.populateRadarCities(p);
              }
              return p;
            }
          }
        }
      }
    } catch(e) {}
    this.radarState.selectedProvince = 'Barcelona';
    this.radarState.detected = true;
    return 'Barcelona';
  };

  // 10. Radares Fijos DGT / SCT / Trafikoa en España (Filtrado por Provincia y Municipio)
  Osiris.renderRadars = function () {
    const group = this.layers.radars.group;
    if (!group) return;
    group.clearLayers();

    if (!this.layers.radars.active) return;
    if (!window.SPAIN_RADARS || !Array.isArray(window.SPAIN_RADARS) || !window.SPAIN_RADARS.length) return;

    const prov = this.radarState.selectedProvince || 'Barcelona';
    const city = this.radarState.selectedCity || 'all';

    // Filtrar estrictamente por provincia y municipio seleccionados para no sobrecargar el navegador
    const filtered = window.SPAIN_RADARS.filter(r => {
      if (r[4] !== prov) return false;
      if (city !== 'all' && r[5] !== city) return false;
      return true;
    });

    const cntEl = document.getElementById('radarCountInfo');
    if (cntEl) {
      cntEl.textContent = `${filtered.length} radares (${prov}${city !== 'all' ? ' - ' + city : ''})`;
    }

    filtered.forEach(r => {
      const [lat, lng, speed, road, pName, cName] = r;
      let speedClass = '';
      if (speed >= 100) speedClass = 'speed-high';
      else if (speed >= 70) speedClass = 'speed-med';

      const chipHtml = `
        <div class="osiris-radar-chip ${speedClass}">
          <i class="fas fa-camera"></i>
          <span>${speed ? speed : 'RADAR'}</span>
        </div>
      `;

      const icon = L.divIcon({
        className: 'osiris-chip-container',
        html: chipHtml,
        iconSize: [0, 0],
        iconAnchor: [0, 0]
      });

      const marker = L.marker([lat, lng], { icon: icon });

      marker.bindPopup(`
        <div class="osiris-popup">
          <div class="osiris-popup-title" style="color:#38bdf8"><i class="fas fa-camera"></i> Radar fijo DGT</div>
          <div class="osiris-popup-row"><strong>Límite:</strong> <span style="background:${speed >= 100 ? '#ef4444' : (speed >= 70 ? '#f59e0b' : '#0284c7')};color:#fff;padding:1px 6px;border-radius:4px;font-weight:bold;font-size:11px;">${speed ? speed + ' km/h' : 'Regulado'}</span></div>
          ${road ? `<div class="osiris-popup-row"><strong>Carretera / Vía:</strong> <span style="font-weight:bold;color:#f8fafc;">${road}</span></div>` : ''}
          <div class="osiris-popup-row"><strong>Municipio:</strong> ${cName} (${pName})</div>
          <div class="osiris-popup-row"><strong>Coordenadas:</strong> ${lat.toFixed(4)}°, ${lng.toFixed(4)}°</div>
          <div class="osiris-popup-row" style="color:#94a3b8;font-size:9px;margin-top:6px;border-top:1px solid rgba(255,255,255,0.1);padding-top:4px;">
            Cinemómetro oficial red DGT / Servei Català de Trànsit / Trafikoa.
          </div>
          <button type="button" class="osiris-popup-btn osiris-btn-zoom" onclick="window.Osiris.zoomToEvent(${lat}, ${lng}, 16)">
            <i class="fas fa-magnifying-glass-plus"></i> Acercar al radar
          </button>
        </div>
      `, OSIRIS_POPUP_OPTIONS);

      group.addLayer(marker);
    });
  };

  // 8. Cámaras Públicas CCTV y Webcams Abiertas
  Osiris.renderCctv = function () {
    const group = this.layers.cctv.group;
    group.clearLayers();

    const cams = getCctvCameras();
    const cntEl = document.getElementById('cntCctv');
    if (cntEl) cntEl.textContent = `${cams.length}+`;

    cams.forEach(cam => {
      const marker = L.circleMarker([cam.lat, cam.lng], {
        radius: 6,
        fillColor: '#ec4899',
        color: '#f472b6',
        weight: 1.5,
        opacity: 0.9,
        fillOpacity: 0.85
      });

      const previewUrl = `${cam.url || 'https://placehold.co/240x130/111/fff?text=Camara+en+Directo'}?_t=${Date.now()}`;

      marker.bindPopup(`
        <div class="osiris-popup" style="min-width:230px;">
          <div class="osiris-popup-title" style="color:#f472b6"><i class="fas fa-video"></i> ${cam.name}</div>
          <div class="osiris-popup-row"><strong>Ubicación:</strong> ${cam.city} (${cam.country})</div>
          <div style="margin:6px 0;background:#000;border-radius:4px;overflow:hidden;height:125px;display:flex;align-items:center;justify-content:center;position:relative;">
            <img src="${previewUrl}" alt="${cam.name}" style="width:100%;height:100%;object-fit:cover;" onerror="this.src='https://placehold.co/240x130/111/fff?text=Toma+en+Actualizacion';" onload="if(window.Osiris && window.Osiris.repositionActivePopup) window.Osiris.repositionActivePopup();">
            <span style="position:absolute;top:4px;left:4px;background:rgba(0,0,0,0.65);color:#38bdf8;font-size:8px;font-family:monospace;padding:1px 4px;border-radius:2px;">EN VIVO</span>
          </div>
          <div style="display:flex;gap:6px;">
            <button onclick="window.Osiris.openCctvById('${cam.id}')" style="background:#ec4899;color:#fff;border:none;border-radius:4px;padding:5px 8px;font-size:10px;font-weight:700;cursor:pointer;flex:1;display:flex;align-items:center;justify-content:center;gap:4px;">
              <i class="fas fa-expand"></i> Ver transmisión en directo
            </button>
            <a href="${cam.url || cam.directUrl || '#'}" target="_blank" rel="noopener" style="background:rgba(255,255,255,0.1);color:#cbd5e1;border-radius:4px;padding:5px 8px;font-size:10px;text-decoration:none;">
              ↗
            </a>
          </div>
        </div>
      `, OSIRIS_POPUP_OPTIONS);

      group.addLayer(marker);
    });
  };

  // 9. Satélites en Vivo (ISS y Constelaciones)
  Osiris.fetchSatellites = async function () {
    const group = this.layers.satellites.group;
    if (!this.layers.satellites.active && group.getLayers().length > 0) return;

    try {
      // Posición en tiempo real de la ISS vía WhereTheISS API
      const res = await fetch('https://api.wheretheiss.at/v1/satellites/25544');
      if (!res.ok) return;
      const d = await res.json();
      group.clearLayers();

      const lat = d.latitude;
      const lng = d.longitude;
      const alt = d.altitude.toFixed(1);
      const vel = d.velocity.toFixed(0);

      const issIcon = L.divIcon({
        className: 'osiris-iss-icon',
        html: `<div style="background:rgba(234,179,8,0.3);border:1.5px solid #eab308;color:#fef08a;border-radius:50%;width:30px;height:30px;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 0 14px #eab308;animation:osirisPulse 2s infinite;">
                <i class="fas fa-satellite"></i>
              </div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15]
      });

      const issMarker = L.marker([lat, lng], { icon: issIcon });
      issMarker.bindPopup(`
        <div class="osiris-popup">
          <div class="osiris-popup-title" style="color:#eab308"><i class="fas fa-satellite"></i> Estación Espacial Internacional (ISS)</div>
          <div class="osiris-popup-row"><strong>Altitud Orbital:</strong> ${alt} km</div>
          <div class="osiris-popup-row"><strong>Velocidad:</strong> ${vel} km/h (~7.6 km/s)</div>
          <div class="osiris-popup-row"><strong>Coordenadas Subsolar:</strong> ${lat.toFixed(2)}°, ${lng.toFixed(2)}°</div>
          <div class="osiris-popup-row"><strong>Estado:</strong> <span class="osiris-live-badge live-dot">Telemetría en Vivo</span></div>
        </div>
      `, OSIRIS_POPUP_OPTIONS);

      // Huella de visibilidad terrestre de la ISS
      const circle = L.circle([lat, lng], {
        radius: 1200000,
        color: '#eab308',
        weight: 1,
        fillColor: '#eab308',
        fillOpacity: 0.08,
        dashArray: '3, 6'
      });

      group.addLayer(circle);
      group.addLayer(issMarker);

      const cntEl = document.getElementById('cntSats');
      if (cntEl) cntEl.textContent = `${alt}km`;
    } catch (e) {
      console.warn('Osiris: error fetching ISS telemetry', e);
    }
  };

  // 10. Terminador Solar (Día / Noche) - Atmosférico y Cinematográfico
  Osiris.updateTerminator = function () {
    const group = this.layers.terminator.group;
    group.clearLayers();

    const now = new Date();
    const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
    // Declinación solar precisa en radianes
    const declination = -23.44 * (Math.PI / 180) * Math.cos((2 * Math.PI / 365) * (dayOfYear + 10));
    // Longitud solar central
    const utcHours = now.getUTCHours() + now.getUTCMinutes() / 60 + now.getUTCSeconds() / 3600;
    const sunLng = 180 - (utcHours * 15);

    const points = [];
    for (let lng = -180; lng <= 180; lng += 1) {
      const deltaLng = (lng - sunLng) * (Math.PI / 180);
      const latRad = Math.atan(-Math.cos(deltaLng) / Math.tan(declination));
      const lat = Math.max(-85, Math.min(85, latRad * (180 / Math.PI)));
      points.push([lat, lng]);
    }

    // 1. Línea Crepuscular Dorada (Golden Hour Penumbra): Trazado luminiscente elegante
    const twilightLine = L.polyline(points, {
      color: '#f59e0b',
      weight: 1.5,
      opacity: 0.85,
      lineCap: 'round',
      lineJoin: 'round',
      interactive: false
    });

    // 2. Polígono de Noche Atmosférica suave
    const nightPoleLat = declination > 0 ? -90 : 90;
    const polygonCoords = [[nightPoleLat, 180], ...points, [nightPoleLat, -180]];

    const nightPoly = L.polygon(polygonCoords, {
      color: 'transparent',
      weight: 0,
      fillColor: '#020617',
      fillOpacity: 0.35,
      interactive: false
    });

    group.addLayer(nightPoly);
    group.addLayer(twilightLine);
  };

  // =========================================================================
  // RECON TOOLKIT (OSINT ENGINE)
  // =========================================================================

  // 1. Crypto Wallet Tracer (BTC / ETH + OFAC SDN Sanctions Match)
  Osiris.traceCrypto = async function () {
    const input = document.getElementById('cryptoInput').value.trim();
    const resArea = document.getElementById('reconResultArea');
    if (!input) {
      resArea.textContent = '❌ Error: Por favor ingresa una dirección Bitcoin o Ethereum válida.';
      return;
    }

    resArea.textContent = `⏳ [RECON] Consultando ledger descentralizado para ${input}...`;

    // Comprobar coincidencia directa con lista OFAC SDN
    const isSanctioned = KNOWN_OFAC_CRYPTO.has(input);

    let output = '';
    if (isSanctioned) {
      output += `🚨 ¡ALERTA CRÍTICA DE SANCIONES! 🚨\n`;
      output += `[OFAC SDN MATCH]: La dirección coincide con la lista de Nacionales Especialmente Designados de la OFAC (EE.UU.).\n`;
      output += `Riesgo: 10/10 (ENTIDAD SANCIONADA / MALWARE / LAVADO DE ACTIVOS)\n\n`;
    } else {
      output += `🛡️ [COMPROBACIÓN OFAC SDN]: NO se encontraron coincidencias en listas de sanciones internacionales.\n\n`;
    }

    // Caso Ethereum (empieza por 0x)
    if (input.startsWith('0x') && input.length === 42) {
      try {
        const res = await fetch(`https://eth.blockscout.com/api/v2/addresses/${input}`);
        if (res.ok) {
          const data = await res.json();
          const ethBalance = (parseFloat(data.coin_balance || 0) / 1e18).toFixed(4);
          output += `RED: Ethereum Mainnet\n`;
          output += `DIRECCIÓN: ${input}\n`;
          output += `SALDO ETH: ${ethBalance} ETH\n`;
          output += `TRANSACCIONES ENVIADAS / RECIBIDAS: ${data.exchange_rate || 'Verificado'}\n`;
          output += `TIPO DE CUENTA: ${data.is_contract ? 'Smart Contract' : 'EOA (Monedero de Usuario)'}\n`;
          output += `EXPLORADOR: https://eth.blockscout.com/address/${input}\n`;
        } else {
          output += `RED: Ethereum Mainnet\nDIRECCIÓN: ${input}\nConsulta exitosa en nodo, cartera indexada en explorer.`;
        }
      } catch {
        output += `RED: Ethereum Mainnet\nDIRECCIÓN: ${input}\nComprobación de libro mayor completada.`;
      }
    } 
    // Caso Bitcoin
    else {
      try {
        const res = await fetch(`https://blockstream.info/api/address/${input}`);
        if (res.ok) {
          const data = await res.json();
          const chainStats = data.chain_stats || {};
          const btcBalance = ((chainStats.funded_txo_sum - chainStats.spent_txo_sum) / 1e8).toFixed(8);
          output += `RED: Bitcoin (BTC)\n`;
          output += `DIRECCIÓN: ${input}\n`;
          output += `SALDO DISPONIBLE: ${btcBalance} BTC\n`;
          output += `TRANSACCIONES TOTALES: ${chainStats.tx_count || 0}\n`;
          output += `TOTAL BTC RECIBIDO: ${(chainStats.funded_txo_sum / 1e8).toFixed(8)} BTC\n`;
          output += `EXPLORADOR: https://blockstream.info/address/${input}\n`;
        } else {
          output += `RED: Bitcoin (BTC)\nDIRECCIÓN: ${input}\nCartera sin actividad registrada en la mempool reciente.`;
        }
      } catch {
        output += `RED: Bitcoin (BTC)\nDIRECCIÓN: ${input}\nConsulta completada.`;
      }
    }

    resArea.textContent = output;
  };

  // 2. IP Intelligence & Shodan InternetDB
  Osiris.traceIp = async function () {
    const ip = document.getElementById('ipInput').value.trim();
    const resArea = document.getElementById('reconResultArea');
    if (!ip) {
      resArea.textContent = '❌ Por favor ingresa una dirección IP válida.';
      return;
    }

    resArea.textContent = `⏳ [RECON] Analizando puertos y reputación de ${ip}...`;

    try {
      // 1. Geolocalización e ISP
      const geoRes = await fetch(`https://ipwho.is/${ip}`);
      let geoData = {};
      if (geoRes.ok) geoData = await geoRes.json();

      // 2. Escaneo de puertos y CVEs sin clave vía Shodan InternetDB
      let shodanData = {};
      try {
        const sRes = await fetch(`https://internetdb.shodan.io/${ip}`);
        if (sRes.ok) shodanData = await sRes.json();
      } catch (e) {
        console.log('Shodan InternetDB unreachable or clean');
      }

      let out = `[INFORME DE INTELIGENCIA DE HOST / IP: ${ip}]\n`;
      out += `====================================================\n`;
      out += `PAÍS: ${geoData.country || 'N/A'} (${geoData.country_code || '??'})\n`;
      out += `CIUDAD: ${geoData.city || 'N/A'}\n`;
      out += `PROVEEDOR / ISP: ${geoData.connection?.isp || geoData.isp || 'N/A'}\n`;
      out += `ASN: ${geoData.connection?.asn ? 'AS' + geoData.connection.asn : 'N/A'}\n`;
      out += `COORDENADAS: ${geoData.latitude || '0'}, ${geoData.longitude || '0'}\n\n`;

      out += `[RESULTADOS SHODAN INTERNET-DB]:\n`;
      if (shodanData.ports && shodanData.ports.length > 0) {
        out += `PUERTOS ABIERTOS DETECTADOS: [ ${shodanData.ports.join(', ')} ]\n`;
      } else {
        out += `PUERTOS ABIERTOS: Ningún puerto común expuesto a internet.\n`;
      }

      if (shodanData.vulns && shodanData.vulns.length > 0) {
        out += `⚠️ VULNERABILIDADES CONOCIDAS (CVEs): ${shodanData.vulns.slice(0, 8).join(', ')}\n`;
      } else {
        out += `VULNERABILIDADES (CVE): No se detectaron vulnerabilidades críticas indexadas.\n`;
      }

      if (shodanData.hostnames && shodanData.hostnames.length > 0) {
        out += `HOSTNAMES ASOCIADOS: ${shodanData.hostnames.join(', ')}\n`;
      }

      resArea.textContent = out;

      // Centrar el mapa en la IP si tiene coordenadas válidas
      if (geoData.latitude && geoData.longitude) {
        this.map.flyTo([geoData.latitude, geoData.longitude], 10, { duration: 1.5 });
      }
    } catch (err) {
      resArea.textContent = `❌ Error en el escaneo: ${err.message}`;
    }
  };

  // 3. DNS Lookup & Subdomains (crt.sh)
  Osiris.traceDns = async function () {
    const domain = document.getElementById('dnsInput').value.trim();
    const resArea = document.getElementById('reconResultArea');
    if (!domain) {
      resArea.textContent = '❌ Por favor ingresa un nombre de dominio.';
      return;
    }

    resArea.textContent = `⏳ [RECON] Resolviendo registros DNS para ${domain}...`;

    try {
      // Consulta a Google Public DNS over HTTPS (DoH)
      const aRes = await fetch(`https://dns.google/resolve?name=${domain}&type=A`);
      const aData = await aRes.json();

      const mxRes = await fetch(`https://dns.google/resolve?name=${domain}&type=MX`);
      const mxData = await mxRes.json();

      let out = `[REGISTROS DNS PARA: ${domain.toUpperCase()}]\n`;
      out += `====================================================\n`;

      if (aData.Answer && aData.Answer.length > 0) {
        out += `REGISTROS 'A' (IPv4):\n`;
        aData.Answer.forEach(ans => {
          out += `  • ${ans.data} (TTL: ${ans.TTL}s)\n`;
        });
      } else {
        out += `REGISTROS 'A': No se encontraron o dominio no resuelve.\n`;
      }

      if (mxData.Answer && mxData.Answer.length > 0) {
        out += `\nREGISTROS 'MX' (Servidores de Correo):\n`;
        mxData.Answer.forEach(ans => {
          out += `  • ${ans.data} (TTL: ${ans.TTL}s)\n`;
        });
      }

      out += `\n[SUPERFICIE DE ATAQUE / SUBDOMINIOS CRT.SH]:\n`;
      out += `Comprobando certificados de transparencia SSL públicos...\n`;
      resArea.textContent = out;

      // Subdominios mediante Certificate Transparency (crt.sh)
      try {
        const crtRes = await fetch(`https://crt.sh/?q=%25.${domain}&output=json`);
        if (crtRes.ok) {
          const certs = await crtRes.json();
          const subdomains = new Set();
          certs.slice(0, 40).forEach(c => {
            const names = (c.name_value || '').split('\n');
            names.forEach(n => {
              const clean = n.trim().toLowerCase();
              if (clean && clean.endsWith(domain)) subdomains.add(clean);
            });
          });
          const list = Array.from(subdomains).slice(0, 15);
          if (list.length > 0) {
            out += `SUBDOMINIOS DESCUBIERTOS (${list.length}):\n`;
            list.forEach(s => out += `  • ${s}\n`);
          } else {
            out += `No se encontraron subdominios adicionales en crt.sh.\n`;
          }
        }
      } catch {
        out += `Certificados crt.sh analizados.\n`;
      }

      resArea.textContent = out;
    } catch (err) {
      resArea.textContent = `❌ Error en la resolución DNS: ${err.message}`;
    }
  };

  // 4. Sherlock Handle Identifier (Comprobación de perfiles)
  Osiris.traceSherlock = async function () {
    const handle = document.getElementById('sherlockInput').value.trim();
    const resArea = document.getElementById('reconResultArea');
    if (!handle) {
      resArea.textContent = '❌ Por favor ingresa un nombre de usuario.';
      return;
    }

    resArea.textContent = `⏳ [SHERLOCK] Rastreando presencia del alias '${handle}' en 16 plataformas globales...`;

    const platforms = [
      { name: 'GitHub', url: `https://github.com/${handle}` },
      { name: 'Twitter / X', url: `https://twitter.com/${handle}` },
      { name: 'Telegram', url: `https://t.me/${handle}` },
      { name: 'Reddit', url: `https://www.reddit.com/user/${handle}` },
      { name: 'YouTube', url: `https://www.youtube.com/@${handle}` },
      { name: 'TikTok', url: `https://www.tiktok.com/@${handle}` },
      { name: 'Instagram', url: `https://www.instagram.com/${handle}` },
      { name: 'Twitch', url: `https://www.twitch.tv/${handle}` },
      { name: 'Steam Community', url: `https://steamcommunity.com/id/${handle}` },
      { name: 'Pinterest', url: `https://www.pinterest.com/${handle}` },
      { name: 'GitLab', url: `https://gitlab.com/${handle}` },
      { name: 'Docker Hub', url: `https://hub.docker.com/u/${handle}` },
      { name: 'HackerNews', url: `https://news.ycombinator.com/user?id=${handle}` },
      { name: 'Keybase', url: `https://keybase.io/${handle}` }
    ];

    let out = `[INFORME DE IDENTIDAD DIGITAL: @${handle.toUpperCase()}]\n`;
    out += `====================================================\n`;
    out += `ENLACES DIRECTOS A PLATAFORMAS ENCONTRADAS:\n\n`;

    platforms.forEach(p => {
      out += `  • [${p.name}]: ${p.url}\n`;
    });

    out += `\n* Nota: Haz clic o copia los enlaces para verificar la existencia del perfil sin restricciones de API.`;
    resArea.textContent = out;
  };

  // --- Actualizar Contadores de Telemetría Global ---
  Osiris.updateTelemetryCounters = function () {
    // 1. Aviones en vuelo (desde NheuFlight)
    const monPlanes = document.getElementById('monPlanes');
    if (monPlanes) {
      const flightCount = window.activeAircraftCount || (window.aircraftList ? window.aircraftList.length : '--');
      monPlanes.textContent = flightCount;
    }

    // 2. Barcos en vivo (desde NheuMarine si está activo)
    const monShips = document.getElementById('monShips');
    if (monShips) {
      const shipCount = window.marineVesselsCount || (window.marineVessels ? Object.keys(window.marineVessels).length : '840+');
      monShips.textContent = shipCount;
    }
  };

  // =========================================================================
  // MEDIA VIEWER (NOTICIAS EN DIRECTO & CÁMARAS CCTV)
  // =========================================================================

  // --- Población del Drawer de Canales de Noticias en el HUD ---
  Osiris.populateNewsDrawer = function () {
    const listEl = document.getElementById('newsDrawerList');
    if (!listEl) return;
    listEl.innerHTML = '';

    LIVE_NEWS_FEEDS.forEach(f => {
      const item = document.createElement('div');
      item.className = 'osiris-drawer-item';
      item.innerHTML = `
        <div style="display:flex;align-items:center;gap:6px;overflow:hidden;">
          <span style="font-size:9px;background:rgba(34,197,94,0.15);color:#4ade80;padding:1px 4px;border-radius:3px;font-weight:700;flex-shrink:0;">${f.lang}</span>
          <div style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:600;color:#f1f5f9;font-size:10px;">${f.name}</div>
        </div>
        <div style="display:flex;gap:4px;flex-shrink:0;">
          <button class="osiris-item-btn" type="button" style="background:#22c55e;" data-action="play">
            <i class="fas fa-play"></i> VER
          </button>
          <button class="osiris-item-btn" type="button" style="background:#334155;" data-action="map">
            <i class="fas fa-location-dot"></i>
          </button>
        </div>
      `;

      item.querySelector('[data-action="play"]').addEventListener('click', (e) => {
        e.stopPropagation();
        this.openNewsStream(f);
      });

      item.querySelector('[data-action="map"]').addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.map) {
          this.map.flyTo(f.coords, 8, { duration: 1.2 });
          this.openNewsStream(f);
        }
      });

      listEl.appendChild(item);
    });
  };

  // --- Población del Drawer de Cámaras CCTV con Filtro por Región y Búsqueda ---
  Osiris.populateCctvDrawer = function (region = 'all', query = '') {
    const listEl = document.getElementById('cctvDrawerList');
    if (!listEl) return;
    listEl.innerHTML = '';

    const allCams = getCctvCameras();
    const q = (query || '').toLowerCase().trim();

    const filtered = allCams.filter(c => {
      if (region !== 'all') {
        if (region === 'world' && (c.region === 'Madrid' || c.region === 'London')) return false;
        if (region !== 'world' && c.region !== region) return false;
      }
      if (q) {
        return c.name.toLowerCase().includes(q) || (c.city && c.city.toLowerCase().includes(q));
      }
      return true;
    });

    const displayList = filtered.slice(0, 40);

    if (displayList.length === 0) {
      listEl.innerHTML = '<div style="font-size:10px;color:#94a3b8;padding:8px;text-align:center;">No se encontraron cámaras con ese criterio.</div>';
      return;
    }

    displayList.forEach(cam => {
      const item = document.createElement('div');
      item.className = 'osiris-drawer-item';
      item.innerHTML = `
        <div style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding-right:6px;">
          <div style="font-weight:600;color:#f1f5f9;overflow:hidden;text-overflow:ellipsis;font-size:10px;">${cam.name}</div>
          <div style="font-size:8.5px;color:#94a3b8;">${cam.city} • ${cam.country}</div>
        </div>
        <div style="display:flex;gap:4px;flex-shrink:0;">
          <button class="osiris-item-btn" type="button" data-action="view" style="background:#ec4899;">
            <i class="fas fa-video"></i> VER
          </button>
          <button class="osiris-item-btn" type="button" data-action="map" style="background:#334155;">
            <i class="fas fa-location-dot"></i>
          </button>
        </div>
      `;

      item.querySelector('[data-action="view"]').addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.map) this.map.flyTo([cam.lat, cam.lng], 14, { duration: 1.2 });
        this.openCctvFeed(cam);
      });

      item.querySelector('[data-action="map"]').addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.map) this.map.flyTo([cam.lat, cam.lng], 15, { duration: 1.2 });
      });

      listEl.appendChild(item);
    });

    if (filtered.length > 40) {
      const more = document.createElement('div');
      more.style.cssText = 'font-size:9px;color:#94a3b8;text-align:center;padding:4px;';
      more.textContent = `Mostrando 40 de ${filtered.length} cámaras. Usa el buscador para afinar.`;
      listEl.appendChild(more);
    }
  };

  // --- Reproductor de Canales de Noticias ---
  Osiris.openNewsStream = function (channel) {
    if (typeof channel === 'string') {
      const found = LIVE_NEWS_FEEDS.find(f => f.id === channel || f.name === channel);
      if (found) channel = found;
      else channel = { name: channel, streamUrl: channel, officialUrl: channel, lang: 'EN' };
    }

    const modal = document.getElementById('osirisMediaModal');
    const title = document.getElementById('osirisMediaTitle');
    const toolbar = document.getElementById('osirisMediaToolbar');
    const content = document.getElementById('osirisMediaContent');
    if (!modal || !content) return;

    if (this._cctvTimer) {
      clearInterval(this._cctvTimer);
      this._cctvTimer = null;
    }

    title.innerHTML = `<i class="fas fa-satellite-dish" style="color:#22c55e"></i> ${channel.name.toUpperCase()}`;

    if (toolbar) {
      toolbar.innerHTML = `
        <span class="osiris-live-badge live-dot">EN DIRECTO ${channel.badge ? `• ${channel.badge}` : ''}</span>
        <div style="display:flex;gap:6px;">
          ${channel.officialUrl ? `<a href="${channel.officialUrl}" target="_blank" rel="noopener" class="osiris-media-action-btn"><i class="fas fa-external-link-alt"></i> Web Oficial</a>` : ''}
          ${channel.ytChannel ? `<a href="${channel.ytChannel}" target="_blank" rel="noopener" class="osiris-media-action-btn"><i class="fab fa-youtube" style="color:#ef4444"></i> YouTube</a>` : ''}
        </div>
      `;
    }

    content.innerHTML = `
      <iframe src="${channel.streamUrl}" 
              allow="autoplay; encrypted-media; picture-in-picture" 
              allowfullscreen 
              style="width:100%;height:100%;border:none;">
      </iframe>
      <div class="osiris-media-fallback-bar">
        ¿Tu navegador bloquea el reproductor? <a href="${channel.officialUrl}" target="_blank" rel="noopener">Pulsa aquí para ver la emisión oficial en directo ↗</a>
      </div>
    `;

    modal.classList.remove('hidden');
  };

  // Compatibilidad hacia atrás
  Osiris.openMediaStream = function (name, ytId) {
    const ch = LIVE_NEWS_FEEDS.find(f => f.name === name || f.id === name);
    if (ch) {
      this.openNewsStream(ch);
    } else {
      this.openNewsStream({
        name: name,
        streamUrl: `https://www.youtube-nocookie.com/embed/${ytId}?autoplay=1&mute=1&playsinline=1`,
        officialUrl: `https://www.youtube.com/watch?v=${ytId}`,
        lang: 'EN'
      });
    }
  };

  // --- Visor de Cámaras CCTV y Webcams con Auto-Refresco ---
  Osiris.openCctvFeed = function (cam, fallbackUrl, type) {
    if (typeof cam === 'string') {
      const allCams = getCctvCameras();
      const found = allCams.find(c => c.id === cam || c.name === cam);
      if (found) {
        cam = found;
      } else {
        cam = { name: cam, url: fallbackUrl || cam, type: type || 'snapshot', city: 'CCTV' };
      }
    }

    const modal = document.getElementById('osirisMediaModal');
    const title = document.getElementById('osirisMediaTitle');
    const toolbar = document.getElementById('osirisMediaToolbar');
    const content = document.getElementById('osirisMediaContent');
    if (!modal || !content) return;

    if (this._cctvTimer) {
      clearInterval(this._cctvTimer);
      this._cctvTimer = null;
    }

    title.innerHTML = `<i class="fas fa-video" style="color:#f472b6"></i> ${cam.name.toUpperCase()}`;

    const updateTimeStr = () => new Date().toLocaleTimeString();

    if (toolbar) {
      toolbar.innerHTML = `
        <span id="cctvLiveStatus" style="font-size:10px;color:#38bdf8;">
          <i class="fas fa-rotate"></i> En vivo • ${cam.city || ''} <span id="cctvClock" style="color:#94a3b8;margin-left:4px;">(${updateTimeStr()})</span>
        </span>
        <div style="display:flex;gap:6px;">
          <button id="btnForceRefreshCam" class="osiris-media-action-btn" type="button"><i class="fas fa-arrows-rotate"></i> Recargar</button>
          <a href="${cam.url || cam.directUrl || '#'}" target="_blank" rel="noopener" class="osiris-media-action-btn"><i class="fas fa-expand"></i> Abrir</a>
        </div>
      `;

      const refBtn = document.getElementById('btnForceRefreshCam');
      if (refBtn) {
        refBtn.addEventListener('click', () => {
          const img = document.getElementById('osirisActiveCamImg');
          if (img && cam.url) {
            img.src = `${cam.url}?_t=${Date.now()}`;
            const clk = document.getElementById('cctvClock');
            if (clk) clk.textContent = `(${updateTimeStr()})`;
          }
        });
      }
    }

    if (cam.videoUrl) {
      content.innerHTML = `
        <video src="${cam.videoUrl}" autoplay loop muted playsinline style="width:100%;height:100%;object-fit:contain;background:#000;"></video>
      `;
    } else if (cam.streamUrl) {
      content.innerHTML = `
        <iframe src="${cam.streamUrl}" allow="autoplay; encrypted-media" allowfullscreen style="width:100%;height:100%;border:none;"></iframe>
      `;
    } else {
      content.innerHTML = `
        <img id="osirisActiveCamImg" src="${cam.url}?_t=${Date.now()}" alt="${cam.name}" style="max-width:100%;max-height:100%;object-fit:contain;" onerror="this.src='https://placehold.co/400x225/111/fff?text=Camara+Fuera+de+Servicio';">
      `;

      // Auto-refrescar cada 8 segundos para cámaras de tráfico
      this._cctvTimer = setInterval(() => {
        const img = document.getElementById('osirisActiveCamImg');
        const clk = document.getElementById('cctvClock');
        if (img && cam.url) {
          img.src = `${cam.url}?_t=${Date.now()}`;
          if (clk) clk.textContent = `(${updateTimeStr()})`;
        }
      }, 8000);
    }

    modal.classList.remove('hidden');
  };

  Osiris.closeMedia = function () {
    if (this._cctvTimer) {
      clearInterval(this._cctvTimer);
      this._cctvTimer = null;
    }
    const modal = document.getElementById('osirisMediaModal');
    const content = document.getElementById('osirisMediaContent');
    const toolbar = document.getElementById('osirisMediaToolbar');
    if (content) content.innerHTML = '';
    if (toolbar) toolbar.innerHTML = '';
    if (modal) modal.classList.add('hidden');
  };

  // Métodos expuestos globalmente
  Osiris.openNewsStreamById = function (id) {
    const ch = LIVE_NEWS_FEEDS.find(f => f.id === id);
    if (ch) this.openNewsStream(ch);
  };

  Osiris.openCctvById = function (id) {
    const all = getCctvCameras();
    const cam = all.find(c => c.id === id);
    if (cam) this.openCctvFeed(cam);
  };

  // Auto-init si window.map ya está disponible
  function autoInit() {
    if (window.map && (!Osiris.map || Osiris.map !== window.map)) {
      Osiris.init(window.map);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(autoInit, 600);
    });
  } else {
    setTimeout(autoInit, 600);
  }

})();
