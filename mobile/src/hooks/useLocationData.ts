export const LATAM_COUNTRIES = [
    { label: 'Argentina', value: 'AR' },
    { label: 'Bolivia', value: 'BO' },
    { label: 'Brasil', value: 'BR' },
    { label: 'Chile', value: 'CL' },
    { label: 'Colombia', value: 'CO' },
    { label: 'Costa Rica', value: 'CR' },
    { label: 'Cuba', value: 'CU' },
    { label: 'Ecuador', value: 'EC' },
    { label: 'El Salvador', value: 'SV' },
    { label: 'Guatemala', value: 'GT' },
    { label: 'Honduras', value: 'HN' },
    { label: 'México', value: 'MX' },
    { label: 'Nicaragua', value: 'NI' },
    { label: 'Panamá', value: 'PA' },
    { label: 'Paraguay', value: 'PY' },
    { label: 'Perú', value: 'PE' },
    { label: 'República Dominicana', value: 'DO' },
    { label: 'Uruguay', value: 'UY' },
    { label: 'Venezuela', value: 'VE' },
];

export const LATAM_STATES: Record<string, string[]> = {
    // Argentina
    AR: [
        'Buenos Aires', 'Catamarca', 'Chaco', 'Chubut', 'Córdoba', 'Corrientes', 'Entre Ríos',
        'Formosa', 'Jujuy', 'La Pampa', 'La Rioja', 'Mendoza', 'Misiones', 'Neuquén', 'Río Negro',
        'Salta', 'San Juan', 'San Luis', 'Santa Cruz', 'Santa Fe', 'Santiago del Estero',
        'Tierra del Fuego', 'Tucumán'
    ],
    // Brasil
    BR: [
        'Acre', 'Alagoas', 'Amapá', 'Amazonas', 'Bahia', 'Ceará', 'Distrito Federal', 'Espírito Santo',
        'Goiás', 'Maranhão', 'Mato Grosso', 'Mato Grosso do Sul', 'Minas Gerais', 'Pará', 'Paraíba',
        'Paraná', 'Pernambuco', 'Piauí', 'Rio de Janeiro', 'Rio Grande do Norte', 'Rio Grande do Sul',
        'Rondônia', 'Roraima', 'Santa Catarina', 'São Paulo', 'Sergipe', 'Tocantins'
    ],
    // Chile
    CL: [
        'Arica y Parinacota', 'Tarapacá', 'Antofagasta', 'Atacama', 'Coquimbo', 'Valparaíso',
        'Metropolitana de Santiago', 'O\'Higgins', 'Maule', 'Ñuble', 'Biobío', 'Araucanía',
        'Los Ríos', 'Los Lagos', 'Aysén', 'Magallanes'
    ],
    // Colombia
    CO: [
        'Amazonas', 'Antioquia', 'Arauca', 'Atlántico', 'Bogotá', 'Bolívar', 'Boyacá', 'Caldas',
        'Caquetá', 'Casanare', 'Cauca', 'Cesar', 'Chocó', 'Córdoba', 'Cundinamarca', 'Guainía',
        'Guaviare', 'Huila', 'La Guajira', 'Magdalena', 'Meta', 'Nariño', 'Norte de Santander',
        'Putumayo', 'Quindío', 'Risaralda', 'San Andrés y Providencia', 'Santander', 'Sucre',
        'Tolima', 'Valle del Cauca', 'Vaupés', 'Vichada'
    ],
    // México
    MX: [
        'Aguascalientes', 'Baja California', 'Baja California Sur', 'Campeche', 'Chiapas', 'Chihuahua',
        'Ciudad de México', 'Coahuila', 'Colima', 'Durango', 'Guanajuato', 'Guerrero', 'Hidalgo',
        'Jalisco', 'México', 'Michoacán', 'Morelos', 'Nayarit', 'Nuevo León', 'Oaxaca', 'Puebla',
        'Querétaro', 'Quintana Roo', 'San Luis Potosí', 'Sinaloa', 'Sonora', 'Tabasco', 'Tamaulipas',
        'Tlaxcala', 'Veracruz', 'Yucatán', 'Zacatecas'
    ],
    // Peru
    PE: [
        'Amazonas', 'Áncash', 'Apurímac', 'Arequipa', 'Ayacucho', 'Cajamarca', 'Callao', 'Cusco',
        'Huancavelica', 'Huánuco', 'Ica', 'Junín', 'La Libertad', 'Lambayeque', 'Lima', 'Loreto',
        'Madre de Dios', 'Moquegua', 'Pasco', 'Piura', 'Puno', 'San Martín', 'Tacna', 'Tumbes',
        'Ucayali'
    ],
    // Uruguay
    UY: [
        'Artigas', 'Canelones', 'Cerro Largo', 'Colonia', 'Durazno', 'Flores', 'Florida', 'Lavalleja',
        'Maldonado', 'Montevideo', 'Paysandú', 'Río Negro', 'Rivera', 'Rocha', 'Salto', 'San José',
        'Soriano', 'Tacuarembó', 'Treinta y Tres'
    ],
    // Venezuela
    VE: [
        'Amazonas', 'Anzoátegui', 'Apure', 'Aragua', 'Barinas', 'Bolívar', 'Carabobo', 'Cojedes',
        'Delta Amacuro', 'Distrito Capital', 'Falcón', 'Guárico', 'La Guaira', 'Lara', 'Mérida',
        'Miranda', 'Monagas', 'Nueva Esparta', 'Portuguesa', 'Sucre', 'Táchira', 'Trujillo',
        'Yaracuy', 'Zulia'
    ],
    // Default fallback for others (can be expanded later)
    DEFAULT: ['Outro / Other']
};

export const useLocationData = () => {
    const getStates = (countryCode: string) => {
        return LATAM_STATES[countryCode] || LATAM_STATES['DEFAULT'];
    };

    return {
        countries: LATAM_COUNTRIES,
        getStates
    };
};
