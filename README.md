# CRiSS-LAB Website

Sitio web oficial del Computational Research in Social Science Lab (CRiSS-LAB) de la Universidad del Desarrollo.

El sitio está construido con Hugo y Wowchemy, y se despliega en Netlify.

## Estructura

- `config/_default/`: configuración global, navegación, SEO, idioma y parámetros del sitio.
- `content/en/`: contenido público activo en inglés.
- `content/es/`: contenido en español, actualmente preparado pero no habilitado en la configuración.
- `content/en/authors/`: perfiles de personas del laboratorio.
- `content/en/publication/`: publicaciones académicas.
- `content/en/projects/`: proyectos de investigación e innovación.
- `content/en/post/`: noticias y blog.
- `content/en/event/`: charlas, seminarios y eventos.
- `assets/media/`: imágenes globales usadas por widgets y banners.

## Desarrollo Local

El entorno de trabajo esperado es `candialab2`.

```bash
conda run -n candialab2 hugo server --buildFuture
```

Para compilar localmente:

```bash
conda run -n candialab2 hugo --gc --minify --buildFuture
```

Este sitio usa Hugo Modules, por lo que el comando anterior requiere que `go` esté disponible en el entorno o en el `PATH`.
