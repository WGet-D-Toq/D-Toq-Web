// netlify/functions/update-chofer-status.js

const Airtable = require('airtable');

// Configura tu base de Airtable
const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);
const TABLE_NAME = 'Choferes'; // Asegúrate de que este sea el nombre correcto de tu tabla de choferes en Airtable

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
        const { status, choferEmail } = JSON.parse(event.body);

        if (!status || !choferEmail) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: 'Estado y email del chofer son requeridos.' })
            };
        }

        // Asegurarse de que el email recibido en el body coincide con el del usuario autenticado
        if (choferEmail !== context.clientContext.user.email) {
            return {
                statusCode: 403,
                body: JSON.stringify({ message: 'No tienes permiso para actualizar el estado de otro chofer.' })
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
                body: JSON.stringify({ message: 'Chofer no encontrado en Airtable para actualizar.' })
            };
        }

        const choferRecordId = records[0].id;

        // 4. Actualizar el campo 'Estado' del chofer en Airtable
        const updatedRecords = await base(TABLE_NAME).update([
            {
                id: choferRecordId,
                fields: {
                    'Estado': status
                }
            }
        ]);

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*', // Considera restringir esto en producción
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization'
            },
            body: JSON.stringify({ message: `Estado del chofer actualizado a '${status}'.`, id: updatedRecords[0].id })
        };

    } catch (error) {
        console.error('Error en update-chofer-status Netlify Function:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Error interno del servidor.', error: error.message })
       
};
    }
};
