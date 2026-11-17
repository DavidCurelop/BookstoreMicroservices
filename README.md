# BookStore Co.

Aplicación de referencia para el caso longitudinal del curso
**Cloud Computing**.

Este repositorio contiene una versión funcional de la plataforma operacional
de BookStore Co. y será utilizado durante diferentes actividades y laboratorios
del curso, en este caso, para el proyecto final de la materia. 

## Estructura del repositorio

```text
.
├── frontend/
├── backend/
├── services/
│   ├── ms-auth/
│   ├── ms-books/
│   ├── ms-orders/
│   └── ms-events/
├── infrastructure/
│   └── frontend-edge/
├── kubernetes/
├── database/
│   ├── schema.sql
│   ├── seed.sql
│   └── rds/
├── compose.yaml
└── README.md
```

Los principales componentes corresponden a:

- `frontend/`: aplicación web y configuración de Nginx (`frontend/nginx/`);
- `backend/`: API monolítica usada por el entorno local de Docker Compose;
- `services/`: implementaciones separadas de autenticación, catálogo, pedidos
  y eventos;
- `kubernetes/`: servicios, deployments y rutas de ingreso para el despliegue
  de microservicios en EKS;
- `database/`: esquema, datos iniciales y artefactos relacionados con PostgreSQL;
- `compose.yaml`: entorno local con PostgreSQL, inicialización de la base de
  datos, backend monolítico y frontend.

El entorno local de Docker Compose sigue usando el backend monolítico. No
despliega los cuatro servicios de `services/` ni equivale al entorno de EKS.

## Configuración

El repositorio incluye plantillas de configuración. Cada plantilla se copia
como `.env` en su carpeta y cada archivo lo lee una herramienta distinta:

| Plantilla                          | Archivo a crear         | Lo lee           | Cuándo                                            |
|------------------------------------|-------------------------|------------------|---------------------------------------------------|
| `.env.example`                     | `.env`                  | Docker Compose   | `docker compose ...` (todos los servicios)        |
| `frontend/.env.example`            | `frontend/.env`         | Vite             | `npm run dev` o `npm run build` sin Docker        |
| `backend/.env.example`             | `backend/.env`          | dotenv (Node.js) | `npm run dev` o `npm start` sin Docker            |
| `.env.aws.example`                 | `.env.aws`              | Despliegue en AWS | Referencia de variables para el entorno de AWS   |
| `database/rds/bootstrap.env.example` | `database/rds/bootstrap.env` | `bootstrap.sh` | Inicialización manual de Amazon RDS            |

Las plantillas de `frontend/` y `backend/` **no se usan** con Docker Compose
ni dentro de las imágenes: con Docker, toda la configuración proviene del
`.env` de la raíz.

Para el entorno local con Docker:

```bash
cp .env.example .env
```

Los archivos `.env` contienen configuración específica del entorno y
**no deben incorporarse al repositorio**.

Las variables de base de datos usan los mismos nombres en todos los entornos
y en `database/rds/bootstrap.env.example`: `DB_HOST`, `DB_PORT`, `DB_NAME`,
`APP_DB_USER`, `APP_DB_PASSWORD` y, solo para la inicialización,
`DB_ADMIN_USER`, `DB_ADMIN_PASSWORD`, `INGEST_DB_USER` e `INGEST_DB_PASSWORD`.

## Ejecución local

```bash
docker compose up --build
```

La aplicación queda disponible en `http://localhost:8080` (o en el puerto
definido en `FRONTEND_HOST_PORT`).

La opción `--build` reconstruye las imágenes. Es necesaria cuando cambia el
código o alguna variable `VITE_*`, porque estas quedan incorporadas en el
frontend al momento de compilarlo.

### Servicios por separado

```bash
docker compose up backend          # backend con PostgreSQL e inicialización (API en :5001)
docker compose build frontend      # construye solo la imagen del frontend
docker compose build backend       # construye solo la imagen del backend
```

El contenedor del frontend requiere que el backend exista, porque Nginx
resuelve el servicio `backend` al iniciar. Para trabajar solo en el frontend
se recomienda el desarrollo sin Docker.

### Desarrollo sin Docker

Requiere Node.js 24. La base de datos puede ser la del entorno de Docker:

```bash
docker compose up -d postgres bootstrap
```

Backend (`http://localhost:5001`). `DB_USER` y `DB_PASSWORD` de `backend/.env`
deben coincidir con `APP_DB_USER` y `APP_DB_PASSWORD` del `.env` de la raíz:

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

Frontend con recarga automática (`http://localhost:3000`, con proxy de `/api`
hacia el backend):

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

### Build del frontend para Amazon S3

```bash
cd frontend
npm run build
```

El contenido de `frontend/dist/` es lo que se publica en el bucket. Las
variables `VITE_*` se toman de `frontend/.env` y quedan incorporadas en el
código compilado, por lo que no deben contener secretos.

## Publicar imágenes

Las imágenes del backend y del frontend se publican como **multiplataforma**
(`linux/amd64` y `linux/arm64`), de modo que funcionan en servidores x86 y ARM
(Graviton) sin importar el equipo donde se construyeron. El nombre de cada
imagen se forma con dos variables del `.env`:

Esta sección cubre las imágenes del backend monolítico y del frontend usados
por Docker Compose. No publica las imágenes de `services/` para EKS.

```text
${IMAGE_REGISTRY}/bookstore-backend:${IMAGE_TAG}
${IMAGE_REGISTRY}/bookstore-frontend:${IMAGE_TAG}
```

