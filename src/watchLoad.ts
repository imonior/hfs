import { FSWatcher, watch } from 'fs'
import fs from 'fs/promises'
import yaml from 'yaml'
import { debounceAsync, readFileBusy } from './misc'

export type WatchLoadCanceller = () => void

interface Options { failedOnFirstAttempt?: ()=>void }

type WriteFile = typeof fs.writeFile
interface WatchLoadReturn { unwatch:WatchLoadCanceller, save:WriteFile }
export function watchLoad(path:string, parser:(data:any)=>void|Promise<void>, { failedOnFirstAttempt }:Options={}): WatchLoadReturn {
    let doing = false
    let watcher: FSWatcher | undefined
    const debounced = debounceAsync(load, 500)
    let retry: NodeJS.Timeout
    let saving: Promise<unknown> | undefined
    init()
    if (!watcher)
        failedOnFirstAttempt?.()
    return {
        unwatch(){
            watcher?.close()
            clearTimeout(retry)
            watcher = undefined
        },
        save(...args:Parameters<WriteFile>) {
            return Promise.resolve(saving).then(() => // wait in case another is ongoing
                saving = fs.writeFile(...args).finally(() => // save but also keep track of the current operation
                    saving = undefined)) // clear
        }
    }

    function init() {
        try {
            watcher = watch(path, ()=> {
                if (!saving)
                    debounced().then()
            })
            debounced().then() // if file is not accessible watch will throw, and we won't get here
        }
        catch {
            retry = setTimeout(init, 1000) // manual watching until watch is successful
        }
    }

    async function load(){
        if (doing) return
        doing = true
        let data: any
        try {
            try {
                data = await readFileBusy(path)
                console.debug('loaded', path)
                if (path.endsWith('.yaml'))
                    data = yaml.parse(data)
            }
            catch (e) { return } // silently ignore read errors
            await parser(data)
        }
        finally {
            doing = false
        }
    }
}

