# 💰 Family Budget Manager

Una aplicación moderna y completa de gestión de presupuesto familiar, construida con Firebase y JavaScript vanilla.

[![Firebase Hosting](https://img.shields.io/badge/Firebase-Hosting-orange?logo=firebase)](https://family-budget-362ee.web.app)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-yellow?logo=javascript)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)

## 🌐 Demo en Vivo

**URL:** [https://family-budget-362ee.web.app](https://family-budget-362ee.web.app)

## ✨ Características

### 🔐 Autenticación
- Login con Email/Password
- Login con Google OAuth
- Gestión de sesiones segura

### 👨‍👩‍👧‍👦 Grupos Familiares
- Crear grupo familiar con código único
- Unirse a grupo con código de 6 dígitos
- Colaboración en tiempo real
- Múltiples miembros por grupo

### 💸 Gestión de Transacciones
- **Añadir** gastos e ingresos
- **Editar** transacciones existentes
- **Eliminar** con confirmación
- Comprobantes en Base64 (sin costos de storage)
- Gastos compartidos con porcentajes
- 4 categorías: Casa, Servicios, Elías, Papás

### 🔍 Búsqueda y Filtros
- Búsqueda por texto (descripción, monto)
- Filtro por categoría
- Filtro por tipo (gasto/ingreso)
- Filtros combinados en tiempo real

### 🎯 Presupuestos
- Presupuesto mensual por categoría
- Barras de progreso visual
- Alertas de sobre-presupuesto
- Configuración personalizable

### 📊 Analytics y Reportes
- **Gráfico de Tendencias**: Visualización de gastos/ingresos a lo largo del tiempo
- **Comparativa Mensual**: Mes actual vs anterior con porcentajes
- **6 Insights Automáticos**:
  - Promedio mensual
  - Balance total
  - Tendencia (↑/↓)
  - Mes con mayor gasto
  - Mes con menor gasto
  - Proyección próximo mes
- Períodos configurables: 6, 12 meses o todo

### 📥 Exportación
- **Excel** (.xlsx): Todas las transacciones en formato tabular
- **PDF**: Reporte profesional con resumen y detalles

### 🖼️ Galería de Comprobantes
- Vista en grid responsive (2x3x4)
- Lightbox interactivo
- Navegación con flechas
- Zoom para ver original
- Descargar individual o todos
- Navegación por teclado (←, →, ESC)

### 🌙 Modo Oscuro
- Toggle en navbar (🌙/☀️)
- 300+ reglas CSS optimizadas
- Persistencia en localStorage
- Transiciones suaves
- Gráficos legibles en ambos modos

### ✅ Tareas y Recordatorios
- Crear tareas asignadas a miembros
- Estados: Pendiente/Completada
- Gestión de pendientes

### 💰 Balance entre Miembros
- Cálculo automático de deudas
- Visualización clara de quién debe a quién
- Basado en gastos compartidos

### 📅 Vista por Categorías
- Filtros por año y mes
- Transacciones agrupadas por categoría
- Totales por categoría

## 🛠️ Tecnologías

- **Frontend**: HTML5, CSS3 (Tailwind via CDN), JavaScript ES6+ Modules
- **Backend**: Firebase (Authentication, Firestore, Hosting)
- **Gráficos**: Chart.js
- **Exportación**: SheetJS (Excel), jsPDF (PDF)
- **PWA**: Manifest.json ready
- **CI/CD**: GitHub Actions

## 📦 Estructura del Proyecto

```
Family-Budget-APP/
├── index.html                 # Página principal
├── manifest.json             # PWA manifest
├── firebase.json             # Configuración Firebase
├── .firebaserc              # Firebase project
├── js/
│   ├── firebase-config.js   # Configuración Firebase
│   ├── auth.js              # Autenticación
│   ├── app.js               # Lógica principal
│   ├── navigation.js        # Sistema de navegación
│   ├── family-group.js      # Grupos familiares
│   ├── transactions.js      # CRUD transacciones
│   ├── search.js            # Búsqueda
│   ├── budgets.js           # Presupuestos
│   ├── export.js            # Exportación Excel/PDF
│   ├── trends.js            # Gráficos y analytics
│   ├── dark-mode.js         # Modo oscuro
│   ├── receipt-gallery.js   # Galería de comprobantes
│   ├── tasks.js             # Tareas
│   ├── balance.js           # Balance
│   └── categories.js        # Vista categorías
├── .github/
│   └── workflows/
│       ├── firebase-hosting-merge.yml
│       └── firebase-hosting-pull-request.yml
└── ROADMAP.md               # Plan de desarrollo
```

## 🚀 Instalación Local

### Prerequisitos

- Node.js 18+ y npm
- Firebase CLI: `npm install -g firebase-tools`
- Cuenta de Firebase

### Pasos

1. **Clonar el repositorio**
   ```bash
   git clone https://github.com/PancitoDulce16/Family-Budget-APP.git
   cd Family-Budget-APP
   ```

2. **Configurar Firebase**

   Edita `js/firebase-config.js` con tus credenciales:
   ```javascript
   const firebaseConfig = {
     apiKey: "TU_API_KEY",
     authDomain: "TU_AUTH_DOMAIN",
     projectId: "TU_PROJECT_ID",
     storageBucket: "TU_STORAGE_BUCKET",
     messagingSenderId: "TU_MESSAGING_SENDER_ID",
     appId: "TU_APP_ID"
   };
   ```

3. **Login en Firebase**
   ```bash
   firebase login
   ```

4. **Inicializar proyecto**
   ```bash
   firebase init hosting
   # Selecciona tu proyecto
   # Public directory: . (punto)
   # Configure as single-page app: Yes
   # Set up automatic builds: No
   ```

5. **Servir localmente**
   ```bash
   firebase serve
   ```
   Abre http://localhost:5000

6. **Deployar**
   ```bash
   firebase deploy --only hosting
   ```

## 🔒 Reglas de Firestore

Configura estas reglas en Firebase Console > Firestore Database > Rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users
    // A user can write to their own document and read documents of users in the same family group.
    match /users/{userId} {
      function userFamilyId() { return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.familyGroupId; }
      allow read: if request.auth != null && userFamilyId() == resource.data.familyGroupId;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
 
    // Family Groups
    // A user can read a group if they are a member, create a new group, or update a group
    // by adding themselves to the members list.
    match /familyGroups/{groupId} {
      allow read: if request.auth.uid in resource.data.members;
      allow create: if request.auth != null;
      allow update: if request.auth.uid in resource.data.members || 
                       request.auth.uid in request.resource.data.members;
    }
 
    // Transactions
    // Users can only manage transactions belonging to their family group.
    match /transactions/{transactionId} {
      function userFamilyId() { return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.familyGroupId; }
      allow get, update, delete: if request.auth != null && userFamilyId() == resource.data.familyGroupId;
      allow list: if request.auth != null && userFamilyId() == request.query.filters.familyGroupId;
      allow create: if request.auth != null && userFamilyId() == request.resource.data.familyGroupId;
    }
 
    // Tasks
    // Users can only manage tasks belonging to their family group.
    match /tasks/{taskId} {
      function userFamilyId() { return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.familyGroupId; }
      allow read, write: if request.auth != null && userFamilyId() == resource.data.familyGroupId;
    }
 
    // Budgets
    // Users can only manage the budget document that matches their family group ID.
    match /budgets/{budgetId} {
      function userFamilyId() { return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.familyGroupId; }
      allow read, write: if request.auth != null && userFamilyId() == budgetId;
    }

    // Categories
    // Users can manage categories belonging to their family group.
    match /categories/{categoryId} {
      function userFamilyId() { return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.familyGroupId; }
      allow get, update, delete: if request.auth != null && userFamilyId() == resource.data.familyGroupId;
      allow list: if request.auth != null && userFamilyId() == request.query.filters.familyGroupId;
      allow create: if request.auth != null && userFamilyId() == request.resource.data.familyGroupId;
    }

    // Recurring Transactions
    // Users can only manage recurring transactions for their own family group.
    match /recurringTransactions/{recurringId} {
      function userFamilyId() { return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.familyGroupId; }
      allow read, update, delete: if request.auth != null && userFamilyId() == resource.data.familyGroupId;
      allow create: if request.auth != null && userFamilyId() == request.resource.data.familyGroupId;
    }

    // Savings Goals
    // Users can manage goals for their own family group.
    match /goals/{goalId} {
      function userFamilyId() { return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.familyGroupId; }
      allow read, write: if request.auth != null && userFamilyId() == resource.data.familyGroupId;
    }
  }
}
```

## 🔧 Configuración de GitHub Actions

Para habilitar deployment automático:

1. **Generar Service Account**
   ```bash
   firebase init hosting:github
   ```

2. **O manualmente**: Ve a Firebase Console → Project Settings → Service Accounts → Generate New Private Key

3. **Agregar Secret a GitHub**:
   - Ve a GitHub Repo → Settings → Secrets and variables → Actions
   - New repository secret
   - Name: `FIREBASE_SERVICE_ACCOUNT_FAMILY_BUDGET_362EE`
   - Value: Pega el contenido del JSON descargado

4. **Push a main** y el deploy será automático 🚀

## 📊 Estadísticas del Proyecto

- **Módulos JavaScript**: 15
- **Líneas de código**: ~4,500+
- **Funcionalidades**: 50+
- **Deploys**: 6+ exitosos
- **Costo**: $0 (100% Firebase Free Tier)

## 🗺️ Roadmap

Ver [ROADMAP.md](ROADMAP.md) para el plan completo de desarrollo.

### ✅ Completado (Fases 1-3)
- Sistema de autenticación
- Grupos familiares
- Transacciones (CRUD completo)
- Búsqueda y filtros
- Presupuestos
- Exportación Excel/PDF
- Gráficos y analytics
- Modo oscuro
- Galería de comprobantes

### 🚧 En Progreso (Fase 4)
- Gastos recurrentes
- Categorías personalizadas
- Drag & drop de imágenes

### 📋 Planeado (Fases 5-10)
- PWA completo con offline
- OCR para recibos
- Multi-idioma
- Múltiples monedas
- Gamificación
- Integraciones externas

## 🤝 Contribuir

Las contribuciones son bienvenidas! Por favor:

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📝 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para detalles.

## 👤 Autor

**Noelia**

- GitHub: [@PancitoDulce16](https://github.com/PancitoDulce16)

## 🙏 Agradecimientos

- Firebase por la infraestructura gratuita
- Chart.js por los gráficos
- SheetJS y jsPDF por las exportaciones
- Claude Code por asistencia en desarrollo

---

**¿Necesitas ayuda?** Abre un [Issue](https://github.com/PancitoDulce16/Family-Budget-APP/issues)

**Made with ❤️ and Claude Code**