| Registro   | `IMAGE_REGISTRY`                                 |
|------------|--------------------------------------------------|
| Local      | `local` (valor por defecto; no se publica)       |
| Docker Hub | `docker.io/<usuario>`                            |
| Amazon ECR | `<cuenta>.dkr.ecr.<region>.amazonaws.com`        |

`IMAGE_TAG` debe coincidir con el archivo `VERSION` y cambiar en cada versión
publicada. No se utiliza la etiqueta `latest`.

### 1. Crear el builder multiplataforma (una sola vez)

```bash
docker buildx create --name bookstore-builder --driver docker-container --use
```

### 2. Iniciar sesión en el registro

Docker Hub:

```bash
docker login
```

Amazon ECR (los repositorios deben existir antes de publicar):

```bash
aws ecr create-repository --repository-name bookstore-backend
aws ecr create-repository --repository-name bookstore-frontend
aws ecr get-login-password --region <region> | docker login --username AWS --password-stdin <cuenta>.dkr.ecr.<region>.amazonaws.com
```

### 3. Configurar y publicar

Ajustar `IMAGE_REGISTRY` e `IMAGE_TAG` en el `.env` y ejecutar:

```bash
docker buildx bake -f compose.yaml --set "*.platform=linux/amd64,linux/arm64" --push backend frontend
```

`docker buildx bake` reutiliza las definiciones de `compose.yaml` (contexto,
argumentos de construcción y nombre de la imagen). En equipos con procesador
Apple Silicon la variante `linux/amd64` se construye por emulación y tarda más.

### 4. Verificar

```bash
docker buildx imagetools inspect <IMAGE_REGISTRY>/bookstore-backend:<IMAGE_TAG>
```

La salida debe listar las plataformas `linux/amd64` y `linux/arm64`.

## Despliegue en AWS

Docker Compose se usa únicamente para el entorno local. El despliegue en AWS
reutiliza las mismas imágenes y los mismos nombres de variables
(`.env.aws.example`), pero se define con las herramientas propias del
servicio de destino.

Para la inicialización manual de PostgreSQL en Amazon RDS se dispone de:

```text
database/rds/bootstrap.env.example
database/rds/bootstrap.sh
```

Las instrucciones de configuración y ejecución correspondientes se encuentran
en las guías de laboratorio.

### Estado de la arquitectura de microservicios

Los manifiestos de `kubernetes/` y el código de `services/` son la base del
despliegue de microservicios. Los servicios usan estos puertos:

| Servicio | Puerto | Responsabilidad |
|----------|--------|-----------------|
| `ms-auth` | 5001 | Autenticación |
| `ms-books` | 5002 | Catálogo y stock |
| `ms-orders` | 5003 | Pedidos |
| `ms-events` | 5004 | Ingesta de eventos y escritura en EFS |

El estado de los tres issues de infraestructura abiertos es:

- [US-06: sidecar de clickstream](https://github.com/DavidCurelop/BookstoreMicroservices/issues/6):
  los deployments incluyen Fluent Bit, buffer local con rotación y envío con
  reintentos a `ms-events`. Falta verificar el comportamiento en un clúster
  EKS real y medir la entrega bajo fallos prolongados o presión de disco.
- [US-07: S3, Cloudflare y WAF](https://github.com/DavidCurelop/BookstoreMicroservices/issues/7):
  hay una base de Terraform para el bucket privado, permisos de lectura,
  DNS, WAF y límites de solicitudes, además de un Worker para servir la SPA
  y reenviar `/api/*` al ALB. Falta configurar las cuentas y dominios reales,
  aplicar los recursos, proteger el acceso directo al ALB y validar el flujo
  desplegado.
- [US-08: ALB, NGINX Ingress y alta disponibilidad](https://github.com/DavidCurelop/BookstoreMicroservices/issues/8):
  hay deployments y servicios de Kubernetes, además de rutas para libros,
  pedidos y eventos. Se añadieron la ruta de autenticación, configuración para
  instalar NGINX Ingress y ALB, y políticas HPA/PDB y distribución por zona.
  La instalación de los controladores, la publicación de imágenes y la
  validación en un clúster AWS siguen pendientes.

`DEPLOYMENT_GUIDE.md` conserva instrucciones de una versión anterior basada
en el backend monolítico y el frontend servido desde Kubernetes. No debe
tomarse como una guía completa para desplegar la arquitectura de microservicios
ni como evidencia de que los recursos de AWS o Cloudflare ya están configurados.

La configuración inicial de US-07 está en `infrastructure/frontend-edge/`.
No se han aplicado recursos de AWS o Cloudflare; el despliegue requiere los
dominios, la zona de Cloudflare y el hostname HTTPS del ALB correspondientes
al entorno.

## Requisitos

Para ejecutar el proyecto se requiere:

- Docker;
- Docker Compose.

El proyecto utiliza Node.js 24 en los componentes que requieren Node.js.

## Ambiente instruccional

La aplicación utiliza un mecanismo de autenticación simplificado para fines
académicos.

Un usuario disponible en los datos iniciales es:

```text
synthetic.customer.0008@bookstore.test
```

No requiere contraseña.

## Uso durante el curso

El código fuente, la configuración, el esquema de base de datos, los datos
disponibles y el comportamiento observable de la aplicación forman parte de
los recursos que pueden ser analizados durante el proyecto.

Las instrucciones específicas para cada actividad, laboratorio o fase del
proyecto se proporcionan en los documentos correspondientes del curso.
