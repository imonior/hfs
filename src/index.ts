import Koa from 'koa'
import mount from 'koa-mount'
import { apiMiddleware } from './apis'
import { API_URI, BUILD_TIMESTAMP, DEV, HFS_STARTED, VERSION} from './const'
import { frontEndApis } from './frontEndApis'
import { log } from './log'
import { pluginsMiddleware } from './plugins'
import { throttler } from './throttler'
import { getAccount, getCurrentUsername, getCurrentUsernameExpanded } from './perm'
import { headRequests, gzipper, sessions, frontendAndSharedFiles, someSecurity } from './middlewares'
import './listen'
import { serveAdminFiles } from './serveFrontend'
import { adminApis } from './adminApis'

if (DEV) console.clear()
console.log('started', HFS_STARTED.toLocaleString(), DEV)
console.log('version', VERSION||'-')
console.log('build', BUILD_TIMESTAMP||'-')
console.debug('cwd', process.cwd())

export const adminApp = new Koa()
    .use(someSecurity)
    .use(mount(API_URI, apiMiddleware(adminApis)))
    .use(serveAdminFiles)
    .on('error', errorHandler)

export const app = new Koa({ keys: ['hfs-keys-test'] })
app.use(someSecurity)
app.use(sessions(app))
app.use(async (ctx, next) => {
    ctx.state.usernames = getCurrentUsernameExpanded(ctx) // accounts chained via .belongs for permissions check
    ctx.state.account = getAccount(getCurrentUsername(ctx))
    await next()
})
app.use(headRequests)
app.use(log())
app.use(pluginsMiddleware())
app.use(throttler())
app.use(gzipper)

// serve apis
app.use(mount(API_URI, apiMiddleware(frontEndApis)))
app.use(frontendAndSharedFiles)
app.on('error', errorHandler)

function errorHandler(err:Error & { code:string, path:string }) {
    const { code } = err
    if (DEV && code === 'ENOENT' && err.path.endsWith('sockjs-node')) return // spam out dev stuff
    if (code === 'ECANCELED' || code === 'ECONNRESET' || code === 'ECONNABORTED') return // someone interrupted, don't care
    console.error('server error', err)
}

process.on('uncaughtException', err => {
    console.error(err)
})
