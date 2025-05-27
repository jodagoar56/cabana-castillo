from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///ganado.db'
db = SQLAlchemy(app)

class Animal(db.Model):
    __tablename__ = 'Animales'  # Explicitly set table name
    id_animal = db.Column(db.Integer, primary_key=True, autoincrement=True)
    nombre = db.Column(db.String(100), nullable=False)
    identificador = db.Column(db.String(50), nullable=False, unique=True)
    raza = db.Column(db.String(50), nullable=False)
    tipo_animal = db.Column(db.String(50), nullable=False)  # Lechero, Carne, Doble Propósito
    prod_leche_inicial = db.Column(db.Float, nullable=True)

    def __repr__(self):
        return f"<Animal {self.id_animal}: {self.nombre}>"

    def to_dict(self):
        return {
            'id_animal': self.id_animal,
            'nombre': self.nombre,
            'identificador': self.identificador,
            'raza': self.raza,
            'tipo_animal': self.tipo_animal,
            'prod_leche_inicial': self.prod_leche_inicial
        }

DAIRY_BREEDS = ['holstein', 'jersey', 'pardo suizo', 'criolla']

@app.route('/animales', methods=['POST'])
def create_animal():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No input data provided'}), 400

    required_fields = ['nombre', 'identificador', 'raza', 'tipo_animal']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'Missing field: {field}'}), 400

    if data['tipo_animal'].lower() == 'lechero' or data['raza'].lower() in DAIRY_BREEDS:
        if 'prod_leche_inicial' not in data or not isinstance(data['prod_leche_inicial'], (int, float)) or data['prod_leche_inicial'] <= 0:
            return jsonify({'error': 'prod_leche_inicial is required and must be a positive number for dairy animals'}), 400
        prod_leche_inicial = data.get('prod_leche_inicial')
    else:
        prod_leche_inicial = data.get('prod_leche_inicial', None) # Allow it to be null or not present for non-dairy

    try:
        animal = Animal(
            nombre=data['nombre'],
            identificador=data['identificador'],
            raza=data['raza'],
            tipo_animal=data['tipo_animal'],
            prod_leche_inicial=prod_leche_inicial
        )
        db.session.add(animal)
        db.session.commit()
        return jsonify(animal.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 400


@app.route('/animales', methods=['GET'])
def get_animals():
    animals = Animal.query.all()
    return jsonify([animal.to_dict() for animal in animals])


@app.route('/animales/<int:id_animal>', methods=['GET'])
def get_animal(id_animal):
    animal = Animal.query.get_or_404(id_animal)
    return jsonify(animal.to_dict())


@app.route('/animales/<int:id_animal>', methods=['PUT'])
def update_animal(id_animal):
    animal = Animal.query.get_or_404(id_animal)
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No input data provided'}), 400

    # Basic validation for required fields if they are being updated
    if 'nombre' in data:
        animal.nombre = data['nombre']
    if 'identificador' in data:
        animal.identificador = data['identificador']
    if 'raza' in data:
        animal.raza = data['raza']
    if 'tipo_animal' in data:
        animal.tipo_animal = data['tipo_animal']

    # Validation for prod_leche_inicial based on tipo_animal or raza
    # Consider current or new values for tipo_animal and raza
    current_tipo_animal = data.get('tipo_animal', animal.tipo_animal)
    current_raza = data.get('raza', animal.raza)

    if current_tipo_animal.lower() == 'lechero' or current_raza.lower() in DAIRY_BREEDS:
        if 'prod_leche_inicial' not in data or not isinstance(data.get('prod_leche_inicial'), (int, float)) or data.get('prod_leche_inicial') <= 0:
            return jsonify({'error': 'prod_leche_inicial is required and must be a positive number for dairy animals'}), 400
        animal.prod_leche_inicial = data.get('prod_leche_inicial')
    elif 'prod_leche_inicial' in data: # If it's not a dairy animal, but prod_leche_inicial is provided
        animal.prod_leche_inicial = data.get('prod_leche_inicial')
    # If not dairy and prod_leche_inicial is not in data, it remains unchanged or null if that's its previous state

    try:
        db.session.commit()
        return jsonify(animal.to_dict())
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 400


@app.route('/animales/<int:id_animal>', methods=['DELETE'])
def delete_animal(id_animal):
    animal = Animal.query.get_or_404(id_animal)
    try:
        db.session.delete(animal)
        db.session.commit()
        return jsonify({'message': 'Animal deleted successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 400


def init_db():
    with app.app_context():
        db.create_all()

def populate_db_if_empty():
    with app.app_context():
        if Animal.query.count() == 0:
            print("Animal table is empty. Populating with sample data...")
            sample_animals = [
                Animal(nombre="Luna", identificador="ARETE001", raza="Holstein", tipo_animal="Lechero", prod_leche_inicial=20.5),
                Animal(nombre="Toro", identificador="ARETE002", raza="Angus", tipo_animal="Carne", prod_leche_inicial=None),
                Animal(nombre="Parda", identificador="ARETE003", raza="Pardo Suizo", tipo_animal="Doble Propósito", prod_leche_inicial=15.0),
                Animal(nombre="Manchitas", identificador="ARETE004", raza="Criolla", tipo_animal="Lechero", prod_leche_inicial=12.0),
                Animal(nombre="Gigante", identificador="ARETE005", raza="Simmental", tipo_animal="Doble Propósito", prod_leche_inicial=10.5)
            ]
            try:
                db.session.add_all(sample_animals)
                db.session.commit()
                print(f"{len(sample_animals)} sample animals added to the database.")
            except Exception as e:
                db.session.rollback()
                print(f"Error populating database: {str(e)}")
        else:
            print("Animal table is not empty. No data populated.")


if __name__ == '__main__':
    init_db()
    populate_db_if_empty()
    app.run(debug=True)
