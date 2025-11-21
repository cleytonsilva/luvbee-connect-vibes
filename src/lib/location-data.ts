// Dados de países da América Latina
export interface Country {
  code: string
  name: string
}

export interface State {
  code: string
  name: string
}

export interface City {
  name: string
}

export const LATAM_COUNTRIES: Country[] = [
  { code: 'BR', name: 'Brasil' },
  { code: 'AR', name: 'Argentina' },
  { code: 'CL', name: 'Chile' },
  { code: 'CO', name: 'Colômbia' },
  { code: 'MX', name: 'México' },
  { code: 'PE', name: 'Peru' },
  { code: 'VE', name: 'Venezuela' },
  { code: 'UY', name: 'Uruguai' },
  { code: 'PY', name: 'Paraguai' },
  { code: 'BO', name: 'Bolívia' },
  { code: 'EC', name: 'Equador' },
  { code: 'CR', name: 'Costa Rica' },
  { code: 'PA', name: 'Panamá' },
  { code: 'GT', name: 'Guatemala' },
  { code: 'SV', name: 'El Salvador' },
  { code: 'HN', name: 'Honduras' },
  { code: 'NI', name: 'Nicarágua' },
  { code: 'DO', name: 'República Dominicana' },
  { code: 'CU', name: 'Cuba' },
  { code: 'PR', name: 'Porto Rico' }
]

// Estados do Brasil
export const BRAZIL_STATES: State[] = [
  { code: 'AC', name: 'Acre' },
  { code: 'AL', name: 'Alagoas' },
  { code: 'AP', name: 'Amapá' },
  { code: 'AM', name: 'Amazonas' },
  { code: 'BA', name: 'Bahia' },
  { code: 'CE', name: 'Ceará' },
  { code: 'DF', name: 'Distrito Federal' },
  { code: 'ES', name: 'Espírito Santo' },
  { code: 'GO', name: 'Goiás' },
  { code: 'MA', name: 'Maranhão' },
  { code: 'MT', name: 'Mato Grosso' },
  { code: 'MS', name: 'Mato Grosso do Sul' },
  { code: 'MG', name: 'Minas Gerais' },
  { code: 'PA', name: 'Pará' },
  { code: 'PB', name: 'Paraíba' },
  { code: 'PR', name: 'Paraná' },
  { code: 'PE', name: 'Pernambuco' },
  { code: 'PI', name: 'Piauí' },
  { code: 'RJ', name: 'Rio de Janeiro' },
  { code: 'RN', name: 'Rio Grande do Norte' },
  { code: 'RS', name: 'Rio Grande do Sul' },
  { code: 'RO', name: 'Rondônia' },
  { code: 'RR', name: 'Roraima' },
  { code: 'SC', name: 'Santa Catarina' },
  { code: 'SP', name: 'São Paulo' },
  { code: 'SE', name: 'Sergipe' },
  { code: 'TO', name: 'Tocantins' }
]

// Estados da Argentina
export const ARGENTINA_STATES: State[] = [
  { code: 'BA', name: 'Buenos Aires' },
  { code: 'CT', name: 'Catamarca' },
  { code: 'CC', name: 'Chaco' },
  { code: 'CH', name: 'Chubut' },
  { code: 'CB', name: 'Córdoba' },
  { code: 'CR', name: 'Corrientes' },
  { code: 'ER', name: 'Entre Ríos' },
  { code: 'FO', name: 'Formosa' },
  { code: 'JY', name: 'Jujuy' },
  { code: 'LP', name: 'La Pampa' },
  { code: 'LR', name: 'La Rioja' },
  { code: 'MZ', name: 'Mendoza' },
  { code: 'MN', name: 'Misiones' },
  { code: 'NQ', name: 'Neuquén' },
  { code: 'RN', name: 'Río Negro' },
  { code: 'SA', name: 'Salta' },
  { code: 'SJ', name: 'San Juan' },
  { code: 'SL', name: 'San Luis' },
  { code: 'SC', name: 'Santa Cruz' },
  { code: 'SF', name: 'Santa Fe' },
  { code: 'SE', name: 'Santiago del Estero' },
  { code: 'TF', name: 'Tierra del Fuego' },
  { code: 'TU', name: 'Tucumán' }
]

