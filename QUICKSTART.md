# Guía Rápida de Inicio

## ✅ Checklist antes de deployar

### 1. Configuración de Firebase Console

Ve a [Firebase Console](https://console.firebase.google.com/) y configura:

#### Authentication
- [ ] Ve a **Authentication** → **Sign-in method**
- [ ] Activa **Email/Password**
- [ ] Activa **Google**
  - Configura el nombre del proyecto
  - Agrega tu email de soporte

#### Firestore Database
- [ ] Ve a **Firestore Database**
- [ ] Click en **Create database**
- [ ] Selecciona **Start in test mode** (cambiaremos las reglas después)
- [ ] Selecciona la ubicación (usa `us-central1` o el más cercano)
- [ ] Click en **Enable**

#### Reglas de Seguridad (IMPORTANTE)
- [ ] Ve a **Firestore Database** → **Rules**
- [ ] Copia y pega las reglas del archivo `README.md`
- [ ] Click en **Publish**

### 2. Instalación de herramientas

```bash
# Instalar Node.js (si no lo tienes)
# Descarga desde: https://nodejs.org/

# Verificar instalación
node --version
npm --version

# Instalar Firebase CLI
npm install -g firebase-tools
```

### 3. Deploy en Firebase Hosting

```bash
# 1. Abre terminal en la carpeta del proyecto
cd C:\Users\Noelia\Documents\GitHub\Family-Budget-APP

# 2. Inicia sesión en Firebase
firebase login

# 3. Deploy
firebase deploy --only hosting
```

## 🎉 ¡Listo!

Tu aplicación estará disponible en:
- **https://family-budget-362ee.web.app**
- **https://family-budget-362ee.firebaseapp.com**

## 📱 Primer uso de la aplicación

### Configuración inicial (primera persona)

1. **Abre la URL** de tu aplicación
2. **Regístrate** con email o Google
3. **Crea un grupo familiar**
   - Elige un nombre (ej: "Familia González")
   - Obtendrás un código de 6 dígitos
4. **Comparte el código** con tu familia

### Unirse al grupo (otros miembros)

1. **Regístrate** en la aplicación
2. **Click en "Unirme a un grupo"**
3. **Ingresa el código** de 6 dígitos
4. **¡Listo!** Ya puedes ver y agregar transacciones

## 🖼️ Agregar iconos de la PWA

Los iconos están en la carpeta `icons/`. Necesitas crear:

1. **icon-192x192.png** (192x192 píxeles)
2. **icon-512x512.png** (512x512 píxeles)

### Opción rápida (placeholder temporal):

1. Ve a https://www.favicon-generator.org/
2. Crea un icono simple con las letras "FB"
3. Descarga y guarda en la carpeta `icons/`
4. O usa un emoji: 💰 (puedes hacer screenshot y redimensionar)

## 🔧 Comandos útiles

```bash
# Ver la app localmente antes de deployar
firebase serve

# Ver logs
firebase hosting:channel:list

# Actualizar después de hacer cambios
firebase deploy --only hosting
```

## ⚠️ Solución rápida de problemas

### "Firebase CLI not found"
```bash
npm install -g firebase-tools
```

### "Not authorized"
```bash
firebase login --reauth
```

### La imagen es muy grande (>1MB)
- Usa un compresor online: https://tinypng.com/
- O toma una foto con menor calidad desde tu cámara
- Las capturas de pantalla suelen ser más pequeñas

### No puedo subir transacciones
- Verifica que hayas configurado las reglas de Firestore
- Asegúrate de estar en un grupo familiar
- La foto debe ser menor a 1MB

## 📊 Límites del plan gratuito

✅ **Incluido gratis:**
- Firebase Hosting: 10GB almacenamiento, 360MB/día transferencia
- Firestore: 50,000 lecturas/día, 20,000 escrituras/día
- Authentication: Usuarios ilimitados
- SSL/HTTPS: Incluido

**Suficiente para:**
- Familia de hasta 10 personas
- ~100 transacciones por día
- Uso normal sin problemas

## 🚀 Próximos pasos

Una vez que tengas la app funcionando:

1. **Invita a tu familia** con el código
2. **Prueba añadir una transacción** de prueba
3. **Verifica que aparezca** en el dashboard
4. **Personaliza** los iconos de la PWA
5. **Instala la app** en tu teléfono (Add to Home Screen)

---

**¿Necesitas ayuda?** Revisa el archivo `DEPLOYMENT.md` para más detalles.
