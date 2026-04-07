// netlify/functions/get-chofer-trips.js

const Airtable = require('airtable');

// Configura tu base de Airtable
const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);
const TABLE_NAME = 'Viajes'; // Asegúrate de que este sea el nombre correcto de tu tabla de viajes en Airtable
const CHOF_TABLE_NAME = 'Choferes'; // Necesario para buscar el ID del chofer

exports.handler = async (event, context) => {
    // 1. Verificar el método HTTP
    if (event.httpMethod !== 'GET') {
        return {
            statusCode: 405,
            body: JSON.stringify({ message: 'Method Not Allowed' }),
            headers: { 'Allow': 'GET' }
        };
    }

    // 2. Verificar autenticación con Netlify Identity
    if (!context.clientContext || !context.clientContext.user) {
        return {
            statusCode: 401,
            body: JSON.stringify({ message: 'Acceso no autorizado. Debes iniciar sesión.' })
        };
    }

    try {
        const { type } = event.queryStringParameters; // Obtener 'type' de los parámetros de la URL
        const choferEmail = context.clientContext.user.email;

        if (!type || (type !== 'activos' && type !== 'historial')) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: 'Tipo de viaje inválido. Debe ser "activos" o "historial".' })
            };
        }

        // Primero, encontrar el ID del chofer en la tabla de Choferes
        const choferRecords = await base(CHOF_TABLE_NAME).select({
            filterByFormula: `{Email} = '${choferEmail}'`,
            maxRecords: 1
        }).firstPage();

        if (choferRecords.length === 0) {
            return {
                statusCode: 404,
                body: JSON.stringify({ message: 'Chofer no encontrado en Airtable.' })
            };
        }

        const choferId = choferRecords[0].id; // Este es el ID del registro del chofer en Airtable
        // Asumimos que la tabla 'Viajes' tiene un campo 'Chofer' que es un campo de tipo 'Link to another record'
        // que apunta al ID del chofer.

        let filterFormula;
        if (type === 'activos') {
            // Filtrar por viajes donde el campo 'Chofer' esté vinculado al chofer actual
            // Y el estado del viaje no sea 'Completado' o 'Cancelado'
            filterFormula = `AND({Chofer_Id} = '${choferId}', OR({Estado} = 'Pendiente', {Estado} = 'En Curso'))`;
        } else { // historial
            // Filtrar por viajes donde el campo 'Chofer' esté vinculado al chofer actual
            // Y el estado del viaje sea 'Completado' o 'Cancelado'
            filterFormula = `AND({Chofer_Id} = '${choferId}', OR({Estado} = 'Completado', {Estado} = 'Cancelado'))`;
        }

        const records = await base(TABLE_NAME).select({
            filterByFormula: filterFormula,
            sort: [{ field: 'Fecha', direction: 'desc' }] // Ordenar por fecha o un campo relevante
        }).firstPage();

        const trips = records.map(record => ({
            id: record.id,
            origin: record.fields['Origen'] || 'Desconocido',
            destination: record.fields['Destino'] || 'Desconocido',
            time: record.fields['Fecha'] ? new Date(record.fields['Fecha']).toLocaleString() : 'N/A',
            status: record.fields['Estado'] || 'Desconocido',
            // Añade más campos del viaje que quieras mostrar en el frontend
        }));

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization'
            },
            body: JSON.stringify(trips)
        };

    } catch (error) {
        console.error('Error en get-chofer-trips Netlify Function:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Error interno del servidor.', error: error.message })
      
};
    }
};
