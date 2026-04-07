// netlify/functions/send-location-update.js

const Airtable = require('airtable');

// Configura tu base de Airtable
const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);
const TABLE_NAME = 'Choferes'; // La tabla donde se guarda la ubicación actual del chofer

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
        const { choferEmail, latitude, longitude, timestamp } = JSON.parse(event.body);

        if (!choferEmail || typeof latitude === 'undefined' || typeof longitude === 'undefined') {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: 'Email del chofer, latitud y longitud son requeridos.' })
            };
        }

        // Asegurarse de que el email recibido en el body coincide con el del usuario autenticado
        if (choferEmail !== context.clientContext.user.email) {
            return {
                statusCode: 403,
                body: JSON.stringify({ message: 'No tienes permiso para actualizar la ubicación de otro chofer.' })
            };
        }

        // 3. Buscar el chofer en Airtable por email
        const records = await base(TABLE_NAME).select({
            filterByFormula: `{Email} = '${choferEmail}'`,
            maxRecords: 1
        }).firstPage();

        if (records.length === 0) {
            return {
                statusCode: 404,
                body: JSON.stringify({ message: 'Chofer no encontrado en Airtable.' })
            };
        }

        const choferRecordId = records[0].id;

        // 4. Actualizar los campos de ubicación y timestamp en el registro del chofer
        const updatedFields = {
            'UltimaLatitud': latitude,
            'UltimaLongitud': longitude,
            'UltimaActualizacionUbicacion': timestamp || new Date().toISOString()
        };

        // Si tienes un campo de "Geolocalización" en Airtable, puedes actualizarlo así:
        // 'UbicacionGeo': `${latitude},${longitude}` // Formato esperado por el campo de Geolocalización de Airtable

        const updatedRecords = await base(TABLE_NAME).update([
            {
                id: choferRecordId,
                fields: updatedFields
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
            body: JSON.stringify({ message: 'Ubicación del chofer actualizada exitosamente.', id: updatedRecords[0].id })
        };

    } catch (error) {
        console.error('Error en send-location-update Netlify Function:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Error interno del servidor.', error: error.message })
     
};
    }
};