// Estados do México
export const MEXICO_STATES: State[] = [
  { code: 'AGU', name: 'Aguascalientes' },
  { code: 'BCN', name: 'Baja California' },
  { code: 'BCS', name: 'Baja California Sur' },
  { code: 'CAM', name: 'Campeche' },
  { code: 'CHP', name: 'Chiapas' },
  { code: 'CHH', name: 'Chihuahua' },
  { code: 'COA', name: 'Coahuila' },
  { code: 'COL', name: 'Colima' },
  { code: 'DIF', name: 'Ciudad de México' },
  { code: 'DUR', name: 'Durango' },
  { code: 'GUA', name: 'Guanajuato' },
  { code: 'GRO', name: 'Guerrero' },
  { code: 'HID', name: 'Hidalgo' },
  { code: 'JAL', name: 'Jalisco' },
  { code: 'MEX', name: 'Estado de México' },
  { code: 'MIC', name: 'Michoacán' },
  { code: 'MOR', name: 'Morelos' },
  { code: 'NAY', name: 'Nayarit' },
  { code: 'NLE', name: 'Nuevo León' },
  { code: 'OAX', name: 'Oaxaca' },
  { code: 'PUE', name: 'Puebla' },
  { code: 'QUE', name: 'Querétaro' },
  { code: 'ROO', name: 'Quintana Roo' },
  { code: 'SLP', name: 'San Luis Potosí' },
  { code: 'SIN', name: 'Sinaloa' },
  { code: 'SON', name: 'Sonora' },
  { code: 'TAB', name: 'Tabasco' },
  { code: 'TAM', name: 'Tamaulipas' },
  { code: 'TLA', name: 'Tlaxcala' },
  { code: 'VER', name: 'Veracruz' },
  { code: 'YUC', name: 'Yucatán' },
  { code: 'ZAC', name: 'Zacatecas' }
]

// Estados da Colômbia
export const COLOMBIA_STATES: State[] = [
  { code: 'AMA', name: 'Amazonas' },
  { code: 'ANT', name: 'Antioquia' },
  { code: 'ARA', name: 'Arauca' },
  { code: 'ATL', name: 'Atlántico' },
  { code: 'BOL', name: 'Bolívar' },
  { code: 'BOY', name: 'Boyacá' },
  { code: 'CAL', name: 'Caldas' },
  { code: 'CAQ', name: 'Caquetá' },
  { code: 'CAS', name: 'Casanare' },
  { code: 'CAU', name: 'Cauca' },
  { code: 'CES', name: 'Cesar' },
  { code: 'CHO', name: 'Chocó' },
  { code: 'COR', name: 'Córdoba' },
  { code: 'CUN', name: 'Cundinamarca' },
  { code: 'DC', name: 'Bogotá D.C.' },
  { code: 'GUA', name: 'Guainía' },
  { code: 'GUV', name: 'Guaviare' },
  { code: 'HUI', name: 'Huila' },
  { code: 'LAG', name: 'La Guajira' },
  { code: 'MAG', name: 'Magdalena' },
  { code: 'MET', name: 'Meta' },
  { code: 'NAR', name: 'Nariño' },
  { code: 'NSA', name: 'Norte de Santander' },
  { code: 'PUT', name: 'Putumayo' },
  { code: 'QUI', name: 'Quindío' },
  { code: 'RIS', name: 'Risaralda' },
  { code: 'SAN', name: 'Santander' },
  { code: 'SAP', name: 'San Andrés y Providencia' },
  { code: 'SUC', name: 'Sucre' },
  { code: 'TOL', name: 'Tolima' },
  { code: 'VAC', name: 'Valle del Cauca' },
  { code: 'VAU', name: 'Vaupés' },
  { code: 'VID', name: 'Vichada' }
]

// Estados do Chile
export const CHILE_STATES: State[] = [
  { code: 'AR', name: 'Arica y Parinacota' },
  { code: 'TA', name: 'Tarapacá' },
  { code: 'AN', name: 'Antofagasta' },
  { code: 'AT', name: 'Atacama' },
  { code: 'CO', name: 'Coquimbo' },
  { code: 'VA', name: 'Valparaíso' },
  { code: 'RM', name: 'Región Metropolitana' },
  { code: 'OH', name: 'O\'Higgins' },
  { code: 'MA', name: 'Maule' },
  { code: 'NB', name: 'Ñuble' },
  { code: 'BI', name: 'Biobío' },
  { code: 'AR', name: 'Araucanía' },
  { code: 'LR', name: 'Los Ríos' },
  { code: 'LL', name: 'Los Lagos' },
  { code: 'AI', name: 'Aysén' },
  { code: 'MG', name: 'Magallanes' }
]

