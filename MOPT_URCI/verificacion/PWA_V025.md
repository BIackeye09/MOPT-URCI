# Verificación v0.25: seguridad vial y flechas

Fecha: 17 de noviembre de 2026.

## Cambios

Desnivel solicita sólo centímetros. La condición se obtiene por sus límites
(0–2, mayor de 2 y menor de 5, desde 5 y menor de 15, desde 15 y menor de 25,
desde 25), manteniendo las fórmulas proporcionales aprobadas y el piso 0.
El selector anterior deja de intervenir, aunque su dato se conserve en una
captura previa. La revisión de pendientes dirige al campo de centímetros.
Pantalla, PDF y Excel usan la misma condición calculada por la medición.

Vegetación y señalamiento exigen la selección y la nota manual dentro de
los límites 95–100,85–94,60–84,26–59 y 0–25. Se admiten decimales dentro de
cada rango con coma o punto. Los extremos son exactos:94,5 no se redondea
ni se admite en las dos primeras opciones. Una nota vacía o fuera de rango
deja pendiente el aspecto y los índices dependientes, sin cambiar la entrada.
Las capturas antiguas sin método proporcional conservan sus reglas anteriores.
Estabilidad y drenaje y la ponderación 60/40 conservan su comportamiento.

Las flechas usan una paleta compartida: Baja 0066FF, Media 8E24AA, AltaE65100;
la guía URCI en pantalla usaC2185B. Se conserva el halo blanco, geometría,
valores, puntas y figuras originales. PDF y Excel consumen la misma paleta.
No se modifican los archivos de plantillas ni las imágenes originales.

## Verificación

npm test:149 pruebas aprobadas, ninguna fallida, además de la interacción
simulada DOM/IndexedDB de Eficiencia. Se comprueban las condiciones automáticas,
independencia de selecciones anteriores, límites y decimales de ambas notas,
ceros válidos, cambios de opción sin recortar, foco del pendiente, preservación
de datos, estado exportado y colores compartidos. Se mantienen las pruebas de
plantillas, gráficos, agrupaciones, Papelera, filtros por fecha y Eficiencia.

En navegador real se confirmó que no existe el selector de desnivel y que la
entrada de centímetros está habilitada desde el inicio.0 cm=100/Muy bueno;
2,5=95/Bueno;5=70/Regular;15=50/Malo;25,5=23,75/Muy malo;35=0/Muy malo.
Borrar la medida dejó pendiente la condición y la nota. En Vegetación,
94,5 se rechazó en Muy bueno;95,5 fue válido y se volvió inválido al cambiar
a Bueno, conservando 95,5.90,5 fue válido en Bueno. En Señalamiento,85 se
rechazó en Regular;80,25 fue válido, y 0 fue válido en Muy malo.

Se guardó una nota fuera de rango, se descargó el borrador y se recargó: el
valor 94,5 y su aviso permanecieron. Corregirlo a 90,5 y guardar recuperó el
estado completo tras recargar. No se migran ni cambian las bases de datos.

El Excel completo real contiene Muestra 01, Curvas 01 y Resumen. AL11=7,5;
AQ11=65 y AR11=Regular; AQ13=72,5; AQ23=90,5 y AR23=Bueno; AQ35=80,25 y
AR35=Regular; AQ50=71,1. En el borrador con 94,5 fuera de Bueno, AQ23, AR23
y AQ50 permanecen vacíos. Los tres colores nuevos aparecen en los dibujos
vectoriales del Excel y en las operaciones de dibujo de la página de curvas
del PDF. El PDF completo tiene cuatro páginas; se revisaron visualmente
la seguridad vial y las curvas.

Las plantillas, vendor, imágenes originales, motores URCI, datos/funciones
de Eficiencia, filtros de fechas y código de guardado son idénticos a v0.24.
Se mantiene localhost:8090 y la caché de aplicación avanza a v025r1.
