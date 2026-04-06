document.addEventListener('DOMContentLoaded', function() {
    const formulario = document.getElementById('viaje-form');
    const botonSubmit = formulario.querySelector('button[type="submit"]');

    formulario.addEventListener('submit', async function(event) {
        event.preventDefault();
        
        // Cambiar estado del botón
        botonSubmit.textContent = "Procesando pedido...";
        botonSubmit.disabled = true;

        // Obtener valores del formulario
        const origen = document.getElementById('origen').value.trim();
        const destino = document.getElementById('destino').value.trim();
        const nombre = document.getElementById('nombre').value.trim();
        const telefono = document.getElementById('telefono').value.trim();

        // Validación básica en el cliente
        if (!origen || !destino || !nombre || !telefono) {
            alert("Por favor, completá todos los campos.");
            botonSubmit.textContent = "Pedir ahora";
            botonSubmit.disabled = false;
            return;
        }

        // Datos que se envían a la función serverless (SIN tokens)
        const datos = {
            origen: origen,
            destino: destino,
            nombre: nombre,
            telefono: telefono
        };

        try {
            // Llamamos a NUESTRA función en Netlify, no a Airtable directamente
            const respuesta = await fetch('/.netlify/functions/crear-viaje', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(datos)
            });

            if (respuesta.ok) {
                const resultado = await respuesta.json();
                console.log("Viaje creando:", resultado);
                
                alert(`¡Hola ${nombre}! Tu viaje ha sido ingresado a nuestra central. Un chofer será asignado en breve.`);
                formulario.reset();
                
            } else {
                const errorData = await respuesta.json();
                console.error("Error:", errorData);
                alert("Ups, hubo un problema al procesar tu pedido. Intentá nuevamente.");
            }

        } catch (error) {
            console.error('Error de red:', error);
            alert("Error de conexión. Verificá tu internet e intentá de nuevo.");
        } finally {
            // Restaurar botón
            botonSubmit.textContent = "Pedir ahora";
            botonSubmit.disabled = false;
        }
    });
});
