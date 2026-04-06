exports.handler = async (event) => {
    // Solo permitir POST
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Método no permitido' };
    }

    // Configurar headers CORS (permite que tu sitio se comunique)
    const headers = {
        'Access-Control-Allow-Origin': '*',  // En producción, cambiá * por tu dominio
        'Content-Type': 'application/json'
    };

    const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
    const BASE_ID = process.env.AIRTABLE_BASE_ID;

    // Validar que las variables de entorno existen
    if (!AIRTABLE_TOKEN || !BASE_ID) {
        return { 
            statusCode: 500, 
            headers,
            body: JSON.stringify({ error: 'Configuración del servidor incompleta' }) 
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

    // Validar campos requeridos
    if (!datos.origen || !datos.destino || !datos.telefono) {
        return { 
            statusCode: 400, 
            headers,
            body: JSON.stringify({ error: 'Faltan campos requeridos' }) 
        };
    }

    const datosParaAirtable = {
        records: [{
            fields: {
                "Origen (Dirección)": datos.origen,
                "Destino (Dirección)": datos.destino,
                "Estado del Viaje": "🔴 Pendiente",
                "Notas / Origen del Pedido": "🌐 Web",
                "Pasajero Solicitante": [datos.telefono]
            }
        }],
        typecast: true
    };

    try {
        const respuesta = await fetch(
            `https://api.airtable.com/v0/${BASE_ID}/VIAJES`,
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
            body: JSON.stringify({ error: 'Error de conexión con Airtable' })
        };

  }
};
