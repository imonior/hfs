import { createElement as h, isValidElement, useEffect, useMemo, useState } from 'react'
import { useApiComp } from './api'
import { Grid } from '@mui/material'
import { state, useSnapState } from './state'
import FileCard from './FileCard'
import VfsMenuBar from './VfsMenuBar'
import VfsTree from './VfsTree'
import { onlyTruthy } from './misc'

let selectOnReload: string[] | undefined

export default function VfsPage() {
    const [id2node] = useState(() => new Map<string, Node>())
    const snap = useSnapState()
    const [res, reload] = useApiComp('get_vfs')
    useMemo(() => snap.vfs || reload(), [snap.vfs, reload])
    useEffect(() => {
        state.vfs = undefined
        if (!res) return
        // rebuild id2node
        id2node.clear()
        const { root } = res
        if (!root) return
        recur(root) // this must be done before state change that would cause Tree to render and expecting id2node
        state.vfs = root
        // refresh objects of selectedFiles
        const ids = selectOnReload || state.selectedFiles.map(x => x.id)
        selectOnReload = undefined
        state.selectedFiles = onlyTruthy(ids.map(id =>
            id2node.get(id)))

        // calculate id and parent fields, and builds the map id2node
        function recur(node: Node, pre='', parent: Node|undefined=undefined) {
            node.parent = parent
            node.id = (pre + node.name) || '/' // root
            id2node.set(node.id, node)
            if (!node.children) return
            for (const n of node.children)
                recur(n, (pre && node.id) + '/', node)
        }

    }, [res, id2node])
    if (isValidElement(res)) {
        id2node.clear()
        return res
    }
    return h(Grid, { container:true },
        h(Grid, { item:true, sm: 6, lg: 7 },
            h(VfsMenuBar),
            snap.vfs && h(VfsTree, { id2node })),
        h(Grid, { item:true, sm: 6, lg: 5 },
            h(FileCard)))
}

export function reloadVfs(pleaseSelect?: string[]) {
    selectOnReload = pleaseSelect
    state.vfs = undefined
}

export type Node = {
    id: string
    name: string
    type?: 'folder'
    source?: string
    size?: number
    ctime?: string
    mtime?: string
    children?: Node[]
    parent?: Node
    hidden?: boolean
    perm?: any
}
