import resourceInfo from "../../../../tmp/resources-info"
import { RESOURCE } from "shared/resources.cjs"
import { d } from "helper/helper"
import { tids2extTids, map2extMap } from "shared/resources.cjs"

const cache = resourceInfo.cache || {}
const scope2ids = cache[RESOURCE.PREFIX[RESOURCE.TYPE.CORE] + 'scope2ids.json'] || {}
const id2children = cache[RESOURCE.PREFIX[RESOURCE.TYPE.CORE] + 'id2children.json'] || {}
const tids = resourceInfo.tids || []

const StaticFetcher = baseUrl => {

    return {
        fetch: (name, json) => {
            const { scope, ids, permIds, tempIds } = json
            const scopeIds = tids2extTids(scope2ids[scope] || [])

            for (const id of scopeIds) {
                if (!ids.includes(id)) ids.push(id)
            }
            const deps = { ...map2extMap(id2children) }

            const processed = []
            const add = []
            const found = {}
            const invalid = []
            const missing = []
            const drop = []

            while (ids.length) {
                const id = ids.pop()
                if (!processed.includes(id)) {
                    processed.push(id)

                    if (!permIds.includes(id) && !tempIds.includes(id)) {
                        if (tids.includes(id)) {
                            found[id] = cache[id]
                        } else {
                            missing.push(id)
                        }
                    }
                    const idDeps = deps[id]
                    if (idDeps && idDeps.length) {
                        ids.push( ...idDeps )
                    }
                }
            }
            for (const id of tempIds) {
                if (!processed.includes(id)) drop.push(id)
            }
            return Promise.resolve({ found, missing, invalid, add, drop })
        }
    }
}

export default StaticFetcher