// Estados do Peru
export const PERU_STATES: State[] = [
  { code: 'AMA', name: 'Amazonas' },
  { code: 'ANC', name: 'Ancash' },
  { code: 'APU', name: 'Apurímac' },
  { code: 'ARE', name: 'Arequipa' },
  { code: 'AYA', name: 'Ayacucho' },
  { code: 'CAJ', name: 'Cajamarca' },
  { code: 'CAL', name: 'Callao' },
  { code: 'CUS', name: 'Cusco' },
  { code: 'HUV', name: 'Huancavelica' },
  { code: 'HUA', name: 'Huánuco' },
  { code: 'ICA', name: 'Ica' },
  { code: 'JUN', name: 'Junín' },
  { code: 'LAL', name: 'La Libertad' },
  { code: 'LAM', name: 'Lambayeque' },
  { code: 'LIM', name: 'Lima' },
  { code: 'LOR', name: 'Loreto' },
  { code: 'MDD', name: 'Madre de Dios' },
  { code: 'MOQ', name: 'Moquegua' },
  { code: 'PAS', name: 'Pasco' },
  { code: 'PIU', name: 'Piura' },
  { code: 'PUN', name: 'Puno' },
  { code: 'SAM', name: 'San Martín' },
  { code: 'TAC', name: 'Tacna' },
  { code: 'TUM', name: 'Tumbes' },
  { code: 'UCA', name: 'Ucayali' }
]

// Estados da Venezuela
export const VENEZUELA_STATES: State[] = [
  { code: 'AMA', name: 'Amazonas' },
  { code: 'ANZ', name: 'Anzoátegui' },
  { code: 'APU', name: 'Apure' },
  { code: 'ARA', name: 'Aragua' },
  { code: 'BAR', name: 'Barinas' },
  { code: 'BOL', name: 'Bolívar' },
  { code: 'CAR', name: 'Carabobo' },
  { code: 'COJ', name: 'Cojedes' },
  { code: 'DEL', name: 'Delta Amacuro' },
  { code: 'FAL', name: 'Falcón' },
  { code: 'GUA', name: 'Guárico' },
  { code: 'LAR', name: 'Lara' },
  { code: 'MER', name: 'Mérida' },
  { code: 'MIR', name: 'Miranda' },
  { code: 'MON', name: 'Monagas' },
  { code: 'NES', name: 'Nueva Esparta' },
  { code: 'POR', name: 'Portuguesa' },
  { code: 'SUC', name: 'Sucre' },
  { code: 'TAC', name: 'Táchira' },
  { code: 'TRU', name: 'Trujillo' },
  { code: 'VAR', name: 'Vargas' },
  { code: 'YAR', name: 'Yaracuy' },
  { code: 'ZUL', name: 'Zulia' },
  { code: 'DC', name: 'Distrito Capital' }
]

// Estados do Uruguai
export const URUGUAY_STATES: State[] = [
  { code: 'AR', name: 'Artigas' },
  { code: 'CA', name: 'Canelones' },
  { code: 'CL', name: 'Cerro Largo' },
  { code: 'CO', name: 'Colonia' },
  { code: 'DU', name: 'Durazno' },
  { code: 'FS', name: 'Flores' },
  { code: 'FD', name: 'Florida' },
  { code: 'LA', name: 'Lavalleja' },
  { code: 'MA', name: 'Maldonado' },
  { code: 'MO', name: 'Montevideo' },
  { code: 'PA', name: 'Paysandú' },
  { code: 'RN', name: 'Río Negro' },
  { code: 'RV', name: 'Rivera' },
  { code: 'RO', name: 'Rocha' },
  { code: 'SA', name: 'Salto' },
  { code: 'SJ', name: 'San José' },
  { code: 'SO', name: 'Soriano' },
  { code: 'TA', name: 'Tacuarembó' },
  { code: 'TT', name: 'Treinta y Tres' }
]

