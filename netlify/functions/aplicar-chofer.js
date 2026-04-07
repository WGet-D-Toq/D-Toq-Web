exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers, body: 'Método no permitido' };
    }

    const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
    const BASE_ID = process.env.AIRTABLE_BASE_ID;

    if (!AIRTABLE_TOKEN || !BASE_ID) {
        return { 
            statusCode: 500, 
            headers,
            body: JSON.stringify({ error: 'Configuración incompleta' }) 
        };
    }

    let datos;
    try {
        datos = JSON.parse(event.body);
    } catch (e) {
        return { 
            statusCode: 400, 
            headers,
            body: JSON.stringify({ error: 'Datos inválidos' }) 
        };
    }

    if (!datos.nombre || !datos.telefono || !datos.equipo) {
        return { 
            statusCode: 400, 
            headers,
            body: JSON.stringify({ error: 'Faltan campos requeridos' }) 
        };
    }

    const datosParaAirtable = {
        records: [{
            fields: {
                "Nombre del Chofer": datos.nombre,
                "Teléfono de Contacto": datos.telefono,
                "Equipo Solicitado": datos.equipo,
                "Estado Actual": "⚫ Fuera de Servicio"
            }
        }],
        typecast: true
    };

    try {
        const respuesta = await fetch(
            `https://api.airtable.com/v0/${BASE_ID}/Choferes`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(datosParaAirtable)
            }
        );

        const resultado = await respuesta.json();
        
        return {
            statusCode: respuesta.ok ? 200 : 400,
            headers,
            body: JSON.stringify(resultado)
        };
    } catch (error) {
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Error de conexión' })
        };
    }
};
