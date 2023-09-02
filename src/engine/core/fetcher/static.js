import resourceInfo from "../../../../tmp/resources-info"
import { ResourceDependencies } from "helper/shared"

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

const StaticFetcher = baseUrl => {
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

export default StaticFetcher