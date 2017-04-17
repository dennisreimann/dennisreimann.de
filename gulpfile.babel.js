import { argv } from 'yargs'
import path from 'path'
import gulp from 'gulp'
import gulpLoadPlugins from 'gulp-load-plugins'
import runSequence from 'run-sequence'
import autoprefixer from 'autoprefixer'
import mqpacker from 'css-mqpacker'
import csswring from 'csswring'
import highlightjs from 'highlight.js'
import BrowserSync from 'browser-sync'
import templateHelper from './lib/templateHelper'

const p = gulpLoadPlugins()
const browserSync = BrowserSync.create()
const isDev = (argv.dev != null)
const assetHost = argv.assetHost || ''
const defaultScheme = isDev ? 'http' : 'https'
const siteHost = isDev ? 'localhost:3000' : 'dennisreimann.de'
const siteUrl = `${defaultScheme}://${siteHost}`

const paths = {
  src: 'src',
  dest: 'dist',
  rev: ['dist/**/*.{css,js,map,svg,jpg,png,gif,woff,woff2}', '!dist/service-worker.js', '!dist/files/**/*'],
  copy: ['src/static/**/*', 'src/static/.htaccess'],
  pages: ['src/pages/**/*.pug'],
  icons: ['src/icons/**/*.svg'],
  styles: ['src/styles/**/*.styl'],
  scripts: ['src/scripts/**/*.js'],
  serviceworker: ['src/serviceworker/service-worker.js'],
  html: ['dist/**/*.html'],
  optimizeImages: ['src/{images,svgs}/**/*'],
  articles: ['src/articles/*.md'],
  templates: 'src/templates/**/*.pug',
  articleTemplate: 'src/templates/article.pug',
  articlesBasepath: 'articles'
}

const dest = (folder = '') => gulp.dest(`${paths.dest}/${folder}`)

const pugConf = {
  pretty: true,
  basedir: './src/templates'
}

const mvbConf = {
  glob: paths.articles,
  template: paths.articleTemplate,
  permalink (article) {
    return `/${paths.articlesBasepath}/${article.id}.html`
  },
  highlight (code, lang) {
    const languages = (lang != null) ? [lang] : undefined
    return highlightjs.highlightAuto(code, languages).value
  },
  grouping (articles) {
    const byYear = {}
    const byTag = {}

    articles.forEach(function (article) {
      const year = article.date.toISOString().replace(/-.*/, '')
      if (!byYear[year]) { byYear[year] = [] }
      byYear[year].push(article)

      return (article.tags || []).forEach(function (tag) {
        if (!byTag[tag]) { byTag[tag] = [] }
        return byTag[tag].push(article)
      })
    })

    // year
    const articlesByYear = []
    Object.keys(byYear).reverse().forEach(year => articlesByYear.push({year, articles: byYear[year]}))

    // tag
    const articlesByTag = byTag

    // groups
    return {
      byTag: articlesByTag,
      byYear: articlesByYear
    }
  }
}

const templateData = file => ({
  h: templateHelper.createHelper(file, isDev, siteHost, assetHost, defaultScheme),
  page: {
    permalink: path.relative(paths.src, file.path).replace(/^pages/, '').replace(/\.pug$/, '.html')
  }
})

const buildHtml = (src, dst) =>
  gulp.src(src)
    .pipe(p.plumber())
    .pipe(p.mvb(mvbConf))
    .pipe(p.data(templateData))
    .pipe(p.pug(pugConf))
    .pipe(dest(dst))

const feedWithTemplate = (template, folder) =>
  gulp.src(`src/feed/${template}.pug`)
    .pipe(p.plumber())
    .pipe(p.mvb(mvbConf))
    .pipe(p.data(templateData))
    .pipe(p.pug(pugConf))
    .pipe(p.rename({extname: '.xml'}))
    .pipe(dest(folder))

gulp.task('feed:atom', () => feedWithTemplate('atom'))
gulp.task('feed:elm', () => feedWithTemplate('elm', paths.articlesBasepath))
gulp.task('feed', ['feed:atom', 'feed:elm'])

gulp.task('copy', cb =>
  gulp.src(paths.copy)
    .pipe(dest())
)

gulp.task('pages', () => buildHtml(paths.pages))
gulp.task('articles', () => buildHtml(paths.articles, paths.articlesBasepath))

