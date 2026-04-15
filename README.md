# Pablo Bot - WhatsApp Automation

Bot automatizado para envío de mensajes por WhatsApp y gestión de leads en Google Sheets.

## Requisitos Previos

1.  **Google Cloud Console**:
    *   Crea un proyecto.
    *   Habilita la **Google Sheets API**.
    *   Crea una **Service Account**.
    *   Descarga la llave JSON y copia el `client_email` y la `private_key`.
2.  **Google Sheet**:
    *   Crea una hoja llamada "Prospectos".
    *   Columnas: `id`, `nombre`, `url`, `estado`, `fases`.
    *   Comparte la hoja con el `client_email` de la Service Account (con permiso de Editor).

## Configuración de Variables de Entorno

Configura las siguientes variables en Railway o en tu archivo `.env`:

*   `GOOGLE_SERVICE_ACCOUNT_EMAIL`: El email de la Service Account.
*   `GOOGLE_PRIVATE_KEY`: La llave privada (incluyendo `-----BEGIN PRIVATE KEY-----` y `-----END PRIVATE KEY-----`).
*   `SPREADSHEET_ID`: El ID de tu Google Sheet (se encuentra en la URL).
*   `MAX_DAILY`: Límite máximo de mensajes por día (ej: 20).

## Primer Arranque y Escaneo de QR

1.  Ejecuta `npm install` y `npm run dev`.
2.  En la terminal verás un **Código QR**.
3.  Abre WhatsApp en tu teléfono > Dispositivos vinculados > Vincular un dispositivo.
4.  Escanea el código QR de la terminal.
5.  Una vez conectado, verás el mensaje "WhatsApp conectado ✓".

## Personalización de Mensajes

Puedes editar los mensajes en el archivo `data/messages.json`. Cada mensaje tiene:
*   `con_nombre`: Se usa si el lead tiene nombre. Usa `{nombre}` como placeholder.
*   `generico`: Se usa si el lead no tiene nombre.

## Lógica de Funcionamiento

*   **Horario**: Lunes a Viernes, 9:00 AM a 6:00 PM (Hora Chile).
*   **Intervalo**: Aleatorio entre 25 y 45 minutos entre mensajes.
*   **Filtro**: Solo procesa leads con `estado == "frio"` y `fases.f3.dm1_enviado == false`.
*   **Actualización**: Al enviar, cambia `estado` a `"dm"` y marca `dm1_enviado` como `true` con la fecha actual.
