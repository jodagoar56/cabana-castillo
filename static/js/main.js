document.addEventListener('DOMContentLoaded', () => {
    // Global Variables & Initialization
    const DAIRY_BREEDS_JS = ['holstein', 'jersey', 'pardo suizo', 'criolla'];

    const animalForm = document.getElementById('animalForm');
    const animalIdInput = document.getElementById('animalId');
    const nombreInput = document.getElementById('nombre');
    const identificadorInput = document.getElementById('identificador');
    const razaInput = document.getElementById('raza');
    const tipoAnimalInput = document.getElementById('tipoAnimal');
    const produccionLecheDiv = document.getElementById('produccionLecheDiv');
    const produccionLecheInput = document.getElementById('produccionLeche');
    const animalCardsContainer = document.getElementById('animalCardsContainer');
    const submitButton = animalForm.querySelector('button[type="submit"]');

    // 2. Dynamic Field Visibility
    const toggleProduccionLecheField = () => {
        const tipoAnimal = tipoAnimalInput.value;
        const raza = razaInput.value.toLowerCase();
        
        if (tipoAnimal === 'Lechero' || DAIRY_BREEDS_JS.includes(raza)) {
            produccionLecheDiv.style.display = 'block';
        } else {
            produccionLecheDiv.style.display = 'none';
            produccionLecheInput.value = ''; 
        }
    };

    tipoAnimalInput.addEventListener('change', toggleProduccionLecheField);
    razaInput.addEventListener('input', toggleProduccionLecheField);
    // Initial call
    toggleProduccionLecheField();

    // 3. Fetch and Display Animals
    const fetchAnimals = async () => {
        try {
            const response = await fetch('/animales');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const animals = await response.json();

            animalCardsContainer.innerHTML = ''; // Clear existing cards

            animals.forEach(animal => {
                const card = document.createElement('div');
                card.classList.add('animal-card');

                let produccionLecheHTML = '';
                if (animal.prod_leche_inicial && animal.prod_leche_inicial > 0) {
                    produccionLecheHTML = `<p><strong>Prod. Leche:</strong> ${animal.prod_leche_inicial} L/día</p>`;
                }

                card.innerHTML = `
                    <h3>${animal.nombre}</h3>
                    <p><strong>Identificador:</strong> ${animal.identificador}</p>
                    <p><strong>Raza:</strong> ${animal.raza}</p>
                    <p><strong>Tipo:</strong> ${animal.tipo_animal}</p>
                    ${produccionLecheHTML}
                    <div class="actions">
                        <button class="edit-btn" data-id="${animal.id_animal}">Editar</button>
                        <button class="delete-btn" data-id="${animal.id_animal}">Eliminar</button>
                    </div>
                `;
                animalCardsContainer.appendChild(card);

                // Attach event listeners for edit and delete
                card.querySelector('.edit-btn').addEventListener('click', () => populateFormForEdit(animal.id_animal));
                card.querySelector('.delete-btn').addEventListener('click', () => handleDeleteAnimal(animal.id_animal));
            });

        } catch (error) {
            console.error("Error fetching animals:", error);
            animalCardsContainer.innerHTML = '<p>Error al cargar los animales. Intente de nuevo más tarde.</p>';
        }
    };

    // 4. Handle Form Submission
    const handleFormSubmit = async (event) => {
        event.preventDefault();

        const nombre = nombreInput.value.trim();
        const identificador = identificadorInput.value.trim();
        const raza = razaInput.value.trim();
        const tipoAnimal = tipoAnimalInput.value;
        const produccionLeche = produccionLecheInput.value.trim();
        const animalId = animalIdInput.value;

        // Client-side Validation
        if (!nombre || !identificador || !raza || !tipoAnimal) {
            alert('Por favor, complete todos los campos obligatorios: Nombre, Identificador, Raza y Tipo de Animal.');
            return;
        }

        let prodLecheValue = null;
        if (produccionLecheDiv.style.display === 'block') {
            if (produccionLeche === '' || isNaN(parseFloat(produccionLeche)) || parseFloat(produccionLeche) < 0) {
                alert('La producción de leche debe ser un número positivo si el campo es visible.');
                return;
            }
            prodLecheValue = parseFloat(produccionLeche);
        }

        const animalData = {
            nombre,
            identificador,
            raza,
            tipo_animal: tipoAnimal,
            prod_leche_inicial: prodLecheValue 
        };

        const method = animalId ? 'PUT' : 'POST';
        const url = animalId ? `/animales/${animalId}` : '/animales';

        try {
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(animalData),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            await response.json(); // Process the response data if needed

            fetchAnimals(); // Refresh list
            animalForm.reset();
            animalIdInput.value = ''; // Clear hidden ID
            submitButton.textContent = 'Guardar Animal'; // Reset button text
            toggleProduccionLecheField(); // Reset field visibility

        } catch (error) {
            console.error("Error saving animal:", error);
            alert(`Error al guardar el animal: ${error.message}`);
        }
    };

    animalForm.addEventListener('submit', handleFormSubmit);

    // 5. Handle Edit Button Click
    const populateFormForEdit = async (id) => {
        try {
            const response = await fetch(`/animales/${id}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const animal = await response.json();

            animalIdInput.value = animal.id_animal;
            nombreInput.value = animal.nombre;
            identificadorInput.value = animal.identificador;
            razaInput.value = animal.raza;
            tipoAnimalInput.value = animal.tipo_animal;
            produccionLecheInput.value = animal.prod_leche_inicial || '';

            toggleProduccionLecheField();
            submitButton.textContent = 'Actualizar Animal';
            animalForm.scrollIntoView({ behavior: 'smooth' });

        } catch (error) {
            console.error("Error fetching animal for edit:", error);
            alert('Error al cargar los datos del animal para editar.');
        }
    };

    // 6. Handle Delete Button Click
    const handleDeleteAnimal = async (id) => {
        if (!confirm('¿Está seguro de que desea eliminar este animal?')) {
            return;
        }

        try {
            const response = await fetch(`/animales/${id}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }
            // const result = await response.json(); // Get success message if needed
            // alert(result.message || 'Animal eliminado con éxito');
            fetchAnimals(); // Refresh list

        } catch (error) {
            console.error("Error deleting animal:", error);
            alert(`Error al eliminar el animal: ${error.message}`);
        }
    };

    // 7. Initial Load
    fetchAnimals();
    toggleProduccionLecheField(); // Ensure correct initial state of the field
});
