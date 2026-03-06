# ✅ Reglas de ofuscación para OpoCalendar

# ✅ Mantener clases Capacitor
-keep class com.getcapacitor.** { *; }
-keep class com.getcapacitor.plugin.** { *; }

# ✅ Mantener interfaces de Capacitor
-keep interface com.getcapacitor.** { *; }

# ✅ Mantener anotaciones
-keepattributes *Annotation*

# ✅ Mantener métodos de clase nativa
-keepclasseswithmembernames class * {
    native <methods>;
}

# ✅ Mantener enumeraciones
-keepclassmembers enum * {
    public static **[] values();
    public static ** valueOf(java.lang.String);
}

# ✅ Mantener clases de recurso
-keep class **.R$* {
    <fields>;
}

# ✅ Mantener clases de vista
-keepclasseswithmembers class * {
    public <init>(android.content.Context, android.util.AttributeSet);
}

# ✅ Eliminar logs en producción
-assumenosideeffects class android.util.Log {
    public static *** d(...);
    public static *** v(...);
    public static *** i(...);
}

# ✅ Mantener métodos de ciclo de vida
-keepclassmembers class * extends android.app.Activity {
    public void *(android.view.View);
}

# ✅ Mantener datos del modelo
-keepclassmembers class com.opocalendar.** {
    <fields>;
    <methods>;
}

# ✅ Mantener credenciales
-keepclassmembers class * {
    *** *Password(...);
    *** *Token(...);
    *** *Secret(...);
}

# ✅ Optimizaciones agresivas
-optimizationpasses 5
-dontusemixedcaseclassnames
-allowaccessmodification
-repackageclasses

# ✅ Mantener nombres de fuente para debugging en release
-keepattributes SourceFile,LineNumberTable
