// netlify/functions/end-trip.js

const Airtable = require('airtable');

// Configura tu base de Airtable
const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);
const TRIPS_TABLE_NAME = 'Viajes'; // La tabla de viajes
const CHOF_TABLE_NAME = 'Choferes'; // La tabla de choferes

exports.handler = async (event, context) => {
    // 1. Verificar el método HTTP
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ message: 'Method Not Allowed' }),
            headers: { 'Allow': 'POST' }
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
        const { choferEmail } = JSON.parse(event.body);

        if (!choferEmail) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: 'Email del chofer es requerido.' })
            };
        }

        // Asegurarse de que el email recibido en el body coincide con el del usuario autenticado
        if (choferEmail !== context.clientContext.user.email) {
            return {
                statusCode: 403,
                body: JSON.stringify({ message: 'No tienes permiso para finalizar un viaje de otro chofer.' })
            };
        }

        // 3. Obtener el ID del chofer desde la tabla de Choferes
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
        const choferId = choferRecords[0].id;

        // 4. Buscar un viaje EN CURSO asignado a este chofer
        // Asume que los viajes están vinculados a los choferes por el ID del registro del chofer
        const inProgressTrips = await base(TRIPS_TABLE_NAME).select({
            filterByFormula: `AND({Chofer_Id} = '${choferId}', {Estado} = 'En Curso')`,
            maxRecords: 1, // Obtener solo el viaje activo
            sort: [{field: 'HoraInicioReal', direction: 'desc'}] // Para asegurar que agarramos el más reciente si hay varios en curso (idealmente no debería haber)
        }).firstPage();

        if (inProgressTrips.length === 0) {
            return {
                statusCode: 404,
                body: JSON.stringify({ message: 'No se encontró ningún viaje en curso asignado a este chofer.' })
            };
        }

        const tripToEnd = inProgressTrips[0];
        const tripId = tripToEnd.id;

        // 5. Actualizar el estado del viaje a 'Completado' y registrar la hora de finalización
        const updatedTrip = await base(TRIPS_TABLE_NAME).update([
            {
                id: tripId,
                fields: {
                    'Estado': 'Completado',
                    'HoraFinReal': new Date().toISOString() // Campo para registrar la hora de finalización real
                }
            }
        ]);

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization'
            },
            body: JSON.stringify({ message: 'Viaje finalizado con éxito.', tripId: updatedTrip[0].id })
        };

    } catch (error) {
        console.error('Error en end-trip Netlify Function:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Error interno del servidor.', error: error.message })
    
};
    }
};
