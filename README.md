# Projeto Didi Cameras
Este é um projeto Django para sincronizar e armazenar dados de câmeras em um banco de dados PostgreSQL hospedado na nuvem (AWS).
Feito para a matéria Cloud, Iot e Indústria 4.0 em Python

**Requisitos**
- Python 3.x
- Banco de dados PostgreSQL (AWS RDS, etc)
- Credenciais AWS configuradas no arquivo ```.env```
- Django e dependências instaladas [```pip install -r requirements.txt```]
- Ambiente virtual [recomendado]

## 🚀 Instrucoes de setup local

1. **Clone o repositório**
   ```bash
   git clone https://github.com/GabrielaPeroni/DidiCameras.git
   cd DidiCameras
   ```
2. **Crie um virtual environment**
   ```bash
    python3 -m venv env
    env/Scripts/activate.bat
    ```
3. **Instale as dependencias**
   ```bash
   pip install -r requirements.txt
    ```
4. **Configure as variáveis de ambiente em um arquivo .env na raiz do projeto**

5. **Execute as migracoes e inicie o projeto**
   ```
   python manage.py migrate
   python manage.py runserver
Para resetar o banco, rode ```python manage.py flush``` (ATENÇÃO: apaga todos os dados).
