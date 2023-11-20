import resourceInfo from "../../../../tmp/resources-info"
import { makeDescriptor, RESOURCE } from "shared/classes/resources.cjs"
import { d } from "helper/helper"

const cache = resourceInfo.cache || {}
const scope2ids = cache[RESOURCE.PREFIX[RESOURCE.TYPE.CORE] + 'scope2ids.json'] || {}
const id2children = cache[RESOURCE.PREFIX[RESOURCE.TYPE.CORE] + 'id2children.json'] || {}
const tids = resourceInfo.tids || []

/*
  routes:

  a) resources

     {
        resources: [ { id, type }, ... ]
        screen: <string>,
        resolved: [ trId, ... ],
        overwrites: {<trId>: [ trId, ...]},
        remotes: [ trId, ... ]
     }

     => {
        found: [ { id, type, data }, ... ]
        notFound: [ { id, type } ],
        invalid: [ { id, type } ]
     }

    --------------------------------------------

    {
        resources: [ tid, ... ]
        scope: <string>,
        storage: { ids: [ tid, ... ], id2children: {<tid>: [ tid, ... ]} }
    }

    => {
        found: {<tid>: <value>},
        missing: [ tid, ... ],
        add: [ tid, ... ]
    }




  b) delete

     { resources: [ trId, ... ] }

     => {
        deleted: [ trId ]
     }

  c) has

     { resources: [ trId, ... ] }

     => {
        found: [ { id, type }, ... ]
     }

  d) store

     // eine Image resource wo data instanceof AppliedImage wird per dat.dataUrl in einen String konvertiert

     {
        screen: <string>,
        resources: [ { id, type, data }, ... ],
        direct: {<type>: [ id, ... ]},
        indirect: {<trId>: [ trId, ... ]}
     }

     => {
        stored: [ { id, type }, ... ]
     }

     ----------------------------------------------------

     {
        scope: <string>,
        resources: {<tid>: <value>}
     }

     => {
        stored: [ tid, ... ]
     }
 */

{

}


const StaticFetcher = baseUrl => {

    return {
        fetch: (name, json) => {
            d('FETCH...', name, json)
            const { scope, ids, permIds, tempIds } = json
            const scopeIds = scope2ids[scope] || []

            for (const id of scopeIds) {
                if (!ids.includes(id)) ids.push(id)
            }
            const deps = { ...id2children }

            const processed = []
            const add = []
            const found = {}
            const invalid = []
            const missing = []
            const drop = []

            const promises = []
            while (ids.length) {
                const rawTid = ids.pop()
                const descriptor = makeDescriptor.fromTid(rawTid)
                const id = descriptor.tid
                const extTid = descriptor.extTid

                if (!processed.includes(id)) {
                    processed.push(id)

                    if (!permIds.includes(rawTid) && !tempIds.includes(rawTid)) {
                        if (tids.includes(extTid)) {
                            const cached = cache[extTid]
                            const promise = cached ?
                                Promise.resolve([id, cached]) :
                                fetch(baseUrl + descriptor.key + '/' + descriptor.extId)
                                    .then(response => {
                                        if (!response.ok || response.status !== 200)
                                            throw new Error(`HTTP error! Status: ${response.status}`)

                                        return descriptor.isJson() ? response.json() : response.blob()
                                    })
                                    .then(data => {
                                        if (data && !descriptor.isJson()) {
                                            data = URL.createObjectURL(data)
                                        }
                                        return [
                                            id, data
                                        ]
                                    })
                            promises.push(promise)
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
            return Promise.all(promises).then(
                resources => {
                    for (const [id, content] of resources) {
                        if (!content) {
                            missing.push(id)
                        } else {
                            found[id] = content
                        }
                    }
                    return d({ found, missing, invalid, add, drop })
                }
            )
        }
    }
}





/*
const StaticFetcher2 = baseUrl => {
    const cache = resourceInfo.cache
    const dependencies = new ResourceDependencies(
        () => resourceInfo.direct,
        () => null,
        () => resourceInfo.indirect,
        () => null,
        () => null
    )
    return {
        fetch: (name, json) => {
            const found = []
            const missing = []
            const add = []

            const { resources = [], screen, resolved, overwrites, remotes } = json
            const relevant = dependencies.getRelevantScreenResources(screen, resolved, overwrites, remotes)

            for (let resId of relevant.found) {
                const [ type, id ] = resId.split(':')
                resources.push({ id, type })
            }
            for (let resId of relevant.notFound) {
                const [type, id] = resId.split(':')
                missing.push({ id, type })
            }
            const promises = []
            for (const resource of resources) {
                const id = resource.id
                const type = resource.type
                const ext = type === 'json' ? '.json' : ''
                const cached = cache[type][id]
                if (cached) {
                    promises.push(Promise.resolve({
                        id, type, data: cached
                    }))
                    continue
                }
                promises.push(
                    resourceInfo.static[type].includes(id) ?
                        fetch(baseUrl + resource.type + '/' + resource.id + ext)
                            .then(response => {
                                if (response.status === 404) {
                                    return Promise.resolve(null)
                                }
                                if (!response.ok) {
                                    throw new Error(`HTTP error! Status: ${response.status}`)
                                }
                                return resource.type === 'json' ? response.json() : response.blob()
                            })
                            .then(data => {
                                if (data !== null && resource.type !== 'json') {
                                    data = URL.createObjectURL(data)
                                }
                                cache[resource.type][id] = data
                                return {
                                    id,
                                    type,
                                    data
                                }
                            }) :
                        Promise.resolve({
                            id,
                            type,
                            data: null
                        })
                )
            }
            return Promise.all(promises).then(resources => {
                for(const resource of resources) {
                    if (resource.data === null) {
                        missing.push(resource)
                    } else {
                        found.push(resource)
                    }
                }
                return {
                    found,
                    missing,
                    add
                }
            })
        }
    }
}
*/

export default StaticFetcher