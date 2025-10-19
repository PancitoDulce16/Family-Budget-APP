# Guía de Deployment en Firebase Hosting

## Pre-requisitos

1. **Node.js instalado** (para Firebase CLI)
   - Descarga desde: https://nodejs.org/
   - Verifica con: `node --version`

2. **Cuenta de Firebase** (ya tienes esto listo)

## Paso 1: Instalar Firebase CLI

Abre tu terminal (Command Prompt o PowerShell) y ejecuta:

```bash
npm install -g firebase-tools
```

## Paso 2: Iniciar sesión en Firebase

```bash
firebase login
```

Se abrirá tu navegador para que autorices el acceso.

## Paso 3: Verificar configuración

El proyecto ya está configurado con los archivos:
- `firebase.json` - Configuración de hosting
- `.firebaserc` - Proyecto de Firebase

## Paso 4: Desplegar la aplicación

Desde la carpeta del proyecto, ejecuta:

```bash
firebase deploy --only hosting
```

## Resultado

Firebase te dará dos URLs:

1. **URL de Firebase Hosting** (gratuita):
   - `https://family-budget-362ee.web.app`
   - `https://family-budget-362ee.firebaseapp.com`

2. **Dominio personalizado** (opcional, requiere configuración adicional)

## Comandos útiles

### Ver el proyecto en el navegador antes de deployar

```bash
firebase serve
```

Esto inicia un servidor local en `http://localhost:5000`

### Ver logs de deployment

```bash
firebase hosting:channel:list
```

### Actualizar la aplicación

Simplemente ejecuta de nuevo:

```bash
firebase deploy --only hosting
```

## Solución de problemas

### Error: "Firebase CLI not found"

Instala Firebase CLI globalmente:
```bash
npm install -g firebase-tools
```

### Error: "Not authorized"

Vuelve a iniciar sesión:
```bash
firebase login --reauth
```

### Error: "Project not found"

Verifica que el archivo `.firebaserc` tenga el ID correcto del proyecto:
```json
{
  "projects": {
    "default": "family-budget-362ee"
  }
}
```

## Notas importantes

- La aplicación usa **almacenamiento Base64** para las imágenes en Firestore (100% gratis)
- Límite de tamaño de imagen: **1MB** por comprobante
- El plan gratuito de Firebase Hosting incluye:
  - 10GB de almacenamiento
  - 360MB/día de transferencia
  - SSL gratuito (HTTPS)

## Configuración adicional recomendada

### 1. Habilitar HTTPS (ya incluido automáticamente)

Firebase Hosting sirve todo por HTTPS de manera automática.

### 2. Reglas de seguridad de Firestore

Ve a Firebase Console > Firestore Database > Rules y aplica estas reglas:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == userId;
    }

    match /familyGroups/{groupId} {
      allow read: if request.auth != null &&
                    request.auth.uid in resource.data.members;
      allow create: if request.auth != null;
      allow update: if request.auth != null &&
                      request.auth.uid in resource.data.members;
    }

    match /transactions/{transactionId} {
      allow read: if request.auth != null &&
                    exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
                    get(/databases/$(database)/documents/users/$(request.auth.uid)).data.familyGroupId == resource.data.familyGroupId;
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null &&
                              resource.data.addedBy == request.auth.uid;
    }
  }
}
```

### 3. Habilitar Google Sign-In

Ve a Firebase Console > Authentication > Sign-in method:
- Activa "Email/Password"
- Activa "Google"

## Actualizaciones futuras

Para actualizar la aplicación después de hacer cambios:

1. Guarda tus cambios en los archivos
2. Ejecuta: `firebase deploy --only hosting`
3. Los cambios estarán disponibles en segundos

## Dominio personalizado (opcional)

Si quieres usar tu propio dominio:

1. Ve a Firebase Console > Hosting
2. Click en "Add custom domain"
3. Sigue las instrucciones para configurar DNS

---

¡Listo! Tu aplicación estará disponible en `https://family-budget-362ee.web.app`
