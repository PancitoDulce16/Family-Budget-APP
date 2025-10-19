# Family Budget Manager

Aplicación web colaborativa para gestionar gastos e ingresos familiares de forma privada y organizada.

## Características Principales

- **Autenticación Segura**: Login con email/contraseña o Google
- **Grupos Familiares**: Sistema de códigos de invitación para compartir presupuestos
- **Gestión de Transacciones**: Registro completo de gastos e ingresos con comprobantes
- **Categorización**: Organiza por Casa, Servicios, Elías y Papás
- **Dashboard en Tiempo Real**: Visualiza totales, balances y actividad reciente
- **Gastos Compartidos**: Divide gastos entre miembros con porcentajes personalizados
- **Trazabilidad**: Registra quién agregó cada transacción y quién pagó

## Estructura del Proyecto

```
Family-Budget-APP/
├── index.html              # Página principal
├── manifest.json           # Configuración PWA
├── js/
│   ├── firebase-config.js  # Configuración de Firebase
│   ├── auth.js            # Sistema de autenticación
│   ├── app.js             # Lógica principal de la app
│   └── family-group.js    # Gestión de grupos familiares
└── README.md              # Este archivo
```

## Base de Datos Firestore

### Colecciones

#### `users`
- email
- displayName
- photoURL
- familyGroupId
- createdAt

#### `familyGroups`
- name
- createdBy
- members (array)
- inviteCode
- createdAt

#### `transactions`
- familyGroupId
- type (income/expense)
- amount
- description
- category
- date
- paidBy
- addedBy
- receiptBase64 (imagen en formato Base64, max 1MB)
- isShared
- sharedWith (array)
- createdAt

#### `tasks` (próximamente)
- familyGroupId
- title
- assignedTo
- createdBy
- dueDate
- status
- relatedTransactionId
- createdAt

## Configuración de Firebase

1. Crea un proyecto en [Firebase Console](https://console.firebase.google.com/)

2. Habilita los siguientes servicios:
   - **Authentication**: Email/Password y Google
   - **Firestore Database**: Modo de prueba (luego configura reglas de seguridad)

3. La configuración ya está incluida en `js/firebase-config.js`

**Nota sobre almacenamiento de imágenes**: Esta aplicación usa **Base64** para guardar las fotos de comprobantes directamente en Firestore, evitando el uso de Firebase Storage (de pago). Límite: 1MB por imagen.

### Reglas de Seguridad de Firestore (Recomendadas)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write their own document
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == userId;
    }

    // Family groups - members can read, creator can write
    match /familyGroups/{groupId} {
      allow read: if request.auth != null &&
                    request.auth.uid in resource.data.members;
      allow create: if request.auth != null;
      allow update: if request.auth != null &&
                      request.auth.uid in resource.data.members;
    }

    // Transactions - family members can read/write
    match /transactions/{transactionId} {
      allow read: if request.auth != null &&
                    exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
                    get(/databases/$(database)/documents/users/$(request.auth.uid)).data.familyGroupId == resource.data.familyGroupId;
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null &&
                              resource.data.addedBy == request.auth.uid;
    }

    // Tasks - family members can read/write
    match /tasks/{taskId} {
      allow read: if request.auth != null &&
                    exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
                    get(/databases/$(database)/documents/users/$(request.auth.uid)).data.familyGroupId == resource.data.familyGroupId;
      allow create, update: if request.auth != null;
    }
  }
}
```

## Instalación y Uso

### Desarrollo Local

1. Clona este repositorio
2. Abre `index.html` con un servidor local (por ejemplo, Live Server en VS Code)
3. O usa Python: `python -m http.server 8000`
4. Navega a `http://localhost:8000`

### Deployment

#### Firebase Hosting (Recomendado)

```bash
# Instala Firebase CLI
npm install -g firebase-tools

# Inicia sesión
firebase login

# Inicializa el proyecto
firebase init hosting

# Despliega
firebase deploy
```

#### Otras opciones
- Netlify
- Vercel
- GitHub Pages

## Uso de la Aplicación

### Primer Uso

1. **Registro**: Crea una cuenta con email o Google
2. **Configurar Grupo**:
   - Crea un nuevo grupo familiar y obtén el código de invitación
   - O únete a un grupo existente con el código
3. **Invitar Miembros**: Comparte el código de 6 dígitos con tu familia

### Añadir Transacciones

1. Click en "+ Añadir Gasto" o "+ Añadir Ingreso"
2. Completa el formulario:
   - Monto
   - Descripción
   - Categoría
   - Fecha
   - Quién pagó
   - Foto del comprobante (obligatorio)
3. Opcionalmente, marca como gasto compartido y define porcentajes

### Ver el Dashboard

- **Resumen del Mes**: Gastos, ingresos y balance
- **Actividad Reciente**: Últimas 5 transacciones
- **Balance entre Miembros**: Quién le debe a quién (próximamente)

## Próximas Funcionalidades

- [ ] Sistema de tareas y recordatorios de pago
- [ ] Cálculo automático de balance entre hermanos
- [ ] Filtros por categoría y rango de fechas
- [ ] Gráficos de gastos por categoría
- [ ] Exportar reportes en PDF/Excel
- [ ] Notificaciones push
- [ ] Modo oscuro
- [ ] Soporte multi-idioma

## Tecnologías Utilizadas

- **Frontend**: HTML5, Tailwind CSS, JavaScript Vanilla
- **Backend**: Firebase (Auth, Firestore, Storage)
- **PWA**: Soporte para instalación en dispositivos móviles

## Contribuciones

Este es un proyecto familiar privado, pero las sugerencias son bienvenidas.

## Licencia

Proyecto privado para uso familiar.

---

Desarrollado con ❤️ para la gestión familiar
