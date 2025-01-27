import { alertDialog, newDialog } from './dialog'
import { createElement as h } from 'react'
import { Box } from '@mui/material'
import { Node, reloadVfs } from './VfsPage'
import { state } from './state'
import { apiCall } from './api'
import FilePicker from './FilePicker'
import { onlyTruthy } from './misc'

export default function addFiles() {
    const close = newDialog({
        title: 'Add files or folders',
        dialogProps: { sx:{ minWidth:'min(90vw, 40em)', minHeight: '70vh' } },
        Content,
    })

    function Content() {
        const under = getUnder()
        return h('div', {},
            h(Box, { sx:{ typography: 'body1', px: 1, py: 2 } }, "Selected elements will be added to " + (under || '(home)')),
            h(FilePicker, {
                async onSelect(sel) {
                    let failed = await Promise.all(sel.map(source =>
                        apiCall('add_vfs', { under, source }).then(() => '', () => source) ))
                    failed = onlyTruthy(failed)
                    if (failed.length)
                        await alertDialog("Some elements have been rejected: "+failed.join(', '), 'error')
                    reloadVfs()
                    close()
                }
            })
        )
    }

}

export async function addVirtual() {
    try {
        const name = "Folder"+String(Date.now()).slice(8)
        const under = getUnder()
        await apiCall('add_vfs', { under, name })
        reloadVfs([ (under||'') + '/' + name ])
        await alertDialog(name + " created", 'success')
    }
    catch(e) {
        await alertDialog(e as Error)
    }
}

function getUnder() {
    let f: Node | undefined = state.selectedFiles[0]
    if (f && f.type !== 'folder')
        f = f.parent
    return f?.id
}
