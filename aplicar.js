document.addEventListener('DOMContentLoaded', function() {
    const formulario = document.getElementById('aplicar-form');
    const botonSubmit = formulario.querySelector('button[type="submit"]');

    formulario.addEventListener('submit', async function(event) {
        event.preventDefault();
        
        botonSubmit.textContent = "Enviando aplicación...";
        botonSubmit.disabled = true;

        const nombre = document.getElementById('nombre').value.trim();
        const telefono = document.getElementById('telefono').value.trim();
        const equipo = document.getElementById('equipo').value;

        if (!nombre || !telefono || !equipo) {
            alert("Por favor, completá todos los campos.");
            botonSubmit.textContent = "Enviar aplicación";
            botonSubmit.disabled = false;
            return;
        }

        const datos = { nombre, telefono, equipo };

        try {
            const respuesta = await fetch('/.netlify/functions/aplicar-chofer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(datos)
            });

            if (respuesta.ok) {
                alert(`¡Gracias ${nombre}! Tu aplicación fue recibida. Nos pondremos en contacto pronto.`);
                formulario.reset();
            } else {
                const errorData = await respuesta.json();
                console.error("Error:", errorData);
                alert("Hubo un problema al enviar tu aplicación. Intentá nuevamente.");
            }
        } catch (error) {
            console.error('Error de red:', error);
            alert("Error de conexión. Verificá tu internet.");
        } finally {
            botonSubmit.textContent = "Enviar aplicación";
            botonSubmit.disabled = false;
        }
    });
});