gulp.task('serviceworker', () => {
  let htmlCacheKeys = {}
  try {
    const htmlManifest = require(`./${paths.dest}/html-manifest.json`)
    // prefix keys and values with slash
    htmlCacheKeys = Object.keys(htmlManifest).reduce((acc, htmlFile) => {
      acc[`/${htmlFile}`] = `/${htmlManifest[htmlFile]}`
      return acc
    }, {})
    // add extra key for root path
    htmlCacheKeys['/'] = `/${htmlManifest['index.html']}`
  } catch (error) { }

  gulp.src(paths.serviceworker)
    .pipe(p.plumber())
    .pipe(p.replace('const HTML_CACHE_KEYS = {}', `const HTML_CACHE_KEYS = ${JSON.stringify(htmlCacheKeys, null, '  ')}`))
    .pipe(p.babel())
    .pipe(p.stripDebug())
    .pipe(p.uglify())
    .pipe(dest())
})

// for config options see:
// - https://github.com/svg/svgo
// - https://github.com/jkphl/svg-sprite/blob/master/docs/configuration.md
gulp.task('icons', cb =>
  gulp.src(paths.icons)
    .pipe(p.plumber())
    .pipe(p.svgSprite({
      mode: {
        symbol: {
          dest: '',
          sprite: 'icons.svg',
          inline: true
        }
      },
      shape: {
        id: {
          separator: '-'
        },
        transform: [
          {
            svgo: {
              plugins: [
                { removeStyleElement: true },
                { removeUselessStrokeAndFill: true },
                { removeAttrs: { attrs: '(stroke|fill)' } }
              ]
            }
          }
        ]
      }
    }))
    .pipe(gulp.dest('src/templates/includes'))
  )

gulp.task('scripts', () =>
  gulp.src(paths.scripts)
    .pipe(p.plumber())
    .pipe(p.babel())
    .pipe(p.stripDebug())
    .pipe(p.uglify())
    .pipe(dest('scripts'))
)

gulp.task('styles', () =>
  gulp.src(paths.styles)
    .pipe(p.plumber())
    .pipe(p.stylus({
      paths: ['src/styles/lib'],
      import: ['mediaQueries', 'variables']
    }))
    .pipe(p.concat('main.css'))
    .pipe(p.postcss([
      mqpacker,
      autoprefixer({browsers: ['last 2 versions']}),
      csswring
    ]))
    .pipe(dest('styles'))
)

gulp.task('optimizeImages', () =>
  gulp.src(paths.optimizeImages)
    .pipe(p.imagemin())
    .pipe(gulp.dest('src'))
)

gulp.task('revAssets', () => {
  const RevAll = p.revAll
  const revAll = new RevAll({prefix: assetHost})
  return gulp.src(paths.rev)
    .pipe(revAll.revision())
    .pipe(p.revDeleteOriginal())
    .pipe(dest())
    .pipe(revAll.versionFile())
    .pipe(dest())
    .pipe(revAll.manifestFile())
    .pipe(dest())
})

gulp.task('sitemap', () =>
  gulp.src(paths.html)
    .pipe(p.sitemap({ siteUrl, changefreq: 'weekly' }))
    .pipe(dest())
)

gulp.task('html:optimize', cb =>
  gulp.src(paths.html)
    .pipe(p.minifyHtml({empty: true}))
    .pipe(dest())
)

gulp.task('html:manifest', cb => {
  const RevAll = p.revAll
  const revAll = new RevAll({fileNameManifest: 'html-manifest.json'})
  return gulp.src(paths.html)
    .pipe(revAll.revision())
    .pipe(revAll.manifestFile())
    .pipe(dest())
})

gulp.task('watch', () => {
  gulp.watch(paths.copy, ['copy'])
  gulp.watch(paths.icons, ['icons'])
  gulp.watch(paths.styles, ['styles'])
  gulp.watch(paths.scripts, ['scripts'])
  gulp.watch(paths.serviceworker, ['serviceworker'])
  gulp.watch(paths.articleTemplate, ['articles'])
  gulp.watch(paths.templates, ['articles', 'pages'])
  gulp.watch(paths.pages).on('change', file => buildHtml(file.path))
  gulp.watch(paths.articles).on('change', file => buildHtml(file.path, paths.articlesBasepath))
})

gulp.task('optimize', ['html:optimize'])
gulp.task('browserSync', cb => browserSync.init(require('./bs-config')))
gulp.task('build', cb => runSequence(['copy', 'icons', 'styles', 'scripts', 'serviceworker'], ['pages', 'articles', 'feed'], cb))
gulp.task('develop', cb => runSequence('build', ['watch', 'browserSync'], cb))
gulp.task('rev', cb => runSequence('revAssets', ['pages', 'articles'], cb))
gulp.task('production', cb => runSequence('build', 'rev', ['sitemap', 'optimize'], 'html:manifest', 'serviceworker', cb))
