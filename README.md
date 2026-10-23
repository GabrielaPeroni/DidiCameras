# Projeto Didi Cameras
Este é um projeto Django para sincronizar e armazenar dados de câmeras em um banco de dados PostgreSQL hospedado na nuvem (AWS).
Feito para a matéria Cloud, Iot e Indústria 4.0 em Python

**Requisitos**
- Python 3.x
- Banco de dados PostgreSQL
- Credenciais configuradas no arquivo ```.env```
- [uv](https://docs.astral.sh/uv/) para gerenciar dependências

## 🚀 Setup local

Requer [uv](https://docs.astral.sh/uv/).

```bash
git clone https://github.com/GabrielaPeroni/DidiCameras.git
cd DidiCameras
uv sync                      # cria .venv e instala dependências (incl. dev)
cp .env.example .env         # opcional em dev: sem DATABASE_URL usa SQLite
uv run pre-commit install
uv run python manage.py migrate
uv run python manage.py runserver
```

Settings: `DidiCameras.settings.{dev,prod,test}` — `manage.py` usa `dev`, WSGI/Docker usam `prod`, pytest usa `test`.

Qualidade:
```bash
uv run ruff check . && uv run ruff format --check .
uv run mypy .
uv run pytest
```

Para resetar o banco, rode `uv run python manage.py flush` (ATENÇÃO: apaga todos os dados).