// Estados do Paraguai
export const PARAGUAY_STATES: State[] = [
  { code: 'ASU', name: 'Asunción' },
  { code: '1', name: 'Concepción' },
  { code: '2', name: 'San Pedro' },
  { code: '3', name: 'Cordillera' },
  { code: '4', name: 'Guairá' },
  { code: '5', name: 'Caaguazú' },
  { code: '6', name: 'Caazapá' },
  { code: '7', name: 'Itapúa' },
  { code: '8', name: 'Misiones' },
  { code: '9', name: 'Paraguarí' },
  { code: '10', name: 'Alto Paraná' },
  { code: '11', name: 'Central' },
  { code: '12', name: 'Ñeembucú' },
  { code: '13', name: 'Amambay' },
  { code: '14', name: 'Canindeyú' },
  { code: '15', name: 'Presidente Hayes' },
  { code: '16', name: 'Alto Paraguay' },
  { code: '17', name: 'Boquerón' }
]

// Estados da Bolívia
export const BOLIVIA_STATES: State[] = [
  { code: 'B', name: 'Beni' },
  { code: 'H', name: 'Chuquisaca' },
  { code: 'C', name: 'Cochabamba' },
  { code: 'L', name: 'La Paz' },
  { code: 'O', name: 'Oruro' },
  { code: 'N', name: 'Pando' },
  { code: 'P', name: 'Potosí' },
  { code: 'S', name: 'Santa Cruz' },
  { code: 'T', name: 'Tarija' }
]

// Estados do Equador
export const ECUADOR_STATES: State[] = [
  { code: 'A', name: 'Azuay' },
  { code: 'B', name: 'Bolívar' },
  { code: 'F', name: 'Cañar' },
  { code: 'C', name: 'Carchi' },
  { code: 'H', name: 'Chimborazo' },
  { code: 'X', name: 'Cotopaxi' },
  { code: 'O', name: 'El Oro' },
  { code: 'E', name: 'Esmeraldas' },
  { code: 'W', name: 'Galápagos' },
  { code: 'G', name: 'Guayas' },
  { code: 'I', name: 'Imbabura' },
  { code: 'L', name: 'Loja' },
  { code: 'R', name: 'Los Ríos' },
  { code: 'M', name: 'Manabí' },
  { code: 'S', name: 'Morona Santiago' },
  { code: 'N', name: 'Napo' },
  { code: 'D', name: 'Orellana' },
  { code: 'Y', name: 'Pastaza' },
  { code: 'P', name: 'Pichincha' },
  { code: 'SE', name: 'Santa Elena' },
  { code: 'SD', name: 'Santo Domingo de los Tsáchilas' },
  { code: 'U', name: 'Sucumbíos' },
  { code: 'T', name: 'Tungurahua' },
  { code: 'Z', name: 'Zamora Chinchipe' }
]

