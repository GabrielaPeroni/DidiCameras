# Projeto Didi Cameras
Este é um projeto Django para sincronizar e armazenar dados de câmeras em um banco de dados PostgreSQL hospedado na nuvem (AWS).
Feito para a matéria Cloud, Iot e Indústria 4.0 em Python

**Requisitos**
- Python 3.8+
- PostgreSQL (usado na AWS RDS)
- Virtualenv (recomendado)
- Git
- AWS EC2 (para hospedar o projeto)
- Biblioteca python-decouple para carregar variáveis de ambiente

## 🚀 Instrucoes de setup local

1. **Clone o repositório**
   ```bash
   https://github.com/GabrielaPeroni/DidiCameras.git
   cd DidiCameras
   ```
2. **Crie um virtual environment**
   ```bash
    python3 -m venv env
    source env/bin/activate
    ```
3. **Instale as dependencias**
   ```bash
   pip install -r requirements.txt
    ```
4. **Configure as variáveis de ambiente em um arquivo .env na raiz do projeto**
   ```
    DB_ENGINE = django.db.backends.postgresql
    DB_NAME= nome_do_banco
    DB_USER= usuario
    DB_PASSWORD= senha
    DB_HOST= host_aws_rds
    DB_PORT= aws_port
    ```
5. **Execute as migracoes e inicie o projeto**
   ```
   python manage.py migrate
   python manage.py runserver