// Estados de outros países (simplificado)
export const OTHER_STATES: Record<string, State[]> = {
  'CR': [{ code: 'SJ', name: 'San José' }, { code: 'AL', name: 'Alajuela' }, { code: 'CA', name: 'Cartago' }, { code: 'HE', name: 'Heredia' }, { code: 'GU', name: 'Guanacaste' }, { code: 'PU', name: 'Puntarenas' }, { code: 'LI', name: 'Limón' }],
  'PA': [{ code: '1', name: 'Bocas del Toro' }, { code: '2', name: 'Coclé' }, { code: '3', name: 'Colón' }, { code: '4', name: 'Chiriquí' }, { code: '5', name: 'Darién' }, { code: '6', name: 'Herrera' }, { code: '7', name: 'Los Santos' }, { code: '8', name: 'Panamá' }, { code: '9', name: 'Veraguas' }, { code: '10', name: 'Guna Yala' }, { code: '11', name: 'Emberá-Wounaan' }, { code: '12', name: 'Ngäbe-Buglé' }],
  'GT': [{ code: 'AV', name: 'Alta Verapaz' }, { code: 'BV', name: 'Baja Verapaz' }, { code: 'CM', name: 'Chimaltenango' }, { code: 'CQ', name: 'Chiquimula' }, { code: 'PR', name: 'El Progreso' }, { code: 'ES', name: 'Escuintla' }, { code: 'GU', name: 'Guatemala' }, { code: 'HU', name: 'Huehuetenango' }, { code: 'IZ', name: 'Izabal' }, { code: 'JA', name: 'Jalapa' }, { code: 'JU', name: 'Jutiapa' }, { code: 'PE', name: 'Petén' }, { code: 'QZ', name: 'Quetzaltenango' }, { code: 'QC', name: 'Quiché' }, { code: 'RE', name: 'Retalhuleu' }, { code: 'SA', name: 'Sacatepéquez' }, { code: 'SM', name: 'San Marcos' }, { code: 'SR', name: 'Santa Rosa' }, { code: 'SO', name: 'Sololá' }, { code: 'SU', name: 'Suchitepéquez' }, { code: 'TO', name: 'Totonicapán' }, { code: 'ZA', name: 'Zacapa' }],
  'SV': [{ code: 'AH', name: 'Ahuachapán' }, { code: 'CA', name: 'Cabañas' }, { code: 'CH', name: 'Chalatenango' }, { code: 'CU', name: 'Cuscatlán' }, { code: 'LI', name: 'La Libertad' }, { code: 'PA', name: 'La Paz' }, { code: 'UN', name: 'La Unión' }, { code: 'MO', name: 'Morazán' }, { code: 'SM', name: 'San Miguel' }, { code: 'SS', name: 'San Salvador' }, { code: 'SV', name: 'San Vicente' }, { code: 'SA', name: 'Santa Ana' }, { code: 'SO', name: 'Sonsonate' }, { code: 'US', name: 'Usulután' }],
  'HN': [{ code: 'AT', name: 'Atlántida' }, { code: 'CH', name: 'Choluteca' }, { code: 'CL', name: 'Colón' }, { code: 'CM', name: 'Comayagua' }, { code: 'CP', name: 'Copán' }, { code: 'CR', name: 'Cortés' }, { code: 'EP', name: 'El Paraíso' }, { code: 'FM', name: 'Francisco Morazán' }, { code: 'GD', name: 'Gracias a Dios' }, { code: 'IN', name: 'Intibucá' }, { code: 'IB', name: 'Islas de la Bahía' }, { code: 'LP', name: 'La Paz' }, { code: 'LE', name: 'Lempira' }, { code: 'OC', name: 'Ocotepeque' }, { code: 'OL', name: 'Olancho' }, { code: 'SB', name: 'Santa Bárbara' }, { code: 'VA', name: 'Valle' }, { code: 'YO', name: 'Yoro' }],
  'NI': [{ code: 'AN', name: 'Atlántico Norte' }, { code: 'AS', name: 'Atlántico Sur' }, { code: 'BO', name: 'Boaco' }, { code: 'CA', name: 'Carazo' }, { code: 'CI', name: 'Chinandega' }, { code: 'CO', name: 'Chontales' }, { code: 'ES', name: 'Estelí' }, { code: 'GR', name: 'Granada' }, { code: 'JI', name: 'Jinotega' }, { code: 'LE', name: 'León' }, { code: 'MD', name: 'Madriz' }, { code: 'MN', name: 'Managua' }, { code: 'MS', name: 'Masaya' }, { code: 'MT', name: 'Matagalpa' }, { code: 'NS', name: 'Nueva Segovia' }, { code: 'RI', name: 'Rivas' }, { code: 'SJ', name: 'Río San Juan' }],
  'DO': [{ code: '01', name: 'Distrito Nacional' }, { code: '02', name: 'Azua' }, { code: '03', name: 'Baoruco' }, { code: '04', name: 'Barahona' }, { code: '05', name: 'Dajabón' }, { code: '06', name: 'Duarte' }, { code: '07', name: 'Elías Piña' }, { code: '08', name: 'Espaillat' }, { code: '09', name: 'Independencia' }, { code: '10', name: 'La Altagracia' }, { code: '11', name: 'La Romana' }, { code: '12', name: 'La Vega' }, { code: '13', name: 'María Trinidad Sánchez' }, { code: '14', name: 'Monseñor Nouel' }, { code: '15', name: 'Monte Cristi' }, { code: '16', name: 'Monte Plata' }, { code: '17', name: 'Pedernales' }, { code: '18', name: 'Peravia' }, { code: '19', name: 'Puerto Plata' }, { code: '20', name: 'Hermanas Mirabal' }, { code: '21', name: 'Samaná' }, { code: '22', name: 'San Cristóbal' }, { code: '23', name: 'San Juan' }, { code: '24', name: 'San Pedro de Macorís' }, { code: '25', name: 'Sánchez Ramírez' }, { code: '26', name: 'Santiago' }, { code: '27', name: 'Santiago Rodríguez' }, { code: '28', name: 'Santo Domingo' }, { code: '29', name: 'Valverde' }],
  'CU': [{ code: '15', name: 'Artemisa' }, { code: '09', name: 'Camagüey' }, { code: '08', name: 'Ciego de Ávila' }, { code: '06', name: 'Cienfuegos' }, { code: '12', name: 'Granma' }, { code: '14', name: 'Guantánamo' }, { code: '11', name: 'Holguín' }, { code: '03', name: 'La Habana' }, { code: '10', name: 'Las Tunas' }, { code: '04', name: 'Matanzas' }, { code: '16', name: 'Mayabeque' }, { code: '01', name: 'Pinar del Río' }, { code: '07', name: 'Sancti Spíritus' }, { code: '13', name: 'Santiago de Cuba' }, { code: '05', name: 'Villa Clara' }],
  'PR': [{ code: 'ADJ', name: 'Adjuntas' }, { code: 'AGU', name: 'Aguada' }, { code: 'AGU', name: 'Aguadilla' }, { code: 'AGU', name: 'Aguas Buenas' }, { code: 'AIB', name: 'Aibonito' }, { code: 'ARE', name: 'Arecibo' }, { code: 'ARI', name: 'Arroyo' }, { code: 'BAY', name: 'Barceloneta' }, { code: 'BAR', name: 'Barranquitas' }, { code: 'BAY', name: 'Bayamón' }, { code: 'CAB', name: 'Cabo Rojo' }, { code: 'CAG', name: 'Caguas' }, { code: 'CAM', name: 'Camuy' }, { code: 'CAN', name: 'Canóvanas' }, { code: 'CAR', name: 'Carolina' }, { code: 'CAT', name: 'Cataño' }, { code: 'CAY', name: 'Cayey' }, { code: 'CEI', name: 'Ceiba' }, { code: 'CID', name: 'Cidra' }, { code: 'COA', name: 'Coamo' }, { code: 'COM', name: 'Comerío' }, { code: 'COR', name: 'Corozal' }, { code: 'CUL', name: 'Culebra' }, { code: 'DOR', name: 'Dorado' }, { code: 'FAJ', name: 'Fajardo' }, { code: 'FLOR', name: 'Florida' }, { code: 'GUA', name: 'Guánica' }, { code: 'GUA', name: 'Guayama' }, { code: 'GUA', name: 'Guayanilla' }, { code: 'GUA', name: 'Guaynabo' }, { code: 'GUR', name: 'Gurabo' }, { code: 'HAT', name: 'Hatillo' }, { code: 'HOR', name: 'Hormigueros' }, { code: 'HUM', name: 'Humacao' }, { code: 'ISA', name: 'Isabela' }, { code: 'JAY', name: 'Jayuya' }, { code: 'JUA', name: 'Juana Díaz' }, { code: 'JUN', name: 'Juncos' }, { code: 'LAJ', name: 'Lajas' }, { code: 'LAR', name: 'Lares' }, { code: 'LAS', name: 'Las Marías' }, { code: 'LAS', name: 'Las Piedras' }, { code: 'LOI', name: 'Loíza' }, { code: 'LUQ', name: 'Luquillo' }, { code: 'MAN', name: 'Manatí' }, { code: 'MAR', name: 'Maricao' }, { code: 'MAU', name: 'Maunabo' }, { code: 'MAY', name: 'Mayagüez' }, { code: 'MOC', name: 'Moca' }, { code: 'MOR', name: 'Morovis' }, { code: 'NAG', name: 'Naguabo' }, { code: 'NAG', name: 'Naranjito' }, { code: 'ORO', name: 'Orocovis' }, { code: 'PAT', name: 'Patillas' }, { code: 'PEÑ', name: 'Peñuelas' }, { code: 'PON', name: 'Ponce' }, { code: 'QUE', name: 'Quebradillas' }, { code: 'RIN', name: 'Rincón' }, { code: 'RIO', name: 'Río Grande' }, { code: 'SAB', name: 'Sabana Grande' }, { code: 'SAL', name: 'Salinas' }, { code: 'SAN', name: 'San Germán' }, { code: 'SAN', name: 'San Juan' }, { code: 'SAN', name: 'San Lorenzo' }, { code: 'SAN', name: 'San Sebastián' }, { code: 'SAN', name: 'Santa Isabel' }, { code: 'TOA', name: 'Toa Alta' }, { code: 'TOA', name: 'Toa Baja' }, { code: 'TRU', name: 'Trujillo Alto' }, { code: 'UTU', name: 'Utuado' }, { code: 'VEG', name: 'Vega Alta' }, { code: 'VEG', name: 'Vega Baja' }, { code: 'VIE', name: 'Vieques' }, { code: 'VIL', name: 'Villalba' }, { code: 'YAB', name: 'Yabucoa' }, { code: 'YAU', name: 'Yauco' }]
}

// Função para obter estados por país
export function getStatesByCountry(countryCode: string): State[] {
  switch (countryCode) {
    case 'BR': return BRAZIL_STATES
    case 'AR': return ARGENTINA_STATES
    case 'MX': return MEXICO_STATES
    case 'CO': return COLOMBIA_STATES
    case 'CL': return CHILE_STATES
    case 'PE': return PERU_STATES
    case 'VE': return VENEZUELA_STATES
    case 'UY': return URUGUAY_STATES
    case 'PY': return PARAGUAY_STATES
    case 'BO': return BOLIVIA_STATES
    case 'EC': return ECUADOR_STATES
    default: return OTHER_STATES[countryCode] || []
  }
}

// Cidades principais por estado (exemplo simplificado - em produção, usar API ou banco de dados)
// Para este exemplo, vamos criar uma função que retorna cidades principais
export function getCitiesByState(countryCode: string, stateCode: string): City[] {
  // Em produção, isso viria de uma API ou banco de dados
  // Por enquanto, retornamos algumas cidades principais por estado brasileiro como exemplo
  const brazilCities: Record<string, City[]> = {
    'SP': [
      { name: 'São Paulo' },
      { name: 'Campinas' },
      { name: 'Guarulhos' },
      { name: 'São Bernardo do Campo' },
      { name: 'Santo André' },
      { name: 'Osasco' },
      { name: 'Ribeirão Preto' },
      { name: 'Sorocaba' },
      { name: 'Santos' },
      { name: 'Mauá' }
    ],
    'RJ': [
      { name: 'Rio de Janeiro' },
      { name: 'São Gonçalo' },
      { name: 'Duque de Caxias' },
      { name: 'Nova Iguaçu' },
      { name: 'Niterói' },
      { name: 'Campos dos Goytacazes' },
      { name: 'Belford Roxo' },
      { name: 'São João de Meriti' },
      { name: 'Petrópolis' },
      { name: 'Volta Redonda' }
    ],
    'MG': [
      { name: 'Belo Horizonte' },
      { name: 'Uberlândia' },
      { name: 'Contagem' },
      { name: 'Juiz de Fora' },
      { name: 'Betim' },
      { name: 'Montes Claros' },
      { name: 'Ribeirão das Neves' },
      { name: 'Uberaba' },
      { name: 'Governador Valadares' },
      { name: 'Ipatinga' }
    ],
    'RS': [
      { name: 'Porto Alegre' },
      { name: 'Caxias do Sul' },
      { name: 'Pelotas' },
      { name: 'Canoas' },
      { name: 'Santa Maria' },
      { name: 'Gravataí' },
      { name: 'Viamão' },
      { name: 'Novo Hamburgo' },
      { name: 'São Leopoldo' },
      { name: 'Rio Grande' }
    ],
    'PR': [
      { name: 'Curitiba' },
      { name: 'Londrina' },
      { name: 'Maringá' },
      { name: 'Ponta Grossa' },
      { name: 'Cascavel' },
      { name: 'São José dos Pinhais' },
      { name: 'Foz do Iguaçu' },
      { name: 'Colombo' },
      { name: 'Guarapuava' },
      { name: 'Paranaguá' }
    ],
    'SC': [
      { name: 'Florianópolis' },
      { name: 'Joinville' },
      { name: 'Blumenau' },
      { name: 'São José' },
      { name: 'Criciúma' },
      { name: 'Chapecó' },
      { name: 'Itajaí' },
      { name: 'Lages' },
      { name: 'Jaraguá do Sul' },
      { name: 'Palhoça' }
    ],
    'BA': [
      { name: 'Salvador' },
      { name: 'Feira de Santana' },
      { name: 'Vitória da Conquista' },
      { name: 'Camaçari' },
      { name: 'Juazeiro' },
      { name: 'Ilhéus' },
      { name: 'Itabuna' },
      { name: 'Jequié' },
      { name: 'Alagoinhas' },
      { name: 'Barreiras' }
    ],
    'GO': [
      { name: 'Goiânia' },
      { name: 'Aparecida de Goiânia' },
      { name: 'Anápolis' },
      { name: 'Rio Verde' },
      { name: 'Luziânia' },
      { name: 'Águas Lindas de Goiás' },
      { name: 'Valparaíso de Goiás' },
      { name: 'Trindade' },
      { name: 'Formosa' },
      { name: 'Novo Gama' }
    ],
    'PE': [
      { name: 'Recife' },
      { name: 'Jaboatão dos Guararapes' },
      { name: 'Olinda' },
      { name: 'Caruaru' },
      { name: 'Petrolina' },
      { name: 'Paulista' },
      { name: 'Cabo de Santo Agostinho' },
      { name: 'Camaragibe' },
      { name: 'Garanhuns' },
      { name: 'Vitória de Santo Antão' }
    ],
    'CE': [
      { name: 'Fortaleza' },
      { name: 'Caucaia' },
      { name: 'Juazeiro do Norte' },
      { name: 'Maracanaú' },
      { name: 'Sobral' },
      { name: 'Crato' },
      { name: 'Itapipoca' },
      { name: 'Maranguape' },
      { name: 'Iguatu' },
      { name: 'Quixadá' }
    ]
  }

  if (countryCode === 'BR' && brazilCities[stateCode]) {
    return brazilCities[stateCode]
  }

  // Para outros países/estados, retornar algumas cidades principais como exemplo
  // Em produção, isso viria de uma API ou banco de dados completo
  const otherCities: Record<string, Record<string, City[]>> = {
    'AR': {
      'BA': [{ name: 'Buenos Aires' }, { name: 'La Plata' }, { name: 'Mar del Plata' }],
      'CB': [{ name: 'Córdoba' }, { name: 'Villa María' }, { name: 'Río Cuarto' }],
      'SF': [{ name: 'Santa Fe' }, { name: 'Rosario' }, { name: 'Rafaela' }]
    },
    'MX': {
      'DIF': [{ name: 'Ciudad de México' }, { name: 'Iztapalapa' }, { name: 'Gustavo A. Madero' }],
      'JAL': [{ name: 'Guadalajara' }, { name: 'Zapopan' }, { name: 'Tlaquepaque' }],
      'NLE': [{ name: 'Monterrey' }, { name: 'San Pedro Garza García' }, { name: 'Guadalupe' }]
    },
    'CO': {
      'DC': [{ name: 'Bogotá' }, { name: 'Soacha' }, { name: 'Chía' }],
      'ANT': [{ name: 'Medellín' }, { name: 'Bello' }, { name: 'Itagüí' }],
      'VAC': [{ name: 'Cali' }, { name: 'Palmira' }, { name: 'Buenaventura' }]
    },
    'CL': {
      'RM': [{ name: 'Santiago' }, { name: 'Puente Alto' }, { name: 'Maipú' }],
      'VA': [{ name: 'Valparaíso' }, { name: 'Viña del Mar' }, { name: 'Quilpué' }]
    },
    'PE': {
      'LIM': [{ name: 'Lima' }, { name: 'Callao' }, { name: 'San Juan de Lurigancho' }],
      'ARE': [{ name: 'Arequipa' }, { name: 'Cerro Colorado' }, { name: 'Yanahuara' }]
    }
  }

  if (otherCities[countryCode] && otherCities[countryCode][stateCode]) {
    return otherCities[countryCode][stateCode]
  }

  // Se não houver cidades disponíveis, retornar lista vazia
  return []
}